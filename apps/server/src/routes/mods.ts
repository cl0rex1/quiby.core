import { createHash } from 'crypto';
import { dbGet } from '../models/db';
import { getReviewFile, putReviewFile, validReviewLink } from '../services/modReviewFiles';
import { Router, Request, Response, raw } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import {
  verifyMod,
  verifyModBatch,
  submitWhitelistRequest,
  getWhitelistRequests,
} from '../services/modSafetyService';

const router = Router();

export const whitelistRequestSchema = z.object({
  file_required: z.boolean().optional(),
  user_discord_id: z.string().optional(),
  mc_username: z.string().min(3).max(16).regex(/^[a-zA-Z0-9_]+$/).optional(),
  mod_name: z.string().min(1).max(100),
  filename: z.string().min(1).max(255).regex(/\.jar$/i, 'Must be a .jar file'),
  hash_sha1: z.string().length(40, 'Must be 40-char hex SHA-1').regex(/^[a-fA-F0-9]+$/),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
  project_url: z.union([z.literal(''), z.string().max(2048).url().refine(value => /^https?:\/\//i.test(value))]).optional(),
});

// Files are private; download links are short-lived and issued only to the review bot.
router.get('/review-file/:hash', (req, res) => {
  if (!validReviewLink(req.params.hash, Number(req.query.expires), String(req.query.signature || ''))) return res.sendStatus(403);
  const bytes = getReviewFile(req.params.hash);
  if (!bytes) return res.sendStatus(404);
  return res.attachment(req.params.hash + '.jar').send(bytes);
});
router.put('/review-file/:hash', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  if (!/^[a-f0-9]{40}$/.test(req.params.hash)) return res.sendStatus(400);
  try {
    const owner = await dbGet("SELECT id FROM mod_whitelist_requests WHERE hash_sha1=? AND user_discord_id=? AND status='pending'", [req.params.hash, req.user!.discordId]);
    if (!owner) return res.sendStatus(403);
    next();
  } catch { res.sendStatus(500); }
}, raw({ type: 'application/octet-stream', limit: '8mb' }), (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length || createHash('sha1').update(req.body).digest('hex') !== req.params.hash) return res.status(400).json({ error: 'Hash mismatch' });
  try { putReviewFile(req.params.hash, req.body); }
  catch (error) { return res.status(413).json({ error: String(error) }); }
  return res.json({ success: true });
});

router.get('/review-delivery/:hash', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!/^[a-f0-9]{40}$/.test(req.params.hash)) return res.sendStatus(400);
  try {
    const row = await dbGet<any>('SELECT discord_message_id FROM mod_whitelist_requests WHERE hash_sha1=? AND user_discord_id=? ORDER BY id DESC LIMIT 1', [req.params.hash, req.user!.discordId]);
    if (!row) return res.sendStatus(404);
    return res.json({ delivered: !!row.discord_message_id, queued: !!getReviewFile(req.params.hash) });
  } catch { return res.sendStatus(500); }
});

// One request carries both metadata and bytes; no JSON-only orphan is created.
router.post('/whitelist-request-file', requireAuth, raw({ type: 'application/octet-stream', limit: '8mb' }), async (req: AuthenticatedRequest, res) => {
  try {
    const payload = whitelistRequestSchema.safeParse(JSON.parse(decodeURIComponent(req.get('x-mod-request') || '')));
    if (!payload.success || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Некорректная заявка или JAR' });
    const hash = createHash('sha1').update(req.body).digest('hex');
    if (hash !== payload.data.hash_sha1.toLowerCase()) return res.status(400).json({ error: 'Хеш файла не совпадает' });
    putReviewFile(hash, req.body);
    const request = await submitWhitelistRequest({ ...payload.data, hash_sha1: hash, file_required: true,
      user_discord_id: req.user!.discordId, mc_username: req.user!.mcUsername });
    return res.json({ success: true, request, message: 'Заявка с JAR передана боту. Файл временно находится в памяти до доставки в Discord.' });
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Ошибка отправки' }); }
});

/**
 * POST /api/mods/verify
 * Verifies one or multiple mod files by SHA-1 hash against Modrinth and Anti-Cheat rules.
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const mods = z.array(z.object({
      name: z.string().min(1).max(100),
      filename: z.string().min(1).max(255).regex(/^[^/\\]+\.jar$/i),
      hash_sha1: z.string().regex(/^[a-fA-F0-9]{40}$/),
    })).min(1).max(20).safeParse(req.body?.mods);
    if (!mods.success) {
      return res.status(400).json({ error: 'Поле mods должно быть массивом объектов с name, filename, hash_sha1' });
    }
    const results = await verifyModBatch(mods.data);
    return res.json({ results });
  } catch (error: any) {
    console.error('Mod verification route error:', error);
    return res.status(500).json({ error: error.message || 'Ошибка проверки модов' });
  }
});

/**
 * POST /api/mods/whitelist-request
 * Allows a player to submit an unindexed/custom mod for review and whitelisting.
 */
router.post('/whitelist-request', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = whitelistRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Ошибка валидации данных',
        errors: parseResult.error.errors,
        details: parseResult.error.errors,
      });
    }

    const { mod_name, filename, hash_sha1, reason, project_url, file_required } = parseResult.data;

    const request = await submitWhitelistRequest({
      user_discord_id: req.user!.discordId,
      mc_username: req.user!.mcUsername,
      mod_name,
      file_required,
      filename,
      hash_sha1,
      reason,
      project_url,
    });

    return res.json({
      success: true,
      request,
      message: 'Запрос на добавление мода в вайтлист успешно отправлен администрации.',
    });
  } catch (error: any) {
    console.error('Whitelist request route error:', error);
    return res.status(500).json({ error: error.message || 'Ошибка отправки запроса' });
  }
});

/**
 * GET /api/mods/whitelist-requests
 * Lists all submitted mod whitelist requests.
 */
router.get('/whitelist-requests', requireAdmin, async (req: Request, res: Response) => {
  try {
    const requests = await getWhitelistRequests();
    return res.json({ requests });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Ошибка получения запросов' });
  }
});

export default router;
