import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Check, AlertCircle, Lock, Download, FolderHeart } from 'lucide-react';
import { CAPE_PRESETS, DEFAULT_SKINS, CapePreset } from '../utils/chibiRenderer';
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
  onSelectCape,
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

    // 1. Create working canvas for library storage
    const cv = document.createElement('canvas');
    const sourceImg = result.convertedImg || (customSkinImg as HTMLImageElement);
    cv.width = sourceImg.naturalWidth || sourceImg.width || 64;
    cv.height = sourceImg.naturalHeight || sourceImg.height || 64;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceImg, 0, 0);

    // 2. Add to persistent library
    const newItem = addSkinToLibrary(file.name, cv);
    setLibrary(getSavedSkinLibrary());

    // 3. Set as current active custom skin
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

    // If currently selected skin was deleted, revert to default
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

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-y-auto p-8 gap-8 select-none z-10">
      {/* Left Column: Live Chibi Character Preview */}
      <div className="flex-1 flex flex-col items-center justify-center bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 relative">
        <ChibiCharacterDisplay
          customSkinImg={customSkinImg}
          activeDefaultSkinIdx={activeDefaultSkinIdx}
          selectedCape={selectedCape}
        />
      </div>

      {/* Right Column: Customization & Library Controls */}
      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-1">
        {/* Section 1: Skin Selection & Upload */}
        <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Скин</span>
            {customSkinImg && (
              <button
                onClick={() => {
                  onSetCustomSkin(null, null);
                  setValidationError(null);
                }}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Сбросить</span>
              </button>
            )}
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <p className="font-semibold">Ошибка проверки скина</p>
                <p className="text-[11px] text-rose-200/80 mt-0.5">{validationError}</p>
              </div>
            </div>
          )}

          {/* Upload Custom Skin Button / Drop Zone */}
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-1.5 w-full py-3.5 px-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isDragging
                ? 'bg-quiby-purple/10 border-quiby-purpleLight text-quiby-purpleLight scale-[1.01]'
                : 'bg-onyx-850 hover:bg-onyx-800 border-onyx-border text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload size={15} className="text-quiby-purpleLight" />
              <span>{customSkinName ? `Текущий: ${customSkinName}` : 'Загрузить скин (.png)'}</span>
            </div>
            <span className="text-[11px] font-normal text-quiby-textMuted">
              64x64 или 64x32 PNG • Автосохранение в библиотеку
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

          {/* Library Section: Saved Skins Collection */}
          {library.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-quiby-textMuted">
                <FolderHeart size={12} className="text-quiby-purpleLight" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Моя коллекция ({library.length})</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {library.map((item) => {
                  const isSelected = customSkinImg && customSkinName === item.name;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectLibraryItem(item)}
                      className={`group relative flex flex-col items-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-onyx-800 border-quiby-purple shadow-onyx-glow text-white'
                          : 'bg-onyx-850/80 hover:bg-onyx-800 border-onyx-border text-quiby-textMuted hover:text-white'
                      }`}
                    >
                      {/* Live Chibi Thumbnail */}
                      <img
                        src={item.chibiPreviewUri}
                        alt={item.name}
                        className="w-12 h-12 object-contain [image-rendering:pixelated] drop-shadow-md pointer-events-none select-none"
                      />

                      <span className="text-[10px] font-medium truncate w-full text-center mt-1">
                        {item.name}
                      </span>

                      {/* Action buttons (Download Chibi & Delete) */}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDownloadChibi(e, item)}
                          title="Скачать чиби-аватар (.png)"
                          className="p-1 rounded-md bg-onyx-900/90 text-quiby-textMuted hover:text-white transition-colors"
                        >
                          <Download size={11} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteLibraryItem(e, item.id)}
                          title="Удалить из коллекции"
                          className="p-1 rounded-md bg-onyx-900/90 text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>

                      {isSelected && (
                        <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded-full bg-quiby-purple flex items-center justify-center text-white">
                          <Check size={9} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subtitle for Default Skins */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-quiby-textMuted uppercase tracking-wider block">
              Базовые скины
            </span>

            <div className="grid grid-cols-2 gap-3">
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
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-onyx-800 border-quiby-purple text-white shadow-onyx-glow'
                        : 'bg-onyx-850 border-onyx-border text-quiby-textMuted hover:text-white hover:bg-onyx-800'
                    }`}
                  >
                    <span>{skin.name}</span>
                    {isSelected && <Check size={14} className="text-quiby-purpleLight" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Cape Selection (Disabled / Locked) */}
        <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Плащ</span>
            <span className="px-2.5 py-0.5 rounded-full bg-onyx-850 border border-onyx-border text-[10px] font-mono text-quiby-textDim uppercase flex items-center gap-1.5">
              <Lock size={11} className="text-quiby-purple" />
              <span>Недоступно в этом сезоне</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 opacity-40 pointer-events-none select-none">
            {CAPE_PRESETS.map((cape) => {
              const isSelected = selectedCape.id === cape.id;
              return (
                <div
                  key={cape.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-not-allowed ${
                    isSelected
                      ? 'bg-onyx-800 border-quiby-purple shadow-onyx-glow text-white'
                      : 'bg-onyx-850 border-onyx-border text-quiby-textMuted'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className="w-5 h-7 rounded-md shrink-0 shadow-inner flex items-center justify-center text-[9px] text-white font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${cape.gradient[0]}, ${cape.gradient[1]})`,
                      }}
                    >
                      {cape.emblem === 'quiby' ? 'Q' : ''}
                    </div>
                    <span className="text-xs font-semibold truncate">{cape.name}</span>
                  </div>

                  <Lock size={13} className="text-quiby-textDim shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
