import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Package, 
  Plus, 
  FolderOpen, 
  CheckCircle, 
  Layers, 
  ToggleLeft, 
  ToggleRight,
  Upload,
  RefreshCw
} from 'lucide-react';
import { ModpackManifest } from '@quiby/shared';

interface CustomModsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: ModpackManifest | null;
  gameDir: string;
}

export interface CustomUserMod {
  id: string;
  name: string;
  filename: string;
  size: number;
  enabled: boolean;
}

export const CustomModsDrawer: React.FC<CustomModsDrawerProps> = ({
  isOpen,
  onClose,
  manifest,
  gameDir,
}) => {
  const [tab, setTab] = useState<'official' | 'custom'>('official');
  const [search, setSearch] = useState('');
  const [customMods, setCustomMods] = useState<CustomUserMod[]>([
    { id: '1', name: "Xaero's Minimap", filename: 'Xaeros_Minimap_24.2.0_NeoForge_1.21.1.jar', size: 1420000, enabled: true },
    { id: '2', name: 'Jade (WAILA Tooltips)', filename: 'Jade-1.21.1-NeoForge-15.1.0.jar', size: 680000, enabled: true },
  ]);

  if (!isOpen) return null;

  const officialFiles = manifest?.files || [];
  const filteredOfficial = officialFiles.filter((f) => {
    return f.path.toLowerCase().includes(search.toLowerCase()) || (f.modName && f.modName.toLowerCase().includes(search.toLowerCase()));
  });

  const filteredCustom = customMods.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.filename.toLowerCase().includes(search.toLowerCase()));

  const toggleCustomMod = (id: string) => {
    setCustomMods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handleAddCustomModFile = (file: File) => {
    if (!file.name.endsWith('.jar')) return;
    const newMod: CustomUserMod = {
      id: `custom-${Date.now()}`,
      name: file.name.replace('.jar', ''),
      filename: file.name,
      size: file.size,
      enabled: true,
    };
    setCustomMods((prev) => [newMod, ...prev]);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="bg-onyx-900 border border-onyx-border rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-onyx-border bg-onyx-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-quiby-purple/15 flex items-center justify-center text-quiby-purpleLight">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Менеджер модов сборки</h3>
              <p className="text-xs text-quiby-textMuted font-mono">
                Minecraft 1.21.1 NeoForge • Create Aeronautics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenModsFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-onyx-800 hover:bg-onyx-750 border border-onyx-border text-xs font-semibold text-quiby-text hover:text-white transition-all cursor-pointer"
            >
              <FolderOpen size={13} className="text-quiby-purpleLight" />
              <span>Папка mods</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-onyx-800 hover:bg-white/10 text-quiby-textMuted hover:text-white border border-onyx-border transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="p-4 border-b border-onyx-border bg-onyx-850/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('official')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                tab === 'official'
                  ? 'bg-quiby-purple text-white shadow-onyx-glow'
                  : 'bg-onyx-800 text-quiby-textMuted hover:text-white border border-onyx-border'
              }`}
            >
              Официальная сборка S6 ({officialFiles.length})
            </button>
            <button
              onClick={() => setTab('custom')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                tab === 'custom'
                  ? 'bg-quiby-purple text-white shadow-onyx-glow'
                  : 'bg-onyx-800 text-quiby-textMuted hover:text-white border border-onyx-border'
              }`}
            >
              Свои моды ({customMods.length})
            </button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3.5 top-2.5 text-quiby-textMuted" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск модов..."
              className="w-full bg-onyx-800 border border-onyx-border rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-quiby-textMuted focus:outline-none focus:border-quiby-purple transition-all"
            />
          </div>
        </div>

        {/* Tab 1: Official S6 Modpack */}
        {tab === 'official' ? (
          <div className="flex-1 overflow-y-auto divide-y divide-onyx-border/50 text-xs p-2">
            {filteredOfficial.length === 0 ? (
              <div className="p-16 text-center text-quiby-textMuted space-y-2">
                <Package size={36} className="mx-auto text-quiby-purple/40" />
                <p>Моды не найдены</p>
              </div>
            ) : (
              filteredOfficial.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-onyx-850 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Package size={16} className="text-quiby-purpleLight shrink-0" />
                    <div className="truncate">
                      <span className="text-white font-medium">{file.modName || file.path}</span>
                      <span className="text-[10px] text-quiby-textDim ml-2 font-mono">{file.path}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
                    <span className="text-quiby-purpleLight">{file.modVersion || '1.21.1'}</span>
                    <span className="text-quiby-textMuted">{formatSize(file.size)}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                      В сборке S6
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Tab 2: User Custom Mods */
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
            {/* Add Custom Mod Dropzone / Button */}
            <label className="border-2 border-dashed border-onyx-border hover:border-quiby-purple rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer transition-colors bg-onyx-850/50 hover:bg-quiby-purple/5">
              <Upload size={24} className="text-quiby-purpleLight" />
              <div className="text-xs font-bold text-white">Добавить свой мод (.jar)</div>
              <p className="text-[11px] text-quiby-textMuted">Перетащите .jar файл сюда или нажмите для выбора</p>
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
            <div className="space-y-2">
              <div className="text-xs font-bold text-quiby-textMuted uppercase tracking-wider px-1">
                Установленные пользовательские моды:
              </div>

              {filteredCustom.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-onyx-850 border border-onyx-border"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Package size={17} className={mod.enabled ? 'text-quiby-purpleLight' : 'text-quiby-textDim'} />
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{mod.name}</div>
                      <div className="text-[10px] text-quiby-textDim font-mono truncate">{mod.filename}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-quiby-textMuted">{formatSize(mod.size)}</span>
                    <button
                      onClick={() => toggleCustomMod(mod.id)}
                      className="cursor-pointer text-quiby-purple hover:text-quiby-purpleLight transition-colors"
                    >
                      {mod.enabled ? (
                        <ToggleRight size={28} className="text-quiby-purple" />
                      ) : (
                        <ToggleLeft size={28} className="text-quiby-textDim" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
