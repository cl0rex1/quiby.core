import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { dbGet } from '../models/db';
import { UserProfile } from '@quiby/shared';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { discordId: string; mcUsername: string; purpose?: string };
    if (payload.purpose || !payload.discordId || !payload.mcUsername) return res.status(401).json({ error: 'Invalid session token' });
    const row = await dbGet<any>('SELECT * FROM users WHERE discord_id = ?', [payload.discordId]);
    if (!row) {
      return res.status(401).json({ error: 'User session expired or user not found' });
    }

    req.user = {
      discordId: row.discord_id,
      username: row.discord_username,
      globalName: row.discord_global_name || undefined,
      avatar: row.discord_avatar || undefined,
      mcUsername: row.mc_username,
      uuid: row.uuid,
      isWhitelisted: Boolean(row.is_whitelisted),
      roles: JSON.parse(row.roles_json || '[]'),
      joinedAt: row.created_at,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-admin-key'];
  if (apiKey && apiKey === config.adminApiKey) {
    return next();
  }

  // Also check if JWT user is an admin
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, config.jwtSecret) as any;
      if (payload.isAdmin || payload.discordId === 'admin') {
        return next();
      }
    } catch (_) {}
  }

  return res.status(403).json({ error: 'Forbidden: Admin access required' });
}
