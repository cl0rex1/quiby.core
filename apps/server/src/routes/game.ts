import { Router, Response } from 'express';
import { createPublicKey } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { requireSupportedLauncher } from '../middleware/launcherVersion';
import { dbGet } from '../models/db';

const router = Router();
const audience = 'quiby-s6-game';
const issuer = 'quiby-core';
const issueSchema = z.object({ publicKey: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/).max(128) });
const verifySchema = z.object({ ticket: z.string().min(1).max(4096), username: z.string().regex(/^[a-zA-Z0-9_]{3,16}$/), uuid: z.string().uuid() });

// A game-only ticket is not an API/Discord session. The private signing key
// stays in the launched JVM; captured tickets cannot authenticate another client.
router.post('/join-ticket', requireSupportedLauncher, requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.set('Cache-Control', 'no-store');
  if (!req.user?.isWhitelisted) return res.status(403).json({ error: 'Доступ к серверу закрыт.' });
  const input = issueSchema.safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'Invalid game public key' });
  try {
    const publicKey = createPublicKey({ key: Buffer.from(input.data.publicKey, 'base64'), type: 'spki', format: 'der' });
    if (publicKey.asymmetricKeyType !== 'ed25519') throw new Error('Wrong key type');
    const canonicalKey = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
    const ticket = jwt.sign({ purpose: 'minecraft_join', mcUsername: req.user.mcUsername, uuid: req.user.uuid, publicKey: canonicalKey },
      config.jwtSecret, { algorithm: 'HS256', audience, issuer, subject: req.user.discordId, expiresIn: '12h' });
    return res.json({ ticket });
  } catch {
    return res.status(400).json({ error: 'Invalid game public key' });
  }
});

router.post('/verify-join-ticket', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const input = verifySchema.safeParse(req.body);
  if (!input.success) return res.status(400).json({ valid: false });
  try {
    const claims = jwt.verify(input.data.ticket, config.jwtSecret, { algorithms: ['HS256'], audience, issuer });
    if (typeof claims === 'string' || claims.purpose !== 'minecraft_join' || !claims.sub || claims.sub.startsWith('dev_')) {
      return res.status(401).json({ valid: false });
    }
    const user = await dbGet<{ mc_username: string; uuid: string; is_whitelisted: number }>('SELECT mc_username, uuid, is_whitelisted FROM users WHERE discord_id = ?', [claims.sub]);
    if (!user?.is_whitelisted || user.mc_username !== input.data.username || user.uuid.toLowerCase() !== input.data.uuid.toLowerCase()
      || claims.mcUsername !== user.mc_username || claims.uuid !== user.uuid || typeof claims.publicKey !== 'string') {
      return res.status(403).json({ valid: false });
    }
    return res.json({ valid: true, username: user.mc_username, uuid: user.uuid, publicKey: claims.publicKey });
  } catch {
    return res.status(401).json({ valid: false });
  }
});

export default router;
