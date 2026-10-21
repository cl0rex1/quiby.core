import type { Request, Response, NextFunction } from 'express';
import { MINIMUM_LAUNCHER_VERSION, LAUNCHER_DOWNLOAD_URL, supportsLauncher } from '@quiby/shared';

export function requireSupportedLauncher(req: Request, res: Response, next: NextFunction): void {
  if (!supportsLauncher(req.get('x-quiby-launcher-version'))) {
    res.status(426).json({ error: 'Установите актуальную релизную версию лаунчера.', minimumVersion: MINIMUM_LAUNCHER_VERSION, downloadUrl: LAUNCHER_DOWNLOAD_URL });
    return;
  }
  next();
}
