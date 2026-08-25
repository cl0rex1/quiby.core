import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, Download, Search, ArrowDownCircle, X } from 'lucide-react';
import { LogEntry } from '@quiby/shared';

interface ConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const ConsoleModal: React.FC<ConsoleModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isOpen]);

  if (!isOpen) return null;

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
        return 'text-quiby-purpleLight';
      default:
        return 'text-quiby-text';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="bg-quiby-bg border border-quiby-border rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-quiby-border/80 bg-quiby-card/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-quiby-purple/15 flex items-center justify-center text-quiby-purpleLight">
              <Terminal size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Консоль отладки и логов</h3>
              <p className="text-xs text-quiby-textMuted font-mono">
                Вывод процессов Minecraft 1.21.1 NeoForge и Create
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                autoScroll
                  ? 'bg-quiby-purple/20 text-quiby-purpleLight border-quiby-purple/40'
                  : 'bg-quiby-card text-quiby-textMuted border-quiby-border'
              }`}
            >
              <ArrowDownCircle size={14} />
              <span>Автопрокрутка</span>
            </button>

            <button
              onClick={handleExport}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-quiby-card hover:bg-quiby-cardHover disabled:opacity-30 border border-quiby-border text-xs font-bold text-white transition-all"
            >
              <Download size={13} />
              <span>Экспорт</span>
            </button>

            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-quiby-card hover:bg-red-500/20 disabled:opacity-30 border border-quiby-border text-xs text-quiby-textMuted hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
              <span>Очистить</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-quiby-card hover:bg-white/10 text-quiby-textMuted hover:text-white border border-quiby-border transition-colors ml-2"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-4 border-b border-quiby-border/60 bg-quiby-surface/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterLevel('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filterLevel === 'all'
                  ? 'bg-quiby-purple text-white shadow-neon-purple'
                  : 'bg-quiby-card text-quiby-textMuted hover:text-white border border-quiby-border'
              }`}
            >
              Все ({logs.length})
            </button>
            <button
              onClick={() => setFilterLevel('error')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filterLevel === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-quiby-card text-red-400 border border-quiby-border'
              }`}
            >
              Ошибки ({logs.filter(l => l.level === 'error').length})
            </button>
            <button
              onClick={() => setFilterLevel('warn')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filterLevel === 'warn'
                  ? 'bg-amber-400 text-black'
                  : 'bg-quiby-card text-amber-400 border border-quiby-border'
              }`}
            >
              Предупреждения ({logs.filter(l => l.level === 'warn').length})
            </button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3.5 top-2.5 text-quiby-textMuted" size={13} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по логам..."
              className="w-full bg-quiby-card border border-quiby-border rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-quiby-textMuted focus:outline-none focus:border-quiby-purple font-mono"
            />
          </div>
        </div>

        {/* Terminal Content Output */}
        <div className="flex-1 bg-black/90 p-4 font-mono text-xs overflow-y-auto space-y-1 select-text">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-quiby-textDim">
              <span>Логи отсутствуют. Запустите игру для просмотра вывода процесса.</span>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="leading-relaxed hover:bg-white/[0.04] px-2 py-0.5 rounded flex items-start gap-2">
                <span className="text-quiby-textDim shrink-0 select-none">[{log.timestamp}]</span>
                <span className="text-quiby-purpleLight shrink-0 font-bold text-[10px]">[{log.source}]</span>
                <span className={`break-all ${getLogLevelClass(log.level)}`}>{log.message}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};
