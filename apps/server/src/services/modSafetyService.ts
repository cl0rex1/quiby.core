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
  'speed',
  'killaura',
  'freecam',
  'baritone',
  'meteor',
  'wurst',
  'bleachhack',
  'aristois',
  'seedcracker',
  'autoclicker',
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

  // 2. Check if approved in manual whitelist requests
  const wlRequest = await dbGet<any>(
    'SELECT * FROM mod_whitelist_requests WHERE hash_sha1 = ? AND status = "approved"',
    [normalizedHash]
  );

  if (wlRequest) {
    // Cache approved whitelist result
    await dbRun(
      `INSERT OR REPLACE INTO verified_mods (hash_sha1, mod_id, name, summary, source, is_allowed, status, reason, categories_json)
       VALUES (?, ?, ?, ?, ?, 1, 'approved', ?, '["whitelist"]')`,
      [normalizedHash, 'whitelist-mod', name, 'Approved via Admin Whitelist', 'whitelist', 'Одобрен администрацией сервера']
    );

    return {
      hashSha1: normalizedHash,
      name,
      filename,
      isAllowed: true,
      status: 'approved',
      source: 'whitelist',
      reason: 'Одобрен администрацией сервера',
      categories: ['whitelist'],
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

/**
 * Submits a player request to whitelist an unverified custom mod.
 */
export async function submitWhitelistRequest(req: {
  user_discord_id?: string;
  mc_username?: string;
  mod_name: string;
  filename: string;
  hash_sha1: string;
  reason?: string;
}): Promise<void> {
  const normalizedHash = req.hash_sha1.toLowerCase().trim();
  await dbRun(
    `INSERT INTO mod_whitelist_requests (user_discord_id, mc_username, mod_name, filename, hash_sha1, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      req.user_discord_id || null,
      req.mc_username || 'Player',
      req.mod_name,
      req.filename,
      normalizedHash,
      req.reason || 'Запрос от игрока через лаунчер',
    ]
  );
}

/**
 * Retrieves all pending whitelist requests.
 */
export async function getWhitelistRequests(): Promise<any[]> {
  return dbAll('SELECT * FROM mod_whitelist_requests ORDER BY created_at DESC');
}
