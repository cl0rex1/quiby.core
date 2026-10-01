import { createHash } from 'crypto';
import { dbGet, dbRun } from '../models/db';
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
  filename: z.string().min(1).max(255).regex(/^[^/\\]+\.(jar|zip)$/i, 'Нужен JAR мода или ZIP ресурспака'),
  hash_sha1: z.string().length(40, 'Must be 40-char hex SHA-1').regex(/^[a-fA-F0-9]+$/),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
  project_url: z.union([z.literal(''), z.string().max(2048).url().refine(value => /^https?:\/\//i.test(value))]).optional(),
});

// Resource packs require an explicit decision; Modrinth presence alone is not admission.
router.post('/resourcepacks/verify', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ hash_sha1: z.string().regex(/^[a-f0-9]{40}$/) }).safeParse(req.body);
  if (!parsed.success) return res.sendStatus(400);
  try {
    const row = await dbGet<any>("SELECT status, decision_reason FROM mod_whitelist_requests WHERE hash_sha1=? AND lower(filename) LIKE '%.zip' ORDER BY CASE WHEN status IN ('approved','rejected') THEN 0 ELSE 1 END,COALESCE(review_sequence,0) DESC,id DESC LIMIT 1", [parsed.data.hash_sha1]);
    return res.json({ status: row?.status || 'unverified', isAllowed: row?.status === 'approved',
      reason: row?.decision_reason || 'Ресурспак требует проверки администрации' });
  } catch { return res.sendStatus(500); }
});

// Files are private; download links are short-lived and issued only to the review bot.
router.get('/review-file/:hash', async (req, res) => {
  if (!validReviewLink(req.params.hash, Number(req.query.expires), String(req.query.signature || ''))) return res.sendStatus(403);
  const bytes = getReviewFile(req.params.hash);
  if (!bytes) return res.sendStatus(404);
  try {
    const row = await dbGet<any>('SELECT filename FROM mod_whitelist_requests WHERE hash_sha1=? ORDER BY id DESC LIMIT 1', [req.params.hash]);
    return res.attachment(row?.filename || req.params.hash + '.jar').send(bytes);
  } catch { return res.sendStatus(500); }
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
    if (!payload.success || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Некорректная заявка или файл' });
    const hash = createHash('sha1').update(req.body).digest('hex');
    if (hash !== payload.data.hash_sha1.toLowerCase()) return res.status(400).json({ error: 'Хеш файла не совпадает' });
    putReviewFile(hash, req.body);
    const request = await submitWhitelistRequest({ ...payload.data, hash_sha1: hash, file_required: true,
      user_discord_id: req.user!.discordId, mc_username: req.user!.mcUsername });
    return res.json({ success: true, request, message: 'Заявка с файлом передана боту. Файл временно находится в памяти до доставки в Discord.' });
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Ошибка отправки' }); }
});

// Authenticated observations, not proof of cheating. Never overwrite an admin decision.
router.post('/detected', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ filename: z.string().min(1).max(255).regex(/^[^/\\]+\.jar$/i),
    hash_sha1: z.string().regex(/^[a-f0-9]{40}$/), size: z.number().int().positive().max(512*1024*1024),
    reason: z.string().min(1).max(1000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error:'Некорректная запись мода'});
  try {
    const b=parsed.data;
    const quota=await dbGet<any>("SELECT COUNT(*) total FROM mod_whitelist_requests WHERE user_discord_id=? AND auto_detected=1 AND created_at > datetime('now','-1 hour')",[req.user!.discordId]);
    if (quota.total >= 100) return res.status(429).json({error:'Лимит записей за час'});
    await dbRun(`INSERT INTO mod_whitelist_requests(user_discord_id,mc_username,mod_name,filename,hash_sha1,reason,status,auto_detected,size_bytes)
      SELECT ?,?,?,?,?,?,'pending',1,? WHERE NOT EXISTS
      (SELECT 1 FROM mod_whitelist_requests WHERE user_discord_id=? AND hash_sha1=?)`,
      [req.user!.discordId,req.user!.mcUsername,b.filename.slice(0,-4).slice(0,100),b.filename,b.hash_sha1,
        'Автопроверка лаунчера: '+b.reason,b.size,req.user!.discordId,b.hash_sha1]);
    return res.json({success:true});
  } catch { return res.status(500).json({error:'Не удалось сохранить запись'}); }
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
