import React, { useEffect, useRef, useState } from 'react';
import { AuthSession } from '@quiby/shared';
import { Package, Plus, RefreshCw, Upload, FolderOpen, Trash2 } from 'lucide-react';
import { ModWhitelistModal } from './ModWhitelistModal';
import { CustomModItem } from '../views/ModsView';
import { useFileDrop } from '../utils/useFileDrop';

type Pack = { filename: string; hashSha1: string; size: number; official: boolean; status: string; isAllowed: boolean; reason: string };
export function ResourcePacksExplorer({ gameDir, files, session, onNotify }: {
  gameDir: string; files: { path: string; sha256: string }[]; session?: AuthSession | null;
  onNotify?: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<CustomModItem | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const statuses = useRef(new Map<string, string>());
  const refreshing = useRef(false);
  const refresh = async () => {
    if (!session?.token || refreshing.current) return;
    refreshing.current = true;
    try {
      const items: Pack[] = await window.quibyApi.getResourcePacks(gameDir, files, session.token);
      for (const item of items) {
        const previous = statuses.current.get(item.hashSha1);
        if (previous && previous !== item.status) onNotify?.('Решение по ресурспаку', `${item.filename}: ${item.reason}`, item.isAllowed ? 'success' : 'warning');
        statuses.current.set(item.hashSha1, item.status);
      }
      setPacks(items); setError('');
    } catch (err) { setError(String(err)); }
    finally { refreshing.current = false; }
  };
  useEffect(() => {
    statuses.current.clear(); setPacks([]);
    void refresh();
    const timer = setInterval(() => void refresh(), 20000);
    return () => clearInterval(timer);
  }, [gameDir, session?.token]);
  const add = async (incoming: FileList | null) => {
    if (!incoming || busy) return;
    setBusy(true);
    try {
      for (const file of Array.from(incoming)) {
        if (!/\.zip$/i.test(file.name) || file.size > 100 * 1024 * 1024) throw new Error('Нужен ZIP до 100 МиБ');
        await window.quibyApi.addResourcePack(gameDir, file.name, new Uint8Array(await file.arrayBuffer()));
      }
      await refresh();
      onNotify?.('Ресурспаки добавлены', 'Для сторонних паков подайте заявку. После одобрения перезапустите игру.', 'info');
    } catch (err) { setError(String(err)); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const dragging = useFileDrop(incoming => void add(incoming));
  const request = async (pack: Pack) => {
    try {
      const hash = await window.quibyApi.stageResourcePackReview(gameDir, pack.filename);
      setReview({ id: hash, name: pack.filename.replace(/\.zip$/i, ''), filename: pack.filename, size: pack.size, enabled: false, hashSha1: hash });
    } catch (err) { setError(String(err)); }
  };
  return <section className="content-library resource-pack-library view-enter">
    <input ref={input} type="file" accept=".zip" multiple hidden onChange={e => void add(e.target.files)} />
    <div className="content-toolbar"><div className="library-count">Ресурспаки <span>{packs.length}</span></div><div className="toolbar-actions">
      <button className="ui-button" onClick={() => void window.quibyApi.openResourcePacksFolder(gameDir).catch(err => setError(String(err)))}><FolderOpen size={14}/>Папка</button>
      <button className="ui-button" onClick={() => void refresh()}><RefreshCw size={14}/>Обновить</button>
      <button className="ui-button is-primary" disabled={busy || !session?.token} onClick={() => input.current?.click()}><Plus size={14}/>Добавить ZIP</button>
    </div></div>
    <p className="text-xs text-zinc-400">Сторонние ресурспаки доступны после проверки администрации. Новый допуск применяется при следующем запуске игры.</p>
    {!session?.token && <p className="inline-error">Войдите в аккаунт для проверки ресурспаков.</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    {dragging && <div className="content-import-overlay"><Upload size={36}/><strong>Отпустите ZIP ресурспаков</strong></div>}
    <div className="library-scroll"><div className="library-grid">{packs.map(pack => <article className="library-file" key={pack.filename}>
      <div className="library-file-icon"><Package size={23}/></div>
      <div className="library-file-copy"><h3 title={pack.filename}>{pack.filename}</h3><p>{pack.official ? 'Сборка' : pack.isAllowed ? 'Одобрен' : pack.status === 'pending' ? 'На проверке' : pack.status === 'rejected' ? 'Отклонён' : 'Нет допуска'}</p><span>{pack.reason}</span></div>
      {!pack.official && !pack.isAllowed && <button className="ui-button is-primary" disabled={busy || !session?.token} onClick={() => void request(pack)}>Подать заявку</button>}
      {!pack.official && <button className="file-trash" title="В корзину" onClick={() => void window.quibyApi.trashResourcePack(gameDir, pack.filename).then(refresh).catch(err => setError(String(err)))}><Trash2 size={15}/></button>}
    </article>)}</div>{!packs.length && <div className="library-empty"><Package size={44}/><h2>Ресурспаки</h2><p>Добавьте ZIP для проверки и отправки в вайтлист.</p></div>}</div>
    <ModWhitelistModal isOpen={!!review} mod={review} session={session} onClose={() => setReview(null)} onSuccess={() => { onNotify?.('Заявка отправлена', 'ZIP доставлен в Discord. Решение появится автоматически.', 'success'); void refresh(); }}/>
  </section>;
}
