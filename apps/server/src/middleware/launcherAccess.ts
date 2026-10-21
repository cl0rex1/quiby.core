import type { Request, Response, NextFunction } from 'express';
import { getLauncherAccess } from '../services/launcherAccess';

export async function rejectClosedLauncher(res: Response): Promise<boolean> {
  const access = await getLauncherAccess();
  if (!access.closed) return false;
  res.set({ 'Cache-Control': 'no-store', 'Retry-After': '30' }).status(503).json({ code: 'LAUNCHER_ACCESS_CLOSED', error: access.message });
  return true;
}
export function requireLauncherAccess(_req: Request, res: Response, next: NextFunction) {
  void rejectClosedLauncher(res).then(closed => { if (!closed) next(); }).catch(next);
}
