import React, { useState } from 'react';
import { X, Search, Package, Layers, FileCode, Sparkles, RefreshCw } from 'lucide-react';
import { ModpackManifest } from '@quiby/shared';

interface ModpackModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: ModpackManifest | null;
  onRefresh: () => void;
}

export const ModpackModal: React.FC<ModpackModalProps> = ({
  isOpen,
  onClose,
  manifest,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'mods' | 'configs' | 'shaders'>('all');

  if (!isOpen) return null;

  const files = manifest?.files || [];

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.path.toLowerCase().includes(search.toLowerCase()) || (f.modName && f.modName.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;

    if (activeCategory === 'mods') return f.path.startsWith('mods/');
    if (activeCategory === 'configs') return f.path.startsWith('config/') || f.path.startsWith('defaultconfigs/');
    if (activeCategory === 'shaders') return f.path.startsWith('shaderpacks/') || f.path.startsWith('resourcepacks/');
    return true;
  });

  const modsCount = files.filter(f => f.path.startsWith('mods/')).length;
  const configsCount = files.filter(f => f.path.startsWith('config/') || f.path.startsWith('defaultconfigs/')).length;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="bg-quiby-bg border border-quiby-border rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-quiby-border/80 bg-quiby-card/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-quiby-purple/15 flex items-center justify-center text-quiby-purpleLight">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Состав сборки 6 Сезона</h3>
              <p className="text-xs text-quiby-textMuted font-mono">
                Minecraft {manifest?.gameVersion || '1.21.1'} • {manifest?.loader.type || 'NeoForge'} {manifest?.loader.version || '21.1.65'} • {files.length} файлов ({formatSize(manifest?.totalSize || 0)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-quiby-card hover:bg-quiby-cardHover text-quiby-text hover:text-white border border-quiby-border transition-colors"
              title="Обновить манифест"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-quiby-card hover:bg-white/10 text-quiby-textMuted hover:text-white border border-quiby-border transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search & Category Tabs */}
        <div className="p-4 border-b border-quiby-border/60 bg-quiby-surface/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeCategory === 'all'
                  ? 'bg-quiby-purple text-white shadow-neon-purple'
                  : 'bg-quiby-card text-quiby-textMuted hover:text-white border border-quiby-border'
              }`}
            >
              Все ({files.length})
            </button>
            <button
              onClick={() => setActiveCategory('mods')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeCategory === 'mods'
                  ? 'bg-quiby-purple text-white shadow-neon-purple'
                  : 'bg-quiby-card text-quiby-textMuted hover:text-white border border-quiby-border'
              }`}
            >
              Моды ({modsCount})
            </button>
            <button
              onClick={() => setActiveCategory('configs')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeCategory === 'configs'
                  ? 'bg-quiby-purple text-white shadow-neon-purple'
                  : 'bg-quiby-card text-quiby-textMuted hover:text-white border border-quiby-border'
              }`}
            >
              Конфиги ({configsCount})
            </button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3.5 top-2.5 text-quiby-textMuted" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или пути..."
              className="w-full bg-quiby-card border border-quiby-border rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-quiby-textMuted focus:outline-none focus:border-quiby-purple transition-all"
            />
          </div>
        </div>

        {/* Files List Table */}
        <div className="flex-1 overflow-y-auto divide-y divide-quiby-border/40 text-xs p-2">
          {filteredFiles.length === 0 ? (
            <div className="p-16 text-center text-quiby-textMuted space-y-2">
              <Package size={36} className="mx-auto text-quiby-purple/40" />
              <p>Файлы не найдены</p>
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const isJar = file.path.endsWith('.jar');
              const displayName = file.modName && file.modName !== 'NeoForge Mod' ? file.modName : file.path;

              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-quiby-card/80 rounded-xl transition-colors"
                >
                  <div className="col-span-6 flex items-center gap-2.5 truncate">
                    {isJar ? (
                      <Package size={15} className="text-quiby-purpleLight shrink-0" />
                    ) : (
                      <FileCode size={15} className="text-quiby-textMuted shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="text-white font-medium">{displayName}</span>
                      {isJar && file.modName && (
                        <span className="text-[10px] text-quiby-textDim ml-2 font-mono">{file.path}</span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 text-quiby-textMuted font-mono text-[11px]">
                    {file.modVersion || '—'}
                  </div>

                  <div className="col-span-2 text-quiby-text font-mono text-[11px]">
                    {formatSize(file.size)}
                  </div>

                  <div className="col-span-2 text-right text-quiby-textDim font-mono text-[10px] truncate" title={file.sha256}>
                    {file.sha256.substring(0, 10)}...
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
