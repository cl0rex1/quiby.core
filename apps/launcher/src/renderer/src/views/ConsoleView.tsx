import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, Download, Search, ArrowDownCircle } from 'lucide-react';
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
        return 'text-x-purpleLight';
      default:
        return 'text-x-text';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-black p-5 space-y-4 select-none">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Terminal className="text-x-purpleLight" />
            <span>Консоль логов</span>
          </h2>
          <p className="text-xs text-x-textMuted mt-0.5">
            Отладочные сообщения Minecraft 1.21.1 NeoForge и Create Aeronautics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
              autoScroll
                ? 'bg-x-purple/20 text-x-purpleLight border-x-purple/40'
                : 'bg-x-surface text-x-textMuted border-x-border'
            }`}
          >
            <ArrowDownCircle size={14} />
            <span>Автопрокрутка</span>
          </button>

          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-30 text-black text-xs font-bold transition-all shadow-sm"
          >
            <Download size={13} />
            <span>Экспорт</span>
          </button>

          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-x-surface hover:bg-red-500/20 disabled:opacity-30 border border-x-border text-xs text-x-textMuted hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
            <span>Очистить</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterLevel('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              filterLevel === 'all'
                ? 'bg-white text-black'
                : 'bg-x-surface text-x-textMuted hover:text-white border border-x-border'
            }`}
          >
            Все ({logs.length})
          </button>
          <button
            onClick={() => setFilterLevel('error')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              filterLevel === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-x-surface text-red-400 border border-x-border'
            }`}
          >
            Ошибки ({logs.filter(l => l.level === 'error').length})
          </button>
          <button
            onClick={() => setFilterLevel('warn')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              filterLevel === 'warn'
                ? 'bg-amber-400 text-black'
                : 'bg-x-surface text-amber-400 border border-x-border'
            }`}
          >
            Предупреждения ({logs.filter(l => l.level === 'warn').length})
          </button>
        </div>

        <div className="relative w-60">
          <Search className="absolute left-3.5 top-2.5 text-x-textMuted" size={13} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по логам..."
            className="w-full bg-x-surface border border-x-border rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-x-textMuted focus:outline-none focus:border-x-purple font-mono"
          />
        </div>
      </div>

      {/* Terminal Box */}
      <div className="flex-1 bg-x-surface border border-x-border rounded-2xl p-4 font-mono text-xs overflow-y-auto space-y-1 shadow-inner">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-x-textDim">
            <span>Логи отсутствуют. Запустите игру для просмотра вывода процесса.</span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="leading-relaxed hover:bg-white/[0.04] px-2 py-0.5 rounded flex items-start gap-2">
              <span className="text-x-textDim shrink-0 select-none">[{log.timestamp}]</span>
              <span className="text-x-purpleLight shrink-0 font-bold text-[10px]">[{log.source}]</span>
              <span className={`break-all ${getLogLevelClass(log.level)}`}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
