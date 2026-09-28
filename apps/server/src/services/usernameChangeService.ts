import { dbGet, dbRun } from '../models/db';
import { generateMinecraftUUID } from './discord';

export async function submitUsernameChangeRequest(input: {
  discordId: string;
  currentUsername: string;
  requestedUsername: string;
  reason: string;
}) {
  if (input.currentUsername.toLowerCase() === input.requestedUsername.toLowerCase()) {
    return { code: 400, error: 'Новый ник совпадает с текущим.' };
  }

  const taken = await dbGet(
    'SELECT 1 FROM users WHERE mc_username = ? COLLATE NOCASE AND discord_id != ?',
    [input.requestedUsername, input.discordId],
  );
  if (taken) return { code: 409, error: 'Этот ник уже привязан к другому аккаунту.' };

  const pending = await dbGet<{ id: number }>(
    "SELECT id FROM mc_username_change_requests WHERE discord_id = ? AND status = 'pending' LIMIT 1",
    [input.discordId],
  );
  if (pending) return { code: 409, error: 'У вас уже есть заявка на смену ника на рассмотрении.' };

  const inserted = await dbRun(
    `INSERT INTO mc_username_change_requests
      (discord_id, current_username, requested_username, reason, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [input.discordId, input.currentUsername, input.requestedUsername, input.reason],
  );
  return {
    code: 201,
    request: {
      id: inserted.lastID,
      current_username: input.currentUsername,
      requested_username: input.requestedUsername,
      status: 'pending',
    },
  };
}

export async function reviewUsernameChangeRequest(
  id: number,
  decision: 'approved' | 'rejected',
  reviewerDiscordId: string,
  reason: string,
) {
  const request = await dbGet<any>(
    "SELECT * FROM mc_username_change_requests WHERE id = ? AND status = 'pending'",
    [id],
  );
  if (!request) {
    const existing = await dbGet<any>('SELECT * FROM mc_username_change_requests WHERE id = ?', [id]);
    return existing
      ? { code: 409, error: 'Заявка уже рассмотрена', request: existing }
      : { code: 404, error: 'Заявка не найдена' };
  }

  if (decision === 'approved') {
    const update = await dbRun(
      `UPDATE users SET mc_username = ?, uuid = ?
       WHERE discord_id = ? AND mc_username = ? COLLATE NOCASE
       AND NOT EXISTS (
         SELECT 1 FROM users WHERE mc_username = ? COLLATE NOCASE AND discord_id != ?
       )`,
      [
        request.requested_username,
        generateMinecraftUUID(request.requested_username),
        request.discord_id,
        request.current_username,
        request.requested_username,
        request.discord_id,
      ],
    );
    if (!update.changes) {
      return { code: 409, error: 'Ник успел измениться или уже занят; профиль не изменён.' };
    }
  }

  await dbRun(
    `UPDATE mc_username_change_requests SET status = ?, reviewer_discord_id = ?,
      decision_reason = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`,
    [decision, reviewerDiscordId, reason, id],
  );
  return {
    code: 200,
    request: await dbGet<any>('SELECT * FROM mc_username_change_requests WHERE id = ?', [id]),
  };
}
