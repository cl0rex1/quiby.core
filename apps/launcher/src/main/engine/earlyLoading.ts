import fs from 'node:fs';
import path from 'node:path';

/** Select the service only after its jar was verified and installed; keep all other FML settings. */
export function configureEarlyLoading(gameDir: string, installedPaths: string[]): void {
  const enabled = installedPaths.some(file => /^mods\/quiby-early-loading-[^/]+\.jar$/.test(file));
  const configPath = path.join(gameDir, 'config', 'fml.toml');
  const previous = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  const provider = /^earlyWindowProvider\s*=\s*[^\r\n]*/m;
  // Restore the stock provider on rollback. FML 4.x does not reliably fall back when one is removed.
  if (!enabled && !/^earlyWindowProvider\s*=\s*["']quiby["']/m.test(previous)) return;
  const setting = `earlyWindowProvider = "${enabled ? 'quiby' : 'fmlearlywindow'}"`;
  const next = provider.test(previous) ? previous.replace(provider, setting) : `${setting}\n${previous}`;
  if (next !== previous) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, next);
  }
}
