import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(10);
  const [statusText, setStatusText] = useState('Инициализация quiby.core...');
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const steps = [
      { p: 35, text: 'Проверка манифеста Minecraft 1.21.1 NeoForge...', delay: 350 },
      { p: 70, text: 'Загрузка модулей Create Aeronautics...', delay: 750 },
      { p: 95, text: 'Синхронизация профиля Discord...', delay: 1100 },
      { p: 100, text: 'Готово к запуску', delay: 1400 },
    ];

    const timeouts = steps.map((s) =>
      setTimeout(() => {
        setProgress(s.p);
        setStatusText(s.text);
      }, s.delay)
    );

    const finishTimeout = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => onFinish(), 400);
    }, 1800);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finishTimeout);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#08090d] flex flex-col items-center justify-center select-none transition-opacity duration-400 ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-quiby-purple/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-quiby-indigo/15 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center space-y-6 max-w-sm w-full px-6 text-center">
        {/* Animated Brand Emblem */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-quiby-purpleDark via-quiby-purple to-quiby-accent p-0.5 shadow-neon-purple animate-bounce duration-1000">
            <div className="w-full h-full bg-[#08090d] rounded-3xl flex items-center justify-center">
              <span className="font-black text-4xl bg-gradient-to-tr from-white via-quiby-purpleLight to-quiby-purple bg-clip-text text-transparent">
                Q
              </span>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-quiby-purple flex items-center justify-center text-white shadow">
            <Sparkles size={13} />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-wider text-white">
            quiby<span className="text-quiby-purple">.</span>
          </h1>
          <div className="text-xs font-mono font-bold tracking-widest uppercase text-quiby-purpleLight">
            Season VI • Aeronautics
          </div>
        </div>

        {/* Progress Bar & Status Text */}
        <div className="w-full space-y-2 pt-4">
          <div className="w-full h-1.5 bg-quiby-card rounded-full overflow-hidden border border-quiby-border">
            <div
              className="h-full bg-gradient-to-r from-quiby-purple via-quiby-purpleLight to-quiby-indigo transition-all duration-300 rounded-full shadow-neon-purple"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="text-[11px] font-mono text-quiby-textMuted transition-all">
            {statusText}
          </div>
        </div>
      </div>
    </div>
  );
};
