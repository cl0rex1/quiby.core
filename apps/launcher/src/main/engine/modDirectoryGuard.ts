import { watch } from 'node:fs';
import path from 'node:path';
import { verifyLaunchContent } from './contentIntegrity';

/** Keep the launch-time decisions fixed while Java starts and runs. Never delete player files. */
export function guardModDirectory(
  gameDir: string, files: { path: string; sha256: string }[], approvedMods: ReadonlyMap<string, string>,
  onViolation: (error: Error) => void, pollMs = 30_000,
): { check: () => Promise<void>; close: () => void } {
  let closed = false;
  let pending = false;
  let active: Promise<void> | undefined;
  // Copy the decisions: approval changes apply to the next launch only.
  const approved = new Map(approvedMods);
  const manifest = files.map(file => ({ ...file }));
  const check = (): Promise<void> => {
    if (closed) return Promise.resolve();
    pending = true;
    if (active) return active;
    active = (async () => {
      while (pending && !closed) {
        pending = false;
        await verifyLaunchContent(gameDir, manifest, approved, new Map(), ['mods']);
      }
    })().finally(() => { active = undefined; });
    return active;
  };
  const trigger = () => {
    void check().catch(error => {
      if (!closed) {
        close();
        onViolation(error instanceof Error ? error : new Error(String(error)));
      }
    });
  };
  // Subscribe before the final check, closing the check-to-spawn gap.
  const watcher = watch(path.join(gameDir, 'mods'), trigger);
  const timer = setInterval(trigger, pollMs);
  timer.unref();
  const close = () => {
    closed = true;
    clearInterval(timer);
    watcher.close();
  };
  watcher.on('error', error => {
    if (!closed) { close(); onViolation(error); }
  });
  return { check, close };
}
