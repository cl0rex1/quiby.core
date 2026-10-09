import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Image as ImageIcon, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

import { ContentToolbar, ContentSearch, useContentView } from './ContentToolbar';
import { allVisibleSelected, toggleVisibleSelection } from '../utils/contentSelection';
import { ContentSelectionDock, SelectionCheck } from './ContentSelectionDock';

type Screenshot = { name: string; modifiedAt: number; size: number; thumbnail?: string };

export function ScreenshotGallery({ gameDir, onNotify }: {
  gameDir: string;
  onNotify?: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useContentView('screenshots');
  const generation = useRef(0);
  const thumbnails = useRef(new Map<string, { stamp: string; image: string }>());
  const [selected, setSelected] = useState<{ name: string; image: string } | null>(null);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const viewer = useRef<HTMLDialogElement>(null);
  const imageRequest = useRef(0);
  const closeViewer = () => { imageRequest.current++; setSelected(null); };
  useEffect(() => {
    if (!selected) return;
    const element = viewer.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
  }, [Boolean(selected)]);

  const refresh = useCallback(async () => {
    if (!window.quibyApi) return;
    const current = ++generation.current;
    setLoading(true);
    try {
      const files = await window.quibyApi.getScreenshots(gameDir);
      if (current !== generation.current) return;
      const stamp = (file: Screenshot) => `${file.size}:${file.modifiedAt}`;
      const cached = (file: Screenshot) => thumbnails.current.get(file.name)?.stamp === stamp(file) ? thumbnails.current.get(file.name)?.image : undefined;
      const valid = new Set(files.map(file => file.name));
      for (const name of thumbnails.current.keys()) if (!valid.has(name)) thumbnails.current.delete(name);
      setScreenshots(files.map(file => ({ ...file, thumbnail: cached(file) })));
      setSelectedNames(previous => previous.filter(name => valid.has(name)));
      // Bound IPC/image decoding work instead of opening every PNG simultaneously.
      for (let start = 0; start < files.length; start += 4) {
        const batch: Screenshot[] = await Promise.all(files.slice(start, start + 4).map(async file => {
          if (cached(file)) return { ...file, thumbnail: cached(file) };
          try { return { ...file, thumbnail: await window.quibyApi.getScreenshotImage(gameDir, file.name, true) }; }
          catch { return file; }
        }));
        if (current !== generation.current) return;
        for (const file of batch) if (file.thumbnail) thumbnails.current.set(file.name, { stamp: stamp(file), image: file.thumbnail });
        setScreenshots(previous => previous.map(file => batch.find(item => item.name === file.name) || file));
      }
    } catch (error) {
      if (current === generation.current) onNotify?.('Не удалось загрузить скриншоты', error instanceof Error ? error.message : undefined, 'error');
    } finally { if (current === generation.current) setLoading(false); }
  }, [gameDir, onNotify]);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    thumbnails.current.clear(); setScreenshots([]); setSelected(null); setSelectedNames([]);
    void refreshRef.current();
    return () => { generation.current++; imageRequest.current++; };
  }, [gameDir]);

  const open = async (name: string) => {
    const request = ++imageRequest.current;
    try {
      const image = await window.quibyApi.getScreenshotImage(gameDir, name, false);
      if (request === imageRequest.current) setSelected({ name, image });
    } catch (error) {
      if (request === imageRequest.current) onNotify?.('Не удалось открыть скриншот', error instanceof Error ? error.message : undefined, 'error');
    }
  };
  const toggle = (name: string) => setSelectedNames(previous => previous.includes(name) ? previous.filter(item => item !== name) : [...previous, name]);
  const copy = async (name: string) => {
    try { await window.quibyApi.copyScreenshot(gameDir, name); onNotify?.('Скриншот скопирован', name, 'success'); }
    catch (error) { onNotify?.('Не удалось скопировать скриншот', error instanceof Error ? error.message : undefined, 'error'); }
  };
  const trash = async (names: string[]) => {
    if (!names.length || busy) return;
    setBusy(true);
    try {
      await window.quibyApi.trashScreenshots(gameDir, names);
      setSelected(current => current && names.includes(current.name) ? null : current);
      setSelectedNames([]);
      await refresh();
      onNotify?.('Скриншоты перемещены в корзину', `Файлов: ${names.length}`, 'info');
    } catch (error) { onNotify?.('Не удалось удалить скриншоты', error instanceof Error ? error.message : undefined, 'error'); }
    finally { setBusy(false); }
  };
  const selectedIndex = selected ? screenshots.findIndex(file => file.name === selected.name) : -1;

  const filtered = screenshots.filter(file => file.name.toLowerCase().includes(search.trim().toLowerCase()));
  const visibleNames = filtered.map(file => file.name);
  const selectAll = () => { setSelectedNames(previous => toggleVisibleSelection(previous, visibleNames)); };
  return <section className={`content-library screenshot-gallery ${selectedNames.length ? 'has-selection' : ''}`} aria-label="Библиотека скриншотов">
    <ContentToolbar label="Скриншоты" total={screenshots.length} visible={filtered.length} mode={mode} onMode={setMode} busy={busy} refreshing={loading}
      selection={{ allSelected: allVisibleSelected(selectedNames, visibleNames), onSelectAll: selectAll }} onRefresh={() => void refresh()}
      onFolder={() => void window.quibyApi.openScreenshotsFolder(gameDir).catch(error => onNotify?.('Не удалось открыть папку', error instanceof Error ? error.message : undefined, 'error'))}/>
    <ContentSearch value={search} onChange={setSearch} label="Поиск скриншотов" hint=".png"/>
    <ContentSelectionDock count={selectedNames.length} total={screenshots.length} allSelected={allVisibleSelected(selectedNames, visibleNames)} busy={busy}
      onSelectAll={selectAll} onClear={() => { setSelectedNames([]); }} onDelete={() => void trash(selectedNames)}
      onCopy={selectedNames.length === 1 ? () => void copy(selectedNames[0]) : undefined} />
    <div className="library-scroll">
    {filtered.length === 0 ? <div className="screenshot-gallery-empty"><ImageIcon size={32} /><strong>{search ? 'Ничего не найдено' : loading ? 'Загружаем скриншоты…' : 'Скриншотов пока нет'}</strong><span>Сделайте снимок в Minecraft клавишей F2. Он появится здесь.</span></div>
      : <div className={`screenshot-gallery-grid is-${mode}`}>{filtered.map(file => <div key={file.name} className={`screenshot-gallery-item ${selectedNames.includes(file.name) ? 'is-selected' : ''}`}><button type="button" className="screenshot-gallery-open" onClick={event => { if (selectedNames.length > 0 || event.ctrlKey || event.metaKey || event.shiftKey) { if (event.shiftKey && selectedNames.length) { const anchor = filtered.findIndex(item => item.name === selectedNames[selectedNames.length - 1]); const target = filtered.findIndex(item => item.name === file.name); setSelectedNames(previous => [...new Set([...previous, ...filtered.slice(Math.min(anchor < 0 ? target : anchor, target), Math.max(anchor < 0 ? target : anchor, target) + 1).map(item => item.name)])]); } else toggle(file.name); } else void open(file.name); }}>
        {file.thumbnail ? <img src={file.thumbnail} alt={file.name} /> : <span className="screenshot-gallery-placeholder"><ImageIcon size={26} /></span>}
        <span className="screenshot-gallery-caption"><strong title={file.name}>{file.name}</strong><small>{new Date(file.modifiedAt).toLocaleString('ru-RU')}</small></span>
      </button><div className="screenshot-gallery-check"><SelectionCheck checked={selectedNames.includes(file.name)} onToggle={() => { toggle(file.name); }} label={`Выделить ${file.name}`} /></div></div>)}</div>}
    </div>
    {selected && <dialog ref={viewer} className="screenshot-viewer" aria-label={selected.name} onCancel={event => { event.preventDefault(); closeViewer(); }} onClick={closeViewer}
      onKeyDown={event => {
        const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
        const next = screenshots[selectedIndex + direction];
        if (direction && next) { event.preventDefault(); void open(next.name); }
      }}>
      <div className="screenshot-viewer-toolbar" onClick={event => event.stopPropagation()}><strong>{selected.name}</strong><button type="button" className="ui-button" onClick={() => void copy(selected.name)}><Copy size={15} /> Копировать</button><button type="button" className="ui-button" disabled={busy} onClick={() => void trash([selected.name])}><Trash2 size={15} /> В корзину</button><button type="button" className="ui-button" onClick={closeViewer} aria-label="Закрыть"><X size={17} /></button></div>
      <div className="screenshot-viewer-body" onClick={event => event.stopPropagation()}><button type="button" className="screenshot-viewer-nav" disabled={selectedIndex <= 0} onClick={() => void open(screenshots[selectedIndex - 1].name)} aria-label="Предыдущий"><ChevronLeft /></button><img src={selected.image} alt={selected.name} /><button type="button" className="screenshot-viewer-nav" disabled={selectedIndex >= screenshots.length - 1} onClick={() => void open(screenshots[selectedIndex + 1].name)} aria-label="Следующий"><ChevronRight /></button></div>
      <span>{selectedIndex + 1} / {screenshots.length}</span>
    </dialog>}
  </section>;
}
