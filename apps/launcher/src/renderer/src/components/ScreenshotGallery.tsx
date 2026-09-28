import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, Image as ImageIcon, RefreshCw, X } from 'lucide-react';

type Screenshot = { name: string; modifiedAt: number; size: number; thumbnail?: string };

export function ScreenshotGallery({ gameDir, onNotify }: {
  gameDir: string;
  onNotify?: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ name: string; image: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!window.quibyApi) return;
    setLoading(true);
    try {
      const files = await window.quibyApi.getScreenshots(gameDir);
      setScreenshots(files);
      for (const file of files) {
        try {
          const thumbnail = await window.quibyApi.getScreenshotImage(gameDir, file.name, true);
          setScreenshots(previous => previous.map(item => item.name === file.name ? { ...item, thumbnail } : item));
        } catch {
          // A deleted or damaged image should not hide the rest of the gallery.
        }
      }
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

  return <section className="screenshot-gallery">
    <div className="screenshot-gallery-toolbar">
      <div><strong>Мои скриншоты</strong><small>Папка screenshots выбранной установки Minecraft · {screenshots.length} файлов</small></div>
      <div className="screenshot-gallery-actions">
        <button type="button" className="ui-button" onClick={() => void refresh()}><RefreshCw size={15} /> Обновить</button>
        <button type="button" className="ui-button" onClick={() => void window.quibyApi.openScreenshotsFolder(gameDir)}><FolderOpen size={15} /> Открыть папку</button>
      </div>
    </div>
    {screenshots.length === 0 ? <div className="screenshot-gallery-empty"><ImageIcon size={32} /><strong>{loading ? 'Загружаем скриншоты…' : 'Скриншотов пока нет'}</strong><span>Сделайте снимок в Minecraft клавишей F2. Он появится здесь.</span></div>
      : <div className="screenshot-gallery-grid">{screenshots.map(file => <button type="button" key={file.name} className="screenshot-gallery-item" onClick={() => void open(file.name)}>
        {file.thumbnail ? <img src={file.thumbnail} alt={file.name} /> : <span className="screenshot-gallery-placeholder"><ImageIcon size={26} /></span>}
        <span className="screenshot-gallery-caption"><strong title={file.name}>{file.name}</strong><small>{new Date(file.modifiedAt).toLocaleString('ru-RU')}</small></span>
      </button>)}</div>}
    {selected && <div className="screenshot-viewer" role="dialog" aria-modal="true" aria-label={selected.name} onClick={() => setSelected(null)}>
      <button type="button" className="screenshot-viewer-close" aria-label="Закрыть" onClick={() => setSelected(null)}><X size={20} /></button>
      <img src={selected.image} alt={selected.name} onClick={event => event.stopPropagation()} />
      <span>{selected.name}</span>
    </div>}
  </section>;
}
