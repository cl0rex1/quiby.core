import { useCallback, useEffect, useRef, useState } from 'react';
import { LockKeyhole, Loader2, RefreshCw } from 'lucide-react';

export function useLauncherAccess(server: string, token?: string) {
  const [access, setAccess] = useState<{ closed: boolean; message: string; canLogin: boolean; token?: string } | null>(null);
  const [checking, setChecking] = useState(true), [error, setError] = useState('');
  const refresh = useRef<() => void>(() => {});
  useEffect(() => {
    const controller = new AbortController(); let busy = false;
    const check = async () => {
      if (busy) return; busy = true; setChecking(true);
      try {
        const response = await fetch(`${server}/api/launcher/access`, { headers: token ? {Authorization:'Bearer '+token} : {}, cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
        const result = await response.json();
        if (!response.ok || typeof result.closed !== 'boolean') throw Error();
        if (!controller.signal.aborted) { setAccess({ token, closed: result.closed, canLogin: result.canLogin===true, message: typeof result.message === 'string' ? result.message : 'Попробуйте позже.' }); setError(''); }
      } catch { if (!controller.signal.aborted) setError('Не удалось проверить доступ. Проверьте соединение и повторите попытку.'); }
      finally { if (!controller.signal.aborted) setChecking(false); busy = false; }
    };
    refresh.current = () => void check(); void check();
    const timer = window.setInterval(check, 30000);
    window.addEventListener('focus', refresh.current);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh.current); };
  }, [server,token]);
  return { access:access?.token===token?access:null, checking, error, retry: useCallback(() => refresh.current(), []) };
}

export function LauncherAccessScreen({ message, checking, loading, unavailable, onRetry, onLogin }: { message: string; checking: boolean; loading: boolean; unavailable: boolean; onRetry: () => void; onLogin?:()=>void }) {
  return <main className="launcher-access-screen view-enter">
    <section aria-labelledby="launcher-access-title"><span className="access-lock">{loading ? <Loader2 className="loading-spinner" size={25}/> : <LockKeyhole size={25}/>}</span>
      <p className="page-kicker">QUIBY / CORE</p><h1 id="launcher-access-title">{loading ? 'Проверяем доступ' : unavailable ? 'Нет соединения' : 'Доступ временно закрыт'}</h1>
      <p role="status">{message}</p><button className="ui-button" disabled={checking} onClick={onRetry}><RefreshCw size={15} className={checking ? 'loading-spinner' : ''}/>{checking ? 'Проверяем…' : 'Проверить снова'}</button>
      {onLogin && <button className="ui-button" onClick={onLogin}>Войти через Discord</button>}
      {!loading && <small>{unavailable ? 'Повторим проверку автоматически.' : 'Лаунчер откроется автоматически, когда доступ восстановят.'}</small>}
    </section>
  </main>;
}
