import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import type { AuthSession, LauncherSettings, LaunchState } from '@quiby/shared';

test('preinstallation completes the file pipeline while closed, never creates a ticket, route or game process, and retries safely', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-preinstall-'));
  const calls: string[] = [], states: LaunchState[] = [];
  let failDownload = false;
  const unexpected = () => { throw Error('Game-only side effect during preinstallation'); };
  const stubs: Record<string, object> = {
    electron: { app: { getVersion: () => '1.1.7', getPath: () => root }, BrowserWindow: { getAllWindows: () => [{}] } },
    child_process: { spawn: unexpected, exec: unexpected },
    './downloader': { syncModpackFiles: async () => {
      calls.push('download');
      if (failDownload) throw Error('Download failed');
      await fs.writeFile(path.join(root, 'downloaded.txt'), 'verified file');
    } },
    './earlyLoading': { configureEarlyLoading: () => calls.push('early') },
    './voiceChatDefaults': { repairVoiceChatDefaults: async () => calls.push('voice') },
    './mojang': { ensureMinecraftVanilla: async () => { calls.push('vanilla'); return {}; } },
    './neoforge': { ensureNeoForge: async () => { calls.push('neoforge'); return {}; } },
    './customModVerification': {},
    './contentIntegrity': { checkContentLinks: async () => {}, verifyLaunchContent: async () => { calls.push('verify'); assert.equal(await fs.readFile(path.join(root, 'downloaded.txt'), 'utf8'), 'verified file'); } },
    '../rpc/discordRpc': { updateDiscordRpcStatus: () => {} },
    '../../shared/modpackProfiles': { selectModpackProfile: (value: object) => value },
    './bundledModSelection': { applyBundledModSelection: () => {} },
    '../../shared/jvmArgs': { parseCustomJvmArgs: () => [] },
    './resourcePackProfile': { applyResourcePackProfile: async () => {} },
    './javaDetector': { resolveJava21: async () => { calls.push('java'); return 'java'; } },
    './manifestSource': { getLatestModpackManifest: async () => ({ name: 'Test', version: '6.1.40', gameVersion: '1.21.1', loader: { type: 'neoforge', version: '21.1.250' }, files: [] }) },
    './crashDetails': {},
    './resourcePackAdmission': { prepareResourcePackAdmission: async () => ({ hashes: [], approved: new Map() }) },
    './modDirectoryGuard': { guardModDirectory: unexpected },
    './gameAdmission': { requireGameLaunchAccess: async () => { calls.push('launch-access'); throw Error('Minecraft closed'); }, prepareGameAdmission: unexpected },
    './directRoute': { prepareDirectRoute: unexpected },
  };
  const loader = Module as unknown as { _load: (id: string, parent: any, isMain: boolean) => any };
  const original = loader._load;
  loader._load = function (id, parent, isMain) {
    if (parent?.filename.replace(/\\/g, '/').endsWith('/engine/minecraftLauncher.ts') && stubs[id]) return stubs[id];
    return original.call(this, id, parent, isMain);
  };
  try {
    const { launchMinecraft, getLaunchState, isGameActive } = await import('../minecraftLauncher');
    const session = { token: 'discord', user: { mcUsername: 'Tester', username: 'Tester' } } as AuthSession;
    const settings = { gameDir: root, modpackProfile: 'optimal', customJvmArgs: '' } as LauncherSettings;
    const win = { isDestroyed: () => false, webContents: { send: (channel: string, value: LaunchState) => { if (channel === 'launch-state-change') states.push(value); } } } as any;
    await launchMinecraft(session, settings, 'https://api.invalid', win, [], [], true);
    assert.deepEqual(calls, ['java', 'download', 'early', 'voice', 'vanilla', 'neoforge', 'verify']);
    assert.deepEqual(getLaunchState(), { status: 'installed', mode: 'preinstall' });
    assert.equal(isGameActive(), false);
    assert.equal(states.some(state => state.status === 'running' || state.status === 'starting'), false);
    await assert.rejects(launchMinecraft(session, settings, 'https://api.invalid', win), /Minecraft closed/);
    assert.equal(calls.at(-1), 'launch-access', 'Normal launch still enforces the access policy');
    failDownload = true;
    await assert.rejects(launchMinecraft(session, settings, 'https://api.invalid', win, [], [], true), /Download failed/);
    assert.equal(isGameActive(), false);
    failDownload = false;
    const pending = launchMinecraft(session, settings, 'https://api.invalid', win, [], [], true);
    assert.equal(isGameActive(), true);
    await assert.rejects(launchMinecraft(session, settings, 'https://api.invalid', win, [], [], true), /уже запускается/);
    await pending;
    assert.equal(getLaunchState().status, 'installed');
    assert.equal(isGameActive(), false);
  } finally { loader._load = original; await fs.rm(root, { recursive: true, force: true }); }
});
