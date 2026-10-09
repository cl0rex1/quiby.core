import { Router } from 'express';
import { listNews } from '../services/newsService';
const router = Router();
router.get('/', async (_req, res) => {
  try { res.setHeader('Cache-Control', 'no-store'); return res.json(await listNews()); }
  catch { return res.status(500).json({ error: 'Не удалось загрузить новости' }); }
});
export default router;
