import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Trash2, 
  Sun, 
  Plus, 
  Search, 
  X, 
  Check, 
  Sparkles, 
  HardDrive,
  SlidersHorizontal
} from 'lucide-react';

export interface LocalShaderpack {
  name: string;
  filename: string;
  size: number;
  active: boolean;
  profile?: 'potato' | 'low' | 'medium' | 'ultra';
  updatedAt: number;
}

const DEFAULT_SAMPLE_SHADERS: LocalShaderpack[] = [
  {
    name: 'Complementary Reimagined',
    filename: 'ComplementaryReimagined_r5.2.2.zip',
    size: 2450000,
    active: true,
    profile: 'medium',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    name: 'BSL Shaders v8.2',
    filename: 'BSL_v8.2.09.1.zip',
    size: 1980000,
    active: false,
    profile: 'medium',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    name: 'MakeUp Ultra Fast (Для слабых ПК)',
    filename: 'MakeUp-UltraFast-8.9.zip',
    size: 890000,
    active: false,
    profile: 'potato',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
];

interface ShadersExplorerProps {
  gameDir: string;
  onNotify?: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ShadersExplorer: React.FC<ShadersExplorerProps> = ({
  gameDir,
  onNotify,
}) => {
  const [shaders, setShaders] = useState<LocalShaderpack[]>(() => {
    const saved = localStorage.getItem('quiby_local_shaders');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return DEFAULT_SAMPLE_SHADERS;
  });
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const loadShadersFromDisk = async () => {
    if (window.quibyApi?.getShaderpacks) {
      try {
        const diskFiles = await window.quibyApi.getShaderpacks(gameDir);
        if (diskFiles && Array.isArray(diskFiles) && diskFiles.length > 0) {
          const mapped: LocalShaderpack[] = diskFiles.map((f: any) => ({
            name: f.name,
            filename: f.filename,
            size: f.size,
            active: false,
            updatedAt: f.updatedAt || Date.now(),
          }));
          setShaders(mapped);
          localStorage.setItem('quiby_local_shaders', JSON.stringify(mapped));
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    loadShadersFromDisk();
  }, [gameDir]);

  const saveShadersList = (newList: LocalShaderpack[]) => {
    setShaders(newList);
    localStorage.setItem('quiby_local_shaders', JSON.stringify(newList));
  };

  const handleOpenFolder = () => {
    window.quibyApi?.openPath(`${gameDir || '~/.quiby-launcher'}/shaderpacks`);
  };

  const handleToggleActive = (filename: string) => {
    const updated = shaders.map((s) => ({
      ...s,
      active: s.filename === filename ? !s.active : false, // Exclusive active shader
    }));
    saveShadersList(updated);
    const activeItem = updated.find((s) => s.active);
    onNotify?.(
      activeItem ? `Шейдер активирован: ${activeItem.name}` : 'Шейдеры отключены',
      activeItem ? 'Пакет шейдеров будет применен при запуске игры.' : 'Игра запустится со стандартной графикой Iris/Sodium.',
      'success'
    );
  };

  const handleDelete = (filename: string) => {
    const updated = shaders.filter((s) => s.filename !== filename);
    saveShadersList(updated);
    onNotify?.('Шейдерпак удален', `Файл «${filename}» удален.`, 'info');
  };

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const added: LocalShaderpack[] = [];
    Array.from(files).forEach((file) => {
      if (file.name.endsWith('.zip')) {
        added.push({
          name: file.name.replace('.zip', '').replace(/_/g, ' '),
          filename: file.name,
          size: file.size,
          active: false,
          profile: 'medium',
          updatedAt: Date.now(),
        });
      }
    });

    if (added.length > 0) {
      const merged = [...added, ...shaders.filter((s) => !added.some((a) => a.filename === s.filename))];
      saveShadersList(merged);
      onNotify?.(
        'Шейдерпак добавлен',
        `Успешно добавлено шейдеров: ${added.length}. Выберите активный пакет для игры.`,
        'success'
      );
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const filtered = shaders.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-4 select-none">
      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <label className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-black text-xs font-bold transition-all cursor-pointer shadow-sm press-feedback border border-white/40">
            <Plus size={16} className="stroke-[2.5]" />
            <span className="apple-subheading">Добавить шейдер (.zip)</span>
            <input
              type="file"
              accept=".zip"
              multiple
              className="hidden"
              onChange={(e) => handleAddFiles(e.target.files)}
            />
          </label>

          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm press-feedback"
            title="Открыть папку shaderpacks в проводнике"
          >
            <FolderOpen size={14} className="text-zinc-400" />
            <span className="apple-subheading">Папка shaderpacks</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 text-zinc-500" size={13} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по шейдерам..."
            className="w-full bg-zinc-900/80 border border-white/10 focus:border-white/30 rounded-2xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-colors backdrop-blur-md"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white press-feedback"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main List / Grid */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleAddFiles(e.dataTransfer.files);
        }}
        className={`flex-1 bg-zinc-950/40 border rounded-3xl p-4 md:p-5 overflow-y-auto backdrop-blur-sm shadow-sm transition-all duration-200 ${
          isDragging ? 'border-dashed border-amber-400/80 bg-amber-950/20' : 'border-white/5'
        }`}
      >
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs space-y-3">
            <Sun size={36} className="mx-auto text-zinc-600" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-zinc-300 apple-subheading">Шейдерпаки не найдены</p>
              <p className="text-zinc-500 text-xs max-w-sm mx-auto apple-body">
                Перетащите архив .zip шейдера сюда для автоматической установки в клиент Iris/Embeddium.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((shader, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 gap-3.5 ${
                  shader.active
                    ? 'bg-zinc-850/90 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20 border-t-amber-300/40'
                    : 'glass-card hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3.5 truncate">
                  {/* Active Radio Selector */}
                  <button
                    onClick={() => handleToggleActive(shader.filename)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer press-feedback ${
                      shader.active
                        ? 'bg-amber-400 text-zinc-950 shadow-sm'
                        : 'bg-zinc-800/80 border border-white/10 hover:border-white/30 text-transparent'
                    }`}
                    title={shader.active ? 'Активен (нажмите для отключения)' : 'Сделать активным шейдером'}
                  >
                    <Check size={13} className="stroke-[3]" />
                  </button>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-zinc-850/90 border border-white/10 flex items-center justify-center shrink-0 shadow-sm text-amber-400">
                    <Sun size={22} className={shader.active ? 'animate-spin-slow' : ''} />
                  </div>

                  {/* Title & Info */}
                  <div className="truncate space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate apple-subheading">
                        {shader.name}
                      </span>
                      {shader.active && (
                        <span className="px-1.5 py-0.2 rounded-md bg-amber-500/15 border border-amber-500/30 text-[9px] font-mono text-amber-300 font-bold">
                          АКТИВЕН
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1">
                        <HardDrive size={10} />
                        {formatSize(shader.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles size={10} />
                        Iris / Oculus
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(shader.filename)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer press-feedback shrink-0"
                  title="Удалить шейдерпак"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
