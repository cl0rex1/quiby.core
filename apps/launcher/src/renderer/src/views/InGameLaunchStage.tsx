import React, { useState, useEffect, useRef } from 'react';
import { 
  Square, 
  Copy, 
  Check, 
  Trash2, 
  ArrowDownCircle, 
  RotateCw, 
  Terminal, 
  Clock, 
  Cpu
} from 'lucide-react';
import { AuthSession, DownloadProgress, LaunchState, LogEntry } from '@quiby/shared';
import { CapePreset, DEFAULT_SKINS } from '../utils/chibiRenderer';
import { ChibiCharacterDisplay } from '../components/ChibiCharacterDisplay';
import { useMotion } from '../components/MotionProvider';
import quibySeasonLogo from '../assets/quiby_season6_logo.png';

export interface InGameLaunchStageProps {
  session: AuthSession | null;
  launchState: LaunchState;
  downloadProgress: DownloadProgress | null;
  logs: LogEntry[];
  serverIp?: string;
  totalPlaytimeSeconds?: number;
  customSkinImg: HTMLImageElement | null;
  customSkinName: string | null;
  activeDefaultSkinIdx: number;
  selectedCape: CapePreset;
  onKill: () => void;
  onClearLogs?: () => void;
  backgroundVideoUrl?: string;
}

