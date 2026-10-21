import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
export const WindowHeader: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  useEffect(() => {
    let active = true;
    const unsubscribe = window.quibyApi?.onMaximized(setIsMaximized);
    void window.quibyApi?.isMaximized().then(value => { if (active) setIsMaximized(value); }).catch(() => {});
    return () => { active = false; unsubscribe?.(); };
  }, []);

  const handleMinimize = () => {
    window.quibyApi?.minimize();
  };

  const handleMaximize = () => {
    window.quibyApi?.maximize();
  };

  const handleClose = () => {
    window.quibyApi?.close();
  };

  return (
    <header className="launcher-window-header h-8 w-full border-b flex items-center justify-between px-3 select-none app-drag shrink-0 z-50">
      {/* Left: small clean brand mark `quiby.` + version `Season VI: Aeronautics` with subtle monospace tag */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-black text-white tracking-tight">quiby.</span>
        <span className="header-edition">S6 / RELEASE</span>
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
