import React, { useState } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Zap, 
  Check, 
  Flame, 
  Layers, 
  ShieldCheck, 
  ArrowRight,
  Monitor
} from 'lucide-react';
import { LauncherSettings } from '@quiby/shared';

interface FirstLaunchOnboardingModalProps {
  isOpen: boolean;
  settings: LauncherSettings;
  onClose: () => void;
  onApplyPreset: (updatedSettings: Partial<LauncherSettings>, profile: 'clean' | 'optimal' | 'full') => void;
}

export const FirstLaunchOnboardingModal: React.FC<FirstLaunchOnboardingModalProps> = ({
  isOpen,
  settings,
  onClose,
  onApplyPreset,
}) => {
  const [selectedGraphics, setSelectedGraphics] = useState<'potato' | 'optimal' | 'ultra'>(
    settings.graphicsPreset || 'optimal'
  );
  const [selectedProfile, setSelectedProfile] = useState<'clean' | 'optimal' | 'full'>(
    settings.modpackProfile || 'optimal'
  );

  if (!isOpen) return null;

  const handleApply = () => {
    let ramMb = 8192;
    if (selectedGraphics === 'potato') ramMb = 4096;
    if (selectedGraphics === 'ultra') ramMb = 12288;

    onApplyPreset(
      {
        ramMaxMb: ramMb,
        ramMinMb: Math.min(ramMb, 4096),
        graphicsPreset: selectedGraphics,
        modpackProfile: selectedProfile,
      },
      selectedProfile
    );
    localStorage.setItem('quiby_onboarded', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-xl bg-zinc-950/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.9)] space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold apple-micro-tag">
            <Sparkles size={12} />
            <span>QUIBY. SEASON VI • ПЕРВЫЙ ЗАПУСК</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white apple-display tracking-tight">
            Добро пожаловать в quiby.core
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto apple-body">
            Выберите желаемый уровень графики и состав сборки. Настройки можно изменить в любой момент.
          </p>
        </div>

        {/* 1. Graphics Level Presets */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 apple-micro-tag">
            <Monitor size={12} className="text-purple-400" />
            <span>1. Уровень графики и производительности</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Potato */}
            <button
              type="button"
              onClick={() => setSelectedGraphics('potato')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedGraphics === 'potato'
                  ? 'bg-zinc-850 border-white/30 ring-1 ring-white/20 shadow-md'
                  : 'bg-zinc-900/50 hover:bg-zinc-900 border-white/5 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-lg">🥔</span>
                {selectedGraphics === 'potato' && <Check size={14} className="text-white stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white apple-subheading">Картошка</p>
                <p className="text-[10px] text-zinc-500 font-mono">4 ГБ RAM • Макс FPS</p>
              </div>
            </button>

            {/* Optimal */}
            <button
              type="button"
              onClick={() => setSelectedGraphics('optimal')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedGraphics === 'optimal'
                  ? 'bg-zinc-850 border-emerald-400/50 ring-1 ring-emerald-400/30 shadow-[0_0_20px_rgba(52,211,153,0.15)]'
                  : 'bg-zinc-900/50 hover:bg-zinc-900 border-white/5 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-lg">⚡</span>
                {selectedGraphics === 'optimal' && <Check size={14} className="text-emerald-400 stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white apple-subheading">Оптимально</p>
                <p className="text-[10px] text-emerald-400 font-mono font-bold">8 ГБ RAM • Баланс</p>
              </div>
            </button>

            {/* Ultra */}
            <button
              type="button"
              onClick={() => setSelectedGraphics('ultra')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedGraphics === 'ultra'
                  ? 'bg-zinc-850 border-purple-400/50 ring-1 ring-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                  : 'bg-zinc-900/50 hover:bg-zinc-900 border-white/5 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-lg">✨</span>
                {selectedGraphics === 'ultra' && <Check size={14} className="text-purple-400 stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white apple-subheading">Ультра</p>
                <p className="text-[10px] text-purple-400 font-mono">12+ ГБ • Шейдеры</p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Modpack Profile Type */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 apple-micro-tag">
            <Layers size={12} className="text-purple-400" />
            <span>2. Состав сборки</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Clean */}
            <button
              type="button"
              onClick={() => setSelectedProfile('clean')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedProfile === 'clean'
                  ? 'bg-zinc-850 border-white/30 ring-1 ring-white/20 shadow-md'
                  : 'bg-zinc-900/50 hover:bg-zinc-900 border-white/5 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold font-mono text-zinc-400">CORE</span>
                {selectedProfile === 'clean' && <Check size={14} className="text-white stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white apple-subheading">Чистая</p>
                <p className="text-[10px] text-zinc-500">Только Create & S6</p>
              </div>
            </button>

            {/* Optimal */}
            <button
              type="button"
              onClick={() => setSelectedProfile('optimal')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedProfile === 'optimal'
                  ? 'bg-zinc-850 border-emerald-400/50 ring-1 ring-emerald-400/30 shadow-[0_0_20px_rgba(52,211,153,0.15)]'
                  : 'bg-zinc-900/50 hover:bg-zinc-900 border-white/5 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold font-mono text-emerald-400">REC</span>
                {selectedProfile === 'optimal' && <Check size={14} className="text-emerald-400 stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white apple-subheading">Оптимальная</p>
                <p className="text-[10px] text-emerald-400">S6 + Оптимизация</p>
              </div>
            </button>

            {/* Full */}
            <button
              type="button"
              onClick={() => setSelectedProfile('full')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedProfile === 'full'
                  ? 'bg-zinc-850 border-purple-400/50 ring-1 ring-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                  : 'bg-zinc-900/50 hover:bg-zinc-900 border-white/5 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold font-mono text-purple-400">FULL</span>
                {selectedProfile === 'full' && <Check size={14} className="text-purple-400 stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white apple-subheading">Полная</p>
                <p className="text-[10px] text-purple-400">Все звуки и визуал</p>
              </div>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleApply}
            className="w-full py-3.5 rounded-2xl bg-white hover:bg-neutral-100 text-zinc-950 text-xs font-bold transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer press-feedback border border-white/40 group"
          >
            <span className="apple-subheading">Применить и продолжить</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
