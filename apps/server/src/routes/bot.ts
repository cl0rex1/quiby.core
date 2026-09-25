import { timingSafeEqual } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { dbAll, dbGet } from '../models/db';
import { reviewWhitelistRequest } from '../services/modSafetyService';

const router = Router();
// Scoped service credential: does not grant player, news, or pack administration.
router.use((req, res, next) => {
  if (!config.modReviewBotApiKey) return res.status(503).json({ error: 'Bot API is not configured' });
  const supplied = Buffer.from(req.get('x-bot-key') || '');
  const expected = Buffer.from(config.modReviewBotApiKey);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
const queueSchema = z.object({
  after_id: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});
export const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reviewer_discord_id: z.string().regex(/^\d{17,20}$/),
  reason: z.string().trim().min(3).max(1000),
});
const idSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

router.get('/mod-whitelist-requests', async (req, res) => {
  const query = queueSchema.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: 'Invalid queue filters' });
  try {
    const { after_id, limit, status } = query.data;
    const rows = await dbAll<any>(
      'SELECT * FROM mod_whitelist_requests WHERE id > ? AND status = ? ORDER BY id ASC LIMIT ?',
      [after_id, status, limit + 1],
    );
    const requests = rows.slice(0, limit);
    return res.json({
      requests,
      has_more: rows.length > limit,
      next_after_id: requests.at(-1)?.id ?? after_id,
    });
  } catch {
    return res.status(500).json({ error: 'Не удалось получить заявки' });
  }
});
router.get('/mod-whitelist-requests/:id', async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Invalid request id' });
  try {
    const request = await dbGet('SELECT * FROM mod_whitelist_requests WHERE id = ?', [id.data]);
    return request ? res.json({ request }) : res.status(404).json({ error: 'Заявка не найдена' });
  } catch {
    return res.status(500).json({ error: 'Не удалось получить заявку' });
  }
});
router.patch('/mod-whitelist-requests/:id', async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  const body = reviewSchema.safeParse(req.body);
  if (!id.success || !body.success) return res.status(400).json({ error: 'Invalid review payload' });
  try {
    const { decision, reviewer_discord_id, reason } = body.data;
    const { code, ...result } = await reviewWhitelistRequest(id.data, decision, reviewer_discord_id, reason);
    return res.status(code).json(result);
  } catch {
    return res.status(500).json({ error: 'Не удалось сохранить решение' });
  }
});
export default router;
