import React, { useState, useEffect, useRef } from 'react';
import { 
  Shirt, 
  Upload, 
  RefreshCw, 
  Check, 
  Sparkles, 
  Heart,
  Trash2
} from 'lucide-react';
import { 
  renderChibiCharacter, 
  CAPE_PRESETS, 
  DEFAULT_SKINS, 
  CapePreset 
} from '../utils/chibiRenderer';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Animation Loop for Chibi Canvas
  useEffect(() => {
    let animationFrameId: number;
    let startTime = performance.now();

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const time = (performance.now() - startTime) / 1000;
          renderChibiCharacter(
            ctx,
            canvas.width,
            canvas.height,
            time,
            customSkinImg,
            activeDefaultSkinIdx,
            selectedCape
          );
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [customSkinImg, activeDefaultSkinIdx, selectedCape]);

  // Handle Skin File Upload
  const handleSkinFile = (file: File) => {
    if (!file.name.endsWith('.png')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        onSetCustomSkin(img, file.name);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-y-auto p-8 gap-8 select-none z-10">
      {/* Left Column: Live Chibi Character Preview */}
      <div className="flex-1 flex flex-col items-center justify-center bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 relative">
        <div className="absolute top-5 left-5 flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <Shirt size={16} className="text-quiby-purpleLight" />
          <span>Предпросмотр Chibi</span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files?.[0]) {
              handleSkinFile(e.dataTransfer.files[0]);
            }
          }}
          className={`relative rounded-3xl p-4 transition-all duration-300 ${
            isDragOver ? 'ring-2 ring-quiby-purple bg-quiby-purple/10 scale-105' : ''
          }`}
        >
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] drop-shadow-2xl"
          />

          <div className="text-center mt-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-onyx-850 border border-onyx-border text-xs font-mono text-quiby-purpleLight">
              <Sparkles size={12} className="text-quiby-purple" />
              <span>
                {customSkinName ? customSkinName : DEFAULT_SKINS[activeDefaultSkinIdx].name}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Customization Controls */}
      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-1">
        {/* Section 1: Skin Selection */}
        <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Shirt size={16} className="text-quiby-purpleLight" />
              <span>Выбор скина</span>
            </div>
            {customSkinImg && (
              <button
                onClick={() => onSetCustomSkin(null, null)}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                <Trash2 size={13} />
                <span>Сбросить скин</span>
              </button>
            )}
          </div>

          {/* Upload Button */}
          <label className="flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl bg-onyx-850 hover:bg-onyx-800 border border-onyx-border text-xs font-bold text-white transition-all cursor-pointer shadow-sm">
            <Upload size={15} className="text-quiby-purpleLight" />
            <span>Загрузить свой скин (.png)</span>
            <input
              type="file"
              accept=".png"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleSkinFile(e.target.files[0]);
                }
              }}
            />
          </label>

          {/* Default Skins Selector */}
          <div>
            <span className="block text-xs text-quiby-textMuted mb-2">Или выберите дефолтный скин:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEFAULT_SKINS.map((skin, idx) => {
                const isSelected = !customSkinImg && activeDefaultSkinIdx === idx;
                return (
                  <button
                    key={skin.id}
                    onClick={() => {
                      onSetCustomSkin(null, null);
                      onSetDefaultSkinIdx(idx);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-onyx-800 border-quiby-purple text-white shadow-onyx-glow'
                        : 'bg-onyx-850 border-onyx-border text-quiby-textMuted hover:text-white hover:bg-onyx-800'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: skin.primaryColor }}
                    ></span>
                    <span className="truncate">{skin.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Cape Selection */}
        <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-4">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Heart size={16} className="text-rose-400" />
            <span>Выбор плаща (Официальные 6 Сезона)</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {CAPE_PRESETS.map((cape) => {
              const isSelected = selectedCape.id === cape.id;
              return (
                <button
                  key={cape.id}
                  onClick={() => onSelectCape(cape)}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-onyx-800 border-quiby-purple shadow-onyx-glow text-white'
                      : 'bg-onyx-850 border-onyx-border text-quiby-textMuted hover:text-white hover:bg-onyx-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className="w-6 h-8 rounded-md shrink-0 shadow-inner flex items-center justify-center text-[10px] text-white font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${cape.gradient[0]}, ${cape.gradient[1]})`,
                      }}
                    >
                      {cape.emblem === 'quiby' ? 'Q' : ''}
                    </div>
                    <span className="text-xs font-semibold truncate">{cape.name}</span>
                  </div>

                  {isSelected && <Check size={14} className="text-quiby-purpleLight shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
