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
  ShieldCheck,
  Sparkles,
  Filter
} from 'lucide-react';
import { ModpackManifest, AuthSession } from '@quiby/shared';
import { verifyCustomMod } from '../utils/modVerifier';
import { resolveModMetadata } from '../utils/knownMods';
import { ModWhitelistModal } from '../components/ModWhitelistModal';
import { SchematicsExplorer } from '../components/SchematicsExplorer';
import { ShadersExplorer } from '../components/ShadersExplorer';
import { NotificationItem } from '../components/NotificationsModal';

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
  gameDir: string;
  customMods: CustomModItem[];
  session?: AuthSession | null;
  selectedModIds: string[];
  onUpdateSelectedModIds: (ids: string[]) => void;
  onUpdateCustomMods: (mods: CustomModItem[]) => void;
  onNotify?: (
    title: string,
    message?: string,
    type?: 'success' | 'info' | 'warning' | 'error',
    modInfo?: NotificationItem['modInfo']
  ) => void;
}

export type SwitcherMode = 'official' | 'custom';
export type ContentCategory = 'mods' | 'schematics' | 'shaders';
export type ModFilterCategory = 'all' | 'optimization' | 'interface' | 'audio' | 'mechanics';

export const ModsView: React.FC<ModsViewProps> = ({
  manifest,
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
  const [isDragging, setIsDragging] = useState(false);
  const [activeWhitelistMod, setActiveWhitelistMod] = useState<CustomModItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const officialFiles = manifest?.files || [];

  // Window-wide drag & drop listener for .jar files
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounter++;
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
      if (e.dataTransfer?.files) {
        handleFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [customMods]);

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
    name: string,
    filename: string
  ) => {
    if (filterCategory === 'all') return true;
    const c = (cat || '').toLowerCase();
    const l = (label || '').toLowerCase();
    const full = (name + ' ' + filename).toLowerCase();

    if (filterCategory === 'optimization') {
      return (
        c === 'optimization' ||
        l.includes('оптимиз') ||
        full.includes('sodium') ||
        full.includes('ferrite') ||
        full.includes('embeddium') ||
        full.includes('memory') ||
        full.includes('culling') ||
        full.includes('fast')
      );
    }
    if (filterCategory === 'interface') {
      return (
        c === 'interface' ||
        l.includes('интерфейс') ||
        full.includes('jei') ||
        full.includes('rei') ||
        full.includes('emi') ||
        full.includes('jade') ||
        full.includes('appleskin') ||
        full.includes('mouse')
      );
    }
    if (filterCategory === 'audio') {
      return (
        l.includes('звук') ||
        l.includes('голос') ||
        full.includes('sound') ||
        full.includes('physics') ||
        full.includes('voice') ||
        full.includes('footstep') ||
        full.includes('audio')
      );
    }
    if (filterCategory === 'mechanics') {
      return (
        c === 'mechanisms' ||
        l.includes('механик') ||
        l.includes('дирижабл') ||
        full.includes('create') ||
        full.includes('aeronautics') ||
        full.includes('steam') ||
        full.includes('train')
      );
    }
    return true;
  };

  const filteredOfficial = officialFiles.filter((f) => {
    const rawName = f.modName || f.path.replace('mods/', '').replace('.jar', '');
    const meta = resolveModMetadata(rawName, f.path);
    const matchesSearch =
      meta.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.path.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesCategory(meta.category, meta.categoryLabel, meta.displayName, f.path);
  });

  const filteredCustom = customMods.filter((m) => {
    const meta = resolveModMetadata(m.name, m.filename, m.description, m.iconUrl);
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.filename.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesCategory(meta.category, meta.categoryLabel, m.name, m.filename);
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

  const handleDeleteCustomMod = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = customMods.filter((m) => m.id !== id);
    onUpdateCustomMods(updated);
    onUpdateSelectedModIds(selectedModIds.filter((item) => item !== id));
  };

  const handleAddCustomModFile = async (file: File) => {
    if (!file.name.endsWith('.jar')) return;

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

    const nextList = [initialMod, ...customMods];
    onUpdateCustomMods(nextList);
    setSwitcherMode('custom');

    setIsVerifying(true);
    try {
      const result = await verifyCustomMod(file);
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

      onUpdateCustomMods(
        nextList.map((m) => (m.id === tempId ? verifiedMod : m))
      );
    } catch (e) {
      console.error('Failed to verify mod file:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenWhitelistModal = (e: React.MouseEvent, mod: CustomModItem) => {
    e.stopPropagation();
    setActiveWhitelistMod(mod);
  };

  const handleOpenModsFolder = () => {
    window.quibyApi?.openPath(`${gameDir}/mods`);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getMonogram = (title: string) => {
    const cleaned = title.replace(/[^a-zA-Z0-9а-яА-Я]/g, ' ').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (cleaned.substring(0, 2) || 'MD').toUpperCase();
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
    <div className="flex-1 flex flex-col h-full overflow-hidden p-5 md:p-7 space-y-4 select-none z-10 relative">
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

      {/* Top Header: Title & Content Category Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2.5 tracking-tight">
            {contentCategory === 'mods' && <Package className="text-[#d4975c]" size={22} />}
            {contentCategory === 'schematics' && <Layers className="text-purple-400" size={22} />}
            {contentCategory === 'shaders' && <Sun className="text-amber-400" size={22} />}
            <span>
              {contentCategory === 'mods' && 'Модификации'}
              {contentCategory === 'schematics' && 'Схематики Create'}
              {contentCategory === 'shaders' && 'Шейдерпаки'}
            </span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Minecraft 1.21.1 NeoForge • Season VI Content Hub
          </p>
        </div>

        {/* Master Category Selector */}
        <div className="inline-flex p-1 rounded-2xl bg-surface-900 border border-surface-border shadow-inner gap-1">
          <button
            type="button"
            onClick={() => setContentCategory('mods')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 press-feedback ${
              contentCategory === 'mods'
                ? 'bg-surface-800 text-white border border-[#d4975c]/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package size={13} className={contentCategory === 'mods' ? 'text-[#d4975c]' : ''} />
            <span>Моды</span>
          </button>

          <button
            type="button"
            onClick={() => setContentCategory('schematics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 press-feedback ${
              contentCategory === 'schematics'
                ? 'bg-surface-800 text-white border border-[#d4975c]/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers size={13} className="text-purple-400" />
            <span>Схематики</span>
          </button>

          <button
            type="button"
            onClick={() => setContentCategory('shaders')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 press-feedback ${
              contentCategory === 'shaders'
                ? 'bg-surface-800 text-white border border-[#d4975c]/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sun size={13} className="text-amber-400" />
            <span>Шейдеры</span>
          </button>
        </div>
      </div>

      {contentCategory === 'schematics' ? (
        <SchematicsExplorer gameDir={gameDir} onNotify={onNotify} />
      ) : contentCategory === 'shaders' ? (
        <ShadersExplorer gameDir={gameDir} onNotify={onNotify} />
      ) : (
        <>
          {/* In-Context Sleek Dashed Drop Banner at top */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-between px-4 py-2.5 border border-dashed press-feedback ${
              isDragging
                ? 'border-[#d4975c] bg-[#d4975c]/15 text-white shadow-[0_0_20px_rgba(212,151,92,0.25)] scale-[1.01]'
                : 'border-surface-borderLight hover:border-[#d4975c]/50 bg-surface-900/70 hover:bg-surface-850 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isDragging ? 'bg-[#d4975c] text-surface-950' : 'bg-surface-800 text-[#d4975c]'
              }`}>
                <Upload size={14} className={isDragging ? 'animate-bounce' : ''} />
              </div>
              <span className="text-xs font-medium">
                {isDragging
                  ? 'Отпустите .jar файл для быстрой установки мода в клиент'
                  : 'Перетащите .jar файлы сюда или нажмите для выбора из проводника'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline-block">
              NeoForge 1.21.1 • Drag & Drop
            </span>
          </div>

          {/* Sub-Header Toolbar: Switcher, Fast Actions & Folders */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Segmented Switcher: Сборка vs Мои моды */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="inline-flex p-1 rounded-2xl bg-surface-900 border border-surface-border shadow-inner gap-1">
                <button
                  type="button"
                  onClick={() => setSwitcherMode('official')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 press-feedback ${
                    switcherMode === 'official'
                      ? 'bg-surface-800 text-white border border-[#d4975c]/40 shadow-sm'
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
                      ? 'bg-surface-800 text-white border border-[#d4975c]/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Мои моды ({customMods.length})</span>
                  {isVerifying && <Loader2 size={11} className="animate-spin text-[#d4975c]" />}
                </button>
              </div>

              {/* Select All Button for Custom Mods */}
              {switcherMode === 'custom' && filteredCustom.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllCustom}
                  className={`h-8 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm press-feedback ${
                    isAllSelected
                      ? 'bg-surface-800 border-[#d4975c]/50 text-white'
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#d4975c] hover:bg-[#eab683] text-surface-950 text-xs font-bold transition-all cursor-pointer shadow-sm press-feedback"
              >
                <Plus size={15} className="stroke-[2.5]" />
                <span>Добавить мод (.jar)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenModsFolder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-900 hover:bg-surface-850 border border-surface-border hover:border-surface-borderLight text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm press-feedback"
                title="Открыть папку mods в проводнике"
              >
                <FolderOpen size={13} className="text-zinc-400" />
                <span>Папка mods</span>
              </button>
            </div>
          </div>

          {/* Filter Bar: Category Chips & Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 shrink-0">
            {/* Fast Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
                <Filter size={11} className="text-[#d4975c]" />
                <span>Категория:</span>
              </span>
              {CATEGORY_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterCategory(chip.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer press-feedback ${
                    filterCategory === chip.id
                      ? 'bg-surface-800 border border-[#d4975c]/60 text-white font-semibold shadow-sm'
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
                className="w-full bg-surface-900 border border-surface-border focus:border-[#d4975c]/50 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-colors"
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
          <div className="flex-1 bg-surface-950/80 border border-surface-border rounded-2xl p-3 md:p-4 overflow-y-auto shadow-sm space-y-2.5">
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
                    const meta = resolveModMetadata(rawName, file.path);

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-surface-900 border border-surface-border hover:border-surface-borderLight transition-all duration-150 gap-3"
                      >
                        <div className="flex items-center gap-3 truncate">
                          {/* Mod Logo or Monogram */}
                          {meta.iconUrl ? (
                            <img
                              src={meta.iconUrl}
                              alt={meta.displayName}
                              className="w-10 h-10 rounded-xl object-cover border border-surface-border bg-surface-850 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-surface-850 border border-surface-border flex items-center justify-center shrink-0 font-mono font-bold text-xs text-[#d4975c]">
                              {getMonogram(meta.displayName)}
                            </div>
                          )}

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
                            href={`https://modrinth.com/mods?q=${encodeURIComponent(meta.displayName)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-surface-800 transition-colors press-feedback"
                            title="Найти на Modrinth"
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
                <div className="py-20 text-center text-zinc-500 text-xs space-y-2.5">
                  <Package size={36} className="mx-auto text-zinc-600" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-zinc-300">
                      {search || filterCategory !== 'all' ? 'Моды не найдены по запросу' : 'У вас пока нет установленных модов'}
                    </p>
                    <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                      Перетащите файл .jar в панель сверху или нажмите «Добавить мод».
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
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 gap-3 ${
                          isSelected
                            ? 'bg-surface-850 border-[#d4975c]/60 shadow-md ring-1 ring-[#d4975c]/30'
                            : isBlocked
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : mod.enabled
                            ? 'bg-surface-900 border-surface-border hover:border-surface-borderLight shadow-sm'
                            : 'bg-surface-900/50 border-surface-border opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {/* Checkbox selector */}
                          <button
                            type="button"
                            onClick={() => toggleSelectMod(mod.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer press-feedback ${
                              isSelected
                                ? 'bg-[#d4975c] text-surface-950 shadow-sm'
                                : 'bg-surface-850 border border-surface-border text-transparent hover:border-[#d4975c]/50'
                            }`}
                            title={isSelected ? 'Снять выбор' : 'Выбрать мод'}
                          >
                            <Check size={12} className="stroke-[3]" />
                          </button>

                          {/* Logo / Monogram */}
                          {meta.iconUrl ? (
                            <img
                              src={meta.iconUrl}
                              alt={meta.displayName}
                              className="w-10 h-10 rounded-xl object-cover border border-surface-border bg-surface-850 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-surface-850 border border-surface-border flex items-center justify-center shrink-0 font-mono font-bold text-xs text-[#d4975c]">
                              {getMonogram(meta.displayName)}
                            </div>
                          )}

                          {/* Title, Clean Filename & Status Badge */}
                          <div className="truncate space-y-0.5">
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

                            <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 truncate">
                              <span>{mod.filename}</span>
                              <span>•</span>
                              <span>{formatSize(mod.size)}</span>

                              {isUnverified && (
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenWhitelistModal(e, mod)}
                                  className="px-2 py-0.5 rounded bg-surface-800 hover:bg-surface-750 text-[#eab683] border border-surface-border text-[10px] font-sans font-medium transition-colors cursor-pointer press-feedback"
                                >
                                  Вайтлист
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Controls: Modrinth Link, Toggle Switch & Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Modrinth Link */}
                          <a
                            href={
                              mod.projectUrl ||
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
