import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, Download, Search, AlertCircle, ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import { LogEntry } from '@quiby/shared';

interface ConsoleViewProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({ logs, onClearLogs }) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.source.toUpperCase()}/${l.level.toUpperCase()}]: ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiby-game-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogLevelClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-400 font-semibold';
      case 'warn':
        return 'text-amber-400 font-medium';
      case 'debug':
        return 'text-cyan-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Terminal className="text-emerald-400" />
            <span>Консоль логов</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Вывод отладочных сообщений Minecraft 1.21.1 NeoForge и диагностика модов
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              autoScroll
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-quiby-panel text-slate-400 border-quiby-border'
            }`}
          >
            <ArrowDownCircle size={14} />
            <span>Автопрокрутка</span>
          </button>

          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-quiby-panel hover:bg-quiby-panel/80 disabled:opacity-40 border border-quiby-border text-xs text-slate-300 transition-colors"
          >
            <Download size={14} />
            <span>Экспорт</span>
          </button>

          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 border border-red-500/30 text-xs text-red-400 transition-colors"
          >
            <Trash2 size={14} />
            <span>Очистить</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterLevel('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              filterLevel === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-quiby-panel text-slate-400 hover:text-white border border-quiby-border'
            }`}
          >
            Все ({logs.length})
          </button>
          <button
            onClick={() => setFilterLevel('error')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              filterLevel === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-quiby-panel text-red-400 border border-quiby-border'
            }`}
          >
            Ошибки ({logs.filter(l => l.level === 'error').length})
          </button>
          <button
            onClick={() => setFilterLevel('warn')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              filterLevel === 'warn'
                ? 'bg-amber-500 text-quiby-dark font-bold'
                : 'bg-quiby-panel text-amber-400 border border-quiby-border'
            }`}
          >
            Предупреждения ({logs.filter(l => l.level === 'warn').length})
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по логам..."
            className="w-full bg-quiby-panel border border-quiby-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>
      </div>

      {/* Terminal Output Box */}
      <div className="flex-1 bg-black/80 border border-quiby-border rounded-2xl p-4 font-mono text-xs overflow-y-auto space-y-1.5 shadow-inner">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600">
            <span>Логи отсутствуют. Запустите игру для просмотра вывода процесса.</span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="leading-relaxed hover:bg-white/5 px-2 py-0.5 rounded flex items-start gap-2">
              <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
              <span className="text-slate-400 shrink-0 font-bold uppercase text-[10px]">[{log.source}]</span>
              <span className={`break-all ${getLogLevelClass(log.level)}`}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
