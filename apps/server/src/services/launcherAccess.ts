import { dbGet, dbRun } from '../models/db';

export const defaultAccessMessage = 'Доступ к лаунчеру временно закрыт. Попробуйте позже.';
export async function hasLauncherExceptions() {
  return Boolean(await dbGet('SELECT id FROM users WHERE is_whitelisted=1 AND launcher_access_exempt=1 LIMIT 1'));
}
export async function getPlayerLauncherAccess(discordId?: string) {
  const access = await getLauncherAccess();
  const player = discordId && !discordId.startsWith('dev_')
    ? await dbGet<{is_whitelisted:number;launcher_access_exempt:number}>('SELECT is_whitelisted,launcher_access_exempt FROM users WHERE discord_id=?',[discordId]) : undefined;
  if (player && !player.is_whitelisted) return {...access,closed:true,personalBlocked:true,canLogin:await hasLauncherExceptions(),message:'Доступ к вашему аккаунту закрыт администрацией.'};
  return {...access,personalBlocked:false,closed:access.closed && !Boolean(player?.launcher_access_exempt),canLogin:access.closed && await hasLauncherExceptions()};
}
export async function getLauncherAccess() {
  const row = await dbGet<{ closed: number; message: string; updated_at: string }>('SELECT * FROM launcher_access WHERE id=1');
  return { closed: Boolean(row?.closed), message: row?.message || defaultAccessMessage, updatedAt: row?.updated_at || null };
}
export async function setLauncherAccess(closed: boolean, message: string) {
  await dbRun(`INSERT INTO launcher_access(id,closed,message) VALUES(1,?,?)
    ON CONFLICT(id) DO UPDATE SET closed=excluded.closed,message=excluded.message,updated_at=CURRENT_TIMESTAMP`, [closed ? 1 : 0, message || defaultAccessMessage]);
  return getLauncherAccess();
}
