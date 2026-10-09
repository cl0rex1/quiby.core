import { useFileDrop } from '../utils/useFileDrop';
import React, { useState, useRef } from 'react';
import {
  Package,
  Loader2,
  Palette,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ExternalLink,
  Upload,
  Layers,
  Sun,
  Image as ImageIcon,
  Filter
} from 'lucide-react';
import { canDisableBundledMod } from '../../../shared/modpackProfiles';
import { ModpackManifest, AuthSession } from '@quiby/shared';
import { resolveModMetadata, MOD_FILTERS, ModFilter, matchesModFilter } from '../utils/knownMods';
import { ModWhitelistModal } from '../components/ModWhitelistModal';
import { SchematicsExplorer } from '../components/SchematicsExplorer';
import { ShadersExplorer } from '../components/ShadersExplorer';
import { ResourcePacksExplorer } from '../components/ResourcePacksExplorer';
import { ScreenshotGallery } from '../components/ScreenshotGallery';
import type { NotificationItem } from '../utils/notifications';
import { ContentToolbar, ContentSearch, useContentView } from '../components/ContentToolbar';
import { ContentSelectionDock, SelectionCheck } from '../components/ContentSelectionDock';
import { allVisibleSelected, toggleVisibleSelection } from '../utils/contentSelection';
import { ModIcon } from '../components/ModIcon';

export interface CustomModItem {
  id: string;
  name: string;
  filename: string;
  size: number;
  enabled: boolean;
  hashSha1?: string;
  safetyStatus?: 'approved' | 'pending' | 'blocked' | 'unverified';
  safetyReason?: string;
  reviewDeliveryFailed?: boolean;
  categories?: string[];
  projectUrl?: string;
  iconUrl?: string;
  description?: string;
}

interface ModsViewProps {
  gameActive?: boolean;
  manifest: ModpackManifest | null;
  serverUrl: string;
  gameDir: string;
  customMods: CustomModItem[];
  session?: AuthSession | null;
  selectedModIds: string[];
  onUpdateSelectedModIds: (ids: string[]) => void;
  onUpdateCustomMods: (mods: React.SetStateAction<CustomModItem[]>) => void;
  disabledBundledMods?: string[];
  onToggleBundledMod?: (modId: string) => void;
  onNotify?: (
    title: string,
    message?: string,
    type?: 'success' | 'info' | 'warning' | 'error',
    modInfo?: NotificationItem['modInfo']
  ) => void;
}

export type SwitcherMode = 'official' | 'custom';
export type ContentCategory = 'mods' | 'schematics' | 'shaders' | 'screenshots' | 'resourcepacks';
export type ModFilterCategory = ModFilter;

