import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Cpu, 
  Folder, 
  RefreshCw, 
  FolderOpen, 
  Monitor 
} from 'lucide-react';
import { LauncherSettings } from '@quiby/shared';
import { RamSlider } from '../components/RamSlider';

interface SettingsViewProps {
  settings: LauncherSettings;
  onUpdateSettings: (newSettings: LauncherSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [totalRamGb, setTotalRamGb] = useState(16);
  const [javaList, setJavaList] = useState<any[]>([]);
  const [detectingJava, setDetectingJava] = useState(false);

  useEffect(() => {
    handleDetectJava();
  }, []);

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
      onUpdateSettings({ ...settings, javaPath: selected });
    }
  };

  const handleBrowseGameDir = async () => {
    const selected = await window.quibyApi?.selectGameDir();
    if (selected) {
      onUpdateSettings({ ...settings, gameDir: selected });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-8 space-y-6 select-none z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Sliders className="text-quiby-purpleLight" />
            <span>Настройки лаунчера</span>
          </h2>
          <p className="text-xs text-quiby-textMuted font-mono mt-0.5">
            Память RAM, среда Java 21 и параметры запуска
          </p>
        </div>
      </div>

      {/* 1. Interactive RAM Memory Slider */}
      <RamSlider
        ramMb={settings.ramMaxMb}
        totalSystemRamGb={totalRamGb}
        onChange={(ramMb) => {
          onUpdateSettings({
            ...settings,
            ramMaxMb: ramMb,
            ramMinMb: Math.min(settings.ramMinMb, ramMb),
          });
        }}
      />

      {/* 2. Java 21 Runtime */}
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
              onChange={(e) => onUpdateSettings({ ...settings, javaPath: e.target.value })}
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
              onChange={(e) => onUpdateSettings({ ...settings, javaPath: e.target.value })}
              placeholder="java или /usr/bin/java"
              className="flex-1 bg-onyx-850 border border-onyx-border rounded-2xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-quiby-purple"
            />
            <button
              type="button"
              onClick={handleBrowseJava}
              className="px-4 py-2 rounded-2xl bg-onyx-850 hover:bg-onyx-800 border border-onyx-border text-xs text-quiby-text hover:text-white transition-colors cursor-pointer"
            >
              Обзор...
            </button>
          </div>
        </div>
      </div>

      {/* 3. Game Directory & Resolution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Directory */}
        <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Folder size={16} className="text-quiby-purpleLight" />
            <span>Папка с игрой</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={settings.gameDir}
              onChange={(e) => onUpdateSettings({ ...settings, gameDir: e.target.value })}
              className="flex-1 bg-onyx-850 border border-onyx-border rounded-2xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-quiby-purple truncate"
            />
            <button
              type="button"
              onClick={handleBrowseGameDir}
              className="px-4 py-2 rounded-2xl bg-onyx-850 hover:bg-onyx-800 border border-onyx-border text-xs text-quiby-text hover:text-white transition-colors cursor-pointer"
            >
              Обзор
            </button>
            <button
              type="button"
              onClick={() => window.quibyApi?.openPath(settings.gameDir)}
              className="p-2 rounded-2xl bg-onyx-850 hover:bg-onyx-800 border border-onyx-border text-quiby-text hover:text-white transition-colors cursor-pointer"
              title="Открыть папку"
            >
              <FolderOpen size={16} />
            </button>
          </div>
        </div>

        {/* Resolution */}
        <div className="bg-onyx-900/60 border border-onyx-border rounded-3xl p-6 space-y-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Monitor size={16} className="text-quiby-purpleLight" />
            <span>Разрешение окна</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={settings.windowWidth}
                onChange={(e) => onUpdateSettings({ ...settings, windowWidth: parseInt(e.target.value, 10) || 1280 })}
                className="w-20 bg-onyx-850 border border-onyx-border rounded-2xl px-2.5 py-2 text-xs text-white font-mono text-center"
              />
              <span className="text-quiby-textDim">×</span>
              <input
                type="number"
                value={settings.windowHeight}
                onChange={(e) => onUpdateSettings({ ...settings, windowHeight: parseInt(e.target.value, 10) || 720 })}
                className="w-20 bg-onyx-850 border border-onyx-border rounded-2xl px-2.5 py-2 text-xs text-white font-mono text-center"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-quiby-textMuted cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={settings.fullscreen}
                onChange={(e) => onUpdateSettings({ ...settings, fullscreen: e.target.checked })}
                className="rounded accent-quiby-purple"
              />
              <span>Полноэкранный</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
