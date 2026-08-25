import React from 'react';
import { X, Heart, Check, Sparkles } from 'lucide-react';
import { CAPE_PRESETS, CapePreset } from '../utils/chibiRenderer';

interface CapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCape: CapePreset;
  onSelectCape: (cape: CapePreset) => void;
}

export const CapeModal: React.FC<CapeModalProps> = ({
  isOpen,
  onClose,
  selectedCape,
  onSelectCape,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="bg-onyx-900 border border-onyx-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-onyx-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
              <Heart size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Выбор плаща и кастомизация</h3>
              <p className="text-xs text-quiby-textMuted font-mono">
                Официальные плащи 6 Сезона quiby.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-onyx-800 hover:bg-white/10 text-quiby-textMuted hover:text-white border border-onyx-border transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Capes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {CAPE_PRESETS.map((cape) => {
            const isSelected = selectedCape.id === cape.id;
            return (
              <div
                key={cape.id}
                onClick={() => {
                  onSelectCape(cape);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-onyx-800 border-quiby-purple shadow-onyx-glow'
                    : 'bg-onyx-850 border-onyx-border hover:border-quiby-purple/40 hover:bg-onyx-800'
                }`}
              >
                {/* Cape Visual Swatch */}
                <div
                  className="w-full h-20 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${cape.gradient[0]}, ${cape.gradient[1]})`,
                  }}
                >
                  {cape.emblem === 'quiby' && (
                    <span className="font-black text-2xl text-white drop-shadow">Q</span>
                  )}
                  {cape.emblem === 'crown' && (
                    <span className="text-2xl drop-shadow">👑</span>
                  )}
                  {cape.emblem === 'wings' && (
                    <span className="text-2xl drop-shadow">⚡</span>
                  )}
                  {cape.emblem === 'none' && (
                    <span className="text-xs font-mono text-quiby-textMuted">Без плаща</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{cape.name}</span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-quiby-purple flex items-center justify-center text-white">
                      <Check size={12} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold text-xs tracking-wide transition-all shadow-sm cursor-pointer"
        >
          Применить и закрыть
        </button>
      </div>
    </div>
  );
};
