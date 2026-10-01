export const MINIMUM_LAUNCHER_VERSION = '1.0.1-beta.19';
export const LAUNCHER_DOWNLOAD_URL = 'https://github.com/cl0rex1/quiby-launcher-releases/releases';

/** Quiby's published versions are stable x.y.z or x.y.z-beta.N. */
export function supportsLauncher(version: string | undefined, minimum = MINIMUM_LAUNCHER_VERSION): boolean {
  const parse = (value: string) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/.exec(value);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? Infinity : Number(match[4])] : null;
  };
  const current = parse(version || '');
  const required = parse(minimum);
  if (!current || !required) return false;
  for (let i = 0; i < current.length; i++) {
    if (current[i] !== required[i]) return current[i] > required[i];
  }
  return true;
}
