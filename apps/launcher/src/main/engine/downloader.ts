import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

export async function downloadFile(url: string, destPath: string, onBytes?: (bytes: number) => void): Promise<void> {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }

  const fileStream = fs.createWriteStream(destPath);
  const reader = res.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    if (onBytes) onBytes(buffer.length);
    return;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fileStream.write(Buffer.from(value));
    if (onBytes) onBytes(value.length);
  }

  fileStream.end();
}

export async function syncModpackFiles(
  manifest: ModpackManifest,
  gameDir: string,
  serverBaseUrl: string,
  win: BrowserWindow | null,
  protectedModFilenames: Set<string> = new Set()
): Promise<void> {
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

  for (const file of manifest.files) {
    validRelativePaths.add(file.path.replace(/\\/g, '/'));
    const localPath = path.join(gameDir, file.path);

    if (!fs.existsSync(localPath)) {
      filesToDownload.push(file);
    } else {
      const localHash = await computeFileSha256(localPath);
      if (localHash.toLowerCase() !== file.sha256.toLowerCase()) {
        filesToDownload.push(file);
      }
    }
  }

  // 2. Clean obsolete mods from local mods/ directory, preserving user's approved custom mods
  const localModsDir = path.join(gameDir, 'mods');
  if (fs.existsSync(localModsDir)) {
    const localModFiles = fs.readdirSync(localModsDir);
    for (const modFile of localModFiles) {
      if (modFile.endsWith('.jar')) {
        const rel = `mods/${modFile}`;
        if (!validRelativePaths.has(rel)) {
          // If this is a protected user custom mod, preserve it
          if (protectedModFilenames.has(modFile) || protectedModFilenames.has(rel)) {
            continue;
          }
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
    const destPath = path.join(gameDir, file.path);
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
      });
    } catch (err: any) {
      console.error(`Error downloading ${file.path}:`, err);
      // fallback create empty dummy or throw
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
