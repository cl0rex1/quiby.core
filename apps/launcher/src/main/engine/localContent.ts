import fs from 'fs';
import { readPackIcon } from './packIcon';
import path from 'path';

export type ContentKind = 'shaderpacks' | 'schematics';
const extensions = { shaderpacks: /\.zip$/i, schematics: /\.(nbt|schem|schematic)$/i };
export function contentDirectory(gameDir: string, kind: ContentKind): string {
  if (kind !== 'shaderpacks' && kind !== 'schematics') throw new Error('Неизвестный тип контента');
  return path.join(gameDir, kind);
}
export function contentFilePath(gameDir: string, kind: ContentKind, filename: string): string {
  if (!filename || filename === '.' || filename === '..' || /[\\/:\x00]/.test(filename))
    throw new Error('Недопустимое имя файла');
  return path.join(contentDirectory(gameDir, kind), filename);
}
async function checkedDirectory(gameDir: string, kind: ContentKind) {
  const dir = contentDirectory(gameDir, kind);
  await fs.promises.mkdir(dir, { recursive: true });
  const stat = await fs.promises.lstat(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Папка ${kind} не должна быть ссылкой.`);
  return dir;
}
export async function checkedContentFilePath(gameDir: string, kind: ContentKind, filename: string) {
  const target = contentFilePath(gameDir, kind, filename);
  await checkedDirectory(gameDir, kind);
  return target;
}
export async function listLocalContent(gameDir: string, kind: ContentKind) {
  const dir = await checkedDirectory(gameDir, kind);
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = entries.filter(
    (entry) =>
      (entry.isFile() && extensions[kind].test(entry.name)) ||
      (kind === 'shaderpacks' && entry.isDirectory()),
  );
  const items = await Promise.all(
    files.map(async (entry) => {
      const stat = await fs.promises.lstat(path.join(dir, entry.name)).catch(error => {
        if (error.code === 'ENOENT') return null; // An external deletion must not hide the whole library.
        throw error;
      });
      if (!stat || stat.isSymbolicLink()) return null;
      return {
        name: entry.name.replace(/\.(zip|nbt|schem|schematic)$/i, '').replace(/_/g, ' '),
        filename: entry.name,
        size: stat.size,
        isDirectory: entry.isDirectory(),
        updatedAt: stat.mtimeMs,
      };
    }),
  );
  const result = items.filter((item): item is NonNullable<typeof item> => item !== null);
  if (kind !== 'shaderpacks') return result;
  const decorated: (typeof result[number] & { iconUrl?: string })[] = [];
  for (let start = 0; start < result.length; start += 4) {
    decorated.push(...await Promise.all(result.slice(start, start + 4).map(async item => ({ ...item, iconUrl: await readPackIcon(path.join(dir, item.filename)) }))));
  }
  return decorated;
}
export async function installLocalContent(
  gameDir: string,
  kind: ContentKind,
  filename: string,
  bytes: Uint8Array,
) {
  const target = contentFilePath(gameDir, kind, filename);
  if (!extensions[kind].test(filename) || !bytes?.length || bytes.length > 100 * 1024 * 1024)
    throw new Error('Нужен поддерживаемый файл размером до 100 МБ');
  await checkedDirectory(gameDir, kind);
  let handle: fs.promises.FileHandle;
  try {
    handle = await fs.promises.open(target, 'wx');
  } catch (error: any) {
    if (error.code === 'EEXIST') throw new Error(`Файл ${filename} уже есть. Сначала удалите старую версию.`);
    throw error;
  }
  try {
    await handle.writeFile(bytes);
  } catch (error) {
    await handle.close();
    await fs.promises.unlink(target);
    throw error;
  }
  await handle.close();
}
