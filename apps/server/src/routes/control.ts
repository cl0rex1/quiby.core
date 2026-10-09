import { listNews, newsSchema, saveNews } from '../services/newsService';
import { Router, Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { dbAll, dbGet, dbRun } from '../models/db';
import { reviewWhitelistRequest, submitWhitelistRequest } from '../services/modSafetyService';
import { reviewUsernameChangeRequest } from '../services/usernameChangeService';

const router = Router();
const cookieName = 'quiby_control';
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/control' };
const keyFingerprint = () => createHash('sha256').update(config.adminApiKey).digest('hex');
const attempts = new Map<string, { count: number; until: number }>();
const wrap = (fn: (req: Request, res: Response) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.removeHeader('Access-Control-Allow-Origin');
  res.removeHeader('Access-Control-Allow-Credentials');
  if (req.method !== 'GET') {
    if (req.get('x-quiby-control') !== '1') return res.status(403).json({ error: 'Запрос отклонён' });
    const origin = req.get('origin');
    try { if (origin && new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Недопустимый источник запроса' }); }
    catch { return res.sendStatus(403); }
    if (req.get('sec-fetch-site') === 'cross-site') return res.sendStatus(403);
  }
  next();
});
router.post('/login', (req, res) => {
  const now = Date.now();
  for (const [ip, item] of attempts) if (item.until < now) attempts.delete(ip);
  const ip = req.ip || 'unknown';
  const current = attempts.get(ip) || { count: 0, until: now + 60000 };
  if (current.count >= 10) return res.status(429).json({ error: 'Слишком много попыток. Подождите минуту.' });
  if (attempts.size > 1000) return res.status(429).json({ error: 'Повторите позже' });
  current.count++; attempts.set(ip, current);
  const supplied = typeof req.body?.key === 'string' && req.body.key.length <= 1024 ? req.body.key : '';
  if (!config.adminApiKey || !timingSafeEqual(createHash('sha256').update(supplied).digest(), createHash('sha256').update(config.adminApiKey).digest())) return res.status(401).json({ error: 'Неверный ключ администратора' });
  attempts.delete(ip);
  const token = jwt.sign({ purpose: 'control', key: keyFingerprint() }, config.jwtSecret, { expiresIn: '2h' });
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: 2 * 60 * 60 * 1000 });
  return res.json({ success: true });
});
router.use((req, res, next) => {
  try {
    const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!token) throw new Error();
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    if (payload.purpose !== 'control' || payload.key !== keyFingerprint()) throw new Error();
    next();
  } catch { return res.status(401).json({ error: 'Войдите в панель администратора' }); }
});
router.get('/session', (_req, res) => res.json({ authenticated: true }));
router.post('/logout', (_req, res) => { res.clearCookie(cookieName, cookieOptions); res.json({ success: true }); });
const querySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), search: z.string().max(100).default(''), status: z.enum(['all','pending','approved','rejected']).default('all') });
const decisionSchema = z.object({ decision: z.enum(['approved','rejected']), reason: z.string().trim().min(3).max(1000) });
const idSchema = z.coerce.number().int().positive();
async function audit(action: string, target: string, details: string) {
  await dbRun('INSERT INTO admin_audit(action,target,details) VALUES (?,?,?)', [action, target, details]);
}
router.get('/overview', wrap(async (_req, res) => {
  const users = await dbGet('SELECT COUNT(*) total, COALESCE(SUM(is_whitelisted),0) allowed FROM users');
  const mods = await dbGet("SELECT COUNT(*) total, COALESCE(SUM(status='pending'),0) pending FROM mod_whitelist_requests");
  const names = await dbGet("SELECT COUNT(*) total, COALESCE(SUM(status='pending'),0) pending FROM mc_username_change_requests");
  const pack = await dbGet('SELECT version_id FROM modpack_versions WHERE is_active=1 ORDER BY id DESC LIMIT 1');
  res.json({ users, mods, names, pack: pack?.version_id || '—' });
}));
for (const [route, table, searchColumns] of [
  ['mods', 'mod_whitelist_requests', ['mod_name','filename','hash_sha1','mc_username']],
  ['names', 'mc_username_change_requests', ['current_username','requested_username','discord_id']],
  ['players', 'users', ['discord_username','mc_username','discord_id']],
  ['audit', 'admin_audit', ['action','target','details']],
] as const) {
  router.get('/' + route, wrap(async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Некорректные фильтры' });
    const q = parsed.data;
    const clauses = [`(${searchColumns.map(c => c + ' LIKE ?').join(' OR ')})`];
    const values: any[] = searchColumns.map(() => '%' + q.search + '%');
    if ((route === 'mods' || route === 'names') && q.status !== 'all') { clauses.push('status=?'); values.push(q.status); }
    const where = clauses.join(' AND ');
    const count = await dbGet(`SELECT COUNT(*) total FROM ${table} WHERE ${where}`, values);
    const columns = route === 'players' ? 'id,discord_id,discord_username,mc_username,uuid,is_whitelisted,created_at,last_login_at' : '*';
    const items = await dbAll(`SELECT ${columns} FROM ${table} WHERE ${where} ORDER BY id DESC LIMIT 30 OFFSET ?`, [...values, (q.page - 1) * 30]);
    res.json({ items, total: count?.total || 0, page: q.page, pageSize: 30 });
  }));
}
for (const kind of ['mods','names'] as const) {
  router.patch(`/${kind}/:id`, wrap(async (req, res) => {
    const id = idSchema.safeParse(req.params.id), body = decisionSchema.safeParse(req.body);
    if (!id.success || !body.success) return res.status(400).json({ error: 'Укажите решение и причину (3–1000 символов)' });
    const fn = kind === 'mods' ? reviewWhitelistRequest : reviewUsernameChangeRequest;
    const { code, ...result } = await fn(id.data, body.data.decision, 'web-admin', body.data.reason);
    if (code === 200) await audit(kind + ':' + body.data.decision, String(id.data), body.data.reason);
    return res.status(code).json(result);
  }));
}
router.post('/mods', wrap(async (req, res) => {
  const parsed = decisionSchema.extend({ name: z.string().trim().min(1).max(100), filename: z.string().regex(/^[^/\\]+\.jar$/i).max(255), hash: z.string().regex(/^[a-f0-9]{40}$/i) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Проверьте имя, JAR, SHA-1 и причину' });
  const b = parsed.data;
  const item = await submitWhitelistRequest({ mod_name: b.name, filename: b.filename, hash_sha1: b.hash, reason: b.reason, user_discord_id: 'web-admin', mc_username: 'web-admin' });
  const { code, ...result } = await reviewWhitelistRequest(item.id, b.decision, 'web-admin', b.reason);
  if (code === 200) await audit('mods:' + b.decision, b.hash, b.reason);
  return res.status(code).json(result);
}));
router.patch('/players/:id', wrap(async (req, res) => {
  const body = z.object({ allowed: z.boolean() }).safeParse(req.body);
  if (!/^\d{17,20}$/.test(req.params.id) || !body.success) return res.status(400).json({ error: 'Некорректные данные' });
  const result = await dbRun('UPDATE users SET is_whitelisted=? WHERE discord_id=?', [body.data.allowed ? 1 : 0, req.params.id]);
  if (!result.changes) return res.status(404).json({ error: 'Игрок не найден' });
  await audit(body.data.allowed ? 'players:allow' : 'players:block', req.params.id, 'Доступ через лаунчер и проверку сессии');
  res.json({ success: true });
}));
router.get('/news', wrap(async (req, res) => {
  const query = querySchema.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: 'Некорректный запрос' });
  const all = (await listNews()).filter(item => `${item.title} ${item.content}`.toLowerCase().includes(query.data.search.toLowerCase()));
  res.json({ items: all.slice((query.data.page - 1) * 30, query.data.page * 30), total: all.length, pageSize: 30 });
}));
for (const method of ['post', 'put'] as const) router[method](method === 'post' ? '/news' : '/news/:id', wrap(async (req, res) => {
  const parsed = newsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Проверьте заголовок (3–160), текст (3–20000), автора и тип новости' });
  const result = await saveNews(parsed.data, method === 'put' ? req.params.id : undefined);
  if (!result) return res.status(404).json({ error: 'Новость не найдена' });
  await audit(parsed.data.broadcast ? 'news:broadcast' : 'news:save', result.id, parsed.data.title);
  res.status(method === 'post' ? 201 : 200).json({ success: true, ...result });
}));
router.delete('/news/:id', wrap(async (req, res) => {
  const result = await dbRun('DELETE FROM news WHERE id=?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ error: 'Новость не найдена' });
  await audit('news:delete', req.params.id, 'Удалена из ленты');
  res.json({ success: true });
}));
export default router;
