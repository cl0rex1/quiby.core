import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModMetadata } from '../knownMods';

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
