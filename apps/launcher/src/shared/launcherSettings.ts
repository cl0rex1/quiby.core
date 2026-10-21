import type { LauncherSettings } from '@quiby/shared';

export const windowLimits = { width: { min: 640, max: 7680 }, height: { min: 360, max: 4320 } };

export function normalizeSettings(value: unknown, defaults: LauncherSettings): LauncherSettings {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const number = (key: keyof LauncherSettings, min: number, max: number) => {
    const value = input[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, Math.round(value))) : defaults[key] as number;
  };
  const text = (key: 'javaPath' | 'gameDir' | 'customJvmArgs') => typeof input[key] === 'string'
    ? (input[key] as string).replace(/\0/g, '').trim() : defaults[key];
  const boolean = (key: keyof LauncherSettings) => typeof input[key] === 'boolean'
    ? input[key] as boolean : defaults[key] as boolean;
  const ramMaxMb = Math.round(number('ramMaxMb', 4096, 65536) / 1024) * 1024;
  const background = (key: 'homeBackground' | 'wardrobeBackground'): LauncherSettings[typeof key] => {
    const value = input[key] as Record<string, unknown> | undefined;
    if (value?.mode === 'none') return { mode: 'none' };
    if (value?.mode === 'custom' && typeof value.imageId === 'string' && /^[a-f0-9-]{36}\.(gif|png|jpe?g|webp)$/.test(value.imageId)) return { mode: 'custom', imageId: value.imageId };
    return { mode: 'default' };
  };
  return {
    homeBackground: background('homeBackground'), wardrobeBackground: background('wardrobeBackground'),
    ramMaxMb,
    ramMinMb: Math.min(ramMaxMb, number('ramMinMb', 1024, 65536)),
    windowWidth: number('windowWidth', windowLimits.width.min, windowLimits.width.max),
    windowHeight: number('windowHeight', windowLimits.height.min, windowLimits.height.max),
    javaPath: text('javaPath') || 'java', gameDir: text('gameDir'), customJvmArgs: text('customJvmArgs'),
    fullscreen: boolean('fullscreen'), autoCloseLauncher: boolean('autoCloseLauncher'),
    enableDiscordRpc: boolean('enableDiscordRpc'),
    autoJoinServer: typeof input.autoJoinServer === 'boolean' ? input.autoJoinServer : defaults.autoJoinServer,
    modpackProfile: typeof input.modpackProfile === 'string' && ['clean', 'optimal', 'full'].includes(input.modpackProfile)
      ? input.modpackProfile as LauncherSettings['modpackProfile'] : defaults.modpackProfile,
    graphicsPreset: typeof input.graphicsPreset === 'string' && ['potato', 'optimal', 'ultra'].includes(input.graphicsPreset)
      ? input.graphicsPreset as LauncherSettings['graphicsPreset'] : defaults.graphicsPreset,
    totalPlaytimeSeconds: number('totalPlaytimeSeconds', 0, Number.MAX_SAFE_INTEGER),
    disabledBundledMods: Array.isArray(input.disabledBundledMods)
      ? [...new Set(input.disabledBundledMods.filter((id): id is string => typeof id === 'string' && id.length > 0))]
      : defaults.disabledBundledMods,
  };
}
