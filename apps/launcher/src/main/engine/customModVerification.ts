import { createHash } from 'crypto';
import { createReadStream } from 'fs';

export function hashCustomModBytes(bytes: Uint8Array): string {
  return createHash('sha1').update(bytes).digest('hex');
}

export async function hashCustomModFile(filePath: string): Promise<string> {
  const hash = createHash('sha1');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

export async function requireApprovedCustomMod(
  filename: string,
  hashSha1: string,
  size: number,
  serverUrl: string
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${serverUrl.replace(/\/$/, '')}/api/mods/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mods: [{ name: filename.slice(0, -4), filename, hash_sha1: hashSha1, size }] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new Error(`Не удалось проверить мод ${filename}: сервер проверки недоступен`);
  }

  if (!response.ok) throw new Error(`Не удалось проверить мод ${filename}: ответ сервера ${response.status}`);

  let result: { hashSha1?: string; status?: string; isAllowed?: boolean; reason?: string; source?: string } | undefined;
  try {
    const data = await response.json();
    result = data.results?.[0];
  } catch {
    throw new Error(`Не удалось проверить мод ${filename}: некорректный ответ сервера`);
  }

  if (typeof result?.hashSha1 !== 'string' || result.hashSha1.toLowerCase() !== hashSha1.toLowerCase()) {
    throw new Error(`Не удалось проверить мод ${filename}: хеш в ответе не совпадает с файлом`);
  }
  if (result?.status !== 'approved' || result.isAllowed !== true) {
    throw new Error(`Мод ${filename} не разрешён: ${result?.reason || 'нет одобрения сервера'}`);
  }
  if (result.source !== 'whitelist') {
    throw new Error(`Мод ${filename} требует одобрения администрации. Наличие в Modrinth не является проверкой на читы; подайте заявку в вайтлист.`);
  }
}
