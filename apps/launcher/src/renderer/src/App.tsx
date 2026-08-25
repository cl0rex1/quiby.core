import React, { useState, useEffect } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { MinimalSidebar, ActiveTab } from './components/MinimalSidebar';
import { CharacterStage } from './views/CharacterStage';
import { SkinWardrobeView } from './views/SkinWardrobeView';
import { ModsView } from './views/ModsView';
import { SettingsView } from './views/SettingsView';
import { FloatingPlayButton } from './components/FloatingPlayButton';
import { DiscordAuthModal } from './components/DiscordAuthModal';
import { CAPE_PRESETS, CapePreset } from './utils/chibiRenderer';
import { 
  AuthSession, 
  DownloadProgress, 
  LauncherSettings, 
  LaunchState, 
  LogEntry, 
  ModpackManifest, 
  ServerStatus 
} from '@quiby/shared';

const SERVER_URL = 'http://localhost:3001';

const defaultSettings: LauncherSettings = {
  ramMinMb: 4096,
  ramMaxMb: 8192,
  javaPath: 'java',
  customJvmArgs: '',
  windowWidth: 1280,
  windowHeight: 720,
  fullscreen: false,
  autoCloseLauncher: false,
  gameDir: '',
  enableDiscordRpc: true,
  serverIp: 'play.quiby.fun:25565',
};

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [settings, setSettings] = useState<LauncherSettings>(defaultSettings);
  const [manifest, setManifest] = useState<ModpackManifest | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [launchState, setLaunchState] = useState<LaunchState>({ status: 'idle' });
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  // Custom Skin & Cape State
  const [customSkinImg, setCustomSkinImg] = useState<HTMLImageElement | null>(null);
  const [customSkinName, setCustomSkinName] = useState<string | null>(null);
  const [activeDefaultSkinIdx, setActiveDefaultSkinIdx] = useState(0);
  const [selectedCape, setSelectedCape] = useState<CapePreset>(CAPE_PRESETS[1]); // Default to quiby S6 Cape

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 1. Initial Load (Settings & Saved Session)
  useEffect(() => {
    const saved = localStorage.getItem('quiby_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (_) {}
    }

    const savedCapeId = localStorage.getItem('quiby_cape');
    if (savedCapeId) {
      const found = CAPE_PRESETS.find((c) => c.id === savedCapeId);
      if (found) setSelectedCape(found);
    }

    if (window.quibyApi) {
      window.quibyApi.getSettings().then((s) => {
        if (s) setSettings(s);
      });

      // IPC event listeners
      const unsubscribeProgress = window.quibyApi.onDownloadProgress((p) => {
        setDownloadProgress(p);
      });

      const unsubscribeLog = window.quibyApi.onGameLog((log) => {
        setLogs((prev) => [...prev.slice(-1000), log]);
      });

      const unsubscribeState = window.quibyApi.onLaunchStateChange((state) => {
        setLaunchState(state);
      });

      return () => {
        unsubscribeProgress?.();
        unsubscribeLog?.();
        unsubscribeState?.();
      };
    }
  }, []);

  // 2. Fetch Remote Manifest and Server Ping
  const fetchRemoteData = async () => {
    try {
      const manRes = await fetch(`${SERVER_URL}/api/modpack/latest`);
      if (manRes.ok) {
        setManifest(await manRes.json());
      }

      const statusRes = await fetch(`${SERVER_URL}/api/status`);
      if (statusRes.ok) {
        setServerStatus(await statusRes.json());
      }
    } catch (e) {
      console.warn('Backend server not reachable yet, operating in standalone mode.');
    }
  };

  useEffect(() => {
    fetchRemoteData();
    const interval = setInterval(fetchRemoteData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    localStorage.setItem('quiby_session', JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('quiby_session');
  };

  const handleSelectCape = (cape: CapePreset) => {
    setSelectedCape(cape);
    localStorage.setItem('quiby_cape', cape.id);
  };

  const handleSaveSettings = async (newSettings: LauncherSettings) => {
    setSettings(newSettings);
    if (window.quibyApi) {
      await window.quibyApi.saveSettings(newSettings);
    }
  };

  const handleLaunchGame = async () => {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      if (window.quibyApi) {
        await window.quibyApi.launchGame(session, settings, SERVER_URL);
      }
    } catch (err: any) {
      console.error('Launch Error:', err);
    }
  };

  const handleKillGame = () => {
    if (window.quibyApi) {
      window.quibyApi.killGame();
    }
  };

  return (
    <div className="flex h-screen w-screen bg-onyx-950 text-quiby-text overflow-hidden select-none font-sans relative">
      {/* Standalone Startup Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Floating Purple Ambient Light Orb (Gentle Drift) */}
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-quiby-purple/15 rounded-full blur-[140px] pointer-events-none animate-float-nebula"></div>
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-quiby-indigo/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* 1. Exactly 4-Button Minimalist Left Sidebar */}
      <MinimalSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        session={session}
        onOpenProfile={() => setIsAuthModalOpen(true)}
      />

      {/* 2. Main View Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'home' && (
          <CharacterStage
            session={session}
            serverStatus={serverStatus}
            serverIp={settings.serverIp}
            customSkinImg={customSkinImg}
            customSkinName={customSkinName}
            activeDefaultSkinIdx={activeDefaultSkinIdx}
            selectedCape={selectedCape}
            onOpenWardrobe={() => setActiveTab('wardrobe')}
            onOpenLogin={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'wardrobe' && (
          <SkinWardrobeView
            customSkinImg={customSkinImg}
            customSkinName={customSkinName}
            activeDefaultSkinIdx={activeDefaultSkinIdx}
            selectedCape={selectedCape}
            onSetCustomSkin={(img, name) => {
              setCustomSkinImg(img);
              setCustomSkinName(name);
            }}
            onSetDefaultSkinIdx={setActiveDefaultSkinIdx}
            onSelectCape={handleSelectCape}
          />
        )}

        {activeTab === 'mods' && (
          <ModsView
            manifest={manifest}
            gameDir={settings.gameDir}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            logs={logs}
            onSaveSettings={handleSaveSettings}
            onClearLogs={() => setLogs([])}
          />
        )}
      </main>

      {/* 3. Floating Action Play Button (Bottom Right) */}
      <FloatingPlayButton
        session={session}
        launchState={launchState}
        downloadProgress={downloadProgress}
        onLaunch={handleLaunchGame}
        onKill={handleKillGame}
        onOpenLogin={() => setIsAuthModalOpen(true)}
      />

      {/* 4. Discord Auth Modal */}
      <DiscordAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
        serverUrl={SERVER_URL}
      />
    </div>
  );
};

export default App;
