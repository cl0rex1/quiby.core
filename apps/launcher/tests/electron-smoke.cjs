const { app, BrowserWindow, dialog, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'quiby-electron-test-'));
const report = path.join(__dirname, '../test-results/electron-smoke.json');
fs.mkdirSync(path.dirname(report), { recursive: true });
fs.mkdirSync(path.join(root, '.quiby-launcher'), { recursive: true });
process.env.APPDATA = root;
process.env.QUIBY_API_URL = 'http://127.0.0.1:1';
app.setPath('userData', path.join(root, 'user-data'));
app.disableHardwareAcceleration();
fs.writeFileSync(path.join(root, '.quiby-launcher', 'launcher-settings.json'), JSON.stringify({ enableDiscordRpc: false }));
const gifFile = path.join(root, 'background.gif');
fs.writeFileSync(gifFile, Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [gifFile] });
// Exercise the built main/preload/renderer in isolation without showing test windows.
BrowserWindow.prototype.show = function () {};
BrowserWindow.prototype.focus = function () {};
const reviewUploads = [];
globalThis.fetch = async (url, options) => {
  if (String(url).endsWith('/api/mods/whitelist-request-file')) {
    reviewUploads.push(options.body.length);
    return Response.json({ success: true });
  }
  if (String(url).includes('/api/mods/review-delivery/')) return Response.json({ delivered: true });
  throw Error('Network disabled in Electron smoke test');
};
const packDirectory = path.join(root, '.quiby-launcher', 'resourcepacks');
fs.mkdirSync(packDirectory, { recursive: true });
for (const [name, size] of [['above-eight.zip', 8 * 1024 * 1024 + 1], ['twenty.zip', 20 * 1024 * 1024], ['too-large.zip', 20 * 1024 * 1024 + 1], ['empty.zip', 0]]) {
  fs.writeFileSync(path.join(packDirectory, name), Buffer.alloc(size, 7));
}
const failures = [];
const watchdog = setTimeout(() => { fs.writeFileSync(report, JSON.stringify({ passed: false, error: 'Electron startup timed out', failures })); console.error('Electron startup timed out', failures); app.exit(1); }, 30000);
app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
});
app.on('browser-window-created', (_event, win) => {
  win.webContents.on('console-message', details => { if (details.level === 'error' && !/ERR_BLOCKED_BY_CLIENT/.test(details.message)) failures.push(details.message); });
  win.webContents.on('did-finish-load', async () => {
    if (!win.webContents.getURL().startsWith('file:') || win.webContents.getURL().includes('view=splash')) return;
    try {
      const result = await win.webContents.executeJavaScript(`(async () => {
        const api = window.quibyApi;
        const before = await api.getSettings();
        const saved = await api.saveSettings({ ...before, windowWidth: 99999, windowHeight: -1, ramMinMb: 32000, ramMaxMb: 4096 });
        const after = await api.getSettings();
        await api.saveNotifications([{ id: 'test', title: 'Smoke test', read: false, timestamp: Date.now() }]);
        const notifications = await api.loadNotifications();
        const state = await api.getLaunchState();
        const networkReport = await api.getNetworkReport();
        let networkError = '';
        try { await api.checkNetwork(''); } catch(error) { networkError = error.message; }
        const backgroundId = await api.selectBackground();
        const loadImage = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image.naturalWidth); image.onerror = () => reject(Error('Background failed to load')); image.src = src; });
        const imageWidth = await loadImage('quiby-media://background/' + backgroundId);
        const posterWidth = await loadImage('quiby-media://background/' + backgroundId + '.poster.png');
        const packReviews = [];
        for (const filename of ['above-eight.zip', 'twenty.zip', 'too-large.zip', 'empty.zip']) {
          try {
            const hash = await api.stageResourcePackReview('', filename);
            const upload = await api.uploadModReview(hash, 'isolated-test-token', { mod_name: filename, filename, reason: 'Resource pack size boundary test' });
            packReviews.push({ filename, hash, delivered: upload.delivered });
          } catch (error) { packReviews.push({ filename, error: error.message }); }
        }
        return { saved, after, notifications: notifications.length, state, networkReport, networkError, packReviews, background: { id: backgroundId, imageWidth, posterWidth }, maximized: await api.isMaximized(), authVisible: !!document.querySelector('.auth-page'), accessVisible: !!document.querySelector('.launcher-access-screen') };
      })()`);
      assert.equal(result.saved, true);
      assert.equal(result.after.windowWidth, 7680);
      assert.equal(result.after.windowHeight, 360);
      assert.equal(result.after.ramMinMb, 4096);
      assert.equal(result.notifications, 1);
      assert.equal(result.state.status, 'idle');
      assert.equal(result.networkReport, null);
      assert.match(result.networkError, /Discord|Windows/);
      assert.equal(result.authVisible, false); // Offline startup stays on the access check screen.
      assert.equal(result.accessVisible, true);
      assert.equal(typeof result.maximized, 'boolean');
      assert.match(result.background.id, /^[a-f0-9-]{36}\.gif$/);
      assert.equal(result.background.imageWidth, 1);
      assert.equal(result.background.posterWidth, 1);
      assert.deepEqual(reviewUploads, [8 * 1024 * 1024 + 1, 20 * 1024 * 1024]);
      for (const item of result.packReviews.slice(0, 2)) { assert.equal(item.delivered, true); assert.match(item.hash, /^[a-f0-9]{40}$/); }
      for (const item of result.packReviews.slice(2)) assert.match(item.error, /20 МиБ/);
      assert.deepEqual(fs.readFileSync(path.join(root, 'user-data', 'backgrounds', result.background.id)), fs.readFileSync(gifFile));
      const settingsFile = path.join(root, '.quiby-launcher', 'launcher-settings.json');
      assert.equal(fs.existsSync(settingsFile + '.tmp'), false);
      assert.equal(JSON.parse(fs.readFileSync(settingsFile)).windowWidth, 7680);
      assert.deepEqual(failures, []);
      console.log('Electron smoke passed: built renderer, preload bridge, settings normalization/persistence, notifications, window and game state.');
      fs.writeFileSync(report, JSON.stringify({ passed: true, result, failures }, null, 2));
      clearTimeout(watchdog); app.exit(0);
    } catch (error) { console.error(error, failures); fs.writeFileSync(report, JSON.stringify({ passed: false, error: String(error), failures }, null, 2)); clearTimeout(watchdog); app.exit(1); }
  });
});
require('../dist/main/index.js');
