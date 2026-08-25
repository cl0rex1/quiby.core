import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Wifi, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Compass, 
  Anchor,
  Sliders
} from 'lucide-react';
import { ModpackManifest, ServerStatus } from '@quiby/shared';

interface PlayViewProps {
  manifest: ModpackManifest | null;
  serverStatus: ServerStatus | null;
  serverIp: string;
  onOpenModpack: () => void;
  onOpenSettings: () => void;
}

export const PlayView: React.FC<PlayViewProps> = ({
  manifest,
  serverStatus,
  serverIp,
  onOpenModpack,
  onOpenSettings,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyIp = () => {
    navigator.clipboard.writeText(serverIp || 'play.quiby.fun:25565');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative flex-1 flex flex-col justify-between p-8 overflow-y-auto select-none">
      {/* Atmospheric Nebula Background Glows */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-quiby-purple/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-quiby-indigo/15 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main Hero Header */}
      <div className="relative z-10 max-w-3xl space-y-4 pt-4">
        {/* Season Tag Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-quiby-card border border-quiby-purple/40 text-quiby-purpleLight text-xs font-mono font-bold tracking-wider uppercase shadow-neon-purple">
          <Sparkles size={13} className="text-quiby-purple" />
          <span>Season VI • Aeronautics Release</span>
        </div>

        {/* Big Cinematic Display Typography */}
        <div className="space-y-1">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-none">
            QUIBY<span className="text-quiby-purpleLight">.</span>
          </h1>
          <div className="text-xl sm:text-2xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-quiby-purpleLight to-quiby-purple">
            Create Aeronautics & Industrial Age
          </div>
        </div>

        <p className="text-sm sm:text-base text-quiby-textMuted leading-relaxed max-w-2xl">
          Сборка нового поколения на <strong className="text-white">Minecraft 1.21.1 NeoForge</strong>. Стройте летающие базы, дирижабли, настраивайте паровую тягу и исследуйте мир без ограничений на официальном сервере.
        </p>

        {/* Server IP Quick Copy Card */}
        <div className="inline-flex items-center gap-3 p-2 pr-4 rounded-2xl bg-quiby-card/80 border border-quiby-border shadow-sm backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-quiby-surface flex items-center justify-center text-quiby-purpleLight border border-quiby-border">
            <Wifi size={17} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-quiby-textMuted uppercase font-mono">Адрес сервера:</span>
            <span className="text-xs font-mono font-bold text-white">{serverIp || 'play.quiby.fun'}</span>
          </div>
          <button
            onClick={handleCopyIp}
            className="ml-3 px-3 py-1.5 rounded-xl bg-quiby-surface hover:bg-quiby-purple/20 border border-quiby-border text-xs font-bold text-quiby-text hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Скопировано</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Копировать IP</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feature Spotlight Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
        {/* Card 1 */}
        <div 
          onClick={onOpenModpack}
          className="group bg-quiby-card/70 hover:bg-quiby-card border border-quiby-border hover:border-quiby-purple/50 rounded-2xl p-4 space-y-2.5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-neon-purple backdrop-blur-md"
        >
          <div className="w-9 h-9 rounded-xl bg-quiby-purple/15 flex items-center justify-center text-quiby-purpleLight group-hover:scale-110 transition-transform">
            <Anchor size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm group-hover:text-quiby-purpleLight transition-colors">
              Create Aeronautics
            </h3>
            <p className="text-xs text-quiby-textMuted leading-relaxed mt-0.5">
              Дирижабли, полёты в реальном времени, шестерни и кинетическая энергия.
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div 
          onClick={onOpenSettings}
          className="group bg-quiby-card/70 hover:bg-quiby-card border border-quiby-border hover:border-quiby-purple/50 rounded-2xl p-4 space-y-2.5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-neon-purple backdrop-blur-md"
        >
          <div className="w-9 h-9 rounded-xl bg-quiby-purple/15 flex items-center justify-center text-quiby-purpleLight group-hover:scale-110 transition-transform">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm group-hover:text-quiby-purpleLight transition-colors">
              NeoForge 1.21.1 + Oculus
            </h3>
            <p className="text-xs text-quiby-textMuted leading-relaxed mt-0.5">
              Экстремальная оптимизация графики, шейдеры нового поколения и 120+ FPS.
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-quiby-card/70 border border-quiby-border rounded-2xl p-4 space-y-2.5 shadow-sm backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-quiby-purple/15 flex items-center justify-center text-quiby-purpleLight">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              Discord Whitelist 1:1
            </h3>
            <p className="text-xs text-quiby-textMuted leading-relaxed mt-0.5">
              Автоматическая привязка аккаунта, защита от мультиаккаунтов и безопасность.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
