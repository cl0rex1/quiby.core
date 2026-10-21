import type { ModpackManifest } from '@quiby/shared';
import { PACK_MANIFEST_URL } from '../../shared/releaseSources';

export async function getLatestModpackManifest(serverBaseUrl: string): Promise<ModpackManifest> {
  const apiUrl = `${serverBaseUrl.replace(/\/$/, '')}/api/modpack/latest`;
  const sources = process.env.QUIBY_PACK_SOURCE === 'local'
    ? [apiUrl, PACK_MANIFEST_URL]
    : [PACK_MANIFEST_URL, apiUrl];
  let lastError: unknown;
  for (const url of sources) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'quiby-launcher' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json() as ModpackManifest;
      if (!manifest?.version || !Array.isArray(manifest.files) || manifest.loader?.type !== 'neoforge') throw new Error('Некорректный манифест сборки');
      return { ...manifest, serverAddress: manifest.serverAddress || 'play.quiby.me:25565' };
    } catch (error) { lastError = error; }
  }
  throw new Error(`Не удалось загрузить сборку из GitHub Releases или API: ${String(lastError)}`);
}
