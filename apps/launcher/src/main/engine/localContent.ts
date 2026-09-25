import fs from 'fs';
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
export async function listLocalContent(gameDir: string, kind: ContentKind) {
  const dir = contentDirectory(gameDir, kind);
  await fs.promises.mkdir(dir, { recursive: true });
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = entries.filter(
    (entry) =>
      (entry.isFile() && extensions[kind].test(entry.name)) ||
      (kind === 'shaderpacks' && entry.isDirectory()),
  );
  return Promise.all(
    files.map(async (entry) => {
      const stat = await fs.promises.stat(path.join(dir, entry.name));
      return {
        name: entry.name.replace(/\.(zip|nbt|schem|schematic)$/i, '').replace(/_/g, ' '),
        filename: entry.name,
        size: stat.size,
        isDirectory: entry.isDirectory(),
        updatedAt: stat.mtimeMs,
      };
    }),
  );
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
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
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
