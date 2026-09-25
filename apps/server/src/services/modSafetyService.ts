import { dbGet, dbRun, dbAll } from '../models/db';

export interface ModVerificationResult {
  hashSha1: string;
  name: string;
  filename: string;
  isAllowed: boolean;
  status: 'approved' | 'blocked' | 'unverified';
  source: 'modrinth' | 'curseforge' | 'whitelist' | 'none';
  reason: string;
  categories: string[];
  projectUrl?: string;
  iconUrl?: string;
  description?: string;
}

const FORBIDDEN_KEYWORDS = [
  'xray',
  'x-ray',
  'x_ray',
  'cheat',
  'cheats',
  'hacks',
  'hack',
  'grief',
  'griefing',
  'automation',
  'bot',
  'dupe',
  'duplication',
  'fly',
  'flyhack',
  'speed',
  'speedhack',
  'killaura',
  'kill-aura',
  'freecam',
  'baritone',
  'meteor',
  'wurst',
  'bleachhack',
  'aristois',
  'liquidbounce',
  'inertia',
  'impact',
  'seedcracker',
  'autoclicker',
  'auto-clicker',
  'autofish',
  'auto-fish',
  'orefinder',
  'cavefinder',
  'aimbot',
  'nuker',
  'esp',
  'cheststealer',
];

const BLOCKED_FILE_NAMES = [
  'xray', 'x-ray', 'meteor', 'wurst', 'baritone', 'liquidbounce',
  'killaura', 'kill-aura', 'autoclicker', 'auto-clicker', 'freecam',
  'cheststealer', 'seedcracker', 'bleachhack', 'aimbot',
  'fractureiser', 'token-grabber', 'tokengrabber', 'infostealer',
  'keylogger', 'ransomware',
];

const MODRINTH_USER_AGENT = 'quiby-launcher/6.0.0 (security@quiby.fun)';

/**
 * Verifies a single mod via internal SQLite cache first, then via Modrinth API.
 */
