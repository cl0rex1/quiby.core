import { PackLogo } from './PackLogo';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthSession } from '@quiby/shared';
import { Palette, Upload } from 'lucide-react';
import type { ResourcePackItem as Pack } from '../../../main/engine/resourcePackCatalog';
import type { CustomModItem } from '../views/ModsView';
import { ModWhitelistModal } from './ModWhitelistModal';
import { ContentToolbar, ContentSearch, useContentView } from './ContentToolbar';
import { ContentSelectionDock } from './ContentSelectionDock';
import { ContentFileCard } from './ContentFileCard';
import { useFileRemoval } from '../utils/useFileRemoval';
import { allVisibleSelected, toggleVisibleSelection } from '../utils/contentSelection';
import { useFileDrop } from '../utils/useFileDrop';

// Display cache only. Admission at launch independently verifies the actual files.
const inventories = new Map<string, Pack[]>();
export function ResourcePacksExplorer({ gameDir, files, session, onNotify, gameActive = false }: {
  gameActive?: boolean;
  gameDir: string; files: { path: string; sha256: string }[]; session?: AuthSession | null;
  onNotify?: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}) {
  const { container, animateRemoval } = useFileRemoval();
  const cacheKey = `${gameDir}:${session?.user.discordId || ''}`;
  const [packs, setPacks] = useState<Pack[]>(() => inventories.get(cacheKey) || []);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useContentView('resourcepacks');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState<CustomModItem | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const statuses = useRef(new Map<string, string>());
  const message = (err: unknown) => err instanceof Error ? err.message : 'Не удалось выполнить действие';
  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const current = generation.current;
    setRefreshing(true);
    const commit = (items: Pack[]) => {
      if (current !== generation.current) return;
      inventories.set(cacheKey, items);
      if (inventories.size > 16) inventories.delete(inventories.keys().next().value!);
      setPacks(items);
      setSelected(previous => previous.filter(name => items.some(item => item.filename === name && !item.official)));
    };
    const pending = (async () => {
      try {
        const local = await window.quibyApi.getResourcePackInventory(gameDir);
        if (current !== generation.current) return;
        const cached = inventories.get(cacheKey) || [];
        commit(local.map((item: Pack) => cached.find(old => old.filename === item.filename && old.size === item.size && old.updatedAt === item.updatedAt) || item));
        if (!session?.token) return;
        const verified = await window.quibyApi.getResourcePacks(gameDir, files, session.token);
        if (current !== generation.current) return;
        for (const item of verified) {
          if (!item.hashSha1 || item.status === 'error') continue;
          const previous = statuses.current.get(item.hashSha1);

          statuses.current.set(item.hashSha1, item.status);
        }
        commit(verified);
        setError('');
      } catch (err) { if (current === generation.current) setError(message(err)); }
      finally { if (current === generation.current) { inFlight.current = null; setRefreshing(false); } }
    })();
    inFlight.current = pending;
    return pending;
  }, [cacheKey, gameDir, files, session?.token, onNotify]);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    generation.current++;
    inFlight.current = null;
    const cached = inventories.get(cacheKey) || [];
    setPacks(cached); setSelected([]); setError('');
    statuses.current = new Map(cached.filter(item => item.hashSha1).map(item => [item.hashSha1!, item.status]));
    const update = () => { if (!document.hidden) void refreshRef.current(); };
    update();
    const timer = window.setInterval(update, 20_000);
    window.addEventListener('focus', update);
    return () => { generation.current++; window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, [cacheKey, session?.token]);
  const fresh = async () => { if (inFlight.current) await inFlight.current; await refreshRef.current(); };
  const add = async (incoming: FileList | null) => {
    if (!incoming || busy || gameActive || !session?.token) return;
    setBusy(true); setError('');
    let added = 0; let failure = '';
    try {
      for (const file of Array.from(incoming)) {
        if (!/\.zip$/i.test(file.name) || !file.size || file.size > 100 * 1024 * 1024) throw new Error(`Файл ${file.name}: нужен ZIP размером до 100 МБ`);
        await window.quibyApi.addResourcePack(gameDir, file.name, new Uint8Array(await file.arrayBuffer()));
        added++;
      }
    } catch (err) { failure = message(err); }
    finally { await fresh(); if (failure) setError(failure); setBusy(false); if (input.current) input.current.value = ''; }
    if (added) onNotify?.('Ресурспаки добавлены', `Файлов: ${added}`, 'success');
  };
  const dragging = useFileDrop(incoming => void add(incoming), !gameActive);
  const request = async (pack: Pack) => {
    setBusy(true); setError('');
    try {
      const staged = await window.quibyApi.stageResourcePackReview(gameDir, pack.filename);
      setReview({ id: staged, name: pack.filename.replace(/\.zip$/i, ''), filename: pack.filename, hashSha1: staged, size: pack.size, enabled: false });
    } catch (err) { setError(message(err)); } finally { setBusy(false); }
  };
  const remove = async (names: string[]) => {
    if (busy || gameActive) return;
    setBusy(true); setError('');
    const removed: string[] = []; let failure = '';
    try {
      for (const name of names) {
        if (packs.find(pack => pack.filename === name)?.official) continue;
        await window.quibyApi.trashResourcePack(gameDir, name); removed.push(name);
      }
    } catch (err) { failure = message(err); }
    finally {
      await animateRemoval(removed);
      setPacks(previous => previous.filter(pack => !removed.includes(pack.filename)));
      setSelected(previous => previous.filter(name => !removed.includes(name)));
      await fresh(); if (failure) setError(failure); setBusy(false);
    }
    if (removed.length) onNotify?.('Ресурспаки удалены', `Файлов: ${removed.length}`, 'info');
  };
  const filtered = packs.filter(pack => pack.filename.toLowerCase().includes(search.trim().toLowerCase()));
  const selectable = filtered.filter(pack => !pack.official && pack.status !== 'checking').map(pack => pack.filename);
  const selectAll = () => setSelected(previous => toggleVisibleSelection(previous, selectable));
  const labels: Record<string, string> = { checking: 'Проверяем', error: 'Проверка недоступна', approved: 'Одобрен', pending: 'На проверке', rejected: 'Отклонён' };
  return <section className={`content-library resource-pack-library ${selected.length ? 'has-selection' : ''}`} aria-label="Библиотека ресурспаков">
    <input ref={input} type="file" accept=".zip" multiple hidden onChange={event => void add(event.target.files)}/>
    <ContentToolbar label="Ресурспаки" total={packs.length} visible={filtered.length} mode={mode} onMode={setMode} busy={busy || gameActive} refreshing={refreshing}
      selection={{ allSelected: allVisibleSelected(selected, selectable), count: selectable.length, onSelectAll: selectAll }} onAdd={session?.token ? () => input.current?.click() : undefined}
      onFolder={() => void window.quibyApi.openResourcePacksFolder(gameDir).catch((err: unknown) => setError(message(err)))} onRefresh={() => void refresh()}/>
    <ContentSearch value={search} onChange={setSearch} label="Поиск ресурспаков" hint=".zip"/>
    {error && <div className="inline-error" role="alert">{error}</div>}
    {dragging && <div className="content-import-overlay"><Upload size={36}/><strong>Отпустите ресурспаки для импорта</strong><span>ZIP · до 100 МБ</span></div>}
    <ContentSelectionDock count={selected.length} total={packs.filter(pack => !pack.official).length} allSelected={allVisibleSelected(selected, selectable)} busy={busy || gameActive} onSelectAll={selectAll} onClear={() => setSelected([])} onDelete={() => void remove(selected)}/>
    <div ref={container} className="library-scroll">
      {filtered.length ? <div className={`library-grid is-${mode}`}>{filtered.map(pack => <ContentFileCard key={pack.filename}
        fileId={pack.filename} name={pack.filename.replace(/\.zip$/i, '')} filename={pack.filename} icon={<PackLogo src={pack.iconUrl} kind="resourcepacks"/>}
        description={pack.official ? 'Ресурспак сборки' : 'Ресурспак'} size={`${(pack.size / 1048576).toFixed(1)} МБ`}
        notice={!pack.isAllowed && !pack.official ? labels[pack.status] || 'Нет допуска' : undefined} reason={pack.reason}
        tone={pack.status === 'rejected' ? 'danger' : 'warning'} busy={busy || gameActive || pack.status === 'checking'}
        selected={selected.includes(pack.filename)}
        onSelect={!pack.official ? () => setSelected(previous => previous.includes(pack.filename) ? previous.filter(name => name !== pack.filename) : [...previous, pack.filename]) : undefined}
        onDelete={!pack.official ? () => void remove([pack.filename]) : undefined}>
        {!pack.official && !pack.isAllowed && <button className="mod-review-button" disabled={busy || gameActive || !session?.token || pack.status === 'checking'} onClick={() => void request(pack)}>{pack.status === 'pending' ? 'Проверить отправку' : 'Подать заявку'}</button>}
      </ContentFileCard>)}</div> : <div className="library-empty"><div className="content-empty-icon"><Palette size={28}/></div><h2>{search ? 'Ничего не найдено' : refreshing ? 'Читаем папку…' : 'Ресурспаков пока нет'}</h2><p>{search ? 'Попробуйте другое название.' : 'Добавьте ZIP. Для пользовательского ресурспака потребуется допуск.'}</p></div>}
    </div>
    <ModWhitelistModal isOpen={Boolean(review)} mod={review} session={session} onClose={() => setReview(null)}/>
  </section>;
}
