import React from 'react';
import { Minus, Square, X, Wifi, WifiOff, LogOut, User, Disc } from 'lucide-react';
import { AuthSession, ServerStatus } from '@quiby/shared';

interface HeaderProps {
  session: AuthSession | null;
  serverStatus: ServerStatus | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ session, serverStatus, onOpenLogin, onLogout }) => {
  const handleMinimize = () => window.quibyApi?.minimize();
  const handleMaximize = () => window.quibyApi?.maximize();
  const handleClose = () => window.quibyApi?.close();

  return (
    <header className="h-14 bg-quiby-card/90 backdrop-blur border-b border-quiby-border flex items-center justify-between px-4 app-drag z-50 select-none">
      {/* Brand & Season Tag */}
      <div className="flex items-center gap-3 app-no-drag">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-quiby-500 flex items-center justify-center shadow-glow-green font-black text-quiby-dark text-lg tracking-wider">
            Q
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
            quiby<span className="text-quiby-400">.core</span>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-quiby-panel border border-quiby-border text-xs font-semibold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          S6 Aeronautics • 1.21.1 NeoForge
        </div>
      </div>

      {/* Middle: Server Status Ping */}
      <div className="hidden md:flex items-center gap-2.5 px-3 py-1 rounded-lg bg-quiby-panel/80 border border-quiby-border text-xs app-no-drag">
        {serverStatus?.online ? (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            <span className="text-slate-300 font-medium">{serverStatus.ip}</span>
            <span className="text-emerald-400 font-bold">
              {serverStatus.players.online} / {serverStatus.players.max} онлайн
            </span>
            <span className="text-slate-500">({serverStatus.latencyMs}ms)</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-slate-300 font-medium">play.quiby.fun</span>
            <span className="text-amber-400 font-medium">1.21.1 NeoForge</span>
          </>
        )}
      </div>

      {/* Right: Auth User & Window Controls */}
      <div className="flex items-center gap-3 app-no-drag">
        {session ? (
          <div className="flex items-center gap-2 bg-quiby-panel px-3 py-1.5 rounded-lg border border-quiby-border text-xs">
            <img
              src={session.user.avatarUrl || `https://api.dicebear.com/8.x/bottts/svg?seed=${session.user.mcUsername}`}
              alt="Avatar"
              className="w-6 h-6 rounded-full border border-emerald-500/50 object-cover"
            />
            <div className="flex flex-col text-left">
              <span className="font-bold text-white text-xs leading-none">{session.user.mcUsername}</span>
              <span className="text-[10px] text-slate-400 leading-none mt-0.5">@{session.user.username}</span>
            </div>
            <button
              onClick={onLogout}
              title="Выйти"
              className="ml-1 p-1 hover:text-red-400 text-slate-400 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 bg-[#5865F2] hover:bg-[#4752c4] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <User size={14} />
            <span>Войти через Discord</span>
          </button>
        )}

        {/* Window Controls */}
        <div className="flex items-center ml-1 space-x-1">
          <button
            onClick={handleMinimize}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={handleMaximize}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <Square size={12} />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-red-600 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