export async function verifyMod(
  name: string,
  filename: string,
  hashSha1: string
): Promise<ModVerificationResult> {
  const normalizedHash = hashSha1.toLowerCase().trim();

  const blockedName = BLOCKED_FILE_NAMES.find((keyword) =>
    `${name} ${filename}`.toLowerCase().includes(keyword)
  );
  if (blockedName) {
    return {
      hashSha1: normalizedHash,
      name,
      filename,
      isAllowed: false,
      status: 'blocked',
      source: 'none',
      reason: `Запрещен: в названии обнаружена сигнатура читов или вредоносного ПО (${blockedName})`,
      categories: ['blocked-name'],
    };
  }

  // Manual decisions are authoritative even after cache eviction or an in-flight catalog lookup.
  const review = await dbGet<any>(
    "SELECT * FROM mod_whitelist_requests WHERE hash_sha1 = ? AND status IN ('approved', 'rejected') ORDER BY COALESCE(review_sequence, 0) DESC, id DESC LIMIT 1",
    [normalizedHash]
  );
  if (review) {
    const approved = review.status === 'approved';
    return {
      hashSha1: normalizedHash, name, filename, isAllowed: approved,
      status: approved ? 'approved' : 'blocked', source: 'whitelist',
      reason: review.decision_reason || (approved ? 'Одобрен администрацией сервера' : 'Отклонён администрацией сервера'),
      categories: ['whitelist'],
    };
  }

  // 1. Check local SQLite cache
  const cached = await dbGet<any>(
    'SELECT * FROM verified_mods WHERE hash_sha1 = ?',
    [normalizedHash]
  );

  if (cached) {
    let parsedCats: string[] = [];
    try {
      parsedCats = JSON.parse(cached.categories_json || '[]');
    } catch (_) {}

    return {
      hashSha1: normalizedHash,
      name: cached.name || name,
      filename,
      isAllowed: Boolean(cached.is_allowed),
      status: cached.status as any,
      source: cached.source as any,
      reason: cached.reason || '',
      categories: parsedCats,
    };
  }

  // 3. Query Modrinth API by SHA-1 hash
  try {
    const versionRes = await fetch(
      `https://api.modrinth.com/v2/version_file/${normalizedHash}?algorithm=sha1`,
      {
        headers: { 'User-Agent': MODRINTH_USER_AGENT },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (versionRes.ok) {
      const versionData = await versionRes.json();
      const projectId = versionData.project_id;

      // Query project metadata for categories, icon, and description
      const projectRes = await fetch(
        `https://api.modrinth.com/v2/project/${projectId}`,
        {
          headers: { 'User-Agent': MODRINTH_USER_AGENT },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (projectRes.ok) {
        const projectData = await projectRes.json();
        const categories: string[] = projectData.categories || [];
        const iconUrl: string | undefined = projectData.icon_url || undefined;
        const description: string | undefined = projectData.description || undefined;
        const combinedText = `${projectData.title} ${description || ''} ${categories.join(' ')}`.toLowerCase();

        // Check for forbidden anti-cheat tags
        const matchedForbidden = FORBIDDEN_KEYWORDS.find((kw) =>
          combinedText.includes(kw)
        );

        if (matchedForbidden) {
          // Blocked cheat mod
          const reason = `Запрещен: содержит признаки читов/гриферства (${matchedForbidden})`;
          await dbRun(
            `INSERT OR REPLACE INTO verified_mods (hash_sha1, mod_id, name, summary, source, is_allowed, status, reason, categories_json)
             VALUES (?, ?, ?, ?, 'modrinth', 0, 'blocked', ?, ?)`,
            [normalizedHash, projectId, projectData.title || name, description || '', reason, JSON.stringify(categories)]
          );

          return {
            hashSha1: normalizedHash,
            name: projectData.title || name,
            filename,
            isAllowed: false,
            status: 'blocked',
            source: 'modrinth',
            reason,
            categories,
            projectUrl: `https://modrinth.com/mod/${projectData.slug || projectId}`,
            iconUrl,
            description,
          };
        }

        // Safe approved mod
        const reason = 'Проверен в каталоге Modrinth';
        await dbRun(
          `INSERT OR REPLACE INTO verified_mods (hash_sha1, mod_id, name, summary, source, is_allowed, status, reason, categories_json)
           VALUES (?, ?, ?, ?, 'modrinth', 1, 'approved', ?, ?)`,
          [normalizedHash, projectId, projectData.title || name, description || '', reason, JSON.stringify(categories)]
        );

        return {
          hashSha1: normalizedHash,
          name: projectData.title || name,
          filename,
          isAllowed: true,
          status: 'approved',
          source: 'modrinth',
          reason,
          categories,
          projectUrl: `https://modrinth.com/mod/${projectData.slug || projectId}`,
          iconUrl,
          description,
        };
      }
    }
  } catch (err) {
    console.warn(`Modrinth lookup failed for ${name} (${normalizedHash}):`, err);
  }

  // 4. Mod not indexed on Modrinth / Curseforge
  return {
    hashSha1: normalizedHash,
    name,
    filename,
    isAllowed: false,
    status: 'unverified',
    source: 'none',
    reason: 'Мод не найден в публичном каталоге Modrinth. Вы можете отправить запрос на добавление в вайтлист.',
    categories: ['unverified'],
  };
}

/**
 * Verifies a batch of mods in parallel.
 */
export async function verifyModBatch(
  mods: Array<{ name: string; filename: string; hash_sha1: string }>
): Promise<ModVerificationResult[]> {
  return Promise.all(
    mods.map((m) => verifyMod(m.name, m.filename, m.hash_sha1))
  );
}

export async function submitWhitelistRequest(req: {
  user_discord_id?: string; mc_username?: string; mod_name: string; filename: string;
  hash_sha1: string; reason?: string; project_url?: string;
}): Promise<{ id: number; status: string }> {
  const hash = req.hash_sha1.toLowerCase().trim();
  await dbRun(
    `INSERT INTO mod_whitelist_requests (user_discord_id, mc_username, mod_name, filename, hash_sha1, reason, project_url, status)
     SELECT ?, ?, ?, ?, ?, ?, ?, 'pending'
     WHERE NOT EXISTS (SELECT 1 FROM mod_whitelist_requests WHERE user_discord_id IS ? AND hash_sha1 = ? AND status = 'pending')`,
    [req.user_discord_id || null, req.mc_username || 'Player', req.mod_name, req.filename, hash,
      req.reason || 'Запрос от игрока', req.project_url || null, req.user_discord_id || null, hash]
  );
  return (await dbGet<{ id: number; status: string }>(
    "SELECT id, status FROM mod_whitelist_requests WHERE user_discord_id IS ? AND hash_sha1 = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
    [req.user_discord_id || null, hash]
  ))!;
}

export async function getWhitelistRequests(): Promise<any[]> {
  return dbAll('SELECT * FROM mod_whitelist_requests ORDER BY id DESC');
}

export async function reviewWhitelistRequest(id: number, status: 'approved' | 'rejected', reviewer: string, reason: string) {
  const update = await dbRun(
    "UPDATE mod_whitelist_requests SET status = ?, reviewer_discord_id = ?, decision_reason = ?, reviewed_at = CURRENT_TIMESTAMP, review_sequence = (SELECT COALESCE(MAX(review_sequence), 0) + 1 FROM mod_whitelist_requests) WHERE id = ? AND status = 'pending'",
    [status, reviewer, reason, id]
  );
  const request = await dbGet<any>('SELECT * FROM mod_whitelist_requests WHERE id = ?', [id]);
  if (!request) return { code: 404, error: 'Заявка не найдена' };
  if (!update.changes && request.status !== status) return { code: 409, error: 'Заявка уже рассмотрена', request };
  // Same-decision retries return the original reviewer and timestamp unchanged.
  return { code: 200, request };
}
