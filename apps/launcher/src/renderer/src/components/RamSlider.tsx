import React, { useState, useRef } from 'react';
import { HardDrive, AlertTriangle } from 'lucide-react';

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
        text: 'Менее 8 ГБ: возможна нехватка памяти для Create Aeronautics',
      };
    }
    if (currentGb > 16) {
      return {
        type: 'high',
        text: 'Более 16 ГБ: сборщик мусора Java (GC) может вызывать задержки',
      };
    }
    return null;
  };

  const warning = getMinimalWarning();

  return (
    <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-6 select-none shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <HardDrive size={16} className="text-quiby-purpleLight" />
          <span>Выделение оперативной памяти</span>
        </div>

        <span className="text-[11px] text-quiby-textMuted font-mono">
          Всего в системе: <strong className="text-white">{totalSystemRamGb} ГБ</strong>
        </span>
      </div>

      {/* Slider Track with Tick Marks & Floating Tooltip Bubble */}
      <div className="pt-8 pb-3 px-2">
        <div ref={trackRef} className="relative w-full flex flex-col justify-center">
          {/* Floating Tooltip Bubble over the Stick Thumb */}
          <div
            className="absolute -top-10 transition-all duration-75 pointer-events-none z-30"
            style={{ left: `${trackPercentage}%` }}
          >
            <div className="-translate-x-1/2 flex flex-col items-center">
              <div className="px-2.5 py-1 rounded-lg bg-onyx-800 border border-quiby-purple/50 shadow-onyx-glow text-white font-mono text-xs font-bold whitespace-nowrap flex items-center gap-1">
                <span>{currentGb} ГБ</span>
                <span className="text-[10px] text-quiby-textDim font-normal">({ramMb} МБ)</span>
              </div>
              {/* Tooltip caret / arrow */}
              <div className="w-2 h-2 bg-onyx-800 border-r border-b border-quiby-purple/50 rotate-45 -mt-1"></div>
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
                          ? 'bg-quiby-purpleLight shadow-[0_0_6px_rgba(167,139,250,0.8)]'
                          : 'bg-quiby-purple/60'
                        : isMajor
                        ? 'bg-onyx-borderLight'
                        : 'bg-onyx-border'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Horizontal Track Bar */}
          <div className="relative w-full h-1.5 bg-onyx-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-quiby-purple via-quiby-purpleLight to-quiby-accent rounded-full transition-all duration-75"
              style={{ width: `${trackPercentage}%` }}
            />
          </div>

          {/* Stick Thumb Indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 z-20"
            style={{ left: `${trackPercentage}%` }}
          >
            <div className="-translate-x-1/2 w-1.5 h-6 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] border border-quiby-purpleLight" />
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

        {/* Clean Extremities Labels (No clutter) */}
        <div className="flex justify-between text-[10px] text-quiby-textDim font-mono pt-3 px-1">
          <span>{minGb} ГБ</span>
          <span>{maxGb} ГБ</span>
        </div>
      </div>

      {/* Minimalist Warning Note (Only if < 8 GB or > 16 GB) */}
      {warning && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs animate-in fade-in duration-200">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="leading-tight">{warning.text}</span>
        </div>
      )}
    </div>
  );
};
