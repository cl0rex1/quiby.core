import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Trash2, 
  Upload, 
  FileCode, 
  Layers, 
  Plus, 
  Search, 
  X,
  Clock,
  HardDrive
} from 'lucide-react';

export interface LocalSchematic {
  name: string;
  filename: string;
  path?: string;
  size: number;
  updatedAt: number;
}

const DEFAULT_SAMPLE_SCHEMATICS: LocalSchematic[] = [
  {
    name: 'Aeronautics_Scout_Airship.nbt',
    filename: 'Aeronautics_Scout_Airship.nbt',
    size: 48200,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    name: 'Create_Automated_Brass_Factory.nbt',
    filename: 'Create_Automated_Brass_Factory.nbt',
    size: 124500,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    name: 'Compact_Steam_Engine_V2.nbt',
    filename: 'Compact_Steam_Engine_V2.nbt',
    size: 31800,
    updatedAt: Date.now() - 1000 * 60 * 60 * 12,
  },
];

interface SchematicsExplorerProps {
  gameDir: string;
  onNotify?: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const SchematicsExplorer: React.FC<SchematicsExplorerProps> = ({
  gameDir,
  onNotify,
}) => {
  const [schematics, setSchematics] = useState<LocalSchematic[]>(() => {
    const saved = localStorage.getItem('quiby_local_schematics');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return DEFAULT_SAMPLE_SCHEMATICS;
  });
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Load schematics from disk if IPC is available
  const loadSchematicsFromDisk = async () => {
    if (window.quibyApi?.getSchematics) {
      try {
        const diskFiles = await window.quibyApi.getSchematics(gameDir);
        if (diskFiles && Array.isArray(diskFiles) && diskFiles.length > 0) {
          setSchematics(diskFiles);
          localStorage.setItem('quiby_local_schematics', JSON.stringify(diskFiles));
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    loadSchematicsFromDisk();
  }, [gameDir]);

  const saveSchematicsList = (newList: LocalSchematic[]) => {
    setSchematics(newList);
    localStorage.setItem('quiby_local_schematics', JSON.stringify(newList));
  };

  const handleOpenFolder = () => {
    window.quibyApi?.openPath(`${gameDir || '~/.quiby-launcher'}/schematics`);
  };

  const handleDelete = (filename: string) => {
    const updated = schematics.filter((s) => s.filename !== filename);
    saveSchematicsList(updated);
    onNotify?.('Схематика удалена', `Файл «${filename}» удален из списка локальных чертежей.`, 'info');
  };

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const added: LocalSchematic[] = [];
    Array.from(files).forEach((file) => {
      if (file.name.endsWith('.nbt') || file.name.endsWith('.schem') || file.name.endsWith('.schematic')) {
        added.push({
          name: file.name,
          filename: file.name,
          size: file.size,
          updatedAt: Date.now(),
        });
      }
    });

    if (added.length > 0) {
      const merged = [...added, ...schematics.filter((s) => !added.some((a) => a.filename === s.filename))];
      saveSchematicsList(merged);
      onNotify?.(
        'Чертеж Create добавлен',
        `Успешно добавлено чертежей: ${added.length}. Теперь они доступны в Schematicannon в игре!`,
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

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filtered = schematics.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-4 select-none">
      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <label className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-black text-xs font-bold transition-all cursor-pointer shadow-sm press-feedback border border-white/40">
            <Plus size={16} className="stroke-[2.5]" />
            <span className="apple-subheading">Добавить чертеж (.nbt)</span>
            <input
              type="file"
              accept=".nbt,.schem,.schematic"
              multiple
              className="hidden"
              onChange={(e) => handleAddFiles(e.target.files)}
            />
          </label>

          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm press-feedback"
            title="Открыть папку schematics в проводнике"
          >
            <FolderOpen size={14} className="text-zinc-400" />
            <span className="apple-subheading">Папка schematics</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 text-zinc-500" size={13} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по чертежам..."
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
          isDragging ? 'border-dashed border-purple-400/80 bg-purple-950/20' : 'border-white/5'
        }`}
      >
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs space-y-3">
            <Layers size={36} className="mx-auto text-zinc-600" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-zinc-300 apple-subheading">Нет сохраненных схем Create</p>
              <p className="text-zinc-500 text-xs max-w-sm mx-auto apple-body">
                Перетащите файлы .nbt чертежей сюда или сохраните схему прямо в игре с помощью Schematic and Quill.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((schem, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 rounded-2xl glass-card gap-3.5 group hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3.5 truncate">
                  {/* Schematic Blueprint Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-zinc-850/90 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-sm text-purple-400 group-hover:border-purple-500/40 transition-colors">
                    <FileCode size={22} />
                  </div>

                  {/* Title & Metadata */}
                  <div className="truncate space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate apple-subheading">
                        {schem.name.replace('.nbt', '').replace('.schem', '').replace(/_/g, ' ')}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-md bg-purple-500/15 border border-purple-500/30 text-[9px] font-mono text-purple-300">
                        NBT
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1">
                        <HardDrive size={10} />
                        {formatSize(schem.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(schem.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(schem.filename)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer press-feedback shrink-0"
                  title="Удалить схему"
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
