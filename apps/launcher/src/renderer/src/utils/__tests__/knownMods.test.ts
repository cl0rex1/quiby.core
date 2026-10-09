import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModMetadata, MOD_CATEGORIES, matchesModCategory, MOD_FILTERS, matchesModFilter } from '../knownMods';

test('simplified filters keep uncertain mods in Other and group voice/audio together', () => {
  assert.equal(MOD_FILTERS.length, 5);
  const known = resolveModMetadata('Create', 'create.jar');
  assert.equal(matchesModFilter(known, 'gameplay', 'approved'), true);
  for (const status of ['pending', 'blocked', 'unverified']) {
    assert.equal(matchesModFilter(known, 'other', status), true);
    assert.equal(matchesModFilter(known, 'gameplay', status), false);
  }
  assert.equal(matchesModFilter({ ...known, category: 'interface', categoryLabel: 'Голос' }, 'visuals'), true);
  assert.equal(matchesModFilter(resolveModMetadata('Mystery', 'mystery.jar'), 'other', 'approved'), true);
});

test('optimization mods are recognized from the shipped filenames', () => {
  for (const file of ['BadOptimizations-2.4.1-1.21.1.jar', 'c2me-neoforge-mc1.21.1-0.4.0-alpha.0.122.jar',
    'lithium-neoforge-0.15.4+mc1.21.1.jar', 'modernfix-neoforge-5.27.24+mc1.21.1.jar',
    'krypton_fnp-neoforge-1.21.1-0.2.28.1-1.21.1.jar', 'createbetterfps-1.21.1-1.1.5.jar',
    'Clumps-neoforge-1.21.1-19.0.0.1.jar', 'sodium-neoforge-0.8.13+mc1.21.1.jar']) {
    assert.equal(resolveModMetadata('', `mods/${file}`).category, 'optimization', file);
  }
  assert.equal(resolveModMetadata('', 'RoughlyEnoughItems-16.0.799-neoforge.jar').category, 'interface');
  assert.equal(resolveModMetadata('', 'Controlling-neoforge-1.21.1-19.0.5.jar').category, 'interface');
  assert.equal(resolveModMetadata('', 'DistantHorizons-3.3.2-1.21.1-fabric-neoforge.jar').category, 'graphics');
  assert.equal(resolveModMetadata('Breakfast', 'breakfast-1.0.jar').category, 'utility');
});

test('every reported tag has a working category and Create addons share Mechanics', () => {
  for (const [file, category] of [
    ['explosionoverhaul-0.2.3.0-neoforge.jar', 'graphics'], ['offbalance-2.0.jar', 'gameplay'],
    ['curios-neoforge-9.5.1+1.21.1.jar', 'library'], ['unknown-mod-1.0.jar', 'utility'],
    ['cloth-config-15.0.jar', 'library'], ['architectury-13.0.jar', 'library'],
    ['quiby-1.21.1-1.1.11.jar', 'launcher'], ['quiby-early-loading-1.21.1-1.1.11.jar', 'launcher'],
  ] as const) {
    const meta = resolveModMetadata('', file);
    assert.ok(MOD_CATEGORIES.some(item => item.id === category));
    assert.equal(meta.category, category, file);
    assert.ok(matchesModCategory(meta, category), file);
    assert.equal(matchesModCategory(meta, 'mechanisms'), false, file);
  }
  for (const file of ['create-aeronautics-bundled-1.21.1-1.3.2.jar', 'createdieselgenerators-1.21.1-1.3.15.jar', 'create_connected-1.0.jar']) {
    const meta = resolveModMetadata('', file);
    assert.equal(meta.categoryLabel, 'Механика');
    assert.ok(matchesModCategory(meta, 'mechanisms'));
  }
});

test('reported mods use their own verified pages and bundled icons instead of stale metadata', () => {
  for (const [file, slug] of [
    ['MouseTweaks-neoforge-mc1.21-2.26.1.jar', 'mouse-tweaks'], ['RoughlyEnoughItems-16.0.799-neoforge.jar', 'rei'],
    ['rejei-0.1.0.jar', 'rei-create-integration-fix'], ['curios-neoforge-9.5.1+1.21.1.jar', 'curios'],
    ['createdieselgenerators-1.21.1-1.3.15.jar', 'create-diesel-generators'],
    ['explosionoverhaul-0.2.3.0-neoforge.jar', 'explosion-overhaul-a-new-level-of-destruction'],
    ['offbalance-2.0.jar', 'sable-off-balance'], ['packetfixer-3.3.1-merged.jar', 'packet-fixer'],
    ['sable_player_ragdoll_patch-1.21.1-1.9.jar', 'sableragdoll-patch'],
  ]) {
    const meta = resolveModMetadata('', file, '����', 'https://example.com/broken.png', 'https://example.com/dependency');
    assert.equal(meta.projectUrl, `https://modrinth.com/mod/${slug}`, file);
    assert.ok(meta.iconUrl?.includes('/assets/modIcons/'), file);
    assert.equal(meta.description.includes('�'), false, file);
  }
  const early = resolveModMetadata('', 'quiby-early-loading-1.21.1-1.1.11.jar');
  assert.equal(early.displayName, 'Quiby Early Loading');
  assert.equal(early.projectUrl, 'https://quiby.me');
  assert.ok(early.iconUrl);
});

test('project links are not inferred from logos and unknown unsafe URLs are hidden', () => {
  assert.equal(resolveModMetadata('', 'create-aeronautics-bundled-1.21.1-1.3.2.jar').projectUrl, undefined);
  assert.equal(resolveModMetadata('Unknown', 'unknown.jar', undefined, 'https://cdn.modrinth.com/data/dependency/icon.png').projectUrl, undefined);
  assert.equal(resolveModMetadata('Unknown', 'unknown.jar', undefined, undefined, 'javascript:alert(1)').projectUrl, undefined);
});

test('legacy catalog entries retain verified links without using another mod logo', () => {
  for (const [name, slug] of [['Create', 'create'], ['Oculus', 'oculus'], ["Farmer's Delight", 'farmers-delight'], ['Embeddium', 'embeddium']]) {
    const meta = resolveModMetadata(name, `${name}.jar`);
    assert.equal(meta.projectUrl, `https://modrinth.com/mod/${slug}`);
    assert.ok(meta.iconUrl);
    if (name === 'Oculus') assert.equal(meta.iconUrl.includes('/YL57xq9U/'), false);
    if (name === "Farmer's Delight") assert.equal(meta.iconUrl.includes('/4I1XuqiY/'), false);
  }
});
