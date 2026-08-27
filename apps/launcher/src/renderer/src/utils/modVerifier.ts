// Mod Anti-Cheat & Safety Verification Client

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

// Longest / most specific keywords first to avoid premature generic matches
export const CHEAT_KEYWORDS = [
  'liquidbounce',
  'cheststealer',
  'auto-clicker',
  'autoclicker',
  'seedcracker',
  'cavefinder',
  'orefinder',
  'bleachhack',
  'duplication',
  'speedhack',
  'auto-fish',
  'kill-aura',
  'aristois',
  'baritone',
  'killaura',
  'autofish',
  'freecam',
  'flyhack',
  'griefing',
  'meteor',
  'cheats',
  'aimbot',
  'inertia',
  'impact',
  'x-ray',
  'x_ray',
  'cheat',
  'hacks',
  'grief',
  'wurst',
  'nuker',
  'xray',
  'hack',
  'dupe',
  'bot',
  'esp',
];

// Malware, Trojan, and Infostealer signatures
export const MALWARE_KEYWORDS = [
  'fractureiser',
  'necros',
  'token-grabber',
  'tokengrabber',
  'discord-stealer',
  'discordstealer',
  'infostealer',
  'stealer',
  'redline',
  'skyrage',
  'kurium',
  'rat',
  'trojan',
  'backdoor',
  'payload',
  'ransomware',
  'keylogger',
];

/**
 * Fast client-side scan for cheat keywords in filename or mod title.
 */
export function quickScanForCheatSignatures(filename: string, name: string): { isCheat: boolean; signature?: string } {
  const lower = (filename + ' ' + name).toLowerCase();
  for (const kw of CHEAT_KEYWORDS) {
    if (lower.includes(kw)) {
      return { isCheat: true, signature: kw };
    }
  }
  return { isCheat: false };
}

/**
 * Scans a file or metadata for known malware, token grabbers, or suspicious byte patterns.
 */
export async function scanFileForMalware(
  file?: File | null,
  filename?: string,
  name?: string
): Promise<{ isSafe: boolean; threat?: string; details?: string }> {
  const targetStr = ((filename || '') + ' ' + (name || '')).toLowerCase();

  // 1. Check filename against known malware signatures
  for (const kw of MALWARE_KEYWORDS) {
    if (targetStr.includes(kw)) {
      return {
        isSafe: false,
        threat: kw,
        details: `Обнаружена сигнатура вредоносного ПО (${kw}). Заявка отклонена для защиты модераторов.`,
      };
    }
  }

  // 2. Scan binary header / sample if File object is present
  if (file && file.size < 60 * 1024 * 1024) {
    try {
      const buffer = await file.slice(0, 1024 * 256).arrayBuffer(); // First 256KB
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const sample = textDecoder.decode(buffer).toLowerCase();

      const dangerousPatterns = [
        { key: 'webhook_grabber', pattern: 'discord.com/api/webhooks' },
        { key: 'fractureiser_stage', pattern: 'files.skyrage.de' },
        { key: 'payload_downloader', pattern: 'powershell -encodedcommand' },
        { key: 'stealer_exec', pattern: 'cmd.exe /c start /b' },
      ];

      for (const p of dangerousPatterns) {
        if (sample.includes(p.pattern)) {
          return {
            isSafe: false,
            threat: p.key,
            details: `Внутри файла обнаружен потенциально опасный код (${p.key}). Отправка запрещена.`,
          };
        }
      }
    } catch (_) {}
  }

  return { isSafe: true };
}

/**
 * Computes SHA-1 hash of a File object using browser Web Cryptography API.
 */
export async function computeFileSha1(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-1', buffer);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a single custom mod against backend anti-cheat service and Modrinth.
 */
export async function verifyCustomMod(
  file: File,
  serverUrl = 'http://localhost:3001'
): Promise<ModVerificationResult> {
  const hashSha1 = await computeFileSha1(file);
  const rawName = file.name.replace('.jar', '');

  // 1. Fast client-side cheat signature check
  const localScan = quickScanForCheatSignatures(file.name, rawName);
  if (localScan.isCheat) {
    return {
      hashSha1,
      name: rawName,
      filename: file.name,
      isAllowed: false,
      status: 'blocked',
      source: 'none',
      reason: `Запрещен античитом: обнаружена сигнатура читов (${localScan.signature})`,
      categories: ['cheat', localScan.signature!],
    };
  }

  // 2. Server-side verification & Modrinth catalog lookup
  try {
    const res = await fetch(`${serverUrl}/api/mods/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mods: [
          {
            name: rawName,
            filename: file.name,
            hash_sha1: hashSha1,
            size: file.size,
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results[0]) {
        return data.results[0];
      }
    }
  } catch (e) {
    console.warn('Backend mod verification unreachable:', e);
  }

  // Fallback unverified status
  return {
    hashSha1,
    name: rawName,
    filename: file.name,
    isAllowed: false,
    status: 'unverified',
    source: 'none',
    reason: 'Мод не найден в каталоге Modrinth. Доступен запрос доступа.',
    categories: ['unverified'],
  };
}

/**
 * Submits an unverified mod to the server whitelist queue and Discord bot channel.
 */
export async function submitModWhitelistRequest(
  mod: { name: string; filename: string; hashSha1: string },
  session: any,
  serverUrl = 'http://localhost:3001',
  extra?: { mc_username?: string; reason?: string; project_url?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${serverUrl}/api/mods/whitelist-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_discord_id: session?.user?.discordId,
        mc_username: extra?.mc_username || session?.user?.mcUsername || 'Player',
        mod_name: mod.name,
        filename: mod.filename,
        hash_sha1: mod.hashSha1,
        reason: extra?.reason || 'Запрос от игрока через форму лаунчера',
        project_url: extra?.project_url,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      message: errData.error || 'Ошибка при отправке заявки',
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Не удалось связаться с сервером',
    };
  }
}
