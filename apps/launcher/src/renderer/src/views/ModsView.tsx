import React, { useState } from 'react';
import { 
  FolderGit2, 
  Search, 
  Package, 
  FolderOpen, 
  Upload, 
  ToggleLeft, 
  ToggleRight,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ExternalLink,
  Trash2,
  Send,
  Loader2,
  Check
} from 'lucide-react';
import { ModpackManifest, AuthSession } from '@quiby/shared';
import { verifyCustomMod, submitModWhitelistRequest } from '../utils/modVerifier';

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
}

interface ModsViewProps {
  manifest: ModpackManifest | null;
  gameDir: string;
  customMods: CustomModItem[];
  session?: AuthSession | null;
  onUpdateCustomMods: (mods: CustomModItem[]) => void;
}

export const ModsView: React.FC<ModsViewProps> = ({
  manifest,
  gameDir,
  customMods,
  session,
  onUpdateCustomMods,
}) => {
  const [tab, setTab] = useState<'official' | 'custom'>('official');
  const [search, setSearch] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [whitelistSuccessId, setWhitelistSuccessId] = useState<string | null>(null);

  const officialFiles = manifest?.files || [];
  const filteredOfficial = officialFiles.filter((f) => {
    return (
      f.path.toLowerCase().includes(search.toLowerCase()) ||
      (f.modName && f.modName.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const filteredCustom = customMods.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.filename.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCustomMod = (id: string) => {
    const target = customMods.find((m) => m.id === id);
    // Disallow enabling blocked cheat mods
    if (target?.safetyStatus === 'blocked') return;

    const updated = customMods.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    onUpdateCustomMods(updated);
  };

  const handleDeleteCustomMod = (id: string) => {
    const updated = customMods.filter((m) => m.id !== id);
    onUpdateCustomMods(updated);
  };

  const handleAddCustomModFile = async (file: File) => {
    if (!file.name.endsWith('.jar')) return;

    const tempId = `custom-${Date.now()}`;
    const initialMod: CustomModItem = {
      id: tempId,
      name: file.name.replace('.jar', ''),
      filename: file.name,
      size: file.size,
      enabled: false,
      safetyStatus: 'checking',
      safetyReason: 'Проверка в базе Modrinth и правилах античита...',
    };

    // Add placeholder immediately
    const nextList = [initialMod, ...customMods];
    onUpdateCustomMods(nextList);

    setIsVerifying(true);
    try {
      const result = await verifyCustomMod(file);
      const verifiedMod: CustomModItem = {
        ...initialMod,
        name: result.name || initialMod.name,
        hashSha1: result.hashSha1,
        safetyStatus: result.status,
        safetyReason: result.reason,
        categories: result.categories,
        projectUrl: result.projectUrl,
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

  const handleRequestWhitelist = async (mod: CustomModItem) => {
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
    <div className="flex-1 flex flex-col h-full overflow-hidden p-8 space-y-5 select-none z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <FolderGit2 className="text-zinc-400" size={22} />
            <span>Моды сборки</span>
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Minecraft 1.21.1 NeoForge • Create Aeronautics
          </p>
        </div>

        <button
          onClick={handleOpenModsFolder}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
        >
          <FolderOpen size={14} className="text-zinc-400" />
          <span>Открыть папку mods</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('official')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              tab === 'official'
                ? 'bg-white text-black shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-white/10'
            }`}
          >
            Сборка 6 Сезона ({officialFiles.length})
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'custom'
                ? 'bg-white text-black shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-white/10'
            }`}
          >
            <span>Мои моды ({customMods.length})</span>
            {isVerifying && <Loader2 size={12} className="animate-spin text-zinc-400" />}
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3.5 top-2.5 text-zinc-500" size={13} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по модам..."
            className="w-full bg-zinc-900/80 border border-white/10 rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 bg-zinc-950/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col backdrop-blur-sm shadow-sm">
        {tab === 'official' ? (
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 text-xs p-2">
            {filteredOfficial.length === 0 ? (
              <div className="p-16 text-center text-zinc-500 space-y-2">
                <Package size={36} className="mx-auto text-zinc-600" />
                <p>Моды не найдены</p>
              </div>
            ) : (
              filteredOfficial.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-900/60 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Package size={16} className="text-zinc-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-white font-medium">{file.modName || file.path}</span>
                      <span className="text-[10px] text-zinc-500 ml-2 font-mono">{file.path}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
                    <span className="text-zinc-400">{file.modVersion || '1.21.1'}</span>
                    <span className="text-zinc-500">{formatSize(file.size)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
            {/* Upload Box */}
            <label className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-3xl p-6 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all bg-zinc-900/40 hover:bg-zinc-900/70 group">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                <Upload size={20} />
              </div>
              <div className="text-xs font-bold text-white">Добавить клиентский мод (.jar)</div>
              <p className="text-[11px] text-zinc-500 max-w-sm">
                Мод автоматически проверяется через Modrinth на отсутствие читов и грифинга
              </p>
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

            {/* Custom Mods List */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">
                Пользовательские клиентские моды:
              </div>

              {filteredCustom.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  У вас пока нет добавленных модов. Перетащите .jar файл для установки.
                </div>
              ) : (
                filteredCustom.map((mod) => {
                  const isBlocked = mod.safetyStatus === 'blocked';
                  const isApproved = mod.safetyStatus === 'approved';
                  const isChecking = mod.safetyStatus === 'checking';
                  const isUnverified = mod.safetyStatus === 'unverified' || (!isBlocked && !isApproved && !isChecking);
                  const isRequested = whitelistSuccessId === mod.id;

                  return (
                    <div
                      key={mod.id}
                      className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all gap-3 ${
                        isBlocked
                          ? 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                          : 'bg-zinc-900/70 border-white/5 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Package
                          size={18}
                          className={`shrink-0 ${
                            isBlocked
                              ? 'text-rose-400'
                              : isApproved
                              ? 'text-emerald-400'
                              : 'text-zinc-500'
                          }`}
                        />
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{mod.name}</span>
                            {mod.projectUrl && (
                              <a
                                href={mod.projectUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-500 hover:text-white transition-colors"
                                title="Открыть на Modrinth"
                              >
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono truncate">
                            {mod.filename} • {formatSize(mod.size)}
                          </div>
                        </div>
                      </div>

                      {/* Safety Status & Actions */}
                      <div className="flex items-center gap-3 shrink-0 ml-auto">
                        {/* Status Badge */}
                        {isChecking && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 text-[11px] text-zinc-400 font-medium">
                            <Loader2 size={11} className="animate-spin" />
                            <span>Проверка...</span>
                          </span>
                        )}

                        {isApproved && (
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium"
                            title={mod.safetyReason}
                          >
                            <ShieldCheck size={12} />
                            <span>Одобрен</span>
                          </span>
                        )}

                        {isBlocked && (
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 font-medium"
                            title={mod.safetyReason}
                          >
                            <ShieldAlert size={12} />
                            <span>Запрещен (Чит)</span>
                          </span>
                        )}

                        {isUnverified && (
                          <div className="flex items-center gap-2">
                            <span
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 font-medium"
                              title={mod.safetyReason}
                            >
                              <ShieldQuestion size={12} />
                              <span>Не проверен</span>
                            </span>

                            {isRequested ? (
                              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-[11px] text-emerald-400">
                                <Check size={11} />
                                <span>Запрос отправлен</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRequestWhitelist(mod)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 hover:text-white transition-colors cursor-pointer border border-white/10"
                                title="Отправить мод на одобрение в вайтлист"
                              >
                                <Send size={10} />
                                <span>В вайтлист</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Toggle On/Off */}
                        <button
                          onClick={() => toggleCustomMod(mod.id)}
                          disabled={isBlocked}
                          className={`cursor-pointer transition-opacity ${
                            isBlocked ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'
                          }`}
                          title={isBlocked ? 'Запрещенный мод нельзя включить' : undefined}
                        >
                          {mod.enabled && !isBlocked ? (
                            <ToggleRight size={26} className="text-white" />
                          ) : (
                            <ToggleLeft size={26} className="text-zinc-600" />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteCustomMod(mod.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Удалить мод"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
