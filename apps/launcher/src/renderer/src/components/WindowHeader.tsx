import React, { useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { ServerStatus } from '@quiby/shared';

interface WindowHeaderProps {
  serverIp?: string;
  serverStatus?: ServerStatus | null;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  serverIp = 'play.quiby.fun',
  serverStatus,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => {
    window.quibyApi?.minimize();
  };

  const handleMaximize = () => {
    window.quibyApi?.maximize();
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    window.quibyApi?.close();
  };

  return (
    <header className="h-8 w-full bg-[#0b0e14] border-b border-[#252f45] flex items-center justify-between px-3 select-none app-drag shrink-0 z-50">
      {/* Left: small clean brand mark `quiby.` + version `Season VI: Aeronautics` with subtle monospace tag */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-black text-white tracking-tight">quiby.</span>
        <span className="text-[10px] font-mono text-zinc-400 bg-surface-850 px-1.5 py-0.5 rounded border border-surface-border">
          Season VI: Aeronautics
        </span>
      </div>

      {/* Center: status indicator (e.g. server host ping pill or empty drag area) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-900 border border-surface-border text-[10px] font-mono text-zinc-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span>{serverIp}</span>
          <span className="text-emerald-400 font-semibold">
            {serverStatus?.online ? `${serverStatus.players.online}/${serverStatus.players.max}` : 'Онлайн'}
          </span>
        </div>
      </div>

      {/* Right: Window control buttons with `-webkit-app-region: no-drag` (class `app-no-drag`) */}
      <div className="flex items-center h-full -mr-3 app-no-drag">
        {/* Minimize button */}
        <button
          type="button"
          onClick={handleMinimize}
          className="h-8 w-11 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer"
          title="Свернуть"
        >
          <Minus size={13} />
        </button>

        {/* Maximize/Restore button */}
        <button
          type="button"
          onClick={handleMaximize}
          className="h-8 w-11 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer"
          title={isMaximized ? 'Восстановить' : 'Развернуть'}
        >
          {isMaximized ? <Copy size={11} className="rotate-90" /> : <Square size={11} />}
        </button>

        {/* Close button (hover turns red rose-600) */}
        <button
          type="button"
          onClick={handleClose}
          className="h-8 w-11 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
          title="Закрыть"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
};

export default WindowHeader;
