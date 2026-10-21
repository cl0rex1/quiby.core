import { Router, RequestHandler, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { config } from '../config';
import { dbAll, dbGet, dbRun } from '../models/db';

export const gameBridgeRoutes = Router();
export const botChatRoutes = Router();
const handle = (fn: (req:Request,res:Response)=>Promise<unknown>):RequestHandler => (req,res,next) => { void fn(req,res).catch(next); };
const authorize = (key: () => string, header: string): RequestHandler => (req, res, next) => {
  const expected = Buffer.from(key()), supplied = Buffer.from(req.get(header) || '');
  if (!expected.length) return res.status(503).json({ error: 'Chat bridge is not configured' });
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return res.sendStatus(403);
  res.set('Cache-Control', 'no-store'); next();
};
gameBridgeRoutes.use(authorize(() => config.gameBridgeApiKey, 'x-game-bridge-key'));
botChatRoutes.use(authorize(() => config.modReviewBotApiKey, 'x-bot-key'));
const snowflake = z.string().regex(/^\d{17,20}$/);
const image = z.string().max(2048).url().refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && !url.port
    && ['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname) && url.pathname.startsWith('/attachments/');
});
const eventSchema = z.object({
  eventId: z.string().uuid(), scope: z.enum(['local', 'global', 'join', 'leave']), uuid: z.string().uuid(),
  username: z.string().regex(/^[A-Za-z0-9_]{3,16}$/), text: z.string().max(512),
  mentions: z.array(z.string().regex(/^[A-Za-z0-9_]{3,16}$/)).max(10),
}).strict();
const inboundSchema = z.object({
  eventId: snowflake, discordId: snowflake, username: z.string().min(1).max(80), text: z.string().max(2000),
  mentions: z.array(snowflake).max(10), images: z.array(image).max(4),
}).strict().refine(value => value.text.trim().length > 0 || value.images.length > 0);
type User = { uuid: string; mc_username: string; discord_id: string };
const clean = (text: string) => text.replace(/[\p{Cc}\p{Cf}§]/gu, ' ').trim();
async function mentionsByName(names: string[]): Promise<User[]> {
  return names.length ? dbAll<User>(`SELECT uuid,mc_username,discord_id FROM users WHERE is_whitelisted=1 AND LOWER(mc_username) IN (${names.map(() => '?').join(',')})`, names.map(n => n.toLowerCase())) : [];
}
async function prune() {
  // Keep failed delivery for two days, then discard stale chat rather than replaying it indefinitely.
  await dbRun('DELETE FROM game_chat_events WHERE created_at < ?', [Date.now() - 2 * 86400_000]);
}
gameBridgeRoutes.post('/events', handle(async (req, res) => {
  const input = z.object({ events: z.array(eventSchema).min(1).max(50) }).strict().safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'Invalid Minecraft chat events' });
  const rejected: string[] = [];
  for (const event of input.data.events) {
    const owner = await dbGet<User>('SELECT uuid,mc_username,discord_id FROM users WHERE LOWER(uuid)=LOWER(?)', [event.uuid]);
    // A renamed/deleted account must not pin unrelated players behind its stale event.
    if (!owner || owner.mc_username.toLowerCase() !== event.username.toLowerCase()) { rejected.push(event.eventId); continue; }
    const mentions = await mentionsByName(event.mentions);
    await dbRun(`INSERT OR IGNORE INTO game_chat_events(event_id,direction,scope,uuid,username,message,mentions_json,discord_id,created_at)
      VALUES(?,'minecraft',?,?,?,?,?,?,?)`, [event.eventId,event.scope,owner.uuid,owner.mc_username,clean(event.text),JSON.stringify(mentions.map(u => ({ uuid:u.uuid, name:u.mc_username, discordId:u.discord_id }))),owner.discord_id,Date.now()]);
  }
  await prune(); return res.json({ success: true, rejected });
}));
botChatRoutes.get('/events', handle(async (_req, res) => {
  await prune();
  const rows = await dbAll<any>("SELECT * FROM game_chat_events WHERE direction='minecraft' AND acked=0 ORDER BY id LIMIT 50");
  return res.json({ events: rows.map(row => ({ id:row.id,scope:row.scope,uuid:row.uuid,username:row.username,text:row.message,
    mentions:JSON.parse(row.mentions_json),avatarUrl:`https://api.quiby.me/api/skins/head/${row.uuid.replace(/-/g,'')}.png` })) });
}));
botChatRoutes.post('/events/:id/ack', handle(async (req, res) => {
  if (!/^\d{1,15}$/.test(req.params.id)) return res.sendStatus(400);
  await dbRun("UPDATE game_chat_events SET acked=1 WHERE id=? AND direction='minecraft'", [req.params.id]);
  return res.json({ success:true });
}));
botChatRoutes.post('/messages', handle(async (req, res) => {
  const input = inboundSchema.safeParse(req.body);
  if (!input.success) return res.status(400).json({ error:'Invalid Discord message' });
  const message = input.data;
  const owner = await dbGet<User>('SELECT uuid,mc_username,discord_id FROM users WHERE discord_id=?', [message.discordId]);
  const targets = message.mentions.length ? await dbAll<User>(`SELECT uuid FROM users WHERE is_whitelisted=1 AND discord_id IN (${message.mentions.map(() => '?').join(',')})`, message.mentions) : [];
  await dbRun(`INSERT OR IGNORE INTO game_chat_events(event_id,direction,scope,uuid,username,message,mentions_json,images_json,discord_id,created_at)
    VALUES(?,'discord','global',?,?,?,?,?,?,?)`, ['discord:'+message.eventId,owner?.uuid || null,owner?.mc_username || clean(message.username),clean(message.text),JSON.stringify(targets.map(u => u.uuid)),JSON.stringify(message.images),message.discordId,Date.now()]);
  return res.json({ success:true });
}));
gameBridgeRoutes.get('/messages', handle(async (_req, res) => {
  await prune();
  const rows = await dbAll<any>("SELECT * FROM game_chat_events WHERE direction='discord' AND scope='global' AND acked=0 ORDER BY id LIMIT 50");
  return res.json({ messages:rows.map(row => ({ id:row.id,username:row.username,text:row.message,mentions:JSON.parse(row.mentions_json),images:JSON.parse(row.images_json) })) });
}));
gameBridgeRoutes.post('/messages/:id/ack', handle(async (req,res) => {
  if (!/^\d{1,15}$/.test(req.params.id)) return res.sendStatus(400);
  await dbRun("UPDATE game_chat_events SET acked=1 WHERE id=? AND direction='discord'", [req.params.id]);
  return res.json({ success:true });
}));
