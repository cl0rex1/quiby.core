import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Check, AlertCircle, Download, User, ArrowRight, X } from 'lucide-react';
import { DEFAULT_SKINS, CapePreset } from '../utils/chibiRenderer';
import { ChibiCharacterDisplay } from '../components/ChibiCharacterDisplay';
import { validateSkinFile } from '../utils/skinValidator';
import {
  SavedSkinItem,
  getSavedSkinLibrary,
  addSkinToLibrary,
  removeSkinFromLibrary,
  createChibiPreviewUri,
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

interface PendingSkinData {
  name: string;
  canvas: HTMLCanvasElement;
  convertedImg: HTMLImageElement;
  previewUri: string;
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
  const [pendingSkin, setPendingSkin] = useState<PendingSkinData | null>(null);

  // Load saved skin library on mount
  useEffect(() => {
    setLibrary(getSavedSkinLibrary());
  }, []);

  // Window-wide drag and drop listener
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
      if (e.dataTransfer?.files?.[0]) {
        processSkinFile(e.dataTransfer.files[0]);
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
  }, [library]);

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

    const currentLib = getSavedSkinLibrary();
    const dataUri = cv.toDataURL('image/png');
    const alreadyExists = currentLib.some((s) => s.dataUri === dataUri);

    // If library already has 6 skins and this is a brand new skin -> prompt confirmation modal
    if (currentLib.length >= 6 && !alreadyExists) {
      const previewUri = createChibiPreviewUri(cv);
      setPendingSkin({
        name: file.name,
        canvas: cv,
        convertedImg: result.convertedImg || sourceImg,
        previewUri,
      });
      return;
    }

    // Otherwise, directly add and equip
    addSkinToLibrary(file.name, cv);
    setLibrary(getSavedSkinLibrary());
    onSetCustomSkin(result.convertedImg || null, file.name);
  };

  // Confirm replacement when collection limit is full
  const handleConfirmReplaceSkin = () => {
    if (!pendingSkin) return;

    // Remove the oldest skin (last in array)
    const currentLib = getSavedSkinLibrary();
    if (currentLib.length >= 6) {
      const oldest = currentLib[currentLib.length - 1];
      removeSkinFromLibrary(oldest.id);
    }

    // Add new skin
    addSkinToLibrary(pendingSkin.name, pendingSkin.canvas);
    setLibrary(getSavedSkinLibrary());
    onSetCustomSkin(pendingSkin.convertedImg, pendingSkin.name);
    setPendingSkin(null);
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

  // Determine active display name
  const currentDisplayName = customSkinImg
    ? customSkinName || 'Пользовательский скин'
    : DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length]?.name || 'Скин';

  const oldestSkinToReplace = library.length >= 6 ? library[library.length - 1] : null;

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden p-6 md:p-8 gap-6 md:gap-8 select-none z-10 relative">
      {/* Full-Window Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md border-4 border-dashed border-zinc-400 p-8 pointer-events-none animate-in fade-in duration-150">
          <div className="flex flex-col items-center gap-3.5 p-8 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-white">
              <Upload size={32} className="animate-bounce" />
            </div>
            <p className="text-base font-bold text-white">Отпустите скин (.png) здесь</p>
            <p className="text-xs text-zinc-400">Скин проверится и добавится в вашу коллекцию</p>
          </div>
        </div>
      )}

      {/* Confirmation Modal when Collection is Full (6/6) */}
      {pendingSkin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Коллекция заполнена</h3>
                  <p className="text-xs text-zinc-400">Лимит: 6 скинов</p>
                </div>
              </div>

              <button
                onClick={() => setPendingSkin(null)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Чтобы добавить новый скин <span className="font-semibold text-white">«{pendingSkin.name}»</span>, самый ранний скин <span className="font-semibold text-zinc-400">«{oldestSkinToReplace?.name}»</span> будет заменен.
            </p>

            {/* Visual comparison of replacement */}
            <div className="flex items-center justify-center gap-4 py-3 px-4 rounded-2xl bg-zinc-950/60 border border-white/5">
              {oldestSkinToReplace && (
                <div className="flex flex-col items-center">
                  <img
                    src={oldestSkinToReplace.chibiPreviewUri}
                    alt="Old"
                    className="w-14 h-14 object-contain opacity-40 [image-rendering:pixelated]"
                  />
                  <span className="text-[10px] text-zinc-500 truncate max-w-[90px] mt-1">
                    Удалится
                  </span>
                </div>
              )}

              <ArrowRight size={18} className="text-zinc-600 shrink-0" />

              <div className="flex flex-col items-center">
                <img
                  src={pendingSkin.previewUri}
                  alt="New"
                  className="w-14 h-14 object-contain [image-rendering:pixelated] drop-shadow-md"
                />
                <span className="text-[10px] text-emerald-400 font-semibold truncate max-w-[90px] mt-1">
                  Новый скин
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setPendingSkin(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmReplaceSkin}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Заменить и добавить
              </button>
            </div>
          </div>
        </div>
      )}

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
          className="group flex items-center justify-between p-4 rounded-2xl border bg-zinc-900/50 hover:bg-zinc-900 border-white/5 hover:border-white/10 transition-all cursor-pointer"
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
                PNG 64x64 • Перетащите файл в любое место окна
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

        {/* Section 2: Library Grid (3 on row 1, 3 on row 2, Max 6 Skins) */}
        {library.length > 0 && (
          <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Моя коллекция
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {library.length}/6
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {library.map((item) => {
                const isSelected = customSkinImg && customSkinName === item.name;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectLibraryItem(item)}
                    title={item.name}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all cursor-pointer aspect-square overflow-hidden ${
                      isSelected
                        ? 'bg-zinc-800 border-zinc-400 shadow-md ring-1 ring-white/10'
                        : 'bg-zinc-900/60 hover:bg-zinc-850 border-white/5 hover:border-white/15 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {/* Live Chibi Thumbnail (Properly contained without overflow) */}
                    <div className="w-full h-full flex items-center justify-center p-1">
                      <img
                        src={item.chibiPreviewUri}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain [image-rendering:pixelated] drop-shadow-md pointer-events-none select-none transition-transform group-hover:scale-105"
                      />
                    </div>

                    {/* Active Checkmark in Top-Left */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-sm z-10">
                        <Check size={9} className="text-zinc-950 stroke-[3]" />
                      </div>
                    )}

                    {/* Action buttons in Top-Right Corner */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => handleDownloadChibi(e, item)}
                        title="Скачать чиби-аватар"
                        className="p-1.5 rounded-lg bg-zinc-900/95 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteLibraryItem(e, item.id)}
                        title="Удалить скин"
                        className="p-1.5 rounded-lg bg-zinc-900/95 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Trash2 size={12} />
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
