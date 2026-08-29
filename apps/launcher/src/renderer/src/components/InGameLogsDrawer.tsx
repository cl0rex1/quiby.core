import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Trash2, 
  ArrowDownCircle, 
  ChevronDown, 
  ChevronUp, 
  Activity 
} from 'lucide-react';
import { LogEntry } from '@quiby/shared';

interface InGameLogsDrawerProps {
  logs: LogEntry[];
  gamePid?: number;
  onClearLogs: () => void;
}

export const InGameLogsDrawer: React.FC<InGameLogsDrawerProps> = ({
  logs,
  gamePid,
  onClearLogs,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && !isCollapsed) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isCollapsed]);

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.source.toUpperCase()}/${l.level.toUpperCase()}]: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLogLevelClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-rose-400 font-semibold';
      case 'warn':
        return 'text-amber-400 font-medium';
      case 'debug':
        return 'text-purple-300';
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <div
      className={`fixed right-8 z-30 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none animate-in fade-in slide-in-from-bottom-3 duration-300 ${
        isCollapsed
          ? 'bottom-[84px] w-80 h-11'
          : 'bottom-[84px] w-[520px] max-w-[calc(100vw-360px)] h-[320px]'
      }`}
    >
      <div className="flex-1 flex flex-col bg-zinc-950/95 border border-white/15 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs font-bold text-white tracking-wide apple-subheading truncate">
              Консоль процесса
            </span>
            {gamePid && (
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-400 shrink-0">
                PID: {gamePid}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Auto-scroll toggle */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer press-feedback ${
                  autoScroll
                    ? 'bg-zinc-800 text-emerald-400 border-emerald-400/30'
                    : 'bg-zinc-900 text-zinc-500 border-transparent hover:text-white'
                }`}
                title={autoScroll ? 'Автопрокрутка включена' : 'Включить автопрокрутку'}
              >
                <ArrowDownCircle size={13} />
              </button>
            )}

            {/* Copy Logs */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={handleCopyLogs}
                disabled={logs.length === 0}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-transparent hover:border-white/10 transition-colors cursor-pointer press-feedback disabled:opacity-30"
                title="Скопировать вывод в буфер обмена"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            )}

            {/* Clear Logs */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={onClearLogs}
                disabled={logs.length === 0}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer press-feedback disabled:opacity-30"
                title="Очистить лог"
              >
                <Trash2 size={13} />
              </button>
            )}

            {/* Collapse/Expand */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-transparent hover:border-white/10 transition-colors cursor-pointer press-feedback ml-1"
              title={isCollapsed ? 'Развернуть консоль' : 'Свернуть консоль'}
            >
              {isCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Live Terminal Stream Output */}
        {!isCollapsed && (
          <div className="flex-1 bg-black/90 p-3.5 font-mono text-[11px] overflow-y-auto space-y-1 select-text scrollbar-thin">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 text-[11px]">
                <span>Ожидание вывода stdout/stderr игры...</span>
              </div>
            ) : (
              logs.slice(-250).map((log) => (
                <div
                  key={log.id}
                  className="leading-relaxed hover:bg-white/[0.03] px-1.5 py-0.5 rounded flex items-start gap-2"
                >
                  <span className="text-zinc-600 shrink-0 select-none text-[10px]">
                    [{log.timestamp}]
                  </span>
                  <span className="text-purple-400/80 shrink-0 font-bold text-[9px] uppercase">
                    [{log.source}]
                  </span>
                  <span className={`break-all ${getLogLevelClass(log.level)}`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
};
