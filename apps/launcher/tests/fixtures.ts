import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await use(errors);
    expect(errors, 'No uncaught renderer errors').toEqual([]);
  }, { auto: true }],
  page: async ({ page }, use) => {
    await page.route('**/api/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const body = pathname === '/api/auth/me' ? { user: { discordId: 'fixture', username: 'Fixture', mcUsername: 'QuibyPlayer', uuid: 'fixture', roles: [], isWhitelisted: true } }
        : pathname === '/api/launcher/access' ? { closed: false, message: '' }
        : pathname === '/api/status' ? { online: true, ip: 'localhost', port: 25565, players: { online: 12, max: 50 } }
        : pathname === '/api/news' ? [] : {};
      await route.fulfill({ json: body });
    });
    await page.addInitScript(() => {
      if (window.top !== window) return;
      const user = { discordId: 'fixture', username: 'Fixture', mcUsername: 'QuibyPlayer', uuid: 'fixture', roles: [], isWhitelisted: true };
      localStorage.setItem('quiby_session', JSON.stringify({ token: 'local-fixture', expiresAt: Date.now() + 86400000, user }));
      localStorage.setItem('quiby_onboarded', 'true');
      const listeners: Record<string, ((value: any) => void)[]> = {};
      const control = {
        calls: [] as { name: string; args: any[] }[],
        failures: {} as Record<string, string>, delays: {} as Record<string, number>,
        files: {} as Record<string, any[]>, activeImports: 0, peakImports: 0,
        emit(name: string, value: unknown) { for (const listener of listeners[name] || []) listener(value); },
      };
      (window as any).__test = control;
      let settings = { ramMinMb: 4096, ramMaxMb: 8192, javaPath: 'java', customJvmArgs: '', windowWidth: 1280, windowHeight: 720, fullscreen: false, autoCloseLauncher: false, enableDiscordRpc: true, gameDir: 'fixture-game', autoJoinServer: true, ...JSON.parse(localStorage.getItem('fixture-settings') || '{}') };
      let notifications: unknown[] = JSON.parse(localStorage.getItem('fixture-notifications') || '[]');
      const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#392744"/></svg>');
      const manifest = { id: 'fixture', name: 'quiby. S6', version: '6.0.0', gameVersion: '1.21.1', loader: { type: 'neoforge', version: '21.1.65' }, javaVersion: 21, recommendedRamMb: 8192, minRamMb: 4096, files: [], totalSize: 0, serverAddress: 'localhost', updatedAt: new Date().toISOString(), changelog: '' };
      const methods: Record<string, (...args: any[]) => any> = {
        getSettings: () => ({ ...settings }), saveSettings: value => { settings = value; localStorage.setItem('fixture-settings', JSON.stringify(value)); return true; },
        selectBackground: () => '12345678-1234-1234-1234-123456789abc.gif',
        loadNotifications: () => JSON.parse(localStorage.getItem('fixture-notifications') || JSON.stringify(notifications)), saveNotifications: value => { notifications = value; localStorage.setItem('fixture-notifications', JSON.stringify(value)); },
        getLaunchState: () => ({ status: localStorage.getItem('fixture-running') ? 'running' : 'idle' }),
        isMaximized: () => false, getTotalRamMb: () => 16384,
        detectJava: () => ({ installations: [], recommended: null, totalRamMb: 16384 }),
        getUpdateState: () => ({ status: 'current', currentVersion: '1.0.2' }), getLatestModpackManifest: () => ({ ...manifest, files: JSON.parse(localStorage.getItem('fixture-bundled-mods') || '[]') }),
        getShaderpacks: dir => [...(control.files[`shaderpacks:${dir}`] || [])],
        getSchematics: dir => [...(control.files[`schematics:${dir}`] || [])],
        getResourcePackInventory: dir => [...(control.files[`resourcepacks:${dir}`] || [])], getResourcePacks: dir => [...(control.files[`resourcepacks:${dir}`] || [])],
        getScreenshots: dir => control.files[`screenshots:${dir}`] || ['one.png', 'two.png', 'three.png'].map(name => ({ name, size: 10, modifiedAt: 1000 })),
        getScreenshotImage: () => image,
        installContentFile: (dir, kind, filename) => { (control.files[`${kind}:${dir}`] ||= []).push({ name: filename, filename, size: 10, updatedAt: 1000 }); },
        stageCustomMod: async filename => {
          control.activeImports++;
          control.peakImports = Math.max(control.peakImports, control.activeImports);
          try {
            await new Promise(resolve => setTimeout(resolve, 30));
            return { name: filename, isAllowed: filename !== 'review.jar', status: filename === 'review.jar' ? 'unverified' : 'approved', hashSha1: 'a'.repeat(40), reason: 'Fixture' };
          } finally { control.activeImports--; }
        },
        trashContentFile: (dir, kind, filename) => { control.files[`${kind}:${dir}`] = (control.files[`${kind}:${dir}`] || []).filter(file => file.filename !== filename); },
        trashResourcePack: (dir, filename) => { control.files[`resourcepacks:${dir}`] = (control.files[`resourcepacks:${dir}`] || []).filter(file => file.filename !== filename); },
        trashScreenshots: (dir, names) => { control.files[`screenshots:${dir}`] = methods.getScreenshots(dir).filter((file: any) => !names.includes(file.name)); },
        uploadModReview: () => ({ success: true, delivered: true }),
        refreshCustomMod: () => ({ isAllowed: true, status: 'approved' }),
        launchGame: () => { throw Error('Сервер авторизации недоступен'); },
      };
      for (const name of ['minimize', 'maximize', 'close', 'killGame', 'openContentFolder', 'openResourcePacksFolder', 'openScreenshotsFolder', 'installCustomMod', 'removeCustomMod', 'copyScreenshot', 'checkForUpdates', 'downloadUpdate', 'installUpdate']) methods[name] = () => true;
      (window as any).quibyApi = new Proxy({}, { get(_target, name: string) {
        if (name.startsWith('on')) return (callback: (value: unknown) => void) => {
          (listeners[name] ||= []).push(callback);
          return () => { listeners[name] = listeners[name].filter(item => item !== callback); };
        };
        if (!methods[name]) throw Error(`Missing bridge fixture: ${name}`);
        return async (...args: any[]) => {
          control.calls.push({ name, args });
          const delay = control.delays[`${name}:${args[1] || args[0] || ''}`] ?? control.delays[name];
          // Capture read results before waiting to reproduce stale disk/IPC responses.
          const result = name.startsWith('get') ? methods[name](...args) : undefined;
          if (delay) await new Promise(resolve => setTimeout(resolve, delay));
          if (control.failures[name]) throw Error(control.failures[name]);
          return name.startsWith('get') ? result : methods[name](...args);
        };
      } });
    });
    await use(page);
  },
});

export { expect };
export const boot = async (page: Page) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Запустить игру', exact: true })).toBeEnabled();
};
export const content = async (page: Page, name: string) => {
  await page.getByLabel('Контент', { exact: true }).click();
  await page.getByRole('navigation', { name: 'Тип контента' }).getByRole('button', { name: new RegExp(name) }).click();
};
export const emit = (page: Page, name: string, value: unknown) => page.evaluate(({ name, value }) => (window as any).__test.emit(name, value), { name, value });
