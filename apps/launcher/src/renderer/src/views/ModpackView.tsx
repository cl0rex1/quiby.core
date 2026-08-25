import React, { useState } from 'react';
import { Search, Package, Layers, FileCode, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';
import { ModpackManifest } from '@quiby/shared';

interface ModpackViewProps {
  manifest: ModpackManifest | null;
  onRefresh: () => void;
}

export const ModpackView: React.FC<ModpackViewProps> = ({ manifest, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'mods' | 'configs' | 'shaders'>('all');

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-black p-5 space-y-4 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Layers className="text-x-purpleLight" />
            <span>Сборка {manifest?.name || 'quiby. Season 6'}</span>
          </h2>
          <p className="text-xs text-x-textMuted mt-0.5">
            Minecraft {manifest?.gameVersion || '1.21.1'} • {manifest?.loader.type || 'NeoForge'} {manifest?.loader.version || '21.1.65'} • Файлов: {files.length} ({formatSize(manifest?.totalSize || 0)})
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          <RefreshCw size={13} />
          <span>Обновить манифест</span>
        </button>
      </div>

      {/* Changelog Box */}
      {manifest?.changelog && (
        <div className="p-3.5 rounded-2xl bg-x-surface border border-x-border text-xs space-y-1 shadow-sm">
          <div className="font-bold text-x-purpleLight flex items-center gap-1.5">
            <Sparkles size={14} className="text-x-purple" />
            <span>Changelog v{manifest.version}:</span>
          </div>
          <p className="text-x-text leading-relaxed pl-5">
            {manifest.changelog}
          </p>
        </div>
      )}

      {/* Search & Category Pills */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeCategory === 'all'
                ? 'bg-white text-black shadow-sm'
                : 'bg-x-surface text-x-textMuted hover:text-white border border-x-border'
            }`}
          >
            Все ({files.length})
          </button>
          <button
            onClick={() => setActiveCategory('mods')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeCategory === 'mods'
                ? 'bg-white text-black shadow-sm'
                : 'bg-x-surface text-x-textMuted hover:text-white border border-x-border'
            }`}
          >
            Моды ({modsCount})
          </button>
          <button
            onClick={() => setActiveCategory('configs')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeCategory === 'configs'
                ? 'bg-white text-black shadow-sm'
                : 'bg-x-surface text-x-textMuted hover:text-white border border-x-border'
            }`}
          >
            Конфиги ({configsCount})
          </button>
        </div>

        <div className="relative w-60">
          <Search className="absolute left-3.5 top-2.5 text-x-textMuted" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск мода..."
            className="w-full bg-x-surface border border-x-border rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-x-textMuted focus:outline-none focus:border-x-purple transition-all"
          />
        </div>
      </div>

      {/* Files List Table in X style */}
      <div className="flex-1 bg-x-surface border border-x-border rounded-2xl overflow-hidden flex flex-col shadow-x-card">
        <div className="grid grid-cols-12 px-4 py-2.5 bg-black/60 border-b border-x-border text-[11px] font-bold text-x-textMuted uppercase tracking-wider">
          <div className="col-span-6">Название / Файл</div>
          <div className="col-span-2">Версия</div>
          <div className="col-span-2">Размер</div>
          <div className="col-span-2 text-right">Хэш (SHA-256)</div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-x-border/40 text-xs">
          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center text-x-textMuted">
              <Package size={32} className="mx-auto mb-2 opacity-30 text-x-purple" />
              <p>Файлы не найдены</p>
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const isJar = file.path.endsWith('.jar');
              const displayName = file.modName && file.modName !== 'NeoForge Mod' ? file.modName : file.path;

              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-white/[0.03] transition-colors"
                >
                  <div className="col-span-6 flex items-center gap-2.5 truncate">
                    {isJar ? (
                      <Package size={15} className="text-x-purpleLight shrink-0" />
                    ) : (
                      <FileCode size={15} className="text-x-textMuted shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="text-white font-medium">{displayName}</span>
                      {isJar && file.modName && (
                        <span className="text-[10px] text-x-textDim ml-2 font-mono">{file.path}</span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 text-x-textMuted font-mono text-[11px]">
                    {file.modVersion || '—'}
                  </div>

                  <div className="col-span-2 text-x-text font-mono text-[11px]">
                    {formatSize(file.size)}
                  </div>

                  <div className="col-span-2 text-right text-x-textDim font-mono text-[10px] truncate" title={file.sha256}>
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
