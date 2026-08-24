import React, { useState } from 'react';
import { Search, Package, Layers, FileCode, CheckCircle, HardDrive, RefreshCw } from 'lucide-react';
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
    <div className="flex-1 flex flex-col p-6 overflow-hidden space-y-5">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Layers className="text-emerald-400" />
            <span>Сборка {manifest?.name || 'quiby. Season 6'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Minecraft {manifest?.gameVersion || '1.21.1'} • {manifest?.loader.type || 'NeoForge'} {manifest?.loader.version || '21.1.65'} • Всего файлов: {files.length} ({formatSize(manifest?.totalSize || 0)})
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-quiby-panel hover:bg-quiby-panel/80 border border-quiby-border text-xs text-slate-300 transition-colors"
        >
          <RefreshCw size={13} />
          <span>Проверить обновления</span>
        </button>
      </div>

      {/* Changelog Box */}
      {manifest?.changelog && (
        <div className="p-4 rounded-2xl bg-quiby-card border border-quiby-border text-xs space-y-1.5 shadow-sm">
          <div className="font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle size={14} />
            <span>Список изменений версии v{manifest.version}:</span>
          </div>
          <p className="text-slate-300 leading-relaxed pl-5">
            {manifest.changelog}
          </p>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === 'all'
                ? 'bg-emerald-500 text-quiby-dark shadow-sm'
                : 'bg-quiby-panel text-slate-400 hover:text-white border border-quiby-border'
            }`}
          >
            Все ({files.length})
          </button>
          <button
            onClick={() => setActiveCategory('mods')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === 'mods'
                ? 'bg-emerald-500 text-quiby-dark shadow-sm'
                : 'bg-quiby-panel text-slate-400 hover:text-white border border-quiby-border'
            }`}
          >
            Моды ({modsCount})
          </button>
          <button
            onClick={() => setActiveCategory('configs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === 'configs'
                ? 'bg-emerald-500 text-quiby-dark shadow-sm'
                : 'bg-quiby-panel text-slate-400 hover:text-white border border-quiby-border'
            }`}
          >
            Конфиги ({configsCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск модов и файлов..."
            className="w-full bg-quiby-panel border border-quiby-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 bg-quiby-card border border-quiby-border rounded-2xl overflow-hidden flex flex-col shadow-inner">
        <div className="grid grid-cols-12 px-4 py-2.5 bg-quiby-panel/80 border-b border-quiby-border text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-6">Название / Путь</div>
          <div className="col-span-2">Версия</div>
          <div className="col-span-2">Размер</div>
          <div className="col-span-2 text-right">Хэш (SHA-256)</div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-quiby-border/40 text-xs">
          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Package size={32} className="mx-auto mb-2 opacity-40" />
              <p>Файлы не найдены</p>
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const isJar = file.path.endsWith('.jar');
              const displayName = file.modName && file.modName !== 'NeoForge Mod' ? file.modName : file.path;

              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-quiby-panel/40 transition-colors"
                >
                  <div className="col-span-6 flex items-center gap-2.5 truncate">
                    {isJar ? (
                      <Package size={15} className="text-emerald-400 shrink-0" />
                    ) : (
                      <FileCode size={15} className="text-cyan-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="text-slate-200 font-medium">{displayName}</span>
                      {isJar && file.modName && (
                        <span className="text-[10px] text-slate-500 ml-2 font-mono">{file.path}</span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 text-slate-400 font-mono text-[11px]">
                    {file.modVersion || '—'}
                  </div>

                  <div className="col-span-2 text-slate-300 font-mono text-[11px]">
                    {formatSize(file.size)}
                  </div>

                  <div className="col-span-2 text-right text-slate-500 font-mono text-[10px] truncate" title={file.sha256}>
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
