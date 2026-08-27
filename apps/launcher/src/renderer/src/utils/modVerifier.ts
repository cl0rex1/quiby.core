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
  try {
    const res = await fetch(`${serverUrl}/api/mods/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mods: [
          {
            name: file.name.replace('.jar', ''),
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
    name: file.name.replace('.jar', ''),
    filename: file.name,
    isAllowed: false,
    status: 'unverified',
    source: 'none',
    reason: 'Мод ожидает проверки в вайтлисте или не найден на Modrinth',
    categories: ['unverified'],
  };
}

/**
 * Submits an unverified mod to the server whitelist queue.
 */
export async function submitModWhitelistRequest(
  mod: { name: string; filename: string; hashSha1: string },
  session: any,
  reason?: string,
  serverUrl = 'http://localhost:3001'
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${serverUrl}/api/mods/whitelist-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_discord_id: session?.user?.discordId,
        mc_username: session?.user?.mcUsername || 'Player',
        mod_name: mod.name,
        filename: mod.filename,
        hash_sha1: mod.hashSha1,
        reason: reason || 'Запрос от игрока через интерфейс модов лаунчера',
      }),
      signal: AbortSignal.timeout(6000),
    });

    return await res.json();
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Не удалось связаться с сервером',
    };
  }
}
