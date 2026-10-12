import fs from 'node:fs/promises';
import { readPackIcon } from './packIcon';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { checkContentLinks } from './contentIntegrity';
import { packDecision } from './resourcePackAdmission';

export type ResourcePackItem = {
  iconUrl?: string; filename: string; size: number; updatedAt: number; hashSha1?: string;
  official: boolean; status: string; isAllowed: boolean; reason: string;
};
type Digests = { stamp: string; sha1: string; sha256: string };
// Display cache only. Launch admission always re-hashes the actual files independently.
const digests = new Map<string, Digests>();
const stamp = (stat: { size: number; mtimeMs: number; ctimeMs: number }) => `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;

export async function resourcePackInventory(gameDir: string): Promise<ResourcePackItem[]> {
  await checkContentLinks(gameDir);
  const root = path.join(gameDir, 'resourcepacks');
  await fs.mkdir(root, { recursive: true });
  const entries = await fs.readdir(root, { withFileTypes: true });
  const items = await Promise.all(entries.filter(entry => entry.isFile() && /\.zip$/i.test(entry.name)).map(async entry => {
    const stat = await fs.lstat(path.join(root, entry.name)).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (!stat) return null;
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 512 * 1024 * 1024) return null;
    return { filename: entry.name, size: stat.size, updatedAt: stat.mtimeMs, official: false, status: 'checking', isAllowed: false, reason: 'Проверяем файл и допуск…' };
  }));
  const result = items.filter((item): item is ResourcePackItem => item !== null).sort((a, b) => a.filename.localeCompare(b.filename, 'ru'));
  for (let start = 0; start < result.length; start += 4) {
    await Promise.all(result.slice(start, start + 4).map(async item => { item.iconUrl = await readPackIcon(path.join(root, item.filename)); }));
  }
  return result;
}

async function catalogHashes(filename: string): Promise<Digests> {
  const before = await fs.lstat(filename);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error('Файл ресурспака недоступен');
  const cached = digests.get(filename);
  if (cached?.stamp === stamp(before)) return cached;
  const sha1 = createHash('sha1'), sha256 = createHash('sha256');
  for await (const bytes of createReadStream(filename)) { sha1.update(bytes); sha256.update(bytes); }
  const after = await fs.lstat(filename);
  if (stamp(before) !== stamp(after) || !after.isFile() || after.isSymbolicLink()) throw new Error('Ресурспак изменился во время проверки. Обновите список.');
  const result = { stamp: stamp(after), sha1: sha1.digest('hex'), sha256: sha256.digest('hex') };
  if (digests.size >= 256) digests.delete(digests.keys().next().value!);
  digests.set(filename, result);
  return result;
}

export async function resourcePackCatalog(gameDir: string, files: { path: string; sha256: string }[], token: string, server: string): Promise<ResourcePackItem[]> {
  const items = await resourcePackInventory(gameDir);
  const official = new Map(files.filter(file => file.path.replace(/\\/g, '/').startsWith('resourcepacks/')).map(file => [file.path.replace(/\\/g, '/'), file.sha256.toLowerCase()]));
  const decisions = new Map<string, ReturnType<typeof packDecision>>();
  const result: ResourcePackItem[] = [];
  for (let start = 0; start < items.length; start += 4) {
    result.push(...await Promise.all(items.slice(start, start + 4).map(async item => {
      try {
        const hash = await catalogHashes(path.join(gameDir, 'resourcepacks', item.filename));
        const trusted = official.get(`resourcepacks/${item.filename}`) === hash.sha256;
        if (trusted) return { ...item, hashSha1: hash.sha1, official: true, status: 'approved', isAllowed: true, reason: 'Ресурспак сборки' };
        if (!decisions.has(hash.sha1)) decisions.set(hash.sha1, packDecision(hash.sha1, token, server));
        return { ...item, hashSha1: hash.sha1, ...await decisions.get(hash.sha1)! };
      } catch (error) {
        return { ...item, status: 'error', reason: error instanceof Error ? error.message : 'Не удалось проверить ресурспак' };
      }
    })));
  }
  return result;
}
