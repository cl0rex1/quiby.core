import fs from 'node:fs/promises';
import path from 'node:path';
import type { LauncherSettings } from '@quiby/shared';

const isFreshPack = (value: string) => /^file\/(?:FreshAnimations_|FA\+Player-)[^/]+\.zip$/i.test(value);

/** Set profile defaults once per profile switch; leave later in-game choices alone. */
export async function applyResourcePackProfile(gameDir: string, profile: LauncherSettings['modpackProfile'], resourcePackPaths: string[]) {
  const marker = path.join(gameDir, '.quiby-resourcepack-profile');
  const selected = profile || 'optimal';
  try {
    if ((await fs.readFile(marker, 'utf8')).trim() === selected) return;
  } catch { /* First launch. */ }

  const optionsPath = path.join(gameDir, 'options.txt');
  let options: string;
  try { options = await fs.readFile(optionsPath, 'utf8'); }
  catch { return; }
  const line = options.split(/\r?\n/).find(value => value.startsWith('resourcePacks:'));
  if (!line) return;
  let active: string[];
  try {
    const parsed: unknown = JSON.parse(line.slice('resourcePacks:'.length));
    if (!Array.isArray(parsed) || !parsed.every(value => typeof value === 'string')) return;
    active = parsed;
  } catch { return; }

  const filtered = active.filter(value => !isFreshPack(value));
  if (selected === 'full') {
    for (const packPath of resourcePackPaths) {
      if (!packPath.startsWith('resourcepacks/')) continue;
      const pack = packPath.slice('resourcepacks/'.length);
      if (!isFreshPack(`file/${pack}`)) continue;
      try {
        await fs.access(path.join(gameDir, packPath));
        filtered.push(`file/${pack}`);
      } catch { /* The pack is not installed. */ }
    }
  }
  const updated = options.replace(line, `resourcePacks:${JSON.stringify(filtered)}`);
  if (updated !== options) await fs.writeFile(optionsPath, updated, 'utf8');
  await fs.writeFile(marker, selected, 'utf8');
}
