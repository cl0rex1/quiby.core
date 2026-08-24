import { Router, Request, Response } from 'express';
import { dbAll } from '../models/db';
import { NewsArticle } from '@quiby/shared';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await dbAll<any>(
      'SELECT id, title, excerpt, content, author, author_avatar, tag, banner_url, pin, created_at FROM news ORDER BY pin DESC, created_at DESC'
    );

    const articles: NewsArticle[] = rows.map(r => ({
      id: r.id,
      title: r.title,
      excerpt: r.excerpt,
      content: r.content,
      author: r.author,
      authorAvatar: r.author_avatar || undefined,
      tag: r.tag,
      bannerUrl: r.banner_url || undefined,
      pin: Boolean(r.pin),
      date: r.created_at,
    }));

    return res.json(articles);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
