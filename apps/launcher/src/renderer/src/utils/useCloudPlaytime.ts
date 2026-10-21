import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthSession } from '@quiby/shared';
import { version } from '../../../../package.json';

type Counter = { deviceId: string; recordedSeconds: number; legacySeconds: number; totalSeconds: number };
const seconds = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;

export function useCloudPlaytime(session: AuthSession | null, server: string) {
  const [total, setTotal] = useState(0);
  const addRef = useRef<(seconds: number) => void>(() => {});
  useEffect(() => {
    if (!session) { setTotal(0); addRef.current = () => {}; return; }
    const key = 'quiby_playtime_' + session.user.discordId;
    let counter: Counter;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (!saved || typeof saved.deviceId !== 'string') throw Error();
      counter = { deviceId: saved.deviceId, recordedSeconds: seconds(saved.recordedSeconds), legacySeconds: seconds(saved.legacySeconds), totalSeconds: seconds(saved.totalSeconds) };
    } catch {
      const owner = localStorage.getItem('quiby_playtime_legacy_owner');
      const legacy = !owner || owner === session.user.discordId ? seconds(Number(localStorage.getItem('quiby_total_playtime'))) : 0;
      if (!owner) localStorage.setItem('quiby_playtime_legacy_owner', session.user.discordId);
      counter = { deviceId: crypto.randomUUID(), recordedSeconds: 0, legacySeconds: legacy, totalSeconds: legacy };
    }
    counter.totalSeconds = Math.max(counter.totalSeconds, seconds(session.user.totalPlaytimeSeconds));
    const persist = () => { localStorage.setItem(key, JSON.stringify(counter)); setTotal(counter.totalSeconds); };
    persist();
    const controller = new AbortController(); let busy = false;
    const sync = async () => {
      if (busy || controller.signal.aborted) return;
      busy = true; const sent = counter.recordedSeconds; let succeeded = false;
      try {
        const response = await fetch(`${server}/api/game/playtime`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}`, 'x-quiby-launcher-version': version },
          body: JSON.stringify({ deviceId: counter.deviceId, totalSeconds: sent, legacySeconds: counter.legacySeconds }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
        const result = await response.json();
        if (!response.ok || !Number.isSafeInteger(result.totalSeconds) || result.totalSeconds < 0) throw Error();
        if (controller.signal.aborted) return;
        counter.totalSeconds = result.totalSeconds + counter.recordedSeconds - sent; persist(); succeeded = true;
      } catch { /* The local device counter retries without counting a minute twice. */ }
      finally { busy = false; if (succeeded && counter.recordedSeconds > sent) void sync(); }
    };
    addRef.current = amount => {
      const elapsed = seconds(amount); if (!elapsed) return;
      counter.recordedSeconds += elapsed; counter.totalSeconds += elapsed; persist(); void sync();
    };
    const focus = () => { void sync(); };
    void sync(); const timer = window.setInterval(sync, 30000); window.addEventListener('focus', focus);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', focus); addRef.current = () => {}; };
  }, [session?.user.discordId, session?.token, server]);
  return { total, add: useCallback((seconds: number) => addRef.current(seconds), []) };
}
