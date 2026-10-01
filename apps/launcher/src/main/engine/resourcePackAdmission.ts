import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { checkContentLinks } from './contentIntegrity';

export async function packHash(file: string, algorithm = 'sha1'): Promise<string> {
  const hash = createHash(algorithm);
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return hash.digest('hex');
}

export async function packDecision(hash: string, token: string, server: string) {
  const response = await fetch(`${server}/api/mods/resourcepacks/verify`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash_sha1: hash }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Не удалось проверить допуск ресурспака: ' + response.status);
  return response.json() as Promise<{ status: string; isAllowed: boolean; reason: string }>;
}

export async function prepareResourcePackAdmission(gameDir: string, files: { path: string; sha256: string }[], token: string, server: string) {
  await checkContentLinks(gameDir);
  const official = new Set(files.filter(file => file.path.startsWith('resourcepacks/')).map(file => file.path.slice(14)));
  const approved = new Map<string, string>();
  const hashes = files.filter(file => file.path.startsWith('resourcepacks/')).map(file => file.sha256.toLowerCase());
  const root = path.join(gameDir, 'resourcepacks');
  await fs.mkdir(root, { recursive: true });
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.zip$/i.test(entry.name) || official.has(entry.name)) continue;
    const file = path.join(root, entry.name);
    const sha1 = await packHash(file);
    const decision = await packDecision(sha1, token, server);
    if (!decision.isAllowed) throw new Error(`Ресурспак ${entry.name}: ${decision.reason}. Подайте заявку во вкладке «Ресурспаки».`);
    const sha256 = await packHash(file, 'sha256');
    if (await packHash(file) !== sha1) throw new Error(`Ресурспак ${entry.name} изменился во время проверки`);
    approved.set(entry.name, sha256);
    hashes.push(sha256);
  }
  return { approved, hashes: [...new Set(hashes)] };
}
