import fs from 'node:fs';
import path from 'node:path';
import type { ModpackManifest } from '@quiby/shared';
import { canDisableBundledMod } from '../../shared/modpackProfiles';

export function applyBundledModSelection(gameDir: string, catalog: ModpackManifest, selected: ModpackManifest): void {
  const activePaths = new Set(selected.files.map(file => file.path));
  for (const file of catalog.files.filter(canDisableBundledMod)) {
    const active = path.join(gameDir, file.path), disabled = active + '.disabled';
    if (!activePaths.has(file.path) && fs.existsSync(active)) fs.renameSync(active, disabled);
    else if (activePaths.has(file.path) && !fs.existsSync(active) && fs.existsSync(disabled)) fs.renameSync(disabled, active);
  }
  // The caller synchronizes SHA-256 and verifies admission after restoring any JAR.
}
