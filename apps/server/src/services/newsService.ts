import { randomUUID } from 'crypto';
import { z } from 'zod';
import { dbAll, dbGet, dbRun } from '../models/db';

export const newsSchema = z.object({
  title: z.string().trim().min(3).max(160), excerpt: z.string().trim().max(500).default(''),
  content: z.string().trim().min(3).max(20000), author: z.string().trim().min(1).max(80),
  tag: z.enum(['update', 'event', 'season', 'announcement']).default('announcement'),
  bannerUrl: z.union([z.literal(''), z.string().url().refine(value => /^https?:\/\//.test(value))]).optional(),
  pin: z.boolean().default(false), broadcast: z.boolean().default(false),
});

export async function saveNews(input: z.infer<typeof newsSchema>, existingId?: string) {
  const id = existingId || 'news-' + randomUUID();
  const previous = existingId ? await dbGet<any>('SELECT * FROM news WHERE id=?', [id]) : null;
  if (existingId && !previous) return null;
  const revision = input.broadcast ? randomUUID() : previous?.broadcast_revision || null;
  const values = [input.title, input.excerpt || input.content.slice(0, 240), input.content, input.author, input.tag, input.bannerUrl === undefined ? previous?.banner_url || null : input.bannerUrl || null, input.pin ? 1 : 0, revision];
  if (previous) await dbRun('UPDATE news SET title=?,excerpt=?,content=?,author=?,tag=?,banner_url=?,pin=?,broadcast_revision=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [...values, id]);
  else await dbRun('INSERT INTO news (title,excerpt,content,author,tag,banner_url,pin,broadcast_revision,id) VALUES (?,?,?,?,?,?,?,?,?)', [...values, id]);
  return { id, broadcastRevision: revision, broadcast: input.broadcast };
}

export async function listNews() {
  const rows = await dbAll<any>('SELECT * FROM news ORDER BY pin DESC, created_at DESC, id DESC LIMIT 100');
  return rows.map(row => ({ id: row.id, title: row.title, excerpt: row.excerpt, content: row.content, author: row.author,
    authorAvatar: row.author_avatar || undefined, tag: row.tag, bannerUrl: row.banner_url || undefined,
    pin: Boolean(row.pin), date: row.created_at.replace(' ', 'T') + (row.created_at.includes('T') ? '' : 'Z'),
    broadcastRevision: row.broadcast_revision || undefined }));
}
