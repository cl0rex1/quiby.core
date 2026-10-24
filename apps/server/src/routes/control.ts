import { renderNewsContent } from '../services/newsMarkup';
import { defaultAccessMessage, getLauncherAccess, setLauncherAccess } from '../services/launcherAccess';
import { defaultGameAccessMessage, getGameAccess, setGameAccess } from '../services/gameAccess';
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
const querySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), search: z.string().max(100).default(''), status: z.enum(['all','pending','approved','rejected']).default('all'), category:z.enum(['all','mods','resourcepacks','other']).default('all'), access:z.enum(['all','allowed','blocked','exempt','game-exempt','game-blocked']).default('all') });
const decisionSchema = z.object({ decision: z.enum(['approved','rejected']), reason: z.string().trim().min(3).max(1000) });
const idSchema = z.coerce.number().int().positive();
async function audit(action: string, target: string, details: string) {
  await dbRun('INSERT INTO admin_audit(action,target,details) VALUES (?,?,?)', [action, target, details]);
}
router.get('/launcher-access', wrap(async (_req, res) => res.json(await getLauncherAccess())));
router.put('/launcher-access', wrap(async (req, res) => {
  const input = z.object({ closed: z.boolean(), message: z.string().trim().max(500).default(defaultAccessMessage) }).strict().safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'Укажите состояние доступа и сообщение до 500 символов.' });
  const access = await setLauncherAccess(input.data.closed, input.data.message);
  await audit(access.closed ? 'launcher:close' : 'launcher:open', 'all', access.message);
  return res.json(access);
}));
router.get('/minecraft-access', wrap(async (_req, res) => res.json(await getGameAccess())));
router.put('/minecraft-access', wrap(async (req, res) => {
  const input = z.object({ closed: z.boolean(), message: z.string().trim().max(500).default(defaultGameAccessMessage) }).strict().safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'Укажите состояние доступа и сообщение до 500 символов.' });
  const access = await setGameAccess(input.data.closed, input.data.message);
  await audit(access.closed ? 'minecraft:close' : 'minecraft:open', 'all', access.message);
  return res.json(access);
}));
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
    const categories:Record<string,number>={all:0,mods:0,resourcepacks:0,other:0};
    if(route==='mods') {
      const groups=await dbAll<{category:string;total:number}>(`SELECT CASE WHEN lower(filename) LIKE '%.jar' THEN 'mods' WHEN lower(filename) LIKE '%.zip' THEN 'resourcepacks' ELSE 'other' END category,COUNT(*) total FROM ${table} WHERE ${clauses.join(' AND ')} GROUP BY category`,values);
      for(const group of groups){categories[group.category]=group.total;categories.all+=group.total;}
      if(q.category==='mods')clauses.push("lower(filename) LIKE '%.jar'");
      if(q.category==='resourcepacks')clauses.push("lower(filename) LIKE '%.zip'");
      if(q.category==='other')clauses.push("lower(filename) NOT LIKE '%.jar' AND lower(filename) NOT LIKE '%.zip'");
    }
    if(route==='players') {
      if(q.access==='allowed')clauses.push('is_whitelisted=1');
      if(q.access==='blocked')clauses.push('is_whitelisted=0');
      if(q.access==='exempt')clauses.push('is_whitelisted=1 AND launcher_access_exempt=1');
      if(q.access==='game-exempt')clauses.push('is_whitelisted=1 AND minecraft_access_blocked=0 AND minecraft_access_exempt=1');
      if(q.access==='game-blocked')clauses.push('minecraft_access_blocked=1');
    }
    const where = clauses.join(' AND ');
    const count = await dbGet(`SELECT COUNT(*) total FROM ${table} WHERE ${where}`, values);
    const columns = route === 'players' ? 'id,discord_id,discord_username,mc_username,uuid,is_whitelisted,launcher_access_exempt,minecraft_access_blocked,minecraft_access_exempt,playtime_seconds,created_at,last_login_at' : '*';
    const items = await dbAll(`SELECT ${columns} FROM ${table} WHERE ${where} ORDER BY id DESC LIMIT 30 OFFSET ?`, [...values, (q.page - 1) * 30]);
    res.json({ items, total: count?.total || 0, page: q.page, pageSize: 30, ...(route==='mods'?{categories}:{}) });
  }));
}
for (const kind of ['mods','names'] as const) {
  router.patch(`/${kind}/:id`, wrap(async (req, res) => {
    const id = idSchema.safeParse(req.params.id), body = decisionSchema.safeParse(req.body);
    if (!id.success || !body.success) return res.status(400).json({ error: 'Укажите решение и причину (3–1000 символов)' });
    const fn = kind === 'mods' ? reviewWhitelistRequest : reviewUsernameChangeRequest;
    const { code, ...result } = await fn(id.data, body.data.decision, 'web-admin', body.data.reason);
    const category = kind==='mods' && 'request' in result && /\.zip$/i.test(result.request.filename) ? 'resourcepacks' : kind;
    if (code === 200) await audit(category + ':' + body.data.decision, String(id.data), body.data.reason);
    return res.status(code).json(result);
  }));
}
router.post('/mods', wrap(async (req, res) => {
  const parsed = decisionSchema.extend({ name: z.string().trim().min(1).max(100), filename: z.string().regex(/^[^/\\]+\.(jar|zip)$/i).max(255), hash: z.string().regex(/^[a-f0-9]{40}$/i) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Проверьте имя, JAR / ZIP, SHA-1 и причину' });
  const b = parsed.data;
  const item = await submitWhitelistRequest({ mod_name: b.name, filename: b.filename, hash_sha1: b.hash, reason: b.reason, user_discord_id: 'web-admin', mc_username: 'web-admin' });
  const { code, ...result } = await reviewWhitelistRequest(item.id, b.decision, 'web-admin', b.reason);
  if (code === 200) await audit((/\.zip$/i.test(b.filename)?'resourcepacks':'mods')+':' + b.decision, b.hash, b.reason);
  return res.status(code).json(result);
}));
router.patch('/players/:id', wrap(async (req, res) => {
  const body = z.object({ allowed: z.boolean().optional(), launcherExempt:z.boolean().optional(), minecraftBlocked:z.boolean().optional(), minecraftExempt:z.boolean().optional() }).strict().refine(b=>Object.values(b).some(value=>value!==undefined)).safeParse(req.body);
  if (!/^\d{17,20}$/.test(req.params.id) || !body.success) return res.status(400).json({ error: 'Некорректные данные' });
  const player=await dbGet<{is_whitelisted:number;minecraft_access_blocked:number}>('SELECT is_whitelisted,minecraft_access_blocked FROM users WHERE discord_id=?',[req.params.id]);
  if(!player)return res.status(404).json({error:'Игрок не найден'});
  if(body.data.launcherExempt && !(body.data.allowed??Boolean(player.is_whitelisted)))return res.status(400).json({error:'Сначала разрешите личный доступ игроку.'});
  if(body.data.minecraftExempt && (!(body.data.allowed??Boolean(player.is_whitelisted)) || (body.data.minecraftBlocked??Boolean(player.minecraft_access_blocked))))return res.status(400).json({error:'Сначала разрешите игроку запуск Minecraft.'});
  const allowed=body.data.allowed===undefined?null:Number(body.data.allowed), exempt=body.data.launcherExempt===undefined?null:Number(body.data.launcherExempt);
  const gameBlocked=body.data.minecraftBlocked===undefined?null:Number(body.data.minecraftBlocked), gameExempt=body.data.minecraftExempt===undefined?null:Number(body.data.minecraftExempt);
  const result = await dbRun(`UPDATE users SET is_whitelisted=COALESCE(?,is_whitelisted),
    launcher_access_exempt=CASE WHEN COALESCE(?,is_whitelisted)=0 THEN 0 ELSE COALESCE(?,launcher_access_exempt) END,
    minecraft_access_blocked=COALESCE(?,minecraft_access_blocked),
    minecraft_access_exempt=CASE WHEN COALESCE(?,is_whitelisted)=0 OR COALESCE(?,minecraft_access_blocked)=1 THEN 0 ELSE COALESCE(?,minecraft_access_exempt) END
    WHERE discord_id=?`, [allowed,allowed,exempt,gameBlocked,allowed,gameBlocked,gameExempt,req.params.id]);
  if (!result.changes) return res.status(404).json({ error: 'Игрок не найден' });
  if(body.data.allowed!==undefined)await audit(body.data.allowed ? 'players:allow' : 'players:block', req.params.id, 'Личный доступ к лаунчеру и игре; личный запрет отменяет исключение.');
  if(body.data.launcherExempt!==undefined)await audit(body.data.launcherExempt?'players:exempt':'players:unexempt',req.params.id,'Исключение из общей блокировки лаунчера');
  if(body.data.minecraftBlocked!==undefined)await audit(body.data.minecraftBlocked?'minecraft:player-block':'minecraft:player-allow',req.params.id,'Личный доступ к запуску Minecraft');
  if(body.data.minecraftExempt!==undefined)await audit(body.data.minecraftExempt?'minecraft:exempt':'minecraft:unexempt',req.params.id,'Исключение из общей блокировки Minecraft');
  res.json({ success: true });
}));
router.post('/news/preview', wrap(async (req, res) => {
  const input = z.object({ content: z.string().max(20000) }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'Текст слишком длинный' });
  res.json({ html: renderNewsContent(input.data.content) });
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
