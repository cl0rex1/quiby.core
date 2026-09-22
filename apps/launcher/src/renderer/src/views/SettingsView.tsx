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
      {/* Header with Apple Typography */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 apple-heading">
            <Sliders className="text-zinc-400" size={22} />
            <span>Настройки лаунчера</span>
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5 apple-body">
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

      {/* 2. Java 21 Runtime Card (macOS Settings Group Style) */}
      <div className="surface-panel rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Cpu size={16} className="text-zinc-400" />
            <span className="apple-subheading">Исполняемая среда Java 21</span>
          </div>
          <button
            type="button"
            onClick={handleDetectJava}
            disabled={detectingJava}
            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-3 py-1 rounded-full bg-zinc-850 border border-white/10 hover:border-white/20 transition-colors cursor-pointer press-feedback shadow-sm"
          >
            <RefreshCw size={12} className={detectingJava ? 'animate-spin' : ''} />
            <span className="apple-body">Автопоиск</span>
          </button>
        </div>

        <div className="space-y-3">
          {javaList.length > 0 && (
            <select
              value={settings.javaPath}
              onChange={(e) => onUpdateSettings({ ...settings, javaPath: e.target.value })}
              className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer transition-colors backdrop-blur-md"
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
              className="flex-1 bg-zinc-900/90 border border-white/10 focus:border-white/30 rounded-2xl px-4 py-2 text-xs text-white font-mono focus:outline-none transition-colors backdrop-blur-md"
            />
            <button
              type="button"
              onClick={handleBrowseJava}
              className="px-4 py-2 rounded-2xl bg-zinc-850 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer press-feedback shadow-sm"
            >
              Обзор...
            </button>
          </div>
        </div>
      </div>

      {/* 3. Game Directory & Resolution Group */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Directory */}
        <div className="surface-panel rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Folder size={16} className="text-zinc-400" />
            <span className="apple-subheading">Папка с игрой</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={settings.gameDir}
              onChange={(e) => onUpdateSettings({ ...settings, gameDir: e.target.value })}
              className="flex-1 bg-zinc-900/90 border border-white/10 focus:border-white/30 rounded-2xl px-4 py-2 text-xs text-white font-mono focus:outline-none truncate transition-colors backdrop-blur-md"
            />
            <button
              type="button"
              onClick={handleBrowseGameDir}
              className="px-4 py-2 rounded-2xl bg-zinc-850 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer press-feedback shadow-sm"
            >
              Обзор
            </button>
            <button
              type="button"
              onClick={() => window.quibyApi?.openPath(settings.gameDir)}
              className="p-2 rounded-2xl bg-zinc-850 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer press-feedback shadow-sm"
              title="Открыть папку"
            >
              <FolderOpen size={16} />
            </button>
          </div>
        </div>

        {/* Resolution */}
        <div className="surface-panel rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Monitor size={16} className="text-zinc-400" />
            <span className="apple-subheading">Разрешение окна</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={settings.windowWidth}
                onChange={(e) => onUpdateSettings({ ...settings, windowWidth: parseInt(e.target.value, 10) || 1280 })}
                className="w-20 bg-zinc-900/90 border border-white/10 focus:border-white/30 rounded-2xl px-2.5 py-2 text-xs text-white font-mono text-center transition-colors backdrop-blur-md"
              />
              <span className="text-zinc-500">×</span>
              <input
                type="number"
                value={settings.windowHeight}
                onChange={(e) => onUpdateSettings({ ...settings, windowHeight: parseInt(e.target.value, 10) || 720 })}
                className="w-20 bg-zinc-900/90 border border-white/10 focus:border-white/30 rounded-2xl px-2.5 py-2 text-xs text-white font-mono text-center transition-colors backdrop-blur-md"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer ml-auto hover:text-white transition-colors press-feedback">
              <input
                type="checkbox"
                checked={settings.fullscreen}
                onChange={(e) => onUpdateSettings({ ...settings, fullscreen: e.target.checked })}
                className="rounded accent-white cursor-pointer"
              />
              <span className="apple-body">Полноэкранный</span>
            </label>
          </div>
        </div>
      </div>

      {/* 5. Presets & Fast-Connect Group */}
      <div className="surface-panel rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Monitor size={16} className="text-purple-400" />
            <span className="apple-subheading">Быстрые пресеты графики и сборки</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              onUpdateSettings({
                ...settings,
                ramMaxMb: 4096,
                ramMinMb: 2048,
                graphicsPreset: 'potato',
                modpackProfile: 'clean',
              });
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
              settings.graphicsPreset === 'potato'
                ? 'bg-zinc-800/90 border-white/30 ring-1 ring-white/20'
                : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/5 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🥔</span>
              <span className="text-[10px] font-mono text-zinc-400">4 GB</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white apple-subheading">Пресет: Картошка</p>
              <p className="text-[10px] text-zinc-500">Чистая сборка, макс. FPS</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onUpdateSettings({
                ...settings,
                ramMaxMb: 8192,
                ramMinMb: 4096,
                graphicsPreset: 'optimal',
                modpackProfile: 'optimal',
              });
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
              settings.graphicsPreset === 'optimal' || !settings.graphicsPreset
                ? 'bg-zinc-800/90 border-emerald-400/40 ring-1 ring-emerald-400/30'
                : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/5 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">⚡</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">8 GB</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white apple-subheading">Пресет: Оптимально</p>
              <p className="text-[10px] text-emerald-400/90">Рекомендовано для Create S6</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onUpdateSettings({
                ...settings,
                ramMaxMb: 12288,
                ramMinMb: 4096,
                graphicsPreset: 'ultra',
                modpackProfile: 'full',
              });
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 press-feedback ${
              settings.graphicsPreset === 'ultra'
                ? 'bg-zinc-800/90 border-purple-400/40 ring-1 ring-purple-400/30'
                : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/5 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">✨</span>
              <span className="text-[10px] font-mono text-purple-400 font-bold">12+ GB</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white apple-subheading">Пресет: Ультра</p>
              <p className="text-[10px] text-purple-400/90">Шейдеры и полная сборка</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