export const InGameLaunchStage: React.FC<InGameLaunchStageProps> = ({
  session,
  launchState,
  downloadProgress,
  logs,
  serverIp = 'play.quiby.fun:25565',
  totalPlaytimeSeconds = 0,
  customSkinImg,
  customSkinName,
  activeDefaultSkinIdx,
  selectedCape,
  onKill,
  onClearLogs,
  backgroundVideoUrl,
}) => {
  const { active: motionActive, reduced } = useMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (motionActive) void video.play().catch(() => {});
    else video.pause();
  }, [motionActive, backgroundVideoUrl]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const logsBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && !document.hidden) {
      logsBottomRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [logs, autoScroll, reduced]);

  const formatPlaytime = (seconds: number) => {
    if (seconds < 60) return '< 1 мин';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} мин`;
    const hours = (seconds / 3600).toFixed(1);
    return `${hours} ч`;
  };

  const formatSpeed = (bps: number) => {
    if (bps <= 0) return '';
    const mbps = (bps / (1024 * 1024)).toFixed(1);
    return `${mbps} МБ/с`;
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.source.toUpperCase()}/${l.level.toUpperCase()}]: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const getLogLevelClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-rose-400 font-semibold';
      case 'warn':
        return 'text-amber-400 font-medium';
      case 'debug':
        return 'text-zinc-500';
      default:
        return 'text-zinc-300';
    }
  };

  const skinDisplayName = customSkinName
    ? customSkinName
    : (DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length]?.name || 'Steve');

  return (
    <div className="game-session view-enter relative flex-1 flex flex-col p-6 overflow-hidden select-none z-10 h-full">
      {/* Ambient Media Background Layer (Video / GIF / Photo Support) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {backgroundVideoUrl ? (
          <video
            ref={videoRef}
            poster={quibySeasonLogo}
            loop
            muted
            playsInline
            src={backgroundVideoUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        ) : (
          <img
            src={quibySeasonLogo}
            alt="Season Ambient Background"
            className="absolute inset-0 w-full h-full object-cover opacity-10"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/80 to-surface-950/50" />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Main 2-Column In-Game Grid */}
      <div className="session-layout relative z-10 flex-1 grid gap-6 overflow-hidden items-stretch min-h-0">
        {/* Left Column (/ w-80): Walking Chibi, Status, PID, Playtime & Kill Button */}
        <div className="rounded-2xl bg-surface-900 p-6 border border-surface-border/70 flex flex-col items-center justify-between relative overflow-hidden shadow-xl shrink-0">
          {/* Top Info Bar: Playtime & PID indicator */}
          <div className="w-full flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-zinc-500" />
              <span className="font-mono">{formatPlaytime(totalPlaytimeSeconds)} в игре</span>
            </div>
            {launchState.gamePid ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                PID: {launchState.gamePid}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-surface-850 border border-surface-border text-[10px] font-mono text-zinc-500">
                PID: --
              </span>
            )}
          </div>

          {/* Central Area: Walking Chibi Character & Status Badge */}
          <div className="my-auto py-4 flex flex-col items-center justify-center relative">
            <div className="relative z-10 transition-transform duration-300">
              <ChibiCharacterDisplay
                customSkinImg={customSkinImg}
                activeDefaultSkinIdx={activeDefaultSkinIdx}
                selectedCape={selectedCape}
                animation="walk"
                showShadow={false}
              />
            </div>

            {/* Launch Status Badge */}
            <div className="mt-2">
              {launchState.status === 'updating' ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#bb74ff]/15 border border-[#bb74ff]/30 text-xs font-bold text-[#d7b6ff] animate-pulse">
                  <RotateCw size={13} className="animate-spin text-[#bb74ff]" />
                  <span>Синхронизация</span>
                </div>
              ) : launchState.status === 'starting' ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300 animate-pulse">
                  <Cpu size={13} className="animate-pulse text-amber-400" />
                  <span>Запуск Java</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span>Процесс Minecraft запущен</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Area: Server Status Pill, Identity & Kill Action */}
          <div className="w-full space-y-3 pt-4 border-t border-surface-border">
            {/* Server Status Pill */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface-850/90 border border-surface-border text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <span className="status-dot" />
                <span className="font-mono font-bold">{serverIp}</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono font-semibold">
                Адрес сервера
              </span>
            </div>

            {/* User & Skin Identity */}
            <div className="flex items-center justify-between text-xs px-1">
              <div>
                <p className="text-[11px] text-zinc-500">Игрок</p>
                <p className="font-bold text-white tracking-wide">
                  {session ? session.user.mcUsername : 'Гость'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-zinc-500">Скин</p>
                <p className="font-semibold text-zinc-300 truncate max-w-[120px]">
                  {skinDisplayName}
                </p>
              </div>
            </div>

            {/* Kill Game Button */}
            <button
              type="button"
              onClick={onKill}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600/90 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer press-feedback transition-all duration-150 border border-rose-500/30 group"
              title="Принудительно закрыть процесс Minecraft"
            >
              <Square size={14} className="fill-white group-hover:scale-110 transition-transform" />
              <span>Остановить игру</span>
            </button>
          </div>
        </div>

        {/* Right Column (/ flex-1): Download Progress (if updating) + Full-Height Live Console */}
        <div className="flex flex-col gap-4 overflow-hidden h-full min-h-0">
          {/* Synchronizing Progress Bar (shown when updating) */}
          {launchState.status === 'updating' && downloadProgress && (
            <div className="rounded-2xl bg-surface-900 p-4 border border-surface-border/70 space-y-2.5 shadow-xl shrink-0 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-medium truncate flex items-center gap-2">
                  <RotateCw size={13} className="animate-spin text-[#bb74ff] shrink-0" />
                  <span className="truncate">{downloadProgress.stageLabel}</span>
                </span>
                <span className="text-[#bb74ff] font-mono font-bold text-sm">
                  {downloadProgress.progressPercent}%
                </span>
              </div>

              <div className="w-full h-2 bg-surface-950 rounded-full overflow-hidden border border-surface-border/80">
                <div
                  className="h-full w-full origin-left bg-[#bb74ff] transition-transform duration-200 rounded-full"
                  style={{ transform: `scaleX(${Math.max(0, Math.min(100, downloadProgress.progressPercent)) / 100})` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                {downloadProgress.currentFile ? (
                  <span className="truncate max-w-[320px] text-zinc-300">
                    {downloadProgress.currentFile}
                  </span>
                ) : (
                  <span>Синхронизация файлов сборки...</span>
                )}
                {downloadProgress.speedBps > 0 && (
                  <span className="text-zinc-200 font-bold bg-surface-850 px-2 py-0.5 rounded border border-surface-border">
                    {formatSpeed(downloadProgress.speedBps)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Full-Height Live Terminal Console Stream */}
          <div className="flex-1 flex flex-col rounded-2xl bg-surface-950 border border-surface-border/70 overflow-hidden shadow-xl min-h-0">
            {/* Terminal Header Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-900/90 border-b border-surface-border/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <Terminal size={14} className="text-[#bb74ff]" />
                <span className="text-xs font-bold text-white tracking-wide">
                  Консоль процесса
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  ({logs.length} строк)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer press-feedback ${
                    autoScroll
                      ? 'bg-surface-800 text-[#bb74ff] border-[#bb74ff]/30'
                      : 'bg-surface-900 text-zinc-500 border-transparent hover:text-white'
                  }`}
                  title={autoScroll ? 'Автопрокрутка включена' : 'Включить автопрокрутку'}
                >
                  <ArrowDownCircle size={13} />
                  <span className="hidden sm:inline">Автоскролл</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLogs}
                  disabled={!logs || logs.length === 0}
                  className="p-1.5 rounded-lg bg-surface-900 hover:bg-surface-800 text-zinc-400 hover:text-white border border-transparent hover:border-surface-border transition-colors cursor-pointer press-feedback disabled:opacity-30"
                  title="Скопировать логи в буфер обмена"
                >
                  {copiedLogs ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>

                {onClearLogs && (
                  <button
                    type="button"
                    onClick={onClearLogs}
                    disabled={!logs || logs.length === 0}
                    className="p-1.5 rounded-lg bg-surface-900 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer press-feedback disabled:opacity-30"
                    title="Очистить консоль"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Live Monospace Terminal Logs */}
            <div className="flex-1 bg-surface-950 p-3 sm:p-4 font-mono text-[11px] overflow-y-auto space-y-1 select-text scrollbar-thin min-h-0">
              {!logs || logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
                  <span>Ожидание вывода Minecraft...</span>
                </div>
              ) : (
                logs.slice(-500).map((log) => (
                  <div
                    key={log.id}
                    className="leading-relaxed hover:bg-surface-900/60 px-1.5 py-0.5 rounded flex items-start gap-2"
                  >
                    <span className="text-zinc-600 shrink-0 select-none text-[10px]">
                      [{log.timestamp}]
                    </span>
                    <span className="text-[#bb74ff]/80 shrink-0 font-bold text-[9px] uppercase">
                      [{log.source}]
                    </span>
                    <span className={`break-all ${getLogLevelClass(log.level)}`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsBottomRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
