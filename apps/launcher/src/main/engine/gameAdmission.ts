import { generateKeyPairSync } from 'node:crypto';

export async function requireGameLaunchAccess(serverBaseUrl: string, sessionToken: string): Promise<void> {
  const response = await fetch(`${serverBaseUrl.replace(/\/$/, '')}/api/game/access`, {
    headers: { Authorization: `Bearer ${sessionToken}` }, cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  const access = await response.json() as { closed?: boolean; message?: string };
  if (!response.ok || typeof access.closed !== 'boolean') throw new Error('Не удалось проверить доступ к запуску Minecraft. Повторите попытку.');
  if (access.closed) throw new Error(access.message || 'Запуск Minecraft временно закрыт.');
}

export async function prepareGameAdmission(serverBaseUrl: string, sessionToken: string, launcherVersion: string): Promise<Record<string, string>> {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const response = await fetch(`${serverBaseUrl.replace(/\/$/, '')}/api/game/join-ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}`, 'x-quiby-launcher-version': launcherVersion },
    body: JSON.stringify({ publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64') }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { code?: string; error?: string };
    throw new Error(error.code === 'MINECRAFT_ACCESS_CLOSED' && error.error ? error.error : 'Не удалось получить разрешение на вход в Minecraft. Проверьте доступ к аккаунту и обновление API.');
  }
  const data = await response.json() as { ticket?: string };
  if (typeof data.ticket !== 'string' || data.ticket.length > 4096 || !data.ticket) throw new Error('Сервер вернул некорректное разрешение на вход.');
  return {
    QUIBY_GAME_TICKET: data.ticket,
    QUIBY_GAME_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
  };
}
