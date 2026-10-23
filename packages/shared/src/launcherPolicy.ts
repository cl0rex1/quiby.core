export const MINIMUM_LAUNCHER_VERSION = '1.1.6';
export const LAUNCHER_DOWNLOAD_URL = 'https://github.com/cl0rex1/quiby-launcher-releases/releases/latest';

/** Only the current published release may authenticate and launch Minecraft. */
export function supportsLauncher(version: string | undefined, required = MINIMUM_LAUNCHER_VERSION): boolean {
  return version === required;
}
