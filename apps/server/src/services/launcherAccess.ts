import { dbGet, dbRun } from '../models/db';

export const defaultAccessMessage = 'Доступ к лаунчеру временно закрыт. Попробуйте позже.';
export async function getLauncherAccess() {
  const row = await dbGet<{ closed: number; message: string; updated_at: string }>('SELECT * FROM launcher_access WHERE id=1');
  return { closed: Boolean(row?.closed), message: row?.message || defaultAccessMessage, updatedAt: row?.updated_at || null };
}
export async function setLauncherAccess(closed: boolean, message: string) {
  await dbRun(`INSERT INTO launcher_access(id,closed,message) VALUES(1,?,?)
    ON CONFLICT(id) DO UPDATE SET closed=excluded.closed,message=excluded.message,updated_at=CURRENT_TIMESTAMP`, [closed ? 1 : 0, message || defaultAccessMessage]);
  return getLauncherAccess();
}
