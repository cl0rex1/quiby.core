import type { AuthSession } from '@quiby/shared';

/** Serialize changes so an earlier upload cannot overwrite a newer selection. */
export function createSkinSynchronizer(serverUrl: string, request: typeof fetch = fetch, isCurrentSession: (session: AuthSession) => boolean = () => true) {
  let tail: Promise<void> = Promise.resolve();
  let lastSuccess = '';
  let lastQueued = '';
  const pending = new Map<string, Promise<void>>();
  return (session: AuthSession, dataUri: string | null): Promise<void> => {
    if (!isCurrentSession(session)) return Promise.reject(new Error('Для смены скина войдите в аккаунт.'));
    const key = JSON.stringify([session.token, dataUri]);
    const existing = pending.get(key);
    if (existing && key === lastQueued) return existing;
    if (!pending.size && key === lastSuccess) return Promise.resolve();
    lastQueued = key;
    const task = tail.catch(() => {}).then(async () => {
      if (!isCurrentSession(session)) throw new Error('Смена скина отменена: аккаунт вышел из системы.');
      const response = await request(`${serverUrl}/api/skins/me`, {
        method: dataUri ? 'PUT' : 'DELETE',
        headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        ...(dataUri ? { body: JSON.stringify({ dataUri }) } : {}),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(`Скин не сохранён (HTTP ${response.status}). ${detail?.error || 'Проверьте соединение и повторите выбор.'}`);
      }
      lastSuccess = key;
    }).finally(() => { if (pending.get(key) === task) pending.delete(key); });
    pending.set(key, task);
    tail = task;
    return task;
  };
}
