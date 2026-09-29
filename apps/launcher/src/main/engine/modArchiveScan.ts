import { fromBuffer, Entry, ZipFile } from 'yauzl';

export interface ArchiveScan { complete: boolean; findings: string[]; metadata: string }
const suspicious = /(?:killaura|kill[-_ ]aura|x[-_ ]?ray|freecam|flyhack|speedhack|cheststealer|seedcracker|baritone|meteorclient|wurstclient|liquidbounce|bleachhack|aimbot|nuker|autoclicker|fractureiser|tokengrabber|token[-_ ]grabber|infostealer|keylogger|files\.skyrage\.de|powershell\s+-encodedcommand)/i;

/** Bounded inspection only: never extract files to disk or execute Java/native code. */
export async function scanModArchive(bytes: Buffer): Promise<ArchiveScan> {
  const result: ArchiveScan = { complete: true, findings: [], metadata: '' };
  let count = 0, expanded = 0, hasMetadata = false;
  const deadline = Date.now() + 15000;
  const note = (value: string) => { if (result.findings.length < 12 && !result.findings.includes(value)) result.findings.push(value); };
  const inspect = async (buffer: Buffer, depth: number, prefix: string): Promise<void> => {
    if (depth > 3 || buffer.length > 100 * 1024 * 1024) throw new Error('Превышен предел вложенности или размера JAR');
    const zip = await new Promise<ZipFile>((resolve, reject) => fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, value) => error ? reject(error) : resolve(value)));
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => { if (settled) return; settled = true; clearTimeout(timer); zip.close(); error ? reject(error) : resolve(); };
      const timer = setTimeout(() => finish(new Error('Превышено время проверки JAR')), Math.max(1, deadline - Date.now()));
      const names = new Set<string>();
      zip.on('error', finish);
      zip.on('end', () => finish());
      zip.on('entry', (entry: Entry) => {
        void (async () => {
          if (settled) return;
          if (++count > 30000 || Date.now() > deadline) throw new Error('Превышен лимит проверки JAR');
          const name = entry.fileName;
          if (names.has(name.toLowerCase())) throw new Error('Дублирующийся путь внутри JAR');
          names.add(name.toLowerCase());
          if (entry.generalPurposeBitFlag & 1) throw new Error('Зашифрованное содержимое JAR');
          if (suspicious.test(name)) note(`Подозрительный путь: ${prefix}${name}`.slice(0, 250));
          if (/\.(dll|so|dylib|exe)$/i.test(name)) note('Вложенный исполняемый или нативный файл');
          if (name.endsWith('/')) { zip.readEntry(); return; }
          const metadata = /^(META-INF\/(neoforge\.mods|mods)\.toml|fabric\.mod\.json|quilt\.mod\.json|mcmod\.info)$/i.test(name);
          if (depth === 0 && metadata) hasMetadata = true;
          const nested = /\.jar$/i.test(name);
          const readable = nested || /\.(class|json|toml|mf|txt|properties|cfg|xml|yml|yaml)$/i.test(name);
          if (!readable) { zip.readEntry(); return; }
          const limit = nested ? 32 * 1024 * 1024 : 8 * 1024 * 1024;
          if (entry.uncompressedSize > limit || expanded + entry.uncompressedSize > 256 * 1024 * 1024) throw new Error('Превышен размер распакованного содержимого');
          const stream = await new Promise<NodeJS.ReadableStream>((res, rej) => zip.openReadStream(entry, (err, value) => err ? rej(err) : res(value)));
          const chunks: Buffer[] = []; let size = 0;
          for await (const chunk of stream) {
            const part = Buffer.from(chunk); size += part.length; expanded += part.length;
            if (settled || size > limit || expanded > 256 * 1024 * 1024) throw new Error('Превышен размер проверки');
            chunks.push(part);
          }
          const data = Buffer.concat(chunks);
          if (nested) await inspect(data, depth + 1, `${prefix}${name}!/`);
          else {
            const text = data.toString('utf8');
            const match = text.match(suspicious);
            if (match) note(`Признак ${match[0]} в ${prefix}${name}`.slice(0, 250));
            if (metadata && depth === 0) result.metadata += text.slice(0, 16000 - result.metadata.length);
          }
          if (!settled) zip.readEntry();
        })().catch(error => finish(error instanceof Error ? error : new Error(String(error))));
      });
      zip.readEntry();
    });
  };
  try { await inspect(bytes, 0, ''); if (!hasMetadata) note('Не найдены стандартные метаданные мода'); }
  catch (error) { result.complete = false; note(error instanceof Error ? error.message : 'Некорректный JAR'); }
  return result;
}
