import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Layers,
  RefreshCw,
  Sun,
  Upload,
} from 'lucide-react';

import { PackLogo } from './PackLogo';
import { ContentSelectionDock } from './ContentSelectionDock';
import { useFileDrop } from '../utils/useFileDrop';
import { ContentToolbar, ContentSearch, useContentView } from './ContentToolbar';
import { ContentFileCard } from './ContentFileCard';
import { useFileRemoval } from '../utils/useFileRemoval';
import { allVisibleSelected, toggleVisibleSelection } from '../utils/contentSelection';

type Kind = 'shaderpacks' | 'schematics';
interface LocalFile {
  iconUrl?: string;
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
  const { container, animateRemoval } = useFileRemoval();
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(window.quibyApi));
  const generation = useRef(0);
  const mutation = useRef(false);
  const dragging = useFileDrop(files => void addFiles(files));
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const desktop = Boolean(window.quibyApi);
  const shader = kind === 'shaderpacks';
  const [viewMode, setViewMode] = useContentView(kind);
  const Icon = shader ? Sun : Layers;
  const accept = shader ? '.zip' : '.nbt,.schem,.schematic';
  const refresh = useCallback(async (clearError = true) => {
    if (!desktop) return;
    const current = ++generation.current;
    setLoading(true);
    if (clearError) setError('');
    try {
      const items = await (kind === 'shaderpacks' ? window.quibyApi.getShaderpacks(gameDir) : window.quibyApi.getSchematics(gameDir));
      if (current !== generation.current) return;
      setFiles(items);
      setSelectedFiles(previous => previous.filter(name => items.some((item: LocalFile) => item.filename === name)));
    } catch (err) {
      if (current === generation.current) setError(err instanceof Error ? err.message : 'Не удалось прочитать папку. Проверьте путь в настройках.');
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [desktop, kind, gameDir]);
  useEffect(() => {
    setFiles([]); setSelectedFiles([]);
    void refresh();
    return () => { generation.current++; };
  }, [refresh]);
  const report = (err: unknown) =>
    setError(err instanceof Error ? err.message : 'Не удалось выполнить действие');
  const addFiles = async (incoming: FileList | null) => {
    if (!incoming || mutation.current || !desktop) return;
    mutation.current = true;
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
        await refresh(false);
      } catch (err) {
        report(err);
      }
      mutation.current = false; setBusy(false);
      if (input.current) input.current.value = '';
      if (added) onNotify?.('Файлы добавлены', `В папку ${kind} сохранено: ${added}.`, 'success');
    }
  };
  const remove = async (filename: string) => {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError('');
    try {
      await window.quibyApi.trashContentFile(gameDir, kind, filename);
      await animateRemoval([filename]);
      setFiles(previous => previous.filter(file => file.filename !== filename));
      await refresh(false);
      onNotify?.('Файл удалён', filename, 'info');
    } catch (err) {
      report(err);
    } finally {
      mutation.current = false; setBusy(false);
    }
  };
  const removeSelected = async () => {
    if (!selectedFiles.length || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError('');
    const removed: string[] = [];
    try {
      for (const filename of selectedFiles) {
        await window.quibyApi.trashContentFile(gameDir, kind, filename);
        removed.push(filename);
      }
    } catch (err) { report(err); }
    finally {
      await animateRemoval(removed);
      setFiles(previous => previous.filter(file => !removed.includes(file.filename)));
      setSelectedFiles(previous => previous.filter(name => !removed.includes(name)));
      await refresh(false);
      mutation.current = false; setBusy(false);
    }
    if (removed.length) onNotify?.('Файлы удалены', `Файлов: ${removed.length}`, 'info');
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
      className={`content-library ${selectedFiles.length ? 'has-selection' : ''}`}
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
      <ContentToolbar label={shader ? 'Шейдеры' : 'Схематики'} total={files.length} visible={filtered.length} mode={viewMode} onMode={setViewMode} busy={!desktop || busy} refreshing={loading}
        selection={{ allSelected: allVisibleSelected(selectedFiles, filtered.map(file => file.filename)), onSelectAll: () => setSelectedFiles(previous => toggleVisibleSelection(previous, filtered.map(file => file.filename))) }}
        onAdd={() => input.current?.click()} onFolder={() => void window.quibyApi.openContentFolder(gameDir, kind).catch(report)} onRefresh={() => void refresh().catch(report)} />
      <ContentSearch value={search} onChange={setSearch} label={shader ? 'Поиск шейдеров' : 'Поиск схематик'} hint={accept} />
      {dragging && <div className="content-import-overlay"><Upload size={36} /><strong>Отпустите файлы для импорта</strong><span>{accept} · до 100 МБ</span></div>}
      <ContentSelectionDock count={selectedFiles.length} total={files.length} allSelected={filtered.length > 0 && filtered.every(file => selectedFiles.includes(file.filename))} busy={busy}
        onSelectAll={() => setSelectedFiles(previous => toggleVisibleSelection(previous, filtered.map(file => file.filename)))}
        onClear={() => setSelectedFiles([])} onDelete={() => void removeSelected()} />
      {error && (
        <div className="inline-error" role="alert">
          {error}
          <button
            className="ui-button"
            onClick={() =>
              void refresh()
            }
          >
            <RefreshCw size={12} />
            Повторить
          </button>
        </div>
      )}
      <div ref={container} className="library-scroll" aria-busy={loading}>
        {loading && !files.length ? <div className="library-empty" role="status"><RefreshCw className="loading-spinner" size={24} /><p>Читаем папку…</p></div> : error && !files.length ? null : filtered.length ? (
          <div className={`library-grid is-${viewMode}`}>
            {filtered.map((file) => (
              <ContentFileCard key={file.filename} fileId={file.filename} name={file.name} filename={file.filename}
                icon={shader ? <PackLogo src={file.iconUrl} kind="shaderpacks"/> : <Icon size={22}/>} description={`${shader ? 'Шейдерпак' : 'Схематика'} · ${new Date(file.updatedAt).toLocaleDateString('ru-RU')}`}
                size={sizeLabel(file)} busy={busy} selected={selectedFiles.includes(file.filename)}
                onSelect={() => setSelectedFiles(previous => previous.includes(file.filename) ? previous.filter(name => name !== file.filename) : [...previous, file.filename])}
                onDelete={() => void remove(file.filename)}/>

            ))}
          </div>
        ) : (
          <div className="library-empty">
            <div className="content-empty-icon" aria-hidden="true"><Icon size={28}/></div>
            <h2>
              {search
                ? 'Ничего не найдено'
                  : shader
                  ? 'Шейдеров пока нет'
                  : 'Схематик пока нет'}
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
          </div>
        )}
      </div>
    </section>
  );
}
