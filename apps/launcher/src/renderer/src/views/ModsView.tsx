import { useFileDrop } from '../utils/useFileDrop';
import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderGit2, 
  Search, 
  Package, 
  FolderOpen, 
  Plus, 
  ToggleLeft, 
  ToggleRight,
  Trash2,
  ExternalLink,
  Loader2,
  Check,
  Upload,
  X,
  CheckSquare,
  Layers,
  FileCode,
  Sun,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  Filter
} from 'lucide-react';
import { ModpackManifest, AuthSession } from '@quiby/shared';
import { resolveModMetadata } from '../utils/knownMods';
import { ModWhitelistModal } from '../components/ModWhitelistModal';
import { SchematicsExplorer } from '../components/SchematicsExplorer';
import { ShadersExplorer } from '../components/ShadersExplorer';
import { ScreenshotGallery } from '../components/ScreenshotGallery';
import type { NotificationItem } from '../utils/notifications';
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
  categories?: string[];
  projectUrl?: string;
  iconUrl?: string;
  description?: string;
}

interface ModsViewProps {
  manifest: ModpackManifest | null;
  serverUrl: string;
  gameDir: string;
  customMods: CustomModItem[];
  session?: AuthSession | null;
  selectedModIds: string[];
  onUpdateSelectedModIds: (ids: string[]) => void;
  onUpdateCustomMods: (mods: React.SetStateAction<CustomModItem[]>) => void;
  onNotify?: (
    title: string,
    message?: string,
    type?: 'success' | 'info' | 'warning' | 'error',
    modInfo?: NotificationItem['modInfo']
  ) => void;
}

export type SwitcherMode = 'official' | 'custom';
export type ContentCategory = 'mods' | 'schematics' | 'shaders' | 'screenshots';
export type ModFilterCategory = 'all' | 'optimization' | 'interface' | 'audio' | 'mechanics';

