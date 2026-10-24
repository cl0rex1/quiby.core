import { dbGet, dbRun } from '../models/db';

export const defaultGameAccessMessage = 'Запуск Minecraft временно закрыт. Попробуйте позже.';

export async function getGameAccess() {
  const row = await dbGet<{ closed: number; message: string; updated_at: string }>('SELECT * FROM minecraft_access WHERE id=1');
  return { closed: Boolean(row?.closed), message: row?.message || defaultGameAccessMessage, updatedAt: row?.updated_at || null };
}

export async function getPlayerGameAccess(discordId?: string) {
  const access = await getGameAccess();
  const player = discordId && !discordId.startsWith('dev_')
    ? await dbGet<{ is_whitelisted: number; minecraft_access_blocked: number; minecraft_access_exempt: number }>(
      'SELECT is_whitelisted,minecraft_access_blocked,minecraft_access_exempt FROM users WHERE discord_id=?', [discordId]) : undefined;
  if (player && (!player.is_whitelisted || player.minecraft_access_blocked)) {
    return { ...access, closed: true, personalBlocked: true, message: 'Запуск Minecraft для вашего аккаунта запрещён администрацией.' };
  }
  return { ...access, closed: access.closed && !Boolean(player?.minecraft_access_exempt), personalBlocked: false };
}

export async function setGameAccess(closed: boolean, message: string) {
  await dbRun(`INSERT INTO minecraft_access(id,closed,message) VALUES(1,?,?)
    ON CONFLICT(id) DO UPDATE SET closed=excluded.closed,message=excluded.message,updated_at=CURRENT_TIMESTAMP`, [Number(closed), message || defaultGameAccessMessage]);
  return getGameAccess();
}
