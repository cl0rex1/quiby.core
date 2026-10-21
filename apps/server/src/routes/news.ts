import { getLinkPreview } from '../services/linkPreview';
import { Router } from 'express';
import { listNews } from '../services/newsService';
const router = Router();
const attempts = new Map<string, { count: number; until: number }>();
router.get('/link-preview', async (req, res) => {
  const now = Date.now();
  for (const [ip, entry] of attempts) if (entry.until < now) attempts.delete(ip);
  const ip = req.ip || 'unknown';
  const entry = attempts.get(ip) || { count: 0, until: now + 60000 };
  if (entry.count >= 30 || (!attempts.has(ip) && attempts.size >= 500)) return res.sendStatus(429);
  entry.count++; attempts.set(ip, entry);
  if (typeof req.query.url !== 'string' || req.query.url.length > 2000) return res.sendStatus(400);
  try { return res.json(await getLinkPreview(req.query.url)); }
  catch { return res.status(422).json({ error: 'Предпросмотр ссылки недоступен' }); }
});
router.get('/', async (_req, res) => {
  try { res.setHeader('Cache-Control', 'no-store'); return res.json(await listNews()); }
  catch { return res.status(500).json({ error: 'Не удалось загрузить новости' }); }
});
export default router;
