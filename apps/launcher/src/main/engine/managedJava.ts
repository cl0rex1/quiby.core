import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { getJavaVersion } from './javaDetector';

const run = promisify(execFile);
export type JavaProgress = (label: string, downloaded: number, total: number) => void;
const installs = new Map<string, Promise<string>>();

export function managedJavaPath(runtimeRoot: string): string {
  const home = path.resolve(runtimeRoot, `java21-${process.platform}-${process.arch}`, 'home');
  return path.join(home, process.platform === 'darwin' ? 'Contents/Home/bin/java' : process.platform === 'win32' ? 'bin/java.exe' : 'bin/java');
}

export function installJava21(runtimeRoot: string, progress: JavaProgress = () => {}): Promise<string> {
  const root = path.resolve(runtimeRoot);
  const existing = installs.get(root);
  if (existing) return existing;
  const installation = downloadRuntime(root, progress).finally(() => installs.delete(root));
  installs.set(root, installation);
  return installation;
}

async function downloadRuntime(root: string, progress: JavaProgress): Promise<string> {
  const systems: Partial<Record<NodeJS.Platform, string>> = { win32: 'windows', linux: 'linux', darwin: 'mac' };
  const architectures: Partial<Record<NodeJS.Architecture, string>> = { x64: 'x64', arm64: 'aarch64' };
  const os = systems[process.platform];
  const arch = architectures[process.arch];
  if (!os || !arch) throw new Error('Автоматическая установка Java поддерживает Windows, Linux и macOS (x64/ARM64).');
  progress('Поиск Java 21…', 0, 0);
  const response = await fetch(`https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=${arch}&image_type=jre&os=${os}&vendor=eclipse`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Не удалось найти Java 21: HTTP ${response.status}`);
  const releases = await response.json() as Array<{ binary: { package: { link: string; checksum: string; size: number } } }>;
  const pkg = releases[0]?.binary?.package;
  if (!pkg || !/^https:\/\//.test(pkg.link) || !/^[a-f0-9]{64}$/i.test(pkg.checksum) || !(pkg.size > 0)) {
    throw new Error('Сервис Java вернул некорректные данные загрузки.');
  }
  await fs.mkdir(root, { recursive: true });
  const staging = await fs.mkdtemp(path.join(root, '.java21-install-'));
  const executable = managedJavaPath(root);
  const destination = path.join(root, `java21-${process.platform}-${process.arch}`);
  try {
    const archive = path.join(staging, os === 'windows' ? 'runtime.zip' : 'runtime.tar.gz');
    const unpacked = path.join(staging, 'unpacked');
    await fs.mkdir(unpacked);
    progress('Скачивание Java 21…', 0, pkg.size);
    const download = await fetch(pkg.link, { signal: AbortSignal.timeout(10 * 60 * 1000) });
    if (!download.ok || !download.body) throw new Error(`Не удалось скачать Java 21: HTTP ${download.status}`);
    const hash = crypto.createHash('sha256');
    let bytes = 0;
    let lastUpdate = 0;
    await pipeline(Readable.fromWeb(download.body as any), new Transform({
      transform(chunk, _encoding, callback) {
        hash.update(chunk);
        bytes += chunk.length;
        if (Date.now() - lastUpdate > 150) {
          progress('Скачивание Java 21…', bytes, pkg.size);
          lastUpdate = Date.now();
        }
        callback(null, chunk);
      },
    }), createWriteStream(archive));
    if (bytes !== pkg.size || hash.digest('hex') !== pkg.checksum.toLowerCase()) throw new Error('Проверка Java 21 не пройдена: повреждённый архив. Повторите запуск.');
    progress('Распаковка Java 21…', bytes, pkg.size);
    await run('tar', ['-xf', archive, '-C', unpacked], { windowsHide: true, timeout: 120000 });
    const entries = await fs.readdir(unpacked, { withFileTypes: true });
    const home = entries.find(entry => entry.isDirectory());
    if (!home || entries.filter(entry => entry.isDirectory()).length !== 1) throw new Error('Неожиданная структура архива Java.');
    const extractedHome = path.join(unpacked, home.name);
    const relativeBin = path.relative(path.join(destination, 'home'), executable);
    const version = await getJavaVersion(path.join(extractedHome, relativeBin));
    if (version?.major !== 21 || !version.is64Bit) throw new Error('Скачанная Java 21 не запускается или не является 64-битной.');
    // Only this managed runtime directory can be replaced; system Java is untouched.
    if (path.dirname(destination) !== root || !path.basename(destination).startsWith('java21-')) throw new Error('Недопустимая папка Java.');
    await fs.rm(destination, { recursive: true, force: true });
    await fs.mkdir(destination, { recursive: true });
    await fs.rename(extractedHome, path.join(destination, 'home'));
    progress('Java 21 готова', bytes, pkg.size);
    return executable;
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
}