export const ModsView: React.FC<ModsViewProps> = ({
  manifest,
  gameActive = false,
  serverUrl,
  gameDir,
  customMods,
  session,
  selectedModIds,
  onUpdateSelectedModIds,
  onUpdateCustomMods,
  disabledBundledMods = [],
  onToggleBundledMod,
  onNotify,
}) => {
  const [contentCategory, setContentCategory] = useState<ContentCategory>('mods');
  const [switcherMode, setSwitcherMode] = useState<SwitcherMode>('custom');
  const [filterCategory, setFilterCategory] = useState<ModFilterCategory>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useContentView('mods');
  const [batchBusy, setBatchBusy] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const importInProgress = useRef(false);
  const isDragging = useFileDrop(files => handleFiles(files), contentCategory === 'mods' && !gameActive);
  const [activeWhitelistMod, setActiveWhitelistMod] = useState<CustomModItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const officialFiles = (manifest?.files || []).filter(file => /^mods\/.*\.jar$/i.test(file.path.replace(/\\/g, '/')));

  const handleFiles = async (files: FileList | File[]) => {
    if (gameActive) return;
    if (importInProgress.current) {
      onNotify?.('Проверка уже идёт', 'Дождитесь завершения импорта файлов.', 'info');
      return;
    }
    importInProgress.current = true;
    setIsVerifying(true);
    try {
      // A batch of large JARs must not be read and verified in memory all at once.
      for (const file of Array.from(files)) await handleAddCustomModFile(file);
    } finally { importInProgress.current = false; setIsVerifying(false); }
  };

  const filteredOfficial = officialFiles.filter((f) => {
    const rawName = f.modName || f.path.replace('mods/', '').replace('.jar', '');
    const meta = resolveModMetadata(rawName, f.path, f.modDescription, f.modIconUrl, f.modProjectUrl, f.modId);
    const matchesSearch =
      meta.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.path.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesModFilter(meta, filterCategory);
  });

  const filteredCustom = customMods.filter((m) => {
    const meta = resolveModMetadata(m.name, m.filename, m.description, m.iconUrl, m.projectUrl);
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.filename.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesModFilter(meta, filterCategory, m.safetyStatus);
  });

  const toggleSelectMod = (id: string) => {
    if (selectedModIds.includes(id)) {
      onUpdateSelectedModIds(selectedModIds.filter((item) => item !== id));
    } else {
      onUpdateSelectedModIds([...selectedModIds, id]);
    }
  };

  const handleSelectAllCustom = () => onUpdateSelectedModIds(toggleVisibleSelection(selectedModIds, filteredCustom.map(mod => mod.id)));
  const deleteSelected = async () => {
    if (batchBusy || gameActive) return;
    setBatchBusy(true);
    const removed: string[] = [];
    try {
      for (const mod of customMods.filter(item => selectedModIds.includes(item.id))) {
        await window.quibyApi.removeCustomMod(gameDir, mod.filename);
        removed.push(mod.id);
      }
    } catch (error) { onNotify?.('Не удалось удалить моды', error instanceof Error ? error.message : undefined, 'error'); }
    finally {
      onUpdateCustomMods(previous => previous.filter(mod => !removed.includes(mod.id)));
      onUpdateSelectedModIds(selectedModIds.filter(id => !removed.includes(id)));
      setBatchBusy(false);
    }
    if (removed.length) onNotify?.('Моды удалены', `Файлов: ${removed.length}`, 'info');
  };

  const toggleCustomMod = (id: string) => {
    const target = customMods.find((m) => m.id === id);
    if (target?.safetyStatus !== 'approved') return;

    const updated = customMods.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    onUpdateCustomMods(updated);
  };

  const handleDeleteCustomMod = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (gameActive) return;
    const target = customMods.find((m) => m.id === id);
    if (target && window.quibyApi) {
      try {
        await window.quibyApi.removeCustomMod(gameDir, target.filename);
      } catch (error) {
        onNotify?.('Не удалось удалить мод', error instanceof Error ? error.message : 'Проверьте папку mods.', 'error');
        return;
      }
    }
    const updated = customMods.filter((m) => m.id !== id);
    onUpdateCustomMods(updated);
    onUpdateSelectedModIds(selectedModIds.filter((item) => item !== id));
  };

  const handleAddCustomModFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.jar') || file.size > 512 * 1024 * 1024) {
      onNotify?.('Неверный файл', 'Нужен .jar размером до 512 МБ.', 'error');
      return;
    }

    const tempId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const meta = resolveModMetadata(file.name.replace('.jar', ''), file.name);

    const initialMod: CustomModItem = {
      id: tempId,
      name: meta.displayName,
      filename: file.name,
      size: file.size,
      enabled: false,
      safetyStatus: 'unverified',
      iconUrl: meta.iconUrl,
      description: meta.description,
    };

    onUpdateCustomMods((previous) => [initialMod, ...previous]);
    setSwitcherMode('custom');

    try {
      if (manifest?.files.some(entry => entry.path.replace(/\\/g, '/') === `mods/${file.name}`)) {
        throw new Error('Этот мод уже входит в сборку сервера');
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await window.quibyApi.stageCustomMod(file.name, bytes, session?.token);
      if (result.isAllowed) {
        if (!window.quibyApi) throw new Error('Установка модов доступна только в приложении лаунчера');
        await window.quibyApi.installCustomMod(gameDir, file.name, bytes, session?.token);
      }
      const verifiedMeta = resolveModMetadata(
        result.name || initialMod.name,
        file.name,
        result.description,
        result.iconUrl
      );

      const verifiedMod: CustomModItem = {
        ...initialMod,
        name: verifiedMeta.displayName,
        hashSha1: result.hashSha1,
        safetyStatus: result.status,
        safetyReason: result.reason,
        categories: result.categories,
        projectUrl: result.projectUrl,
        iconUrl: verifiedMeta.iconUrl,
        description: verifiedMeta.description,
        enabled: result.isAllowed,
      };

      onUpdateCustomMods(previous => [verifiedMod, ...previous.filter(mod => mod.id !== tempId && mod.filename !== file.name)]);
      if (result.isAllowed) onNotify?.('Мод добавлен', `${file.name} установлен в папку mods.`, 'success');
      else if (result.status === 'unverified') onNotify?.('Мод ожидает одобрения', 'Файл сохранён отдельно. Отправьте заявку для проверки.', 'warning', { name: verifiedMod.name, filename: verifiedMod.filename, hashSha1: verifiedMod.hashSha1, status: 'unverified' });
      else onNotify?.('Мод заблокирован', result.reason, 'error');
    } catch (e) {
      console.error('Failed to verify mod file:', e);
      onUpdateCustomMods((previous) => previous.filter((m) => m.id !== tempId));
      onNotify?.('Не удалось добавить мод', e instanceof Error ? e.message : 'Проверьте файл и попробуйте снова.', 'error');
    }
  };

  const handleOpenWhitelistModal = (e: React.MouseEvent, mod: CustomModItem) => {
    e.stopPropagation();
    setActiveWhitelistMod(mod);
  };

  const handleOpenModsFolder = () => {
    void window.quibyApi?.openContentFolder(gameDir, 'mods').catch((error: unknown) => {
      onNotify?.('Не удалось открыть папку модов', error instanceof Error ? error.message : 'Проверьте доступ к папке игры.', 'error');
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const isAllSelected = allVisibleSelected(selectedModIds, filteredCustom.map(mod => mod.id));

  const CATEGORY_CHIPS: { id: ModFilterCategory; label: string }[] = [{ id: 'all', label: 'Все' }, ...MOD_FILTERS];

  return (
    <div className="content-page view-enter">
      {isDragging && <div className="content-import-overlay"><Upload size={36} /><strong>Отпустите моды для проверки</strong><span>.JAR · до 512 МБ</span></div>}
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jar"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            void handleFiles(Array.from(e.target.files));
          }
          e.target.value = '';
        }}
      />

      <header className="page-heading"><div><p className="page-kicker">БИБЛИОТЕКА QUIBY</p><h1>Твой контент.</h1><p>Больше возможностей для твоего мира.</p></div><span className="content-edition">1.21.1 / NEOFORGE</span></header>
      <nav className="content-category-nav" aria-label="Тип контента">
        {([['mods', 'Моды', 'Механики и возможности', Package], ['resourcepacks', 'Ресурспаки', 'Текстуры и вайтлист', Palette], ['shaders', 'Шейдеры', 'Свет и атмосфера', Sun], ['schematics', 'Схематики', 'Идеи и постройки', Layers], ['screenshots', 'Скриншоты', 'Мои кадры из игры', ImageIcon]] as const).map(([id, label, description, Icon]) => <button key={id} type="button" aria-current={contentCategory === id ? 'page' : undefined} onClick={() => { setContentCategory(id); onUpdateSelectedModIds([]); }}><Icon size={19}/><span><strong>{label}</strong><small>{description}</small></span><span className="category-arrow">↗</span></button>)}
      </nav>

      {gameActive && (contentCategory === 'mods' || contentCategory === 'resourcepacks') && <p className="content-lock-notice">Установка и удаление доступны после закрытия игры.</p>}
      {contentCategory === 'resourcepacks' ? (
        <ResourcePacksExplorer gameActive={gameActive} gameDir={gameDir} files={manifest?.files || []} session={session} onNotify={onNotify} />
      ) : contentCategory === 'schematics' ? (
        <SchematicsExplorer gameDir={gameDir} onNotify={onNotify} />
      ) : contentCategory === 'shaders' ? (
        <ShadersExplorer gameDir={gameDir} onNotify={onNotify} />
      ) : contentCategory === 'screenshots' ? (
        <ScreenshotGallery gameDir={gameDir} onNotify={onNotify} />
      ) : (
        <section className={`content-library ${switcherMode === 'custom' && selectedModIds.length ? 'has-selection' : ''}`}>
          <ContentToolbar label="Моды" total={switcherMode === 'custom' ? customMods.length : officialFiles.length} visible={switcherMode === 'custom' ? filteredCustom.length : filteredOfficial.length}
            mode={viewMode} onMode={setViewMode} busy={gameActive || batchBusy || isVerifying} onAdd={() => fileInputRef.current?.click()} onFolder={handleOpenModsFolder}
            selection={switcherMode === 'custom' ? { allSelected: isAllSelected, onSelectAll: handleSelectAllCustom } : undefined}>
            <div className="content-source-toggle" role="group" aria-label="Источник модов">
              <button type="button" aria-pressed={switcherMode === 'official'} onClick={() => { setSwitcherMode('official'); onUpdateSelectedModIds([]); }}>Сборка</button>
              <button type="button" aria-pressed={switcherMode === 'custom'} onClick={() => setSwitcherMode('custom')}>Мои моды</button>
            </div>
          </ContentToolbar>
          <ContentSearch value={search} onChange={setSearch} label="Поиск модов" hint=".jar"/>
          {isVerifying && <p className="content-lock-notice server-loading" role="status"><Loader2 size={15} className="loading-spinner"/>Проверяем файлы на сервере…</p>}
          {switcherMode === 'custom' && <ContentSelectionDock count={selectedModIds.length} total={customMods.length} allSelected={isAllSelected} busy={gameActive || batchBusy || isVerifying}
            onSelectAll={handleSelectAllCustom} onClear={() => onUpdateSelectedModIds([])} onDelete={() => void deleteSelected()} deleteLabel="Удалить"
            onEnable={() => onUpdateCustomMods(previous => previous.map(mod => selectedModIds.includes(mod.id) && mod.safetyStatus === 'approved' ? { ...mod, enabled: true } : mod))}
            onDisable={() => onUpdateCustomMods(previous => previous.map(mod => selectedModIds.includes(mod.id) ? { ...mod, enabled: false } : mod))}/>}
          {/* Filter Bar: Category Chips & Search Bar */}
          <div className="mod-filterbar">
            {/* Fast Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
                <Filter size={11} className="text-[#bb74ff]" />
                <span>Категория:</span>
              </span>
              {CATEGORY_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterCategory(chip.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer press-feedback ${
                    filterCategory === chip.id
                      ? 'bg-surface-800 border border-[#bb74ff]/60 text-white font-semibold shadow-sm'
                      : 'bg-surface-900 hover:bg-surface-850 border border-surface-border text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

          </div>

          {/* Main Mods Grid Container */}
          <div className="mod-results library-scroll">
            {switcherMode === 'official' ? (
              /* Official Modpack Mods Grid */
              filteredOfficial.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 text-xs space-y-2">
                  <Package size={32} className="mx-auto text-zinc-600" />
                  <p>Моды не найдены по текущему фильтру</p>
                </div>
              ) : (
                <div className={`mod-grid is-${viewMode}`}>
                  {filteredOfficial.map((file, idx) => {
                    const rawName = file.modName || file.path.replace('mods/', '').replace('.jar', '');
                    const iconUrl = file.modIconUrl?.startsWith('/') ? `${serverUrl}${file.modIconUrl}` : file.modIconUrl;
                    const meta = resolveModMetadata(rawName, file.path, file.modDescription, iconUrl, file.modProjectUrl, file.modId);
                    const toggleable = canDisableBundledMod(file);
                    const disabled = toggleable && disabledBundledMods.includes(file.modId!);

                    return (
                      <div
                        key={idx}
                        className="content-file-card flex items-center justify-between p-3 rounded-xl bg-surface-900 border border-surface-border hover:border-surface-borderLight transition-all duration-150 gap-3"
                      >
                        <div className="flex items-center gap-3 truncate">
                          {/* Mod Logo or Monogram */}
                          <ModIcon src={meta.iconUrl} name={meta.displayName} />

                          {/* Details */}
                          <div className="truncate space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {meta.displayName}
                              </span>
                              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">Проверен</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate leading-snug">
                              {meta.description}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono truncate">
                              {file.modVersion || '1.21.1'} • {formatSize(file.size)}{toggleable && ` • ${disabled ? 'Выключен' : 'Клиентский'}`}
                            </p>
                          </div>
                        </div>

                        {/* Status badge & external link */}
                        <div className="flex items-center gap-2 shrink-0">
                          {toggleable && <button type="button" role="switch" aria-checked={!disabled} aria-label={`${disabled ? 'Включить' : 'Отключить'} ${meta.displayName} в сборке`} title="Применится при следующем запуске игры" disabled={!onToggleBundledMod} onClick={() => onToggleBundledMod?.(file.modId!)} className="bundled-mod-toggle">{disabled ? <ToggleLeft size={24}/> : <ToggleRight size={24} className="text-emerald-400"/>}</button>}
                          {meta.projectUrl && (<a
                            href={meta.projectUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-surface-800 transition-colors press-feedback"
                            title="Открыть страницу мода"
                          >
                            <ExternalLink size={13} />
                          </a>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Custom Player Mods Grid */
              filteredCustom.length === 0 ? (
                <div className="library-empty mod-empty">
                  <div className="library-emblem" aria-hidden="true"><i/><i/><Package size={44}/></div>
                  <div className="space-y-1">
                    <h2>
                      {search || filterCategory !== 'all' ? 'Моды не найдены по запросу' : 'Твои моды. Твои возможности.'}
                    </h2>
                    <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                      Добавьте .jar — проверим файл перед установкой. Неизвестным модам потребуется одобрение.
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`mod-grid is-${viewMode}`}>
                  {filteredCustom.map((mod) => {
                    const isApproved = mod.safetyStatus === 'approved';
                    const isPending = mod.safetyStatus === 'pending';
                    const isBlocked = mod.safetyStatus === 'blocked';
                    const isUnverified = !isApproved && !isPending && !isBlocked;
                    const isSelected = selectedModIds.includes(mod.id);

                    const meta = resolveModMetadata(
                      mod.name,
                      mod.filename,
                      mod.description,
                      mod.iconUrl,
                      mod.projectUrl
                    );

                    return (
                      <div
                        key={mod.id}
                        className={`content-file-card ${isSelected ? 'is-selected' : ''} flex flex-col items-stretch p-3 rounded-xl border transition-all duration-150 gap-3 ${
                          isSelected
                            ? 'bg-surface-850 border-[#bb74ff]/60 shadow-md ring-1 ring-[#bb74ff]/30'
                            : isBlocked
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : mod.enabled
                            ? 'bg-surface-900 border-surface-border hover:border-surface-borderLight shadow-sm'
                            : 'bg-surface-900/50 border-surface-border'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <SelectionCheck disabled={gameActive || batchBusy || isVerifying} checked={isSelected} onToggle={() => toggleSelectMod(mod.id)} label={`Выделить ${mod.filename}`} />

                          {/* Logo / Monogram */}
                          <ModIcon src={meta.iconUrl} name={meta.displayName} />

                          {/* Title, Clean Filename & Status Badge */}
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white truncate">
                                {meta.displayName}
                              </span>

                              {/* Status Badges */}
                              {isApproved && (
                                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Проверен</span>
                                </span>
                              )}

                              {isPending && (
                                <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-500/10 border border-amber-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  <span>• Вайтлист</span>
                                </span>
                              )}

                              {isBlocked && (
                                <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-rose-500/10 border border-rose-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span>• Запрещен</span>
                                </span>
                              )}

                              {isUnverified && (
                                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-zinc-800 border border-zinc-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                  <span>• В проверке</span>
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-zinc-400 truncate leading-snug">
                              {meta.description}
                            </p>

                            <div className="flex items-center gap-2 min-w-0 font-mono text-[10px] text-zinc-500">
                              <span className="truncate min-w-0" title={mod.filename}>{mod.filename}</span>
                              <span className="shrink-0">• {formatSize(mod.size)}</span>
                            </div>
                          </div>
                          </div>

                          {/* Compact controls stay separate from the mod name and whitelist CTA. */}
                          <div className="flex items-center gap-1.5 shrink-0">
                          {/* Modrinth Link */}
                          {meta.projectUrl && (<a
                            href={meta.projectUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-surface-800 transition-colors press-feedback"
                            title="Открыть страницу мода"
                          >
                            <ExternalLink size={13} />
                          </a>)}

                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => toggleCustomMod(mod.id)}
                            disabled={gameActive || batchBusy || isVerifying || !isApproved}
                            className={`p-0.5 transition-all press-feedback ${
                              !isApproved ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title={
                              isBlocked
                                ? 'Запрещенный мод'
                                : isPending
                                ? 'Мод на рассмотрении'
                                : isUnverified
                                ? 'Требуется вайтлист'
                                : mod.enabled
                                ? 'Отключить мод'
                                : 'Включить мод'
                            }
                          >
                            {mod.enabled ? (
                              <ToggleRight size={24} className="text-emerald-400 stroke-[2]" />
                            ) : (
                              <ToggleLeft size={24} className="text-zinc-500 stroke-[2]" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            disabled={gameActive || batchBusy || isVerifying}
                            onClick={(e) => handleDeleteCustomMod(e, mod.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer press-feedback"
                            title="Удалить мод"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        </div>

                        {(isUnverified || (isPending && mod.reviewDeliveryFailed)) && (
                          <button type="button" disabled={isVerifying || !mod.hashSha1} onClick={(e) => handleOpenWhitelistModal(e, mod)}
                            className="w-full min-h-10 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#a65ee8] hover:bg-[#bc7ff0] text-white border border-[#d1a5f5] text-xs font-bold shadow-md transition-colors cursor-pointer press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4c4ff]"
                            title="Отправить мод на проверку для вайтлиста">
                            {mod.reviewDeliveryFailed ? 'Повторить отправку заявки' : 'Подать заявку в вайтлист'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Whitelist Submission Modal Dialog */}
      <ModWhitelistModal
        isOpen={Boolean(activeWhitelistMod)}
        onClose={() => setActiveWhitelistMod(null)}
        mod={activeWhitelistMod}
        session={session}
        serverUrl={serverUrl}

      />
    </div>
  );
};
