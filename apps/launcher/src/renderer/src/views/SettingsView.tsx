import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  HardDrive, 
  Cpu, 
  Folder, 
  CheckCircle, 
  RefreshCw, 
  FolderOpen, 
  Save, 
  Terminal,
  Download,
  Trash2
} from 'lucide-react';
import { LauncherSettings, LogEntry } from '@quiby/shared';

interface SettingsViewProps {
  settings: LauncherSettings;
  logs: LogEntry[];
  onSaveSettings: (newSettings: LauncherSettings) => void;
  onClearLogs: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings: initialSettings,
  logs,
  onSaveSettings,
  onClearLogs,
}) => {
  const [settings, setSettings] = useState<LauncherSettings>(initialSettings);
  const [totalRamGb, setTotalRamGb] = useState(16);
  const [javaList, setJavaList] = useState<any[]>([]);
  const [detectingJava, setDetectingJava] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings(initialSettings);
    handleDetectJava();
  }, [initialSettings]);

  const handleDetectJava = async () => {
    setDetectingJava(true);
    try {
      const res = await window.quibyApi?.detectJava();
      if (res) {
        setJavaList(res.installations || []);
        if (res.totalRamMb) {
          setTotalRamGb(Math.round(res.totalRamMb / 1024));
        }
      }
    } catch (_) {}
    finally {
      setDetectingJava(false);
    }
  };

  const handleBrowseJava = async () => {
    const selected = await window.quibyApi?.selectJavaPath();
    if (selected) {
      setSettings(prev => ({ ...prev, javaPath: selected }));
    }
  };

  const handleBrowseGameDir = async () => {
    const selected = await window.quibyApi?.selectGameDir();
    if (selected) {
      setSettings(prev => ({ ...prev, gameDir: selected }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(settings);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleExportLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.source.toUpperCase()}/${l.level.toUpperCase()}]: ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiby-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ramGb = Math.round(settings.ramMaxMb / 1024);

  return (
    <form onSubmit={handleSave} className="flex-1 flex flex-col h-full overflow-y-auto p-8 space-y-6 select-none z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Sliders className="text-quiby-purpleLight" />
            <span>Настройки лаунчера</span>
          </h2>
          <p className="text-xs text-quiby-textMuted font-mono mt-0.5">
            Оперативная память, Java 21 и параметры запуска
          </p>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Save size={14} />
          <span>{savedNotice ? 'Сохранено!' : 'Сохранить'}</span>
        </button>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-2xl bg-quiby-purple/15 border border-quiby-purple/30 text-quiby-purpleLight text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle size={15} />
          <span>Настройки успешно применены!</span>
        </div>
      )}

      {/* 1. RAM Slider */}
      <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <HardDrive size={16} className="text-quiby-purpleLight" />
            <span>Оперативная память (RAM)</span>
          </div>
          <span className="px-3.5 py-1 rounded-full bg-onyx-850 font-mono text-xs font-bold text-quiby-purpleLight border border-onyx-border">
            {ramGb} ГБ ({settings.ramMaxMb} МБ)
          </span>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min={4}
            max={Math.max(totalRamGb, 16)}
            step={1}
            value={ramGb}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setSettings(prev => ({
                ...prev,
                ramMaxMb: val * 1024,
                ramMinMb: Math.min(prev.ramMinMb, val * 1024),
              }));
            }}
            className="w-full accent-quiby-purple cursor-pointer h-2 bg-onyx-800 rounded-lg"
          />

          <div className="flex justify-between text-[11px] text-quiby-textDim font-mono">
            <span>4 ГБ (Минимум)</span>
            <span className="text-quiby-purpleLight font-bold">8 ГБ (Рекомендуется для Create)</span>
            <span>{Math.max(totalRamGb, 16)} ГБ (Макс)</span>
          </div>
        </div>
      </div>

      {/* 2. Java 21 */}
      <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Cpu size={16} className="text-quiby-purpleLight" />
            <span>Исполняемая среда Java 21</span>
          </div>
          <button
            type="button"
            onClick={handleDetectJava}
            disabled={detectingJava}
            className="flex items-center gap-1.5 text-xs text-quiby-textMuted hover:text-white px-3 py-1 rounded-full bg-onyx-850 border border-onyx-border transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={detectingJava ? 'animate-spin' : ''} />
            <span>Автопоиск</span>
          </button>
        </div>

        <div className="space-y-3">
          {javaList.length > 0 && (
            <select
              value={settings.javaPath}
              onChange={(e) => setSettings(prev => ({ ...prev, javaPath: e.target.value }))}
              className="w-full bg-onyx-850 border border-onyx-border rounded-2xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-quiby-purple"
            >
              {javaList.map((j, idx) => (
                <option key={idx} value={j.path}>
                  {j.versionString} (Java {j.version}) — {j.path}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={settings.javaPath}
              onChange={(e) => setSettings(prev => ({ ...prev, javaPath: e.target.value }))}
              placeholder="java или /usr/bin/java"
              className="flex-1 bg-onyx-850 border border-onyx-border rounded-2xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-quiby-purple"
            />
            <button
              type="button"
              onClick={handleBrowseJava}
              className="px-4 py-2 rounded-2xl bg-onyx-850 hover:bg-onyx-800 border border-onyx-border text-xs text-quiby-text hover:text-white transition-colors"
            >
              Обзор...
            </button>
          </div>
        </div>
      </div>

      {/* 3. Game Directory */}
      <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-white font-bold text-xs">
          <Folder size={16} className="text-quiby-purpleLight" />
          <span>Папка с игрой</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={settings.gameDir}
            onChange={(e) => setSettings(prev => ({ ...prev, gameDir: e.target.value }))}
            className="flex-1 bg-onyx-850 border border-onyx-border rounded-2xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-quiby-purple truncate"
          />
          <button
            type="button"
            onClick={handleBrowseGameDir}
            className="px-4 py-2 rounded-2xl bg-onyx-850 hover:bg-onyx-800 border border-onyx-border text-xs text-quiby-text hover:text-white transition-colors"
          >
            Обзор
          </button>
          <button
            type="button"
            onClick={() => window.quibyApi?.openPath(settings.gameDir)}
            className="p-2 rounded-2xl bg-onyx-850 hover:bg-onyx-800 border border-onyx-border text-quiby-text hover:text-white transition-colors"
            title="Открыть папку"
          >
            <FolderOpen size={16} />
          </button>
        </div>
      </div>

      {/* 4. Logs Console Accordion */}
      <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 text-white font-bold text-xs hover:text-quiby-purpleLight transition-colors"
          >
            <Terminal size={16} className="text-quiby-purpleLight" />
            <span>Консоль логов игры ({logs.length} строк)</span>
            <span className="text-[10px] text-quiby-textDim font-mono">[{showLogs ? 'Скрыть' : 'Показать'}]</span>
          </button>

          {showLogs && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportLogs}
                disabled={logs.length === 0}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-onyx-850 border border-onyx-border text-[11px] text-white hover:bg-onyx-800 disabled:opacity-30"
              >
                <Download size={12} />
                <span>Экспорт</span>
              </button>
              <button
                type="button"
                onClick={onClearLogs}
                disabled={logs.length === 0}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-onyx-850 border border-onyx-border text-[11px] text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
              >
                <Trash2 size={12} />
                <span>Очистить</span>
              </button>
            </div>
          )}
        </div>

        {showLogs && (
          <div className="h-56 bg-black/90 rounded-2xl p-3.5 font-mono text-[11px] overflow-y-auto space-y-1 select-text border border-onyx-border">
            {logs.length === 0 ? (
              <div className="text-quiby-textDim text-center py-16">Логи отсутствуют.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="leading-relaxed hover:bg-white/[0.04] px-1.5 py-0.5 rounded flex items-start gap-2">
                  <span className="text-quiby-textDim shrink-0">[{log.timestamp}]</span>
                  <span className="text-quiby-purpleLight shrink-0">[{log.source}]</span>
                  <span className={`break-all ${log.level === 'error' ? 'text-rose-400 font-bold' : log.level === 'warn' ? 'text-amber-400' : 'text-quiby-text'}`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </form>
  );
};
