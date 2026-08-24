import React, { useState, useEffect } from 'react';
import { Sliders, HardDrive, Cpu, Folder, Monitor, CheckCircle, RefreshCw, FolderOpen, Save } from 'lucide-react';
import { LauncherSettings } from '@quiby/shared';

interface SettingsViewProps {
  settings: LauncherSettings;
  onSaveSettings: (newSettings: LauncherSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings: initialSettings, onSaveSettings }) => {
  const [settings, setSettings] = useState<LauncherSettings>(initialSettings);
  const [totalRamGb, setTotalRamGb] = useState(16);
  const [javaList, setJavaList] = useState<any[]>([]);
  const [detectingJava, setDetectingJava] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setSettings(initialSettings);
    handleDetectJava();
  }, [initialSettings]);

  const handleDetectJava = async () => {
    setDetectingJava(true);
    try {
      const res = await window.quibyApi.detectJava();
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
    const selected = await window.quibyApi.selectJavaPath();
    if (selected) {
      setSettings(prev => ({ ...prev, javaPath: selected }));
    }
  };

  const handleBrowseGameDir = async () => {
    const selected = await window.quibyApi.selectGameDir();
    if (selected) {
      setSettings(prev => ({ ...prev, gameDir: selected }));
    }
  };

  const handleOpenFolder = (dir: string) => {
    window.quibyApi.openPath(dir);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(settings);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const ramGb = Math.round(settings.ramMaxMb / 1024);

  return (
    <form onSubmit={handleSave} className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Sliders className="text-emerald-400" />
            <span>Настройки лаунчера и игры</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Конфигурация оперативной памяти, среды Java 21, разрешения экрана и параметров сборки
          </p>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-quiby-dark font-bold text-sm shadow-glow-green transition-all"
        >
          <Save size={16} />
          <span>{savedNotice ? 'Сохранено!' : 'Сохранить'}</span>
        </button>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle size={15} />
          <span>Настройки успешно сохранены в профиле!</span>
        </div>
      )}

      {/* 1. RAM Allocation Card */}
      <div className="bg-quiby-card border border-quiby-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <HardDrive size={18} className="text-emerald-400" />
            <span>Выделение оперативной памяти (RAM)</span>
          </div>
          <span className="px-3 py-1 rounded-lg bg-quiby-panel font-mono text-sm font-extrabold text-emerald-400 border border-quiby-border">
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
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-quiby-panel rounded-lg"
          />

          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>4 ГБ (Минимум)</span>
            <span className="text-emerald-400 font-bold">8 ГБ (Рекомендуется для Create)</span>
            <span>{Math.max(totalRamGb, 16)} ГБ (Макс)</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Для плавной работы Minecraft 1.21.1 NeoForge со сложными дирижаблями и механизмами Create Aeronautics рекомендуется выделить от 6 до 8 ГБ RAM.
        </p>
      </div>

      {/* 2. Java Runtime Card */}
      <div className="bg-quiby-card border border-quiby-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Cpu size={18} className="text-cyan-400" />
            <span>Исполняемая среда Java 21</span>
          </div>
          <button
            type="button"
            onClick={handleDetectJava}
            disabled={detectingJava}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-quiby-panel border border-quiby-border transition-colors"
          >
            <RefreshCw size={12} className={detectingJava ? 'animate-spin' : ''} />
            <span>Автопоиск Java</span>
          </button>
        </div>

        <div className="space-y-3">
          {javaList.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Обнаруженные версии Java в системе:
              </label>
              <select
                value={settings.javaPath}
                onChange={(e) => setSettings(prev => ({ ...prev, javaPath: e.target.value }))}
                className="w-full bg-quiby-panel border border-quiby-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {javaList.map((j, idx) => (
                  <option key={idx} value={j.path}>
                    {j.versionString} (Java {j.version}) — {j.path} {j.isCompatible ? '✅ Рекомендуется' : '⚠️ Требуется Java 21+'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Или укажите путь к исполняемому файлу вручную:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings.javaPath}
                onChange={(e) => setSettings(prev => ({ ...prev, javaPath: e.target.value }))}
                placeholder="java или /usr/bin/java или C:\Program Files\Java\bin\javaw.exe"
                className="flex-1 bg-quiby-panel border border-quiby-border rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleBrowseJava}
                className="px-3 py-2 rounded-xl bg-quiby-panel hover:bg-quiby-panel/80 border border-quiby-border text-xs text-slate-300 transition-colors"
              >
                Обзор...
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Game Directory & Display Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Directory */}
        <div className="bg-quiby-card border border-quiby-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Folder size={18} className="text-amber-400" />
            <span>Папка с модами и игрой</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={settings.gameDir}
              onChange={(e) => setSettings(prev => ({ ...prev, gameDir: e.target.value }))}
              className="flex-1 bg-quiby-panel border border-quiby-border rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 truncate"
            />
            <button
              type="button"
              onClick={handleBrowseGameDir}
              className="px-3 py-2 rounded-xl bg-quiby-panel hover:bg-quiby-panel/80 border border-quiby-border text-xs text-slate-300 transition-colors"
            >
              Обзор
            </button>
            <button
              type="button"
              onClick={() => handleOpenFolder(settings.gameDir)}
              title="Открыть папку"
              className="p-2 rounded-xl bg-quiby-panel hover:bg-quiby-panel/80 border border-quiby-border text-slate-300 transition-colors"
            >
              <FolderOpen size={16} />
            </button>
          </div>
        </div>

        {/* Display Resolution */}
        <div className="bg-quiby-card border border-quiby-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Monitor size={18} className="text-purple-400" />
            <span>Разрешение окна игры</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.windowWidth}
                onChange={(e) => setSettings(prev => ({ ...prev, windowWidth: parseInt(e.target.value, 10) || 1280 }))}
                className="w-24 bg-quiby-panel border border-quiby-border rounded-xl px-3 py-1.5 text-xs text-white font-mono text-center"
              />
              <span className="text-slate-500">×</span>
              <input
                type="number"
                value={settings.windowHeight}
                onChange={(e) => setSettings(prev => ({ ...prev, windowHeight: parseInt(e.target.value, 10) || 720 }))}
                className="w-24 bg-quiby-panel border border-quiby-border rounded-xl px-3 py-1.5 text-xs text-white font-mono text-center"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={settings.fullscreen}
                onChange={(e) => setSettings(prev => ({ ...prev, fullscreen: e.target.checked }))}
                className="rounded accent-emerald-500"
              />
              <span>Полноэкранный</span>
            </label>
          </div>
        </div>
      </div>

      {/* 4. Custom JVM Flags */}
      <div className="bg-quiby-card border border-quiby-border rounded-2xl p-5 space-y-3 shadow-sm">
        <label className="block text-sm font-bold text-white">
          Пользовательские JVM флаги и аргументы (опционально):
        </label>
        <textarea
          rows={2}
          value={settings.customJvmArgs}
          onChange={(e) => setSettings(prev => ({ ...prev, customJvmArgs: e.target.value }))}
          placeholder="-XX:+UseG1GC -Dforge.forceNoStencil=true"
          className="w-full bg-quiby-panel border border-quiby-border rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
        />
      </div>
    </form>
  );
};
