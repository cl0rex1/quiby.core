import React, { useState, useEffect } from 'react';
import { Sliders, HardDrive, Cpu, Folder, Monitor, CheckCircle, RefreshCw, FolderOpen, Save, X } from 'lucide-react';
import { LauncherSettings } from '@quiby/shared';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LauncherSettings;
  onSaveSettings: (newSettings: LauncherSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings: initialSettings,
  onSaveSettings,
}) => {
  const [settings, setSettings] = useState<LauncherSettings>(initialSettings);
  const [totalRamGb, setTotalRamGb] = useState(16);
  const [javaList, setJavaList] = useState<any[]>([]);
  const [detectingJava, setDetectingJava] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setSettings(initialSettings);
    if (isOpen) {
      handleDetectJava();
    }
  }, [initialSettings, isOpen]);

  if (!isOpen) return null;

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
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 1000);
  };

  const ramGb = Math.round(settings.ramMaxMb / 1024);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <form onSubmit={handleSave} className="bg-quiby-bg border border-quiby-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-quiby-border/80 bg-quiby-card/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-quiby-purple/15 flex items-center justify-center text-quiby-purpleLight">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Настройки лаунчера</h3>
              <p className="text-xs text-quiby-textMuted font-mono">
                Выделение памяти, Java 21 и параметры запуска
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-quiby-purple to-quiby-indigo hover:from-quiby-purpleLight hover:to-quiby-purple text-white font-bold text-xs shadow-neon-purple transition-all active:scale-95 cursor-pointer"
            >
              <Save size={14} />
              <span>{savedNotice ? 'Сохранено!' : 'Сохранить'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-quiby-card hover:bg-white/10 text-quiby-textMuted hover:text-white border border-quiby-border transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {savedNotice && (
            <div className="p-3 rounded-2xl bg-quiby-purple/15 border border-quiby-purple/30 text-quiby-purpleLight text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle size={15} />
              <span>Настройки успешно применены!</span>
            </div>
          )}

          {/* 1. RAM Allocation Card */}
          <div className="bg-quiby-card border border-quiby-border rounded-2xl p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <HardDrive size={17} className="text-quiby-purpleLight" />
                <span>Выделение оперативной памяти (RAM)</span>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-quiby-surface font-mono text-xs font-bold text-quiby-purpleLight border border-quiby-border">
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
                className="w-full accent-quiby-purple cursor-pointer h-2 bg-quiby-surface rounded-lg"
              />

              <div className="flex justify-between text-[11px] text-quiby-textDim font-mono">
                <span>4 ГБ (Минимум)</span>
                <span className="text-quiby-purpleLight font-bold">8 ГБ (Рекомендуется для Create)</span>
                <span>{Math.max(totalRamGb, 16)} ГБ (Макс)</span>
              </div>
            </div>
          </div>

          {/* 2. Java 21 Runtime Card */}
          <div className="bg-quiby-card border border-quiby-border rounded-2xl p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Cpu size={17} className="text-quiby-purpleLight" />
                <span>Среда исполнения Java 21</span>
              </div>
              <button
                type="button"
                onClick={handleDetectJava}
                disabled={detectingJava}
                className="flex items-center gap-1.5 text-xs text-quiby-textMuted hover:text-white px-3 py-1 rounded-full bg-quiby-surface border border-quiby-border transition-colors"
              >
                <RefreshCw size={12} className={detectingJava ? 'animate-spin' : ''} />
                <span>Автопоиск Java</span>
              </button>
            </div>

            <div className="space-y-3">
              {javaList.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-quiby-textMuted mb-1.5">
                    Обнаруженные версии Java в системе:
                  </label>
                  <select
                    value={settings.javaPath}
                    onChange={(e) => setSettings(prev => ({ ...prev, javaPath: e.target.value }))}
                    className="w-full bg-quiby-surface border border-quiby-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-quiby-purple"
                  >
                    {javaList.map((j, idx) => (
                      <option key={idx} value={j.path}>
                        {j.versionString} (Java {j.version}) — {j.path} {j.isCompatible ? '✅ Совместима' : '⚠️ Требуется Java 21+'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-quiby-textMuted mb-1.5">
                  Путь к исполняемому файлу вручную:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.javaPath}
                    onChange={(e) => setSettings(prev => ({ ...prev, javaPath: e.target.value }))}
                    placeholder="java или /usr/bin/java"
                    className="flex-1 bg-quiby-surface border border-quiby-border rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-quiby-purple"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseJava}
                    className="px-3.5 py-2 rounded-xl bg-quiby-surface hover:bg-quiby-cardHover border border-quiby-border text-xs text-quiby-text transition-colors"
                  >
                    Обзор...
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Game Directory & Resolution Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Directory */}
            <div className="bg-quiby-card border border-quiby-border rounded-2xl p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Folder size={16} className="text-quiby-purpleLight" />
                <span>Папка с игрой</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={settings.gameDir}
                  onChange={(e) => setSettings(prev => ({ ...prev, gameDir: e.target.value }))}
                  className="flex-1 bg-quiby-surface border border-quiby-border rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-quiby-purple truncate"
                />
                <button
                  type="button"
                  onClick={handleBrowseGameDir}
                  className="px-3 py-1.5 rounded-xl bg-quiby-surface hover:bg-quiby-cardHover border border-quiby-border text-xs text-quiby-text transition-colors"
                >
                  Обзор
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenFolder(settings.gameDir)}
                  title="Открыть папку"
                  className="p-1.5 rounded-xl bg-quiby-surface hover:bg-quiby-cardHover border border-quiby-border text-quiby-text transition-colors"
                >
                  <FolderOpen size={15} />
                </button>
              </div>
            </div>

            {/* Resolution */}
            <div className="bg-quiby-card border border-quiby-border rounded-2xl p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Monitor size={16} className="text-quiby-purpleLight" />
                <span>Разрешение экрана</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={settings.windowWidth}
                    onChange={(e) => setSettings(prev => ({ ...prev, windowWidth: parseInt(e.target.value, 10) || 1280 }))}
                    className="w-20 bg-quiby-surface border border-quiby-border rounded-xl px-2.5 py-1.5 text-xs text-white font-mono text-center"
                  />
                  <span className="text-quiby-textDim">×</span>
                  <input
                    type="number"
                    value={settings.windowHeight}
                    onChange={(e) => setSettings(prev => ({ ...prev, windowHeight: parseInt(e.target.value, 10) || 720 }))}
                    className="w-20 bg-quiby-surface border border-quiby-border rounded-xl px-2.5 py-1.5 text-xs text-white font-mono text-center"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-quiby-textMuted cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    checked={settings.fullscreen}
                    onChange={(e) => setSettings(prev => ({ ...prev, fullscreen: e.target.checked }))}
                    className="rounded accent-quiby-purple"
                  />
                  <span>Полноэкранный</span>
                </label>
              </div>
            </div>
          </div>

          {/* 4. Custom JVM Flags */}
          <div className="bg-quiby-card border border-quiby-border rounded-2xl p-4 space-y-2 shadow-sm">
            <label className="block text-xs font-bold text-white">
              Пользовательские JVM флаги и аргументы (опционально):
            </label>
            <textarea
              rows={2}
              value={settings.customJvmArgs}
              onChange={(e) => setSettings(prev => ({ ...prev, customJvmArgs: e.target.value }))}
              placeholder="-XX:+UseG1GC -Dforge.forceNoStencil=true"
              className="w-full bg-quiby-surface border border-quiby-border rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-quiby-purple"
            />
          </div>
        </div>
      </form>
    </div>
  );
};