export const ModsView: React.FC<ModsViewProps> = ({
  manifest,
  serverUrl,
  gameDir,
  customMods,
  session,
  selectedModIds,
  onUpdateSelectedModIds,
  onUpdateCustomMods,
  onNotify,
}) => {
  const [contentCategory, setContentCategory] = useState<ContentCategory>('mods');
  const [switcherMode, setSwitcherMode] = useState<SwitcherMode>('custom');
  const [filterCategory, setFilterCategory] = useState<ModFilterCategory>('all');
  const [search, setSearch] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const isDragging = useFileDrop(files => handleFiles(files), contentCategory === 'mods');
  const [activeWhitelistMod, setActiveWhitelistMod] = useState<CustomModItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const officialFiles = (manifest?.files || []).filter(file => /^mods\/.*\.jar$/i.test(file.path.replace(/\\/g, '/')));

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (file.name.endsWith('.jar')) {
        handleAddCustomModFile(file);
      }
    });
  };

  const matchesCategory = (
    cat: string | undefined,
    label: string | undefined,
    categories: string[] = []
  ) => {
    if (filterCategory === 'all') return true;
    const c = (cat || '').toLowerCase();
    const l = (label || '').toLowerCase();
    if (filterCategory === 'optimization') return c === 'optimization' || categories.some(value => value === 'optimization' || value === 'performance');
    if (filterCategory === 'interface') return c === 'interface' || categories.includes('interface');
    if (filterCategory === 'audio') return l === 'звук' || l === 'голос' || categories.includes('audio');
    if (filterCategory === 'mechanics') return c === 'mechanisms' || categories.includes('technology');
    return true;
  };

  const filteredOfficial = officialFiles.filter((f) => {
    const rawName = f.modName || f.path.replace('mods/', '').replace('.jar', '');
    const meta = resolveModMetadata(rawName, f.path);
    const matchesSearch =
      meta.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.path.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesCategory(meta.category, meta.categoryLabel);
  });

  const filteredCustom = customMods.filter((m) => {
    const meta = resolveModMetadata(m.name, m.filename, m.description, m.iconUrl);
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.filename.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesCategory(meta.category, meta.categoryLabel, m.categories);
  });

  const toggleSelectMod = (id: string) => {
    if (selectedModIds.includes(id)) {
      onUpdateSelectedModIds(selectedModIds.filter((item) => item !== id));
    } else {
      onUpdateSelectedModIds([...selectedModIds, id]);
    }
  };

  const handleSelectAllCustom = () => {
    if (selectedModIds.length === filteredCustom.length) {
      onUpdateSelectedModIds([]);
    } else {
      onUpdateSelectedModIds(filteredCustom.map((m) => m.id));
    }
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

    onUpdateCustomMods((previous) => [initialMod, ...previous.filter(mod => mod.filename !== file.name)]);
    setSwitcherMode('custom');

    setIsVerifying(true);
    try {
      const result = await window.quibyApi.stageCustomMod(file.name, new Uint8Array(await file.arrayBuffer()), session?.token);
      if (result.isAllowed) {
        if (manifest?.files.some((entry) => entry.path.replace(/\\/g, '/') === `mods/${file.name}`)) {
          throw new Error('Этот мод уже входит в сборку сервера');
        }
        if (!window.quibyApi) throw new Error('Установка модов доступна только в приложении лаунчера');
        await window.quibyApi.installCustomMod(gameDir, file.name, new Uint8Array(await file.arrayBuffer()), session?.token);
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

      onUpdateCustomMods((previous) => previous.map((m) => (m.id === tempId ? verifiedMod : m)));
      if (result.isAllowed) onNotify?.('Мод добавлен', `${file.name} установлен в папку mods.`, 'success');
      else if (result.status === 'unverified') onNotify?.('Мод ожидает одобрения', 'Файл сохранён отдельно. Решение обновится автоматически, повторно добавлять мод не нужно.', 'warning');
      else onNotify?.('Мод заблокирован', result.reason, 'error');
    } catch (e) {
      console.error('Failed to verify mod file:', e);
      onUpdateCustomMods((previous) => previous.filter((m) => m.id !== tempId));
      onNotify?.('Не удалось добавить мод', e instanceof Error ? e.message : 'Проверьте файл и попробуйте снова.', 'error');
    } finally {
      setIsVerifying(false);
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

  const isAllSelected = filteredCustom.length > 0 && selectedModIds.length === filteredCustom.length;

  const CATEGORY_CHIPS: { id: ModFilterCategory; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'optimization', label: 'Оптимизация' },
    { id: 'interface', label: 'Интерфейс' },
    { id: 'audio', label: 'Аудио' },
    { id: 'mechanics', label: 'Механика' },
  ];

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
            handleFiles(e.target.files);
          }
        }}
      />

      <header className="page-heading"><div><p className="page-kicker">БИБЛИОТЕКА QUIBY</p><h1>Твой контент.</h1><p>Больше возможностей для твоего мира.</p></div><span className="content-edition">1.21.1 / NEOFORGE</span></header>
      <nav className="content-category-nav" aria-label="Тип контента">
        {([['mods', 'Моды', 'Механики и возможности', Package], ['shaders', 'Шейдеры', 'Свет и атмосфера', Sun], ['schematics', 'Схематики', 'Идеи и постройки', Layers], ['screenshots', 'Скриншоты', 'Мои кадры из игры', ImageIcon]] as const).map(([id, label, description, Icon]) => <button key={id} type="button" aria-current={contentCategory === id ? 'page' : undefined} onClick={() => { setContentCategory(id); onUpdateSelectedModIds([]); }}><Icon size={19}/><span><strong>{label}</strong><small>{description}</small></span><span className="category-arrow">↗</span></button>)}
      </nav>

      {contentCategory === 'schematics' ? (
        <SchematicsExplorer gameDir={gameDir} onNotify={onNotify} />
      ) : contentCategory === 'shaders' ? (
        <ShadersExplorer gameDir={gameDir} onNotify={onNotify} />
      ) : contentCategory === 'screenshots' ? (
        <ScreenshotGallery gameDir={gameDir} onNotify={onNotify} />
      ) : (
        <>
          {/* Sub-Header Toolbar: Switcher, Fast Actions & Folders */}
          <div className="content-toolbar">
            {/* Segmented Switcher: Сборка vs Мои моды */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="inline-flex p-1 rounded-2xl bg-surface-900 border border-surface-border shadow-inner gap-1">
                <button
                  type="button"
                  onClick={() => setSwitcherMode('official')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 press-feedback ${
                    switcherMode === 'official'
                      ? 'bg-surface-800 text-white border border-[#bb74ff]/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Сборка ({officialFiles.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSwitcherMode('custom')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 press-feedback ${
                    switcherMode === 'custom'
                      ? 'bg-surface-800 text-white border border-[#bb74ff]/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Мои моды ({customMods.length})</span>
                  {isVerifying && <Loader2 size={11} className="animate-spin text-[#bb74ff]" />}
                </button>
              </div>

              {/* Select All Button for Custom Mods */}
              {switcherMode === 'custom' && filteredCustom.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllCustom}
                  className={`h-8 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm press-feedback ${
                    isAllSelected
                      ? 'bg-surface-800 border-[#bb74ff]/50 text-white'
                      : 'bg-surface-900 border-surface-border text-zinc-300 hover:text-white hover:bg-surface-850'
                  }`}
                >
                  <CheckSquare size={13} className={isAllSelected ? 'text-emerald-400' : 'text-zinc-400'} />
                  <span>{isAllSelected ? 'Снять выбор' : `Выбрать все (${filteredCustom.length})`}</span>
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ui-button is-primary"
              >
                <Plus size={15} className="stroke-[2.5]" />
                <span>Добавить файл</span>
              </button>

              <button
                type="button"
                onClick={handleOpenModsFolder}
                className="ui-button"
                title="Открыть папку mods в проводнике"
              >
                <FolderOpen size={13} className="text-zinc-400" />
                <span>Открыть папку</span>
              </button>
            </div>
          </div>

          {/* Filter Bar: Category Chips & Search Bar */}
          <div className="mod-filterbar">
            {/* Fast Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
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

            {/* Fast Search Bar with Clear Button */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 text-zinc-500" size={13} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию или файлу..."
                className="w-full bg-surface-900 border border-surface-border focus:border-[#bb74ff]/50 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 text-zinc-500 hover:text-white p-0.5 cursor-pointer press-feedback"
                  title="Очистить поиск"
                >
                  <X size={13} />
                </button>
              )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {filteredOfficial.map((file, idx) => {
                    const rawName = file.modName || file.path.replace('mods/', '').replace('.jar', '');
                    const iconUrl = file.modIconUrl?.startsWith('/') ? `${serverUrl}${file.modIconUrl}` : file.modIconUrl;
                    const meta = resolveModMetadata(rawName, file.path, file.modDescription, iconUrl);

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-surface-900 border border-surface-border hover:border-surface-borderLight transition-all duration-150 gap-3"
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
                              <span className="px-1.5 py-0.2 rounded bg-surface-850 border border-surface-border text-[9px] text-zinc-400 font-mono shrink-0">
                                {meta.categoryLabel}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate leading-snug">
                              {meta.description}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono truncate">
                              {file.modVersion || '1.21.1'} • {formatSize(file.size)}
                            </p>
                          </div>
                        </div>

                        {/* Status badge & external link */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>• Проверен</span>
                          </span>

                          <a
                            href={file.modProjectUrl || meta.projectUrl || `https://modrinth.com/mods?q=${encodeURIComponent(rawName)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-surface-800 transition-colors press-feedback"
                            title={file.modProjectUrl || meta.projectUrl ? 'Открыть страницу мода' : 'Найти на Modrinth'}
                          >
                            <ExternalLink size={13} />
                          </a>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                      mod.iconUrl
                    );

                    return (
                      <div
                        key={mod.id}
                        className={`flex flex-col items-stretch p-3 rounded-xl border transition-all duration-150 gap-3 ${
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
                          {/* Checkbox selector */}
                          <button
                            type="button"
                            onClick={() => toggleSelectMod(mod.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer press-feedback ${
                              isSelected
                                ? 'bg-[#bb74ff] text-surface-950 shadow-sm'
                                : 'bg-surface-850 border border-surface-border text-transparent hover:border-[#bb74ff]/50'
                            }`}
                            title={isSelected ? 'Снять выбор' : 'Выбрать мод'}
                          >
                            <Check size={12} className="stroke-[3]" />
                          </button>

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
                                  <span>• Проверен</span>
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
                          <a
                            href={
                              mod.projectUrl || meta.projectUrl ||
                              `https://modrinth.com/mods?q=${encodeURIComponent(meta.displayName)}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-surface-800 transition-colors press-feedback"
                            title="Открыть на Modrinth"
                          >
                            <ExternalLink size={13} />
                          </a>

                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => toggleCustomMod(mod.id)}
                            disabled={!isApproved}
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
                            onClick={(e) => handleDeleteCustomMod(e, mod.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer press-feedback"
                            title="Удалить мод"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        </div>

                        {isUnverified && (
                          <button type="button" onClick={(e) => handleOpenWhitelistModal(e, mod)}
                            className="w-full min-h-10 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#a65ee8] hover:bg-[#bc7ff0] text-white border border-[#d1a5f5] text-xs font-bold shadow-md transition-colors cursor-pointer press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4c4ff]"
                            title="Отправить мод на проверку для вайтлиста">
                            Подать заявку в вайтлист
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* Whitelist Submission Modal Dialog */}
      <ModWhitelistModal
        isOpen={Boolean(activeWhitelistMod)}
        onClose={() => setActiveWhitelistMod(null)}
        mod={activeWhitelistMod}
        session={session}
        serverUrl={serverUrl}
        onSuccess={(modId, modName) => {
          const modItem = customMods.find((m) => m.id === modId);
          onUpdateCustomMods(
            customMods.map((m) =>
              m.id === modId
                ? {
                    ...m,
                    safetyStatus: 'pending',
                    safetyReason: 'Заявка отправлена модераторам в Discord и находится на рассмотрении',
                  }
                : m
            )
          );
          if (onNotify) {
            onNotify(
              `Заявка на мод «${modName}» отправлена`,
              'Заявка на добавление мода успешно отправлена в Discord канал модерации. Модераторы проверят файл и вынесут решение.',
              'success',
              modItem
                ? {
                    name: modItem.name,
                    filename: modItem.filename,
                    iconUrl: modItem.iconUrl,
                    status: 'pending',
                    hashSha1: modItem.hashSha1,
                    description: modItem.description,
                  }
                : undefined
            );
          }
        }}
      />
    </div>
  );
};
