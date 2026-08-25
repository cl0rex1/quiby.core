import React from 'react';
import { Minus, Square, X, Layers, Terminal, Sliders, Sparkles, Wifi } from 'lucide-react';
import { ServerStatus } from '@quiby/shared';

interface HeaderProps {
  serverStatus: ServerStatus | null;
  logsCount: number;
  modsCount: number;
  onOpenModpack: () => void;
  onOpenConsole: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  serverStatus,
  logsCount,
  modsCount,
  onOpenModpack,
  onOpenConsole,
  onOpenSettings,
}) => {
  const handleMinimize = () => window.quibyApi?.minimize();
  const handleMaximize = () => window.quibyApi?.maximize();
  const handleClose = () => window.quibyApi?.close();

  return (
    <header className="h-14 bg-quiby-bg/90 backdrop-blur-md border-b border-quiby-border/70 flex items-center justify-between px-4 app-drag z-40 select-none">
      {/* Left: Brand Monogram & Season Badge */}
      <div className="flex items-center gap-3 app-no-drag">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-quiby-purpleDark via-quiby-purple to-quiby-accent flex items-center justify-center font-black text-white text-base shadow-neon-purple">
            Q
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">
            quiby<span className="text-quiby-purpleLight">.</span>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-quiby-card border border-quiby-border text-xs font-semibold text-quiby-purpleLight">
          <Sparkles size={12} className="text-quiby-purple" />
          <span>S6 Aeronautics</span>
          <span className="text-quiby-textDim font-mono">1.21.1</span>
        </div>
      </div>

      {/* Middle: Live Server Ping Pill */}
      <div className="hidden md:flex items-center gap-2.5 px-3 py-1 rounded-full bg-quiby-card/80 border border-quiby-border text-xs app-no-drag shadow-sm">
        {serverStatus?.online ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            <span className="text-quiby-text font-mono font-medium">{serverStatus.ip}</span>
            <span className="text-emerald-400 font-bold">
              {serverStatus.players.online} / {serverStatus.players.max} онлайн
            </span>
            <span className="text-quiby-textDim">({serverStatus.latencyMs}ms)</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-quiby-text font-mono">play.quiby.fun</span>
            <span className="text-quiby-purpleLight font-medium">1.21.1 NeoForge</span>
          </>
        )}
      </div>

      {/* Right: Quick Drawer Triggers & Window Controls */}
      <div className="flex items-center gap-2 app-no-drag">
        {/* Modpack Button */}
        <button
          onClick={onOpenModpack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-quiby-card hover:bg-quiby-cardHover border border-quiby-border text-xs font-semibold text-quiby-text hover:text-white transition-all shadow-sm group"
        >
          <Layers size={14} className="text-quiby-purpleLight group-hover:scale-110 transition-transform" />
          <span>Сборка модов</span>
          {modsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-quiby-purple/20 text-quiby-purpleLight font-mono">
              {modsCount}
            </span>
          )}
        </button>

        {/* Console Logs Button */}
        <button
          onClick={onOpenConsole}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-quiby-card hover:bg-quiby-cardHover border border-quiby-border text-xs font-semibold text-quiby-text hover:text-white transition-all shadow-sm group"
        >
          <Terminal size={14} className="text-quiby-purpleLight group-hover:scale-110 transition-transform" />
          <span>Консоль</span>
          {logsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-quiby-border text-quiby-textDim font-mono">
              {logsCount}
            </span>
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full bg-quiby-card hover:bg-quiby-cardHover border border-quiby-border text-quiby-text hover:text-white transition-all shadow-sm group"
          title="Настройки"
        >
          <Sliders size={14} className="text-quiby-purpleLight group-hover:rotate-45 transition-transform" />
        </button>

        {/* Window Controls */}
        <div className="flex items-center ml-2 space-x-1 pl-2 border-l border-quiby-border/70">
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center text-quiby-textMuted hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Свернуть"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleMaximize}
            className="w-7 h-7 flex items-center justify-center text-quiby-textMuted hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Развернуть"
          >
            <Square size={11} />
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center text-quiby-textMuted hover:text-white hover:bg-red-600 rounded-full transition-colors"
            title="Закрыть"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </header>
  );
};
