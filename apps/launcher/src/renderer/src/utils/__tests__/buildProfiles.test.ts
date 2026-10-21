import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBuildToMods, selectedBuild, AVAILABLE_BUILD_PROFILES } from '../buildProfiles';

test('build choices map to existing profiles without enabling unapproved files', () => {
  const mods = [
    { enabled: false, safetyStatus: 'approved', categories: ['graphics'] },
    { enabled: false, safetyStatus: 'approved', categories: ['optimization'] },
    { enabled: true, safetyStatus: 'pending', categories: [] },
    { enabled: true, safetyStatus: 'blocked', categories: [] },
  ];
  assert.equal(selectedBuild({ modpackProfile: 'full' }).name, 'Standard');
  assert.deepEqual(AVAILABLE_BUILD_PROFILES.map(build => build.profile), ['optimal', 'clean']);
  assert.equal(selectedBuild({}).name, 'Standard');
  assert.equal(selectedBuild({ modpackProfile: 'clean' }).name, 'Draft');
  assert.deepEqual(applyBuildToMods(mods, 'full').map(m => m.enabled), [true, true, false, false]);
  assert.deepEqual(applyBuildToMods(mods, 'optimal').map(m => m.enabled), [false, true, false, false]);
  assert.ok(applyBuildToMods(mods, 'clean').every(m => !m.enabled));
  assert.equal(mods[0].enabled, false);
});
