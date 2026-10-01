import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

type ManagedFile = { path: string; sha256: string };

export async function checkContentLinks(gameDir: string): Promise<void> {
  for (const directory of ['mods', 'resourcepacks']) {
    const root = path.join(gameDir, directory);
    const stat = await fs.lstat(root).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (!stat) continue;
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Недопустимая ссылка или папка: ${directory}`);
    for (const entry of await fs.readdir(root, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error(`Недопустимая ссылка: ${directory}/${entry.name}`);
    }
  }
}

async function digest(filename: string, algorithm: string): Promise<string> {
  const hash = createHash(algorithm);
  for await (const bytes of createReadStream(filename)) hash.update(bytes);
  return hash.digest('hex');
}

/** File admission, not a claim that arbitrary Java bytecode or textures can be proven safe. */
export async function verifyLaunchContent(
  gameDir: string, files: ManagedFile[], approvedMods: ReadonlyMap<string, string>, approvedPacks: ReadonlyMap<string, string> = new Map(),
  directories: readonly ('mods' | 'resourcepacks')[] = ['mods', 'resourcepacks'],
): Promise<void> {
  const expected = new Map(files.map(file => [file.path.replace(/\\/g, '/'), file.sha256.toLowerCase()]));
  for (const relative of expected.keys()) {
    if (directories.includes(relative.split('/')[0] as 'mods' | 'resourcepacks') && /^(mods\/[^/]+\.jar|resourcepacks\/[^/]+\.zip)$/i.test(relative)) {
      const stat = await fs.lstat(path.join(gameDir, relative)).catch(() => null);
      if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error(`Отсутствует обычный файл сборки: ${relative}`);
    }
  }
  for (const directory of directories) {
    const root = path.join(gameDir, directory);
    const rootStat = await fs.lstat(root).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!rootStat) continue;
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error(`Проверка безопасности: ${directory} должна быть обычной папкой, без ссылок.`);
    for (const entry of await fs.readdir(root, { withFileTypes: true })) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink() || entry.isDirectory()) {
        throw new Error(`Проверка безопасности: ${relative} — ссылка или распакованная папка. Переместите её за пределы ${directory}. Допускаются только проверенные файлы.`);
      }
      const relevant = directory === 'mods' ? /\.jar$/i.test(entry.name) : /\.zip$/i.test(entry.name);
      if (!relevant) continue;
      if (!entry.isFile()) throw new Error(`Недопустимый файл: ${relative}`);
      const filename = path.join(root, entry.name);
      const officialHash = expected.get(relative);
      if (officialHash) {
        if (await digest(filename, 'sha256') !== officialHash) throw new Error(`Файл сборки изменён: ${relative}. Повторите проверку сборки.`);
      } else if (directory === 'resourcepacks' && approvedPacks.has(entry.name)) {
        if (await digest(filename, 'sha256') !== approvedPacks.get(entry.name)) throw new Error(`Ресурспак изменён после одобрения: ${entry.name}`);
      } else if (directory === 'mods' && approvedMods.has(entry.name)) {
        if (await digest(filename, 'sha1') !== approvedMods.get(entry.name)) throw new Error(`Мод изменён после одобрения: ${entry.name}. Требуется новая проверка.`);
      } else {
        throw new Error(directory === 'resourcepacks'
          ? `Ресурспак ${entry.name} не входит в проверенную сборку. Переместите его из resourcepacks и передайте администрации для проверки. Переименование не даёт допуска.`
          : `Мод ${entry.name} не одобрен. Добавьте его через вкладку модов и подайте заявку в вайтлист.`);
      }
    }
  }
}
