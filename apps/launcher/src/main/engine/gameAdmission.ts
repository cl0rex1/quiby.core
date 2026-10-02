import { generateKeyPairSync } from 'node:crypto';

export async function prepareGameAdmission(serverBaseUrl: string, sessionToken: string, launcherVersion: string): Promise<Record<string, string>> {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const response = await fetch(`${serverBaseUrl.replace(/\/$/, '')}/api/game/join-ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}`, 'x-quiby-launcher-version': launcherVersion },
    body: JSON.stringify({ publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64') }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Не удалось получить разрешение на вход в Minecraft. Проверьте доступ к аккаунту и обновление API.');
  const data = await response.json() as { ticket?: string };
  if (typeof data.ticket !== 'string' || data.ticket.length > 4096 || !data.ticket) throw new Error('Сервер вернул некорректное разрешение на вход.');
  return {
    QUIBY_GAME_TICKET: data.ticket,
    QUIBY_GAME_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
  };
}
