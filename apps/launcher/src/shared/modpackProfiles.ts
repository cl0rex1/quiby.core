import type { LauncherSettings, ModpackManifest, ModpackFile } from '@quiby/shared';

// Independently reviewed client features; never allow disabling game/security dependencies.
export const TOGGLEABLE_CLIENT_MODS = new Set(['mousetweaks', 'invmove', 'controlling', 'betterpingdisplay', 'entityculling', 'cubes_without_borders']);
export function canDisableBundledMod(file: ModpackFile): boolean {
  return file.userToggleable === true && file.side === 'client' && TOGGLEABLE_CLIENT_MODS.has(file.modId || '') && /^mods\/[^/\\]+\.jar$/i.test(file.path);
}

export function selectModpackProfile(manifest: ModpackManifest, profile: LauncherSettings['modpackProfile'] = 'optimal', disabled: string[] = []): ModpackManifest {
  const excluded = new Set(Array.isArray(disabled) ? disabled : []);
  const files = manifest.files.filter(file => (!file.profiles || file.profiles.includes(profile)) && !(canDisableBundledMod(file) && excluded.has(file.modId!)));
  return { ...manifest, files, totalSize: files.reduce((sum, file) => sum + file.size, 0) };
}
