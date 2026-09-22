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
  Monitor,
  Activity,
  HardDrive
} from 'lucide-react';
import { LauncherSettings } from '@quiby/shared';

interface FirstLaunchOnboardingModalProps {
  isOpen: boolean;
  settings: LauncherSettings;
  onClose: () => void;
  onApplyPreset: (updatedSettings: Partial<LauncherSettings>, profile: 'clean' | 'optimal' | 'full') => void;
}

const PRESET_SPECS = {
  potato: {
    id: 'potato' as const,
    title: 'Картошка (4 ГБ)',
    badge: '120+ FPS • Минимальная нагрузка',
    badgeColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    ramGb: 4,
    ramGaugePercent: 25,
    specCard: 'Sodium Core, дальность прорисовки 8 чанков, отключенные тяжелые шейдеры и частицы, быстрый запуск на любом ноутбуке.',
    specs: [
      { label: 'Движок', value: 'Sodium Core' },
      { label: 'Чанки', value: '8 чанков' },
      { label: 'Шейдеры', value: 'Отключены' },
      { label: 'Ноутбук', value: 'Любой ПК' },
    ],
    recommendedProfile: 'clean' as const,
  },
  optimal: {
    id: 'optimal' as const,
    title: 'Оптимально (8 ГБ)',
    badge: '75-90 FPS • Золотая середина',
    badgeColor: 'bg-[#d4975c]/15 border-[#d4975c]/30 text-[#eab683]',
    ramGb: 8,
    ramGaugePercent: 50,
    specCard: 'Create 6.0 кинематика, реалистичная 3D акустика Sound Physics, мягкое динамическое освещение, 12-16 чанков.',
    specs: [
      { label: 'Кинематика', value: 'Create 6.0' },
      { label: 'Чанки', value: '12-16 чанков' },
      { label: 'Акустика', value: 'Sound Physics 3D' },
      { label: 'Освещение', value: 'Динамическое' },
    ],
    recommendedProfile: 'optimal' as const,
  },
  ultra: {
    id: 'ultra' as const,
    title: 'Ультра (12+ ГБ)',
    badge: '60+ FPS • Максимальное качество',
    badgeColor: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    ramGb: 12,
    ramGaugePercent: 75,
    specCard: 'Полноценные шейдеры Iris/Oculus, объемный дым дирижаблей, отражения на воде, максимальные текстуры.',
    specs: [
      { label: 'Шейдеры', value: 'Iris / Oculus' },
      { label: 'Чанки', value: '20+ чанков' },
      { label: 'Эффекты', value: 'Объемный дым' },
      { label: 'Вода', value: 'Отражения RTX' },
    ],
    recommendedProfile: 'full' as const,
  },
};

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

  const currentSpec = PRESET_SPECS[selectedGraphics];

  const handleSelectGraphics = (g: 'potato' | 'optimal' | 'ultra') => {
    setSelectedGraphics(g);
    setSelectedProfile(PRESET_SPECS[g].recommendedProfile);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl bg-surface-950 border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4975c]/15 border border-[#d4975c]/30 text-[#eab683] text-xs font-mono font-bold">
            <Sparkles size={12} />
            <span>QUIBY. SEASON VI • ПЕРВЫЙ ЗАПУСК</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Добро пожаловать в quiby.core
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Выберите желаемый уровень графики и состав сборки. Настройки можно изменить в любой момент.
          </p>
        </div>

        {/* 1. Graphics Level Presets */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Monitor size={12} className="text-[#d4975c]" />
            <span>1. Уровень графики и производительности</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Potato */}
            <button
              type="button"
              onClick={() => handleSelectGraphics('potato')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedGraphics === 'potato'
                  ? 'bg-surface-850 border-[#d4975c] ring-1 ring-[#d4975c]/30 shadow-md'
                  : 'bg-surface-900 hover:bg-surface-850 border-surface-border text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-lg">🥔</span>
                {selectedGraphics === 'potato' && <Check size={14} className="text-[#d4975c] stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Картошка</p>
                <p className="text-[10px] text-zinc-400 font-mono">4 ГБ RAM • Макс FPS</p>
              </div>
            </button>

            {/* Optimal */}
            <button
              type="button"
              onClick={() => handleSelectGraphics('optimal')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedGraphics === 'optimal'
                  ? 'bg-surface-850 border-[#d4975c] ring-1 ring-[#d4975c]/30 shadow-md'
                  : 'bg-surface-900 hover:bg-surface-850 border-surface-border text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-lg">⚡</span>
                {selectedGraphics === 'optimal' && <Check size={14} className="text-[#d4975c] stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Оптимально</p>
                <p className="text-[10px] text-[#eab683] font-mono font-bold">8 ГБ RAM • Баланс</p>
              </div>
            </button>

            {/* Ultra */}
            <button
              type="button"
              onClick={() => handleSelectGraphics('ultra')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedGraphics === 'ultra'
                  ? 'bg-surface-850 border-[#d4975c] ring-1 ring-[#d4975c]/30 shadow-md'
                  : 'bg-surface-900 hover:bg-surface-850 border-surface-border text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-lg">✨</span>
                {selectedGraphics === 'ultra' && <Check size={14} className="text-[#d4975c] stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Ультра</p>
                <p className="text-[10px] text-purple-400 font-mono">12+ ГБ • Шейдеры</p>
              </div>
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* INTERACTIVE LIVE PREVIEW BLOCK (ПРЕДПОКАЗ НАСТРОЕК)                 */}
        {/* =================================================================== */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-900 border border-surface-border space-y-3.5">
          {/* Header of Preview */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[#d4975c]" />
              <span className="text-xs font-bold text-white tracking-wide uppercase">
                Предпоказ: {currentSpec.title}
              </span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold ${currentSpec.badgeColor}`}>
              {currentSpec.badge}
            </span>
          </div>

          {/* Visual Spec Card */}
          <div className="p-3 rounded-xl bg-surface-850 border border-surface-border/70 space-y-2.5">
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {currentSpec.specCard}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-surface-border/50 text-[10px] font-mono">
              {currentSpec.specs.map((item, idx) => (
                <div key={idx} className="p-1.5 rounded-lg bg-surface-900/80 border border-surface-border/40 text-center">
                  <span className="text-zinc-500 block">{item.label}</span>
                  <span className="text-zinc-200 font-bold truncate block">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RAM Gauge Indicator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <HardDrive size={13} className="text-[#d4975c]" />
                <span>Оперативная память (RAM):</span>
              </span>
              <span className="text-[#eab683] font-bold">
                {currentSpec.ramGb} ГБ из 16 ГБ
              </span>
            </div>

            {/* Gauge progress bar */}
            <div className="h-2.5 w-full rounded-full bg-surface-850 border border-surface-border overflow-hidden relative">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#d4975c] to-[#eab683] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(212,151,92,0.4)]"
                style={{ width: `${currentSpec.ramGaugePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-zinc-500 px-0.5">
              <span>0 ГБ</span>
              <span>4 ГБ</span>
              <span>8 ГБ</span>
              <span>12 ГБ</span>
              <span>16 ГБ</span>
            </div>
          </div>
        </div>

        {/* 2. Modpack Profile Type */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={12} className="text-[#d4975c]" />
            <span>2. Состав сборки</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Clean */}
            <button
              type="button"
              onClick={() => setSelectedProfile('clean')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedProfile === 'clean'
                  ? 'bg-surface-850 border-[#d4975c] ring-1 ring-[#d4975c]/30 shadow-md'
                  : 'bg-surface-900 hover:bg-surface-850 border-surface-border text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold font-mono text-zinc-400">CORE</span>
                {selectedProfile === 'clean' && <Check size={14} className="text-[#d4975c] stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Чистая</p>
                <p className="text-[10px] text-zinc-500">Только Create & S6</p>
              </div>
            </button>

            {/* Optimal */}
            <button
              type="button"
              onClick={() => setSelectedProfile('optimal')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedProfile === 'optimal'
                  ? 'bg-surface-850 border-[#d4975c] ring-1 ring-[#d4975c]/30 shadow-md'
                  : 'bg-surface-900 hover:bg-surface-850 border-surface-border text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold font-mono text-[#eab683]">REC</span>
                {selectedProfile === 'optimal' && <Check size={14} className="text-[#d4975c] stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Оптимальная</p>
                <p className="text-[10px] text-[#eab683]">S6 + Оптимизация</p>
              </div>
            </button>

            {/* Full */}
            <button
              type="button"
              onClick={() => setSelectedProfile('full')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
                selectedProfile === 'full'
                  ? 'bg-surface-850 border-[#d4975c] ring-1 ring-[#d4975c]/30 shadow-md'
                  : 'bg-surface-900 hover:bg-surface-850 border-surface-border text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold font-mono text-purple-400">FULL</span>
                {selectedProfile === 'full' && <Check size={14} className="text-[#d4975c] stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Полная</p>
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
            className="w-full py-3.5 rounded-2xl bg-[#d4975c] hover:bg-[#eab683] text-surface-950 text-xs font-black uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer press-feedback group"
          >
            <span>Применить и продолжить</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
