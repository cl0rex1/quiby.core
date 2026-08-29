import React, { useRef } from 'react';
import { HardDrive, AlertTriangle, Zap, Check } from 'lucide-react';

interface RamSliderProps {
  ramMb: number;
  totalSystemRamGb: number;
  onChange: (ramMb: number) => void;
}

export const RamSlider: React.FC<RamSliderProps> = ({
  ramMb,
  totalSystemRamGb,
  onChange,
}) => {
  const currentGb = Math.round(ramMb / 1024);
  const minGb = 4;
  const maxGb = Math.max(totalSystemRamGb, 16);
  const trackRef = useRef<HTMLDivElement>(null);

  // Quick Preset options
  const presets = [
    { gb: 4, label: '4 ГБ', desc: 'Базовый' },
    { gb: 6, label: '6 ГБ', desc: 'Стандарт' },
    { gb: 8, label: '8 ГБ', desc: 'Оптимально (Рекомендуется)', isRecommended: true },
    { gb: 12, label: '12 ГБ', desc: 'Шейдеры' },
    { gb: 16, label: '16 ГБ', desc: 'Максимум' },
  ].filter((p) => p.gb <= maxGb);

  // Generate measurement ticks for each GB
  const ticksCount = maxGb - minGb;
  const ticks = Array.from({ length: ticksCount + 1 }, (_, i) => minGb + i);
  const trackPercentage = Math.min(Math.max(((currentGb - minGb) / (maxGb - minGb)) * 100, 0), 100);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onChange(val * 1024);
  };

  // Warning only for < 8 GB and > 16 GB
  const getMinimalWarning = () => {
    if (currentGb < 8) {
      return {
        type: 'low',
        text: 'Менее 8 ГБ: возможна нехватка памяти для тяжелых модов Create Aeronautics',
      };
    }
    if (currentGb > 16) {
      return {
        type: 'high',
        text: 'Более 16 ГБ: сборщик мусора Java (GC) может вызывать микрофризы',
      };
    }
    return null;
  };

  const warning = getMinimalWarning();

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6 select-none shadow-sm">
      {/* Header with Specs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-white font-bold text-sm">
          <HardDrive size={18} className="text-zinc-400" />
          <span className="apple-subheading">Выделение оперативной памяти</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-400">В системе:</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800/80 border border-white/10 text-white font-bold">
            {totalSystemRamGb} ГБ
          </span>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {presets.map((preset) => {
          const isSelected = currentGb === preset.gb;
          return (
            <button
              key={preset.gb}
              type="button"
              onClick={() => onChange(preset.gb * 1024)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer press-feedback flex items-center gap-1.5 shadow-sm border ${
                isSelected
                  ? 'bg-white text-zinc-950 border-white shadow-md'
                  : preset.isRecommended
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25'
                  : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {preset.isRecommended && !isSelected && <Zap size={12} className="text-purple-400 fill-purple-400" />}
              {isSelected && <Check size={13} className="stroke-[3]" />}
              <span>{preset.label}</span>
              {preset.isRecommended && (
                <span className="text-[10px] opacity-75 font-normal ml-0.5 hidden sm:inline">
                  (Рекомендуется)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Slider Track with Tick Marks & Floating Tooltip Bubble */}
      <div className="pt-6 pb-2 px-2">
        <div ref={trackRef} className="relative w-full flex flex-col justify-center">
          {/* Floating Tooltip Bubble over the Thumb */}
          <div
            className="absolute -top-10 transition-all duration-75 pointer-events-none z-30"
            style={{ left: `${trackPercentage}%` }}
          >
            <div className="-translate-x-1/2 flex flex-col items-center">
              <div className="px-3 py-1 rounded-xl bg-zinc-900/95 border border-white/20 shadow-xl text-white font-mono text-xs font-bold whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md">
                <span>{currentGb} ГБ</span>
                <span className="text-[10px] text-zinc-400 font-normal">({ramMb} МБ)</span>
              </div>
              <div className="w-2 h-2 bg-zinc-900 border-r border-b border-white/20 rotate-45 -mt-1" />
            </div>
          </div>

          {/* Measurement Sticks / Ticks Layer (Background) */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between items-center px-1 pointer-events-none z-0">
            {ticks.map((tickVal) => {
              const isFilled = tickVal <= currentGb;
              const isMajor = tickVal === 8 || tickVal === 16 || tickVal === minGb || tickVal === maxGb;

              return (
                <div
                  key={tickVal}
                  className="flex flex-col items-center"
                  style={{ width: '0px' }}
                >
                  <span
                    className={`rounded-full transition-colors ${
                      isMajor ? 'w-[2px] h-3.5' : 'w-[1.5px] h-2'
                    } ${
                      isFilled
                        ? isMajor
                          ? 'bg-zinc-200'
                          : 'bg-zinc-400'
                        : isMajor
                        ? 'bg-zinc-700'
                        : 'bg-zinc-800'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Horizontal Track Bar */}
          <div className="relative w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-white rounded-full transition-all duration-75"
              style={{ width: `${trackPercentage}%` }}
            />
          </div>

          {/* Stick Thumb Indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 z-20"
            style={{ left: `${trackPercentage}%` }}
          >
            <div className="-translate-x-1/2 w-2.5 h-6 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.95)] border border-zinc-200" />
          </div>

          {/* Transparent Native Range Input */}
          <input
            type="range"
            min={minGb}
            max={maxGb}
            step={1}
            value={currentGb}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-8 opacity-0 cursor-pointer z-30"
          />
        </div>

        {/* Extremities Labels */}
        <div className="flex justify-between text-[11px] text-zinc-400 font-mono pt-3 px-1">
          <span>Мин: {minGb} ГБ</span>
          <span>Макс: {maxGb} ГБ</span>
        </div>
      </div>

      {/* Warning Alert if low/high */}
      {warning && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs animate-in fade-in duration-200">
          <AlertTriangle size={16} className="shrink-0 text-amber-400" />
          <span className="leading-tight apple-body">{warning.text}</span>
        </div>
      )}
    </div>
  );
};
