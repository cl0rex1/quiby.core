import type { Request, Response, NextFunction } from 'express';
import { getPlayerLauncherAccess, getLauncherAccess, hasLauncherExceptions } from '../services/launcherAccess';

export async function rejectClosedLauncher(res: Response, discordId?: string): Promise<boolean> {
  const access = await getPlayerLauncherAccess(discordId);
  if (!access.closed) return false;
  res.set({ 'Cache-Control': 'no-store', 'Retry-After': '30' }).status(access.personalBlocked?403:503).json({ code: access.personalBlocked?'PLAYER_ACCESS_CLOSED':'LAUNCHER_ACCESS_CLOSED', error: access.message });
  return true;
}
export function requireLauncherAccess(_req: Request, res: Response, next: NextFunction) {
  // Anonymous OAuth may start only when an exception can be used. The callback
  // checks the identity returned by Discord before issuing any session.
  void getLauncherAccess().then(async access => {
    if (!access.closed || await hasLauncherExceptions()) next();
    else await rejectClosedLauncher(res);
  }).catch(next);
}
