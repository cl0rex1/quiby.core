const { app, BrowserWindow, session } = require('electron');
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
// Exercise the built main/preload/renderer in isolation without showing test windows.
BrowserWindow.prototype.show = function () {};
BrowserWindow.prototype.focus = function () {};
globalThis.fetch = async () => { throw Error('Network disabled in Electron smoke test'); };
const failures = [];
const watchdog = setTimeout(() => { fs.writeFileSync(report, JSON.stringify({ passed: false, error: 'Electron startup timed out', failures })); console.error('Electron startup timed out', failures); app.exit(1); }, 30000);
app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
});
app.on('browser-window-created', (_event, win) => {
  win.webContents.on('console-message', details => { if (details.level === 'error' && !/ERR_BLOCKED_BY_CLIENT/.test(details.message)) failures.push(details.message); });
  win.webContents.on('did-finish-load', async () => {
    if (win.webContents.getURL().includes('view=splash')) return;
    try {
      const result = await win.webContents.executeJavaScript(`(async () => {
        const api = window.quibyApi;
        const before = await api.getSettings();
        const saved = await api.saveSettings({ ...before, windowWidth: 99999, windowHeight: -1, ramMinMb: 32000, ramMaxMb: 4096 });
        const after = await api.getSettings();
        await api.saveNotifications([{ id: 'test', title: 'Smoke test', read: false, timestamp: Date.now() }]);
        const notifications = await api.loadNotifications();
        const state = await api.getLaunchState();
        return { saved, after, notifications: notifications.length, state, maximized: await api.isMaximized(), authVisible: !!document.querySelector('.auth-page') };
      })()`);
      assert.equal(result.saved, true);
      assert.equal(result.after.windowWidth, 7680);
      assert.equal(result.after.windowHeight, 360);
      assert.equal(result.after.ramMinMb, 4096);
      assert.equal(result.notifications, 1);
      assert.equal(result.state.status, 'idle');
      assert.equal(result.authVisible, true);
      assert.equal(typeof result.maximized, 'boolean');
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
