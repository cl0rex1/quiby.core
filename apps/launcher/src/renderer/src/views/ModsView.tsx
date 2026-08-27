import React, { useState, useEffect } from 'react';
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
  Send
} from 'lucide-react';
import { ModpackManifest, AuthSession } from '@quiby/shared';
import { verifyCustomMod, submitModWhitelistRequest } from '../utils/modVerifier';
import { resolveModMetadata, ModMetadata } from '../utils/knownMods';

export interface CustomModItem {
  id: string;
  name: string;
  filename: string;
  size: number;
  enabled: boolean;
  hashSha1?: string;
  safetyStatus?: 'approved' | 'blocked' | 'unverified' | 'checking';
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
  onUpdateCustomMods: (mods: CustomModItem[]) => void;
}

type TabType = 'official' | 'custom';

export const ModsView: React.FC<ModsViewProps> = ({
  manifest,
  gameDir,
  customMods,
  session,
  onUpdateCustomMods,
}) => {
  const [tab, setTab] = useState<TabType>('official');
  const [search, setSearch] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [whitelistSuccessId, setWhitelistSuccessId] = useState<string | null>(null);

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
        Array.from(e.dataTransfer.files).forEach((file) => {
          if (file.name.endsWith('.jar')) {
            handleAddCustomModFile(file);
          }
        });
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

  const filteredOfficial = officialFiles.filter((f) => {
    const name = f.modName || f.path;
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      f.path.toLowerCase().includes(search.toLowerCase())
    );
  });

  const filteredCustom = customMods.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.filename.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCustomMod = (id: string) => {
    const target = customMods.find((m) => m.id === id);
    if (target?.safetyStatus === 'blocked') return;

    const updated = customMods.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    onUpdateCustomMods(updated);
  };

  const handleDeleteCustomMod = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = customMods.filter((m) => m.id !== id);
    onUpdateCustomMods(updated);
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
      safetyStatus: 'checking',
      iconUrl: meta.iconUrl,
      description: meta.description,
    };

    const nextList = [initialMod, ...customMods];
    onUpdateCustomMods(nextList);
    setTab('custom');

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

  const handleRequestWhitelist = async (e: React.MouseEvent, mod: CustomModItem) => {
    e.stopPropagation();
    if (!mod.hashSha1) return;
    try {
      const res = await submitModWhitelistRequest(
        { name: mod.name, filename: mod.filename, hashSha1: mod.hashSha1 },
        session
      );
      if (res.success) {
        setWhitelistSuccessId(mod.id);
        setTimeout(() => setWhitelistSuccessId(null), 4000);
      }
    } catch (e) {
      console.error('Failed to submit whitelist request:', e);
    }
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 md:p-8 space-y-5 select-none z-10 relative">
      {/* Full-Window Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md border-4 border-dashed border-zinc-400 p-8 pointer-events-none animate-in fade-in duration-150">
          <div className="flex flex-col items-center gap-3.5 p-8 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-white">
              <Upload size={32} className="animate-bounce" />
            </div>
            <p className="text-base font-bold text-white">Отпустите мод (.jar) для установки</p>
            <p className="text-xs text-zinc-400">Файл добавится в вашу личную коллекцию модов</p>
          </div>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <FolderGit2 className="text-zinc-400" size={22} />
            <span>Моды сборки</span>
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Minecraft 1.21.1 NeoForge • Season VI
          </p>
        </div>

        {/* Action Buttons: Add Mod & Open Folder */}
        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95">
            <Plus size={15} className="stroke-[2.5]" />
            <span>Добавить мод (.jar)</span>
            <input
              type="file"
              accept=".jar"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleAddCustomModFile(e.target.files[0]);
                }
              }}
            />
          </label>

          <button
            onClick={handleOpenModsFolder}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Открыть папку mods в проводнике"
          >
            <FolderOpen size={14} className="text-zinc-400" />
            <span>Папка mods</span>
          </button>
        </div>
      </div>

      {/* Search & Tab Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        {/* Clean Segment Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950/60 border border-white/5 w-full sm:w-auto">
          <button
            onClick={() => setTab('official')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === 'official'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Официальные моды ({officialFiles.length})
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'custom'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Мои моды ({customMods.length})</span>
            {isVerifying && <Loader2 size={11} className="animate-spin text-zinc-400" />}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 text-zinc-500" size={13} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Mods Grid Container */}
      <div className="flex-1 bg-zinc-950/40 border border-white/5 rounded-3xl p-4 md:p-5 overflow-y-auto backdrop-blur-sm shadow-sm">
        {tab === 'official' ? (
          /* Official Modpack Mods Grid */
          filteredOfficial.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 text-xs space-y-2">
              <Package size={32} className="mx-auto text-zinc-600" />
              <p>Моды не найдены по запросу «{search}»</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredOfficial.map((file, idx) => {
                const rawName = file.modName || file.path.replace('mods/', '').replace('.jar', '');
                const meta = resolveModMetadata(rawName, file.path);

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-white/5 hover:border-white/10 transition-all gap-3.5"
                  >
                    <div className="flex items-center gap-3.5 truncate">
                      {/* Mod Logo Icon */}
                      <div className="w-11 h-11 rounded-2xl bg-zinc-850 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        {meta.iconUrl ? (
                          <img
                            src={meta.iconUrl}
                            alt={meta.displayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package size={18} className="text-zinc-400" />
                        )}
                      </div>

                      {/* Title & Short Description */}
                      <div className="truncate space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {meta.displayName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 border border-white/5 text-[9px] text-zinc-400 font-mono shrink-0">
                            {meta.categoryLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate leading-snug">
                          {meta.description}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-mono truncate">
                          {file.modVersion || '1.21.1'} • {formatSize(file.size)}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 text-[10px] font-mono text-zinc-400 border border-white/5 shrink-0">
                      В сборке
                    </span>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Custom Player Mods Grid */
          filteredCustom.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 text-xs space-y-3">
              <Package size={36} className="mx-auto text-zinc-600" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-zinc-300">У вас пока нет установленных модов</p>
                <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                  Перетащите файл .jar в любое место окна или нажмите «Добавить мод».
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCustom.map((mod) => {
                const isBlocked = mod.safetyStatus === 'blocked';
                const isUnverified = mod.safetyStatus === 'unverified';
                const isRequested = whitelistSuccessId === mod.id;
                const meta = resolveModMetadata(
                  mod.name,
                  mod.filename,
                  mod.description,
                  mod.iconUrl
                );

                return (
                  <div
                    key={mod.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all gap-3.5 ${
                      isBlocked
                        ? 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                        : mod.enabled
                        ? 'bg-zinc-900/80 border-white/10 shadow-sm'
                        : 'bg-zinc-900/40 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 truncate">
                      {/* Mod Logo */}
                      <div className="w-11 h-11 rounded-2xl bg-zinc-850 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        {meta.iconUrl ? (
                          <img
                            src={meta.iconUrl}
                            alt={meta.displayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package size={18} className="text-zinc-400" />
                        )}
                      </div>

                      {/* Title & Short Description */}
                      <div className="truncate space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {meta.displayName}
                          </span>
                          {mod.projectUrl && (
                            <a
                              href={mod.projectUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-500 hover:text-white transition-colors shrink-0"
                              title="Открыть на Modrinth"
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-400 truncate leading-snug">
                          {meta.description}
                        </p>

                        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 truncate">
                          <span>{formatSize(mod.size)}</span>
                          {isUnverified && !isRequested && (
                            <button
                              onClick={(e) => handleRequestWhitelist(e, mod)}
                              className="text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Send size={9} />
                              <span>Запросить вайтлист</span>
                            </button>
                          )}
                          {isRequested && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Check size={10} />
                              <span>Запрос отправлен</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Controls: Switch & Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleCustomMod(mod.id)}
                        disabled={isBlocked}
                        className={`cursor-pointer transition-all ${
                          isBlocked ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                        }`}
                        title={isBlocked ? 'Мод заблокирован' : undefined}
                      >
                        {mod.enabled && !isBlocked ? (
                          <ToggleRight size={26} className="text-white" />
                        ) : (
                          <ToggleLeft size={26} className="text-zinc-600" />
                        )}
                      </button>

                      <button
                        onClick={(e) => handleDeleteCustomMod(e, mod.id)}
                        className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
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
    </div>
  );
};
