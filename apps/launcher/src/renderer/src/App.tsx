import React, { useState, useEffect } from 'react';
import { SplashWindowView } from './components/SplashWindowView';
import { MinimalSidebar, ActiveTab } from './components/MinimalSidebar';
import { CharacterStage } from './views/CharacterStage';
import { SkinWardrobeView } from './views/SkinWardrobeView';
import { ModsView, CustomModItem } from './views/ModsView';
import { SettingsView } from './views/SettingsView';
import { FloatingActionDeck } from './components/FloatingActionDeck';
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

const initialCustomMods: CustomModItem[] = [
  { id: '1', name: "Xaero's Minimap", filename: 'Xaeros_Minimap_24.2.0_NeoForge_1.21.1.jar', size: 1420000, enabled: true },
  { id: '2', name: 'Jade (WAILA Tooltips)', filename: 'Jade-1.21.1-NeoForge-15.1.0.jar', size: 680000, enabled: true },
];

export const App: React.FC = () => {
  const isSplashQuery = new URLSearchParams(window.location.search).get('view') === 'splash';
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [manifest, setManifest] = useState<ModpackManifest | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [launchState, setLaunchState] = useState<LaunchState>({ status: 'idle' });
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  // 1. Saved vs Draft Settings State
  const [savedSettings, setSavedSettings] = useState<LauncherSettings>(defaultSettings);
  const [draftSettings, setDraftSettings] = useState<LauncherSettings>(defaultSettings);

  // 2. Saved vs Draft Wardrobe State (Persistent)
  const [savedCape, setSavedCape] = useState<CapePreset>(CAPE_PRESETS[1]);
  const [draftCape, setDraftCape] = useState<CapePreset>(CAPE_PRESETS[1]);
  const [savedSkinImg, setSavedSkinImg] = useState<HTMLImageElement | null>(null);
  const [draftSkinImg, setDraftSkinImg] = useState<HTMLImageElement | null>(null);
  const [savedSkinName, setSavedSkinName] = useState<string | null>(null);
  const [draftSkinName, setDraftSkinName] = useState<string | null>(null);
  const [savedDefaultSkinIdx, setSavedDefaultSkinIdx] = useState(0);
  const [draftDefaultSkinIdx, setDraftDefaultSkinIdx] = useState(0);

  // 3. Saved vs Draft Custom Mods State
  const [savedCustomMods, setSavedCustomMods] = useState<CustomModItem[]>(initialCustomMods);
  const [draftCustomMods, setDraftCustomMods] = useState<CustomModItem[]>(initialCustomMods);

  // Shake warning state when leaving tab with unsaved changes
  const [isShaking, setIsShaking] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Initial Load (Saved Storage & IPC)
  useEffect(() => {
    // Restore Session
    const savedSession = localStorage.getItem('quiby_session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (_) {}
    }

    // Restore Cape
    const savedCapeId = localStorage.getItem('quiby_cape');
    if (savedCapeId) {
      const found = CAPE_PRESETS.find((c) => c.id === savedCapeId);
      if (found) {
        setSavedCape(found);
        setDraftCape(found);
      }
    }

    // Restore Custom Skin
    const savedSkinData = localStorage.getItem('quiby_custom_skin_data');
    const savedName = localStorage.getItem('quiby_custom_skin_name');
    if (savedSkinData) {
      const img = new Image();
      img.onload = () => {
        setSavedSkinImg(img);
        setDraftSkinImg(img);
      };
      img.src = savedSkinData;
      setSavedSkinName(savedName || 'custom.png');
      setDraftSkinName(savedName || 'custom.png');
    }

    // Restore Default Skin Choice (Steve / Alex)
    const savedDefIdx = localStorage.getItem('quiby_default_skin_idx');
    if (savedDefIdx !== null) {
      const idx = parseInt(savedDefIdx, 10) || 0;
      setSavedDefaultSkinIdx(idx);
      setDraftDefaultSkinIdx(idx);
    }

    // Restore Launcher Settings from Electron IPC
    if (window.quibyApi) {
      window.quibyApi.getSettings().then((s) => {
        if (s) {
          setSavedSettings(s);
          setDraftSettings(s);
        }
      });

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

  // Fetch Remote Manifest & Server Ping
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
    } catch (_) {}
  };

  useEffect(() => {
    fetchRemoteData();
    const interval = setInterval(fetchRemoteData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check if current tab has unsaved modifications
  const hasUnsavedChanges = (() => {
    if (activeTab === 'wardrobe') {
      return (
        draftCape.id !== savedCape.id ||
        draftSkinImg !== savedSkinImg ||
        draftSkinName !== savedSkinName ||
        draftDefaultSkinIdx !== savedDefaultSkinIdx
      );
    }
    if (activeTab === 'mods') {
      return JSON.stringify(draftCustomMods) !== JSON.stringify(savedCustomMods);
    }
    if (activeTab === 'settings') {
      return JSON.stringify(draftSettings) !== JSON.stringify(savedSettings);
    }
    return false;
  })();

  // Handle Tab Switch (Navigation Guard)
  const handleSelectTab = (nextTab: ActiveTab) => {
    if (nextTab === activeTab) return;

    if (hasUnsavedChanges) {
      // Block navigation and trigger red shake alert
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setActiveTab(nextTab);
  };

  // Save current tab modifications
  const handleSaveCurrentTab = async () => {
    if (activeTab === 'wardrobe') {
      setSavedCape(draftCape);
      setSavedSkinImg(draftSkinImg);
      setSavedSkinName(draftSkinName);
      setSavedDefaultSkinIdx(draftDefaultSkinIdx);

      // Persist Wardrobe to LocalStorage
      localStorage.setItem('quiby_cape', draftCape.id);
      localStorage.setItem('quiby_default_skin_idx', String(draftDefaultSkinIdx));

      if (draftSkinImg && draftSkinImg.src) {
        localStorage.setItem('quiby_custom_skin_data', draftSkinImg.src);
        localStorage.setItem('quiby_custom_skin_name', draftSkinName || 'custom.png');
      } else {
        localStorage.removeItem('quiby_custom_skin_data');
        localStorage.removeItem('quiby_custom_skin_name');
      }
    } else if (activeTab === 'mods') {
      setSavedCustomMods(draftCustomMods);
    } else if (activeTab === 'settings') {
      setSavedSettings(draftSettings);
      if (window.quibyApi) {
        await window.quibyApi.saveSettings(draftSettings);
      }
    }
  };

  // Cancel / Revert current tab modifications
  const handleCancelCurrentTab = () => {
    if (activeTab === 'wardrobe') {
      setDraftCape(savedCape);
      setDraftSkinImg(savedSkinImg);
      setDraftSkinName(savedSkinName);
      setDraftDefaultSkinIdx(savedDefaultSkinIdx);
    } else if (activeTab === 'mods') {
      setDraftCustomMods(savedCustomMods);
    } else if (activeTab === 'settings') {
      setDraftSettings(savedSettings);
    }
  };

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    localStorage.setItem('quiby_session', JSON.stringify(newSession));
  };

  const handleLaunchGame = async () => {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      if (window.quibyApi) {
        await window.quibyApi.launchGame(session, savedSettings, SERVER_URL);
      }
    } catch (err) {
      console.error('Launch Error:', err);
    }
  };

  const handleKillGame = () => {
    window.quibyApi?.killGame();
  };

  // If this window is the dedicated Splash BrowserWindow:
  if (isSplashQuery) {
    return <SplashWindowView />;
  }

  // Otherwise, render the Main Launcher Window:
  return (
    <div className="flex h-screen w-screen bg-onyx-950 text-quiby-text overflow-hidden select-none font-sans relative">
      {/* Floating Purple Ambient Light */}
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-quiby-purple/15 rounded-full blur-[140px] pointer-events-none animate-float-nebula"></div>
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-quiby-indigo/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* 1. Exactly 4-Button Minimalist Left Sidebar */}
      <MinimalSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        session={session}
        onOpenProfile={() => setIsAuthModalOpen(true)}
      />

      {/* 2. Main View Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'home' && (
          <CharacterStage
            session={session}
            serverStatus={serverStatus}
            serverIp={savedSettings.serverIp}
            customSkinImg={savedSkinImg}
            customSkinName={savedSkinName}
            activeDefaultSkinIdx={savedDefaultSkinIdx}
            selectedCape={savedCape}
            onOpenWardrobe={() => handleSelectTab('wardrobe')}
            onOpenLogin={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'wardrobe' && (
          <SkinWardrobeView
            customSkinImg={draftSkinImg}
            customSkinName={draftSkinName}
            activeDefaultSkinIdx={draftDefaultSkinIdx}
            selectedCape={draftCape}
            onSetCustomSkin={(img, name) => {
              setDraftSkinImg(img);
              setDraftSkinName(name);
            }}
            onSetDefaultSkinIdx={setDraftDefaultSkinIdx}
            onSelectCape={setDraftCape}
          />
        )}

        {activeTab === 'mods' && (
          <ModsView
            manifest={manifest}
            gameDir={draftSettings.gameDir}
            customMods={draftCustomMods}
            onUpdateCustomMods={setDraftCustomMods}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={draftSettings}
            onUpdateSettings={setDraftSettings}
          />
        )}
      </main>

      {/* 3. Floating Action Deck (Play on Home / Save & Cancel on other tabs with shake guard) */}
      <FloatingActionDeck
        activeTab={activeTab}
        session={session}
        launchState={launchState}
        downloadProgress={downloadProgress}
        hasUnsavedChanges={hasUnsavedChanges}
        isShaking={isShaking}
        onLaunch={handleLaunchGame}
        onKill={handleKillGame}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onSave={handleSaveCurrentTab}
        onCancel={handleCancelCurrentTab}
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
