import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  FolderOpen,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';

import { ContentSelectionDock, SelectionCheck } from './ContentSelectionDock';
import { useFileDrop } from '../utils/useFileDrop';

type Kind = 'shaderpacks' | 'schematics';
interface LocalFile {
  name: string;
  filename: string;
  size: number;
  isDirectory?: boolean;
  updatedAt: number;
}
export interface LibraryProps {
  gameDir: string;
  onNotify?: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function LocalContentLibrary({ kind, gameDir, onNotify }: LibraryProps & { kind: Kind }) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dragging = useFileDrop(files => void addFiles(files));
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const desktop = Boolean(window.quibyApi);
  const shader = kind === 'shaderpacks';
  const Icon = shader ? Sun : Layers;
  const accept = shader ? '.zip' : '.nbt,.schem,.schematic';
  const read = () =>
    shader ? window.quibyApi.getShaderpacks(gameDir) : window.quibyApi.getSchematics(gameDir);
  const refresh = async () => {
    if (desktop) {
      const items = await read();
      setFiles(items);
      setSelectedFiles(previous => previous.filter(name => items.some((item: LocalFile) => item.filename === name)));
    }
  };
  useEffect(() => {
    let cancelled = false;
    if (desktop)
      read()
        .then((items) => {
          if (!cancelled) setFiles(items);
        })
        .catch(() => {
          if (!cancelled) setError('Не удалось прочитать папку. Проверьте путь в настройках.');
        });
    return () => {
      cancelled = true;
    };
  }, [kind, gameDir]);
  useEffect(() => { setFiles([]); setSelectedFiles([]); }, [kind, gameDir]);
  const report = (err: unknown) =>
    setError(err instanceof Error ? err.message : 'Не удалось выполнить действие');
  const addFiles = async (incoming: FileList | null) => {
    if (!incoming || busy || !desktop) return;
    setBusy(true);
    setError('');
    let added = 0;
    try {
      for (const file of Array.from(incoming)) {
        const matches = shader ? /\.zip$/i.test(file.name) : /\.(nbt|schem|schematic)$/i.test(file.name);
        if (!matches || !file.size || file.size > 100 * 1024 * 1024)
          throw new Error(`Файл ${file.name}: нужен ${accept} размером до 100 МБ`);
        await window.quibyApi.installContentFile(
          gameDir,
          kind,
          file.name,
          new Uint8Array(await file.arrayBuffer()),
        );
        added++;
      }
    } catch (err) {
      report(err);
    } finally {
      try {
        await refresh();
      } catch (err) {
        report(err);
      }
      setBusy(false);
      if (input.current) input.current.value = '';
      if (added) onNotify?.('Файлы добавлены', `В папку ${kind} сохранено: ${added}.`, 'success');
    }
  };
  const remove = async (filename: string) => {
    setBusy(true);
    setError('');
    try {
      await window.quibyApi.trashContentFile(gameDir, kind, filename);
      await refresh();
      onNotify?.('Файл в корзине', filename, 'info');
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  };
  const removeSelected = async () => {
    if (!selectedFiles.length || busy) return;
    setBusy(true);
    setError('');
    try {
      for (const filename of selectedFiles) await window.quibyApi.trashContentFile(gameDir, kind, filename);
      onNotify?.('Файлы перемещены в корзину', `Файлов: ${selectedFiles.length}`, 'info');
      setSelectedFiles([]);
      await refresh();
    } catch (err) { report(err); await refresh().catch(report); }
    finally { setBusy(false); }
  };
  const filtered = files
    .filter((file) => `${file.name} ${file.filename}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const sizeLabel = (file: LocalFile) =>
    file.isDirectory
      ? 'Папка'
      : file.size >= 1048576
        ? `${(file.size / 1048576).toFixed(1)} МБ`
        : `${Math.max(1, Math.round(file.size / 1024))} КБ`;
  return (
    <section
      className="content-library view-enter"
      aria-label={shader ? 'Библиотека шейдеров' : 'Библиотека схематик'}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(e) => void addFiles(e.target.files)}
      />
      <div className="content-toolbar">
        <div className="library-count">
          На компьютере <span>{files.length}</span>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="ui-button" disabled={busy || !filtered.length} onClick={() => setSelectedFiles(previous => filtered.every(file => previous.includes(file.filename)) ? previous.filter(name => !filtered.some(file => file.filename === name)) : [...new Set([...previous, ...filtered.map(file => file.filename)])])}>Выбрать все видимые</button>
          <button
            className="ui-button"
            disabled={!desktop || busy}
            onClick={() => void window.quibyApi.openContentFolder(gameDir, kind).catch(report)}
          >
            <FolderOpen size={14} /> Открыть папку
          </button>
          <button
            className="ui-button is-primary"
            disabled={!desktop || busy}
            onClick={() => input.current?.click()}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Добавить файл
          </button>
        </div>
      </div>
      <div className="content-search">
        <Search size={15} />
        <input
          aria-label={shader ? 'Поиск шейдеров' : 'Поиск схематик'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Найти по названию или имени файла"
        />
        <span>{accept}</span>
      </div>
      {dragging && <div className="content-import-overlay"><Upload size={36} /><strong>Отпустите файлы для импорта</strong><span>{accept} · до 100 МБ</span></div>}
      <ContentSelectionDock count={selectedFiles.length} total={files.length} allSelected={filtered.length > 0 && filtered.every(file => selectedFiles.includes(file.filename))} busy={busy}
        onSelectAll={() => setSelectedFiles(previous => filtered.every(file => previous.includes(file.filename)) ? previous.filter(name => !filtered.some(file => file.filename === name)) : [...new Set([...previous, ...filtered.map(file => file.filename)])])}
        onClear={() => setSelectedFiles([])} onDelete={() => void removeSelected()} />
      {error && (
        <div className="inline-error" role="alert">
          {error}
          <button
            className="ui-button"
            onClick={() =>
              void refresh()
                .then(() => setError(''))
                .catch(report)
            }
          >
            <RefreshCw size={12} />
            Повторить
          </button>
        </div>
      )}
      <div className="library-scroll">
        {filtered.length ? (
          <div className="library-grid">
            {filtered.map((file) => (
              <article className={`library-file ${selectedFiles.includes(file.filename) ? 'is-selected' : ''}`} key={file.filename}>
                <SelectionCheck checked={selectedFiles.includes(file.filename)} onToggle={() => setSelectedFiles(previous => previous.includes(file.filename) ? previous.filter(name => name !== file.filename) : [...previous, file.filename])} label={`Выделить ${file.filename}`} />
                <div className="library-file-icon">
                  <Icon size={23} />
                </div>
                <div className="library-file-copy">
                  <h3>{file.name}</h3>
                  <p title={file.filename}>{file.filename}</p>
                  <span>
                    {sizeLabel(file)} · {new Date(file.updatedAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <button
                  className="file-trash"
                  title="Переместить в корзину"
                  aria-label={`В корзину: ${file.filename}`}
                  disabled={busy}
                  onClick={() => void remove(file.filename)}
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="library-empty">
            <div className="library-emblem" aria-hidden="true">
              <i />
              <i />
              <Icon size={44} />
            </div>
            <h2>
              {search
                ? 'Ничего не найдено'
                : shader
                  ? 'Другой свет. Тот же мир.'
                  : 'Большая идея начинается с чертежа.'}
            </h2>
            <p>
              {search
                ? 'Попробуйте другое название.'
                : !desktop
                  ? 'Откройте приложение лаунчера, чтобы увидеть и добавить файлы с компьютера.'
                  : shader
                    ? 'Добавьте шейдерпак в ZIP. Выбрать его можно в настройках графики Minecraft.'
                    : 'Импортируйте .nbt, .schem или .schematic. Файлы сохранятся в папку schematics.'}
            </p>
            {!search && (
              <span className="library-empty-caption">
                {shader ? 'СВЕТ / ТЕНИ / АТМОСФЕРА' : 'CREATE / СХЕМЫ / ПОСТРОЙКИ'}
                <ArrowUpRight size={12} />
              </span>
            )}
          </div>
        )}
      </div>
      <footer className="library-footer">
        <span>{kind}/</span>
        <span>
          {shader
            ? 'Выбор активного шейдера — в игре'
            : 'Совместимость чертежа зависит от установленных модов'}
        </span>
      </footer>
    </section>
  );
}
