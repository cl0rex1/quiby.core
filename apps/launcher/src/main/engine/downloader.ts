import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { DownloadProgress, ModpackFile, ModpackManifest } from '@quiby/shared';
import { BrowserWindow } from 'electron';

export async function computeFileSha256(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) return '';
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => resolve(''));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function downloadFile(url: string, destPath: string, onBytes?: (bytes: number) => void, expectedSha256?: string): Promise<void> {
  const dir = path.dirname(destPath);
  const tempPath = `${destPath}.part`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }

  try {
    if (!res.body) {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(tempPath, buffer);
      onBytes?.(buffer.length);
    } else {
      await pipeline(
        Readable.fromWeb(res.body as any),
        new Transform({ transform(chunk, _encoding, callback) {
          onBytes?.(chunk.length);
          callback(null, chunk);
        } }),
        fs.createWriteStream(tempPath)
      );
    }
    if (expectedSha256 && (await computeFileSha256(tempPath)).toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error(`SHA-256 не совпадает: ${path.basename(destPath)}`);
    }
    fs.renameSync(tempPath, destPath);
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

export async function syncModpackFiles(
  manifest: ModpackManifest,
  gameDir: string,
  serverBaseUrl: string,
  win: BrowserWindow | null,
  protectedModFilenames: Set<string> = new Set()
): Promise<void> {
  const gameRoot = path.resolve(gameDir);
  const safeFilePath = (relativePath: string) => {
    const normalized = relativePath.replace(/\\/g, '/');
    if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.split('/').includes('..')) {
      throw new Error(`Недопустимый путь в манифесте: ${relativePath}`);
    }
    const resolved = path.resolve(gameRoot, normalized);
    if (!resolved.startsWith(gameRoot + path.sep)) throw new Error(`Недопустимый путь в манифесте: ${relativePath}`);
    return resolved;
  };
  for (const file of manifest.files) safeFilePath(file.path);
  const sendProgress = (p: Partial<DownloadProgress>) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('download-progress', {
        stage: 'mods',
        stageLabel: 'Синхронизация модов и конфигураций...',
        currentFile: '',
        filesProcessed: 0,
        totalFiles: manifest.files.length,
        bytesDownloaded: 0,
        totalBytes: manifest.totalSize,
        speedBps: 0,
        progressPercent: 0,
        ...p,
      });
    }
  };

  sendProgress({ stage: 'checking', stageLabel: 'Проверка целостности модов и конфигов...' });

  const filesToDownload: ModpackFile[] = [];
  const validRelativePaths = new Set<string>();

  // Bound disk reads instead of hashing every mod serially or opening hundreds of files.
  const checkFile = async (file: ModpackFile) => {
    validRelativePaths.add(file.path.replace(/\\/g, '/'));
    const localPath = safeFilePath(file.path);

    if (!fs.existsSync(localPath)) {
      filesToDownload.push(file);
    } else if (file.action !== 'keep_local') {
      const localHash = await computeFileSha256(localPath);
      if (localHash.toLowerCase() !== file.sha256.toLowerCase()) {
        filesToDownload.push(file);
      }
    }
  };
  for (let index = 0; index < manifest.files.length; index += 4) {
    await Promise.all(manifest.files.slice(index, index + 4).map(checkFile));
  }

  // Ensure protectedModFilenames includes filename without .disabled
  for (const filename of Array.from(protectedModFilenames)) {
    if (filename.endsWith('.disabled')) {
      protectedModFilenames.add(filename.slice(0, -'.disabled'.length));
    }
  }

  // 2. Clean obsolete mods from local mods/ directory, preserving user's approved custom mods and disabled mods
  const localModsDir = path.join(gameDir, 'mods');
  if (fs.existsSync(localModsDir)) {
    const localModFiles = fs.readdirSync(localModsDir);
    for (const modFile of localModFiles) {
      if (modFile.endsWith('.jar') || modFile.endsWith('.jar.disabled') || modFile.endsWith('.disabled')) {
        const rel = `mods/${modFile}`;
        const cleanName = modFile.endsWith('.disabled') ? modFile.slice(0, -'.disabled'.length) : modFile;
        const cleanRel = `mods/${cleanName}`;

        // If this is a protected user custom mod, preserve it
        if (
          protectedModFilenames.has(modFile) ||
          protectedModFilenames.has(rel) ||
          protectedModFilenames.has(cleanName) ||
          protectedModFilenames.has(cleanRel)
        ) {
          console.log(`Preserving user mod: ${modFile}`);
          continue;
        }

        // Handle .disabled files gracefully (do not delete them as obsolete)
        if (modFile.endsWith('.disabled')) {
          console.log(`Preserving user mod: ${modFile}`);
          continue;
        }

        if (!validRelativePaths.has(rel) && !validRelativePaths.has(cleanRel)) {
          try {
            fs.unlinkSync(path.join(localModsDir, modFile));
            console.log(`🗑️ Removed obsolete mod: ${rel}`);
          } catch (_) {}
        }
      }
    }
  }

  if (filesToDownload.length === 0) {
    sendProgress({
      stage: 'mods',
      stageLabel: 'Все моды и файлы актуальны!',
      progressPercent: 100,
      filesProcessed: manifest.files.length,
    });
    return;
  }

  // 3. Download files with progress and speed tracking
  let totalBytesToDownload = filesToDownload.reduce((acc, f) => acc + (f.size || 0), 0);
  let downloadedBytes = 0;
  let processedFiles = 0;
  let lastTime = Date.now();
  let bytesSinceLastTime = 0;
  let currentSpeed = 0;

  for (const file of filesToDownload) {
    const destPath = safeFilePath(file.path);
    const downloadUrl = file.downloadUrl?.startsWith('http')
      ? file.downloadUrl
      : `${serverBaseUrl.replace(/\/$/, '')}${file.downloadUrl || `/api/modpack/files/${file.path}`}`;

    sendProgress({
      stage: 'mods',
      stageLabel: `Загрузка: ${path.basename(file.path)}`,
      currentFile: file.path,
      filesProcessed: processedFiles,
      totalFiles: filesToDownload.length,
      bytesDownloaded: downloadedBytes,
      totalBytes: totalBytesToDownload,
      progressPercent: totalBytesToDownload > 0 ? Math.round((downloadedBytes / totalBytesToDownload) * 100) : 0,
      speedBps: currentSpeed,
    });

    try {
      await downloadFile(downloadUrl, destPath, (chunkBytes) => {
        downloadedBytes += chunkBytes;
        bytesSinceLastTime += chunkBytes;

        const now = Date.now();
        const diff = (now - lastTime) / 1000;
        if (diff >= 0.5) {
          currentSpeed = Math.round(bytesSinceLastTime / diff);
          bytesSinceLastTime = 0;
          lastTime = now;

          sendProgress({
            stage: 'mods',
            stageLabel: `Загрузка: ${path.basename(file.path)}`,
            currentFile: file.path,
            filesProcessed: processedFiles,
            totalFiles: filesToDownload.length,
            bytesDownloaded: downloadedBytes,
            totalBytes: totalBytesToDownload,
            progressPercent: totalBytesToDownload > 0 ? Math.round((downloadedBytes / totalBytesToDownload) * 100) : 0,
            speedBps: currentSpeed,
          });
        }
      }, file.sha256);
    } catch (err: any) {
      throw new Error(`Не удалось загрузить ${file.path}: ${err.message}`);
    }

    processedFiles++;
  }

  sendProgress({
    stage: 'mods',
    stageLabel: 'Сборка готова к запуску!',
    progressPercent: 100,
    filesProcessed: filesToDownload.length,
    totalFiles: filesToDownload.length,
    bytesDownloaded: totalBytesToDownload,
    totalBytes: totalBytesToDownload,
    speedBps: 0,
  });
}
