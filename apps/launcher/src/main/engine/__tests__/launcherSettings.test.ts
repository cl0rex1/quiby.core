import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeSettings } from '../../../shared/launcherSettings';
import type { LauncherSettings } from '@quiby/shared';

const defaults: LauncherSettings = {
  ramMinMb: 4096, ramMaxMb: 8192, javaPath: 'java', gameDir: 'C:\\Games\\Quiby',
  customJvmArgs: '', windowWidth: 1280, windowHeight: 720, fullscreen: false,
  autoCloseLauncher: false, enableDiscordRpc: true,
};

test('damaged settings recover without leaking invalid types to the launcher', () => {
  for (const value of [null, [], 'bad', undefined]) assert.deepEqual(normalizeSettings(value, defaults), normalizeSettings({}, defaults));
  const result = normalizeSettings({ ramMaxMb: -100, ramMinMb: 999999, windowWidth: Infinity,
    windowHeight: 1, javaPath: null, fullscreen: 'false', enableDiscordRpc: 0,
    disabledBundledMods: ['sodium', null, 'sodium', 42], serverIp: 'obsolete' }, defaults);
  assert.equal(result.ramMaxMb, 4096);
  assert.equal(result.ramMinMb, 4096);
  assert.equal(result.windowWidth, 1280);
  assert.equal(result.windowHeight, 360);
  assert.equal(result.javaPath, 'java');
  assert.equal(result.fullscreen, false);
  assert.equal(result.enableDiscordRpc, true);
  assert.deepEqual(result.disabledBundledMods, ['sodium']);
  assert.equal('serverIp' in result, false);
});

test('valid custom settings and paths survive normalization', () => {
  const value = { ...defaults, javaPath: 'C:\\Java 21\\bin\\javaw.exe', customJvmArgs: '-Dname="a b"',
    autoJoinServer: false, modpackProfile: 'full' as const, graphicsPreset: 'ultra' as const,
    disabledBundledMods: ['iris'], totalPlaytimeSeconds: 3600 };
  assert.deepEqual(normalizeSettings(value, defaults), { ...value, homeBackground: { mode: 'default' }, wardrobeBackground: { mode: 'default' } });
  const result = normalizeSettings({ windowWidth: 90000, windowHeight: 800.8, ramMaxMb: NaN }, defaults);
  assert.equal(result.windowWidth, 7680);
  assert.equal(result.windowHeight, 801);
  assert.equal(result.ramMaxMb, 8192);
});

test('background settings retain local media ids and reject paths or invalid modes', () => {
  const id = '12345678-1234-1234-1234-123456789abc.gif';
  assert.deepEqual(normalizeSettings({ homeBackground: { mode: 'custom', imageId: id }, wardrobeBackground: { mode: 'none' } }, defaults).homeBackground, { mode: 'custom', imageId: id });
  for (const value of [{ mode: 'custom', imageId: '../../private.png' }, { mode: 'evil' }, null]) {
    assert.deepEqual(normalizeSettings({ homeBackground: value }, defaults).homeBackground, { mode: 'default' });
  }
});
