import React from 'react';
import { Upload, Trash2, Check } from 'lucide-react';
import { CAPE_PRESETS, DEFAULT_SKINS, CapePreset } from '../utils/chibiRenderer';
import { ChibiCharacterDisplay } from '../components/ChibiCharacterDisplay';

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
        <ChibiCharacterDisplay
          customSkinImg={customSkinImg}
          activeDefaultSkinIdx={activeDefaultSkinIdx}
          selectedCape={selectedCape}
        />
      </div>

      {/* Right Column: Clean Customization Controls */}
      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-1 justify-center">
        {/* Section 1: Skin Selection */}
        <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Скин</span>
            {customSkinImg && (
              <button
                onClick={() => onSetCustomSkin(null, null)}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Сбросить</span>
              </button>
            )}
          </div>

          {/* Upload Custom Skin Button */}
          <label className="flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl bg-onyx-850 hover:bg-onyx-800 border border-onyx-border text-xs font-bold text-white transition-all cursor-pointer shadow-sm">
            <Upload size={15} className="text-quiby-purpleLight" />
            <span>{customSkinName ? customSkinName : 'Загрузить свой скин (.png)'}</span>
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

          {/* 2 Default Skins Only: Steve & Alex */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {DEFAULT_SKINS.map((skin, idx) => {
              const isSelected = !customSkinImg && activeDefaultSkinIdx === idx;
              return (
                <button
                  key={skin.id}
                  onClick={() => {
                    onSetCustomSkin(null, null);
                    onSetDefaultSkinIdx(idx);
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

        {/* Section 2: Cape Selection */}
        <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-4">
          <span className="text-sm font-bold text-white block">Плащ</span>

          <div className="grid grid-cols-2 gap-2.5">
            {CAPE_PRESETS.map((cape) => {
              const isSelected = selectedCape.id === cape.id;
              return (
                <button
                  key={cape.id}
                  onClick={() => onSelectCape(cape)}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-onyx-800 border-quiby-purple shadow-onyx-glow text-white'
                      : 'bg-onyx-850 border-onyx-border text-quiby-textMuted hover:text-white hover:bg-onyx-800'
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
