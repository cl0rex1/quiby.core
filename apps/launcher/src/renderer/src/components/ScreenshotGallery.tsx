import { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Copy, FolderOpen, Image as ImageIcon, RefreshCw, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

type Screenshot = { name: string; modifiedAt: number; size: number; thumbnail?: string };

export function ScreenshotGallery({ gameDir, onNotify }: {
  gameDir: string;
  onNotify?: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ name: string; image: string } | null>(null);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.quibyApi) return;
    setLoading(true);
    try {
      const files = await window.quibyApi.getScreenshots(gameDir);
      setScreenshots(files);
      setSelectedNames(previous => previous.filter(name => files.some(file => file.name === name)));
      await Promise.all(files.map(async file => {
        try {
          const thumbnail = await window.quibyApi.getScreenshotImage(gameDir, file.name, true);
          setScreenshots(previous => previous.map(item => item.name === file.name ? { ...item, thumbnail } : item));
        } catch {
          // A deleted or damaged image should not hide the rest of the gallery.
        }
      }));
    } catch (error) {
      onNotify?.('Не удалось загрузить скриншоты', error instanceof Error ? error.message : undefined, 'error');
    } finally {
      setLoading(false);
    }
  }, [gameDir, onNotify]);

  useEffect(() => { void refresh(); }, [gameDir]);

  const open = async (name: string) => {
    try {
      const image = await window.quibyApi.getScreenshotImage(gameDir, name, false);
      setSelected({ name, image });
    } catch (error) {
      onNotify?.('Не удалось открыть скриншот', error instanceof Error ? error.message : undefined, 'error');
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

  return <section className="screenshot-gallery">
    <div className="screenshot-gallery-toolbar">
      <div><strong>Мои скриншоты</strong><small>Папка screenshots выбранной установки Minecraft · {screenshots.length} файлов</small></div>
      <div className="screenshot-gallery-actions">
        <button type="button" className="ui-button" onClick={() => { setSelectionMode(value => !value); setSelectedNames([]); }}><CheckSquare size={15} /> {selectionMode ? 'Готово' : 'Выделить'}</button>
        <button type="button" className="ui-button" onClick={() => void refresh()}><RefreshCw size={15} /> Обновить</button>
        <button type="button" className="ui-button" onClick={() => void window.quibyApi.openScreenshotsFolder(gameDir)}><FolderOpen size={15} /> Открыть папку</button>
      </div>
    </div>
    {selectionMode && <div className="selection-toolbar"><span>Выбрано: {selectedNames.length}</span><button type="button" className="ui-button" onClick={() => setSelectedNames(selectedNames.length === screenshots.length ? [] : screenshots.map(file => file.name))}>{selectedNames.length === screenshots.length ? 'Снять выделение' : 'Выбрать все'}</button>{selectedNames.length === 1 && <button type="button" className="ui-button" onClick={() => void copy(selectedNames[0])}><Copy size={14} /> Копировать</button>}<button type="button" className="ui-button" disabled={!selectedNames.length || busy} onClick={() => void trash(selectedNames)}><Trash2 size={14} /> В корзину</button></div>}
    {screenshots.length === 0 ? <div className="screenshot-gallery-empty"><ImageIcon size={32} /><strong>{loading ? 'Загружаем скриншоты…' : 'Скриншотов пока нет'}</strong><span>Сделайте снимок в Minecraft клавишей F2. Он появится здесь.</span></div>
      : <div className="screenshot-gallery-grid">{screenshots.map(file => <div key={file.name} className={`screenshot-gallery-item ${selectedNames.includes(file.name) ? 'is-selected' : ''}`}><button type="button" className="screenshot-gallery-open" onClick={() => selectionMode ? toggle(file.name) : void open(file.name)}>
        {file.thumbnail ? <img src={file.thumbnail} alt={file.name} /> : <span className="screenshot-gallery-placeholder"><ImageIcon size={26} /></span>}
        <span className="screenshot-gallery-caption"><strong title={file.name}>{file.name}</strong><small>{new Date(file.modifiedAt).toLocaleString('ru-RU')}</small></span>
      </button>{selectionMode && <input className="screenshot-gallery-check" type="checkbox" checked={selectedNames.includes(file.name)} onChange={() => toggle(file.name)} aria-label={`Выделить ${file.name}`} />}</div>)}</div>}
    {selected && <div className="screenshot-viewer" role="dialog" aria-modal="true" aria-label={selected.name} onClick={() => setSelected(null)}>
      <div className="screenshot-viewer-toolbar" onClick={event => event.stopPropagation()}><strong>{selected.name}</strong><button type="button" className="ui-button" onClick={() => void copy(selected.name)}><Copy size={15} /> Копировать</button><button type="button" className="ui-button" disabled={busy} onClick={() => void trash([selected.name])}><Trash2 size={15} /> В корзину</button><button type="button" className="ui-button" onClick={() => setSelected(null)} aria-label="Закрыть"><X size={17} /></button></div>
      <div className="screenshot-viewer-body" onClick={event => event.stopPropagation()}><button type="button" className="screenshot-viewer-nav" disabled={selectedIndex <= 0} onClick={() => void open(screenshots[selectedIndex - 1].name)} aria-label="Предыдущий"><ChevronLeft /></button><img src={selected.image} alt={selected.name} /><button type="button" className="screenshot-viewer-nav" disabled={selectedIndex >= screenshots.length - 1} onClick={() => void open(screenshots[selectedIndex + 1].name)} aria-label="Следующий"><ChevronRight /></button></div>
      <span>{selectedIndex + 1} / {screenshots.length}</span>
    </div>}
  </section>;
}
