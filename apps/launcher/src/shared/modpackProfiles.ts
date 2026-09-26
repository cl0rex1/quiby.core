import type { LauncherSettings, ModpackManifest } from '@quiby/shared';

export function selectModpackProfile(manifest: ModpackManifest, profile: LauncherSettings['modpackProfile'] = 'optimal'): ModpackManifest {
  const files = manifest.files.filter(file => !file.profiles || file.profiles.includes(profile));
  return { ...manifest, files, totalSize: files.reduce((sum, file) => sum + file.size, 0) };
}
