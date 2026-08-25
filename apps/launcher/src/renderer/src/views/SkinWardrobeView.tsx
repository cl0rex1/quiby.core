import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Check, AlertCircle, Download, User } from 'lucide-react';
import { DEFAULT_SKINS, CapePreset } from '../utils/chibiRenderer';
import { ChibiCharacterDisplay } from '../components/ChibiCharacterDisplay';
import { validateSkinFile } from '../utils/skinValidator';
import {
  SavedSkinItem,
  getSavedSkinLibrary,
  addSkinToLibrary,
  removeSkinFromLibrary,
} from '../utils/skinLibrary';

interface SkinWardrobeViewProps {
  customSkinImg: HTMLImageElement | null;
  customSkinName: string | null;
  activeDefaultSkinIdx: number;
  selectedCape: CapePreset;
  onSetCustomSkin: (img: HTMLImageElement | null, name: string | null) => void;
  onSetDefaultSkinIdx: (idx: number) => void;
  onSelectCape: (cape: CapePreset) => void;
}

export const SkinWardrobeView: React.FC<SkinWardrobeViewProps> = ({
  customSkinImg,
  customSkinName,
  activeDefaultSkinIdx,
  selectedCape,
  onSetCustomSkin,
  onSetDefaultSkinIdx,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [library, setLibrary] = useState<SavedSkinItem[]>([]);

  // Load saved skin library on mount
  useEffect(() => {
    setLibrary(getSavedSkinLibrary());
  }, []);

  // Validate and handle uploaded file
  const processSkinFile = async (file: File) => {
    setValidationError(null);
    const result = await validateSkinFile(file);

    if (!result.valid) {
      setValidationError(result.error || 'Выбранный файл не является скином Minecraft.');
      return;
    }

    setValidationError(null);

    // Create working canvas for library storage
    const cv = document.createElement('canvas');
    const sourceImg = result.convertedImg || (customSkinImg as HTMLImageElement);
    cv.width = sourceImg.naturalWidth || sourceImg.width || 64;
    cv.height = sourceImg.naturalHeight || sourceImg.height || 64;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceImg, 0, 0);

    // Add to persistent library (max 5 items)
    addSkinToLibrary(file.name, cv);
    setLibrary(getSavedSkinLibrary());

    // Set as current active custom skin
    onSetCustomSkin(result.convertedImg || null, file.name);
  };

  const handleSelectLibraryItem = (item: SavedSkinItem) => {
    const img = new Image();
    img.onload = () => {
      onSetCustomSkin(img, item.name);
      setValidationError(null);
    };
    img.src = item.dataUri;
  };

  const handleDeleteLibraryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeSkinFromLibrary(id);
    setLibrary(updated);

    if (customSkinName && library.find((s) => s.id === id)?.name === customSkinName) {
      onSetCustomSkin(null, null);
    }
  };

  const handleDownloadChibi = (e: React.MouseEvent, item: SavedSkinItem) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = item.chibiPreviewUri;
    a.download = `chibi_${item.name.replace(/\.[^/.]+$/, '')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processSkinFile(e.dataTransfer.files[0]);
    }
  };

  // Determine active display name
  const currentDisplayName = customSkinImg
    ? customSkinName || 'Пользовательский скин'
    : DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length]?.name || 'Скин';

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden p-6 md:p-8 gap-6 md:gap-8 select-none z-10">
      {/* Left Column: Character Stage Preview */}
      <div className="flex-[1.1] flex flex-col items-center justify-center bg-zinc-950/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-sm">
        {/* Subtle radial backdrop accent */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

        {/* Live Chibi Character */}
        <div className="relative z-10 flex flex-col items-center">
          <ChibiCharacterDisplay
            customSkinImg={customSkinImg}
            activeDefaultSkinIdx={activeDefaultSkinIdx}
            selectedCape={selectedCape}
          />

          {/* Minimal Floating Name Badge */}
          <div className="mt-2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-white/10 text-xs font-medium text-zinc-200 shadow-sm backdrop-blur-md">
            <User size={12} className="text-zinc-400" />
            <span className="truncate max-w-[200px]">{currentDisplayName}</span>
            {customSkinImg && (
              <button
                onClick={() => {
                  onSetCustomSkin(null, null);
                  setValidationError(null);
                }}
                title="Сбросить скин"
                className="ml-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Minimalist Control Panel */}
      <div className="flex-1 flex flex-col space-y-5 overflow-y-auto pr-1 justify-center">
        {/* Validation Error Banner */}
        {validationError && (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">Неверный скин</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">{validationError}</p>
            </div>
          </div>
        )}

        {/* Section 1: Upload Zone */}
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
            isDragging
              ? 'bg-zinc-800/80 border-zinc-400 scale-[1.01]'
              : 'bg-zinc-900/50 hover:bg-zinc-900 border-white/5 hover:border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/5 flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors">
              <Upload size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                Загрузить скин
              </span>
              <span className="text-[11px] text-zinc-500">
                PNG 64x64 • Перетащите файл сюда
              </span>
            </div>
          </div>

          <span className="text-[11px] font-medium text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-800/50 border border-white/5 group-hover:border-white/10">
            Обзор
          </span>

          <input
            type="file"
            accept=".png"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                processSkinFile(e.target.files[0]);
              }
            }}
          />
        </label>

        {/* Section 2: Library Grid (Saved Skins - max 5) */}
        {library.length > 0 && (
          <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Моя коллекция
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {library.length}/5
              </span>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {library.map((item) => {
                const isSelected = customSkinImg && customSkinName === item.name;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectLibraryItem(item)}
                    title={item.name}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all cursor-pointer aspect-square ${
                      isSelected
                        ? 'bg-zinc-800 border-zinc-400 shadow-md'
                        : 'bg-zinc-900/60 hover:bg-zinc-850 border-white/5 hover:border-white/15 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {/* Live Chibi Thumbnail */}
                    <img
                      src={item.chibiPreviewUri}
                      alt={item.name}
                      className="w-14 h-14 object-contain [image-rendering:pixelated] drop-shadow-sm pointer-events-none select-none"
                    />

                    {/* Active Checkmark in Top-Left */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Check size={8} className="text-zinc-900 stroke-[3]" />
                      </div>
                    )}

                    {/* Action buttons pinned in the Top-Right Corner */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => handleDownloadChibi(e, item)}
                        title="Скачать чиби-аватар"
                        className="p-1 rounded-md bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-sm"
                      >
                        <Download size={11} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteLibraryItem(e, item.id)}
                        title="Удалить скин"
                        className="p-1 rounded-md bg-zinc-900/90 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors shadow-sm"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3: Default Skins (Steve & Alex) */}
        <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 space-y-2.5">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Базовые скины
          </span>

          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_SKINS.map((skin, idx) => {
              const isSelected = !customSkinImg && activeDefaultSkinIdx === idx;
              return (
                <button
                  key={skin.id}
                  onClick={() => {
                    onSetCustomSkin(null, null);
                    onSetDefaultSkinIdx(idx);
                    setValidationError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-800 border-zinc-400 text-white shadow-sm'
                      : 'bg-zinc-900/60 hover:bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{skin.name}</span>
                  {isSelected && <Check size={13} className="text-zinc-200" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
