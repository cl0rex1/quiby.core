import fs from 'node:fs/promises';
import path from 'node:path';
import { open, type Entry } from 'yauzl';

const LIMIT = 512 * 1024;
const cache = new Map<string, { stamp: string; icon: string | undefined }>();
const pending = new Map<string, Promise<string | undefined>>();

function pngIcon(bytes: Buffer): string | undefined {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return;
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height || width > 1024 || height > 1024) return;
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function archiveIcon(filename: string): Promise<string | undefined> {
  return new Promise(resolve => {
    open(filename, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) { resolve(undefined); return; }
      let done = false, count = 0;
      let stream: import('node:stream').Readable | undefined;
      const finish = (icon?: string) => {
        if (done) return;
        done = true; clearTimeout(timer); stream?.destroy(); zip.close(); resolve(icon);
      };
      const timer = setTimeout(() => finish(), 1500);
      zip.on('error', () => finish()); zip.on('end', () => finish());
      zip.on('entry', (entry: Entry) => {
        if (done) return;
        if (++count > 10000) { finish(); return; }
        if (!/^(?:pack|shaders\/pack)\.png$/i.test(entry.fileName)) { zip.readEntry(); return; }
        if (entry.uncompressedSize > LIMIT || (entry.generalPurposeBitFlag & 1)) { finish(); return; }
        zip.openReadStream(entry, (error, opened) => {
          if (done) { opened?.destroy(); return; }
          if (error || !opened) { finish(); return; }
          stream = opened;
          const chunks: Buffer[] = []; let size = 0;
          opened.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > LIMIT) finish(); else chunks.push(chunk);
          });
          opened.on('error', () => finish());
          opened.on('end', () => { if (!done) finish(pngIcon(Buffer.concat(chunks))); });
        });
      });
      zip.readEntry();
    });
  });
}

/** Optional display metadata, never used for pack admission. No extraction or network requests. */
export async function readPackIcon(filename: string): Promise<string | undefined> {
  const inFlight = pending.get(filename);
  if (inFlight) return inFlight;
  const read = (async () => {
    try {
      const root = await fs.lstat(filename);
      if (root.isSymbolicLink()) return;
      const source = root.isDirectory() ? path.join(filename, 'pack.png') : filename;
      const stat = root.isDirectory() ? await fs.lstat(source) : root;
      if (!stat.isFile() || stat.isSymbolicLink()) return;
      const stamp = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
      if (cache.get(source)?.stamp === stamp) return cache.get(source)?.icon;
      const icon = root.isDirectory()
        ? stat.size <= LIMIT ? pngIcon(await fs.readFile(source)) : undefined
        : await archiveIcon(source);
      if (cache.size >= 32) cache.delete(cache.keys().next().value!);
      cache.set(source, { stamp, icon });
      return icon;
    } catch { return undefined; }
  })();
  pending.set(filename, read);
  try { return await read; } finally { pending.delete(filename); }
}
