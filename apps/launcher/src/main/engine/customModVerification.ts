import { scanModArchive, ArchiveScan } from './modArchiveScan';
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
  serverUrl: string,
  bytes?: Buffer
): Promise<void> {
  if (bytes) {
    const result = await evaluateCustomMod(filename, bytes, serverUrl);
    if (result.hashSha1 !== hashSha1 || !result.isAllowed) throw new Error(result.reason);
    return;
  }
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

const scanCache = new Map<string, Promise<ArchiveScan>>();

export async function evaluateCustomMod(filename: string, bytes: Buffer, serverUrl: string) {
  const hashSha1 = hashCustomModBytes(bytes);
  const cacheKey = createHash('sha256').update(bytes).digest('hex');
  if (!scanCache.has(cacheKey)) {
    if (scanCache.size >= 64) scanCache.delete(scanCache.keys().next().value!);
    scanCache.set(cacheKey, scanModArchive(bytes));
  }
  const scan = await scanCache.get(cacheKey)!;
  if (!scan.complete) scanCache.delete(cacheKey);
  if (scan.blocked) return { hashSha1, isAllowed: false, status: 'blocked', source: 'none',
    reason: scan.findings.join('; '), scanFindings: scan.findings };
  const response = await fetch(`${serverUrl.replace(/\/$/, '')}/api/mods/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mods: [{ name: filename.slice(0, -4).slice(0,100), filename, hash_sha1: hashSha1 }] }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Сервер проверки недоступен: ' + response.status);
  const result = (await response.json()).results?.[0];
  if (!result || result.hashSha1?.toLowerCase() !== hashSha1) throw new Error('Некорректный ответ проверки мода');
  if (result.status === 'blocked') return { ...result, hashSha1, isAllowed: false };
  const manual = result.source === 'whitelist' && result.status === 'approved' && result.isAllowed === true;
  const allowed = scan.complete && (manual || scan.findings.length === 0);
  return { ...result, hashSha1, isAllowed: allowed, status: allowed ? 'approved' : 'unverified',
    reason: allowed ? (manual ? result.reason : 'Автопроверка JAR пройдена: метаданные, пути, классы и вложенные архивы; известных признаков не найдено.')
      : 'Нужна ручная проверка: ' + scan.findings.join('; '),
    scanFindings: scan.findings };
}
