import React, { useState } from 'react';
import { 
  Layers, 
  Search, 
  Package, 
  FolderOpen, 
  Upload, 
  ToggleLeft, 
  ToggleRight 
} from 'lucide-react';
import { ModpackManifest } from '@quiby/shared';

export interface CustomModItem {
  id: string;
  name: string;
  filename: string;
  size: number;
  enabled: boolean;
}

interface ModsViewProps {
  manifest: ModpackManifest | null;
  gameDir: string;
  customMods: CustomModItem[];
  onUpdateCustomMods: (mods: CustomModItem[]) => void;
}

export const ModsView: React.FC<ModsViewProps> = ({
  manifest,
  gameDir,
  customMods,
  onUpdateCustomMods,
}) => {
  const [tab, setTab] = useState<'official' | 'custom'>('official');
  const [search, setSearch] = useState('');

  const officialFiles = manifest?.files || [];
  const filteredOfficial = officialFiles.filter((f) => {
    return f.path.toLowerCase().includes(search.toLowerCase()) || (f.modName && f.modName.toLowerCase().includes(search.toLowerCase()));
  });

  const filteredCustom = customMods.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.filename.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCustomMod = (id: string) => {
    const updated = customMods.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m));
    onUpdateCustomMods(updated);
  };

  const handleAddCustomModFile = (file: File) => {
    if (!file.name.endsWith('.jar')) return;
    const newMod: CustomModItem = {
      id: `custom-${Date.now()}`,
      name: file.name.replace('.jar', ''),
      filename: file.name,
      size: file.size,
      enabled: true,
    };
    onUpdateCustomMods([newMod, ...customMods]);
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
            <Layers className="text-quiby-purpleLight" />
            <span>Моды сборки</span>
          </h2>
          <p className="text-xs text-quiby-textMuted font-mono mt-0.5">
            Minecraft 1.21.1 NeoForge • Create Aeronautics
          </p>
        </div>

        <button
          onClick={handleOpenModsFolder}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-onyx-850 hover:bg-onyx-800 border border-onyx-border text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
        >
          <FolderOpen size={14} className="text-quiby-purpleLight" />
          <span>Открыть папку mods</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('official')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              tab === 'official'
                ? 'bg-quiby-purple text-white shadow-onyx-glow'
                : 'bg-onyx-850 text-quiby-textMuted hover:text-white border border-onyx-border'
            }`}
          >
            Сборка 6 Сезона ({officialFiles.length})
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              tab === 'custom'
                ? 'bg-quiby-purple text-white shadow-onyx-glow'
                : 'bg-onyx-850 text-quiby-textMuted hover:text-white border border-onyx-border'
            }`}
          >
            Мои моды ({customMods.length})
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3.5 top-2.5 text-quiby-textMuted" size={13} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по модам..."
            className="w-full bg-onyx-850 border border-onyx-border rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-quiby-textMuted focus:outline-none focus:border-quiby-purple"
          />
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 bg-onyx-900/60 border border-onyx-border rounded-3xl overflow-hidden flex flex-col">
        {tab === 'official' ? (
          <div className="flex-1 overflow-y-auto divide-y divide-onyx-border/40 text-xs p-2">
            {filteredOfficial.length === 0 ? (
              <div className="p-16 text-center text-quiby-textMuted space-y-2">
                <Package size={36} className="mx-auto text-quiby-purple/40" />
                <p>Моды не найдены</p>
              </div>
            ) : (
              filteredOfficial.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-onyx-850 rounded-2xl transition-colors"
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
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
            {/* Upload Box */}
            <label className="border-2 border-dashed border-onyx-border hover:border-quiby-purple rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer transition-colors bg-onyx-850/50 hover:bg-quiby-purple/5">
              <Upload size={22} className="text-quiby-purpleLight" />
              <div className="text-xs font-bold text-white">Добавить свой мод (.jar)</div>
              <p className="text-[11px] text-quiby-textMuted">Перетащите .jar файл сюда для установки</p>
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
                Пользовательские моды:
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
