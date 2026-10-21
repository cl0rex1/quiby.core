import { app, BrowserWindow, dialog, ipcMain, nativeImage, net, protocol } from 'electron';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

protocol.registerSchemesAsPrivileged([{ scheme: 'quiby-media', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

async function animatedImagePoster(file: string, format: 'gif' | 'webp'): Promise<Buffer> {
  // Chromium decodes GIF; nativeImage only decodes PNG/JPEG reliably on Windows.
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  try {
    await window.loadURL('data:text/html,<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:">');
    const source = `data:image/${format};base64,` + (await fs.readFile(file)).toString('base64');
    const poster: string = await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 64000000) return reject(Error('Изображение слишком большое.'));
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, 1920 / image.naturalWidth, 1080 / image.naturalHeight);
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      image.onerror = () => reject(Error('Не удалось прочитать изображение.'));
      image.src = ${JSON.stringify(source)};
    })`);
    return Buffer.from(poster, 'base64');
  } finally { window.destroy(); }
}

export function registerBackgrounds() {
  const directory = path.join(app.getPath('userData'), 'backgrounds');
  protocol.handle('quiby-media', async request => {
    const url = new URL(request.url);
    const id = url.pathname.slice(1);
    if (url.hostname !== 'background' || !/^[a-f0-9-]{36}\.(gif|png|jpe?g|webp)(\.poster\.png)?$/.test(id)) return new Response(null, { status: 404 });
    try { return await net.fetch(pathToFileURL(path.join(directory, id)).href); }
    catch { return new Response(null, { status: 404 }); }
  });
  ipcMain.handle('background:select', async () => {
    const selected = await dialog.showOpenDialog({ title: 'Выбрать фон', properties: ['openFile'], filters: [{ name: 'Изображения и GIF', extensions: ['gif', 'png', 'jpg', 'jpeg', 'webp'] }] });
    if (selected.canceled || !selected.filePaths[0]) return null;
    const file = selected.filePaths[0], extension = path.extname(file).toLowerCase();
    if (!/^\.(gif|png|jpe?g|webp)$/.test(extension)) throw new Error('Выберите GIF, PNG, JPEG или WebP.');
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > 50 * 1024 * 1024) throw new Error('Максимальный размер фона — 50 МБ.');
    const poster = extension === '.gif' || extension === '.webp' ? await animatedImagePoster(file, extension.slice(1) as 'gif' | 'webp') : undefined;
    if (!poster && nativeImage.createFromPath(file).isEmpty()) throw new Error('Не удалось прочитать изображение.');
    const id = randomUUID() + extension;
    await fs.mkdir(directory, { recursive: true });
    await fs.copyFile(file, path.join(directory, id));
    if (poster) await fs.writeFile(path.join(directory, id + '.poster.png'), poster);
    return id;
  });
}
