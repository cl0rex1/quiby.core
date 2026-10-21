export const MINIMUM_LAUNCHER_VERSION = '1.0.2';
export const LAUNCHER_DOWNLOAD_URL = 'https://github.com/cl0rex1/quiby-launcher-releases/releases';

/** API access requires a stable x.y.z release at or above the minimum. */
export function supportsLauncher(version: string | undefined, minimum = MINIMUM_LAUNCHER_VERSION): boolean {
  const parse = (value: string) => {
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) return null;
    const parts = value.split('.').map(Number);
    return parts.every(Number.isSafeInteger) ? parts : null;
  };
  const current = parse(version || '');
  const required = parse(minimum);
  if (!current || !required) return false;
  for (let i = 0; i < current.length; i++) {
    if (current[i] !== required[i]) return current[i] > required[i];
  }
  return true;
}
