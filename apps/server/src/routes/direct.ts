import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireSupportedLauncher } from '../middleware/launcherVersion';
import { getPlayerLauncherAccess } from '../services/launcherAccess';
import { dbGet } from '../models/db';

const router = Router();
const audience = 'quiby-direct';
const enabled = () => Boolean(config.direct.server && config.direct.ca && config.direct.providerKey.length >= 32);

router.get('/config', requireSupportedLauncher, requireAuth, (req: AuthenticatedRequest, res) => {
  res.set('Cache-Control', 'no-store');
  if (!req.user?.isWhitelisted) return res.sendStatus(403);
  if (!enabled()) return res.json({ enabled: false });
  const user = 'quiby-player';
  const ticket = jwt.sign({ purpose: 'direct', user }, config.jwtSecret,
    { algorithm: 'HS256', audience, subject: req.user.discordId, expiresIn: '12h' });
  return res.json({ enabled: true, server: config.direct.server, port: config.direct.port,
    ca: config.direct.ca, user, ticket });
});

// frps HTTP plugin: no state changes and no API session accepted here. A visitor
// may consume the two game proxies, but can never publish another service.
router.post('/authorize', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const deny = () => res.json({ reject: true, reject_reason: 'Access denied' });
  if (!enabled()) return deny();
  const op = req.query.op;
  if (!['Login', 'Ping', 'NewProxy'].includes(String(op))) return deny();
  const content = req.body?.content;
  const user = op === 'Login' ? content : content?.user;
  if (!user || typeof user.user !== 'string') return deny();
  const key = user.metas?.providerKey;
  const expected = Buffer.from(config.direct.providerKey);
  const provider = user.user === 'quiby-host' && typeof key === 'string'
    && Buffer.byteLength(key) === expected.length && timingSafeEqual(Buffer.from(key), expected);
  if (provider) {
    if (op === 'NewProxy' && !((content.proxy_name === 'quiby-host.minecraft-direct' && content.proxy_type === 'xtcp')
      || (content.proxy_name === 'quiby-host.minecraft-relay' && content.proxy_type === 'stcp'))) return deny();
    return res.json({ reject: false, unchange: true });
  }
  if (op === 'NewProxy') return deny();
  try {
    if (typeof user.metas?.ticket !== 'string' || user.metas.ticket.length > 4096) return deny();
    const claims = jwt.verify(user.metas.ticket, config.jwtSecret, { algorithms: ['HS256'], audience });
    if (typeof claims === 'string' || claims.purpose !== 'direct' || !claims.sub || claims.sub.startsWith('dev_')
      || claims.user !== user.user || user.user !== 'quiby-player') return deny();
    const access = await getPlayerLauncherAccess(claims.sub);
    const player = await dbGet<{ is_whitelisted: number }>('SELECT is_whitelisted FROM users WHERE discord_id=?', [claims.sub]);
    // getPlayerLauncherAccess also checks current whitelist and individual bans.
    if (!player?.is_whitelisted || access.closed) return deny();
    return res.json({ reject: false, unchange: true });
  } catch { return deny(); }
});

export default router;
