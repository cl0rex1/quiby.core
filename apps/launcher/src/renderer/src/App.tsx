import React, { useState, useEffect } from 'react';
import { SplashWindowView } from './components/SplashWindowView';
import { MinimalSidebar, ActiveTab } from './components/MinimalSidebar';
import { CharacterStage } from './views/CharacterStage';
import { SkinWardrobeView } from './views/SkinWardrobeView';
import { ModsView, CustomModItem } from './views/ModsView';
import { SettingsView } from './views/SettingsView';
import { FloatingActionDeck } from './components/FloatingActionDeck';
import { DiscordAuthModal } from './components/DiscordAuthModal';
import { FloatingNotificationToast, ToastData } from './components/FloatingNotificationToast';
import { NotificationsModal, NotificationItem } from './components/NotificationsModal';
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
  {
    id: 'test-1',
    name: 'Embeddium',
    filename: 'embeddium-0.3.31+mc1.21.1.jar',
    size: 3450000,
    enabled: true,
    safetyStatus: 'approved',
    safetyReason: 'Одобрен • Modrinth (безопасный клиентский мод)',
    categories: ['optimization', 'shaders'],
    projectUrl: 'https://modrinth.com/mod/embeddium',
    iconUrl: 'https://cdn.modrinth.com/data/sk9gg7Kq/icon.png',
    description: 'Оптимизация рендеринга мира и повышение частоты кадров',
  },
  {
    id: 'test-2',
    name: 'Sound Physics Remastered',
    filename: 'soundphysics-neoforge-1.21.1-1.4.6.jar',
    size: 2100000,
    enabled: true,
    safetyStatus: 'approved',
    safetyReason: 'Одобрен администрацией сервера (Вайтлист)',
    categories: ['audio', 'graphics'],
    projectUrl: 'https://modrinth.com/mod/sound-physics-remastered',
    iconUrl: 'https://cdn.modrinth.com/data/qyVF9oeo/icon.png',
    description: 'Реалистичная акустика, эхо в пещерах и затухание звука',
  },
  {
    id: 'test-3',
    name: 'Simple Voice Chat',
    filename: 'voicechat-neoforge-1.21.1-2.5.18.jar',
    size: 4200000,
    enabled: false,
    hashSha1: '7fa52e8964b10b0a8813bc6218d8442e97da60f1',
    safetyStatus: 'unverified',
    safetyReason: 'Мод не найден в публичном каталоге. Доступен запрос на одобрение.',
    categories: ['voice', 'utility'],
    iconUrl: 'https://cdn.modrinth.com/data/9eGKb6K1/icon.png',
    description: 'Позиционный 3D голосовой чат для общения на сервере',
  },
  {
    id: 'test-pending',
    name: 'Custom HUD Tweaks',
    filename: 'custom-hud-1.21.1.jar',
    size: 1540000,
    enabled: false,
    hashSha1: '3bc948a7d1840294829103847291038472910384',
    safetyStatus: 'pending',
    safetyReason: 'Заявка отправлена модераторам в Discord и находится на рассмотрении',
    categories: ['interface', 'utility'],
    description: 'Кастомизация интерфейса, координат и компаса на экране',
  },
  {
    id: 'test-4',
    name: 'X-Ray Ultimate Plus',
    filename: 'XRay-Ultimate-1.21.1-cheat.jar',
    size: 890000,
    enabled: false,
    safetyStatus: 'blocked',
    safetyReason: 'Запрещен: содержит сигнатуры читов/рентгена руд (xray)',
    categories: ['cheat', 'xray'],
    description: 'Запрещенный чит-мод для поиска скрытых руд сквозь стены',
  },
  {
    id: 'test-6',
    name: 'Jade (WAILA Tooltips)',
    filename: 'Jade-1.21.1-NeoForge-15.1.0.jar',
    size: 680000,
    enabled: true,
    safetyStatus: 'approved',
    safetyReason: 'Одобрен • Modrinth (безопасный клиентский мод)',
    categories: ['interface'],
    projectUrl: 'https://modrinth.com/mod/jade',
    iconUrl: 'https://cdn.modrinth.com/data/nvQzSEkH/icon.png',
    description: 'Информативные всплывающие подсказки на блоках и мобах',
  },
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
  const [selectedModIds, setSelectedModIds] = useState<string[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Quiby Core готов к запуску',
      message: 'Сезон VI запущен. Приятной игры на сервере!',
      type: 'info',
      timestamp: Date.now() - 1000 * 60 * 10,
      read: false,
    },
  ]);
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleNotify = (
    title: string,
    message?: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => {
    const newNotif: NotificationItem = {
      id: 'notif-' + Date.now(),
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast({
      id: newNotif.id,
      title,
      message,
      type,
    });
  };

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
      // Only compare user-configurable states: which mods exist and whether they are enabled
      const getComparableState = (mods: CustomModItem[]) =>
        mods.map((m) => ({ id: m.id, enabled: m.enabled }));
      return (
        JSON.stringify(getComparableState(draftCustomMods)) !==
        JSON.stringify(getComparableState(savedCustomMods))
      );
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
      setSelectedModIds([]);
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
      setSelectedModIds([]);
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

  const handleUpdateCustomMods = (newMods: CustomModItem[]) => {
    const getEnabledFingerprint = (mods: CustomModItem[]) =>
      mods.map((m) => `${m.id}:${m.enabled}`).join('|');

    if (
      getEnabledFingerprint(draftCustomMods) === getEnabledFingerprint(newMods) &&
      draftCustomMods.length === newMods.length
    ) {
      setSavedCustomMods(newMods);
    }

    setDraftCustomMods(newMods);
  };

  // If this window is the dedicated Splash BrowserWindow:
  if (isSplashQuery) {
    return <SplashWindowView />;
  }

  // Otherwise, render the Main Launcher Window:
  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden select-none font-sans relative">
      {/* Subtle Radial Ambient Light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.03)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] bg-white/[0.015] rounded-full blur-[140px] pointer-events-none" />

      {/* 1. Interactive Expandable Minimal Sidebar */}
      <MinimalSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        session={session}
        onOpenProfile={() => setIsAuthModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
      />

      {/* 2. Main View Content (Offset for 72px sidebar rail) */}
      <main className="flex-1 flex flex-col overflow-hidden relative pl-[72px]">
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
            session={session}
            selectedModIds={selectedModIds}
            onUpdateSelectedModIds={setSelectedModIds}
            onUpdateCustomMods={handleUpdateCustomMods}
            onNotify={handleNotify}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={draftSettings}
            onUpdateSettings={setDraftSettings}
          />
        )}
      </main>

      {/* 3. Floating Action Deck (Play on Home / Save & Cancel on other tabs / Batch Actions with Metaball Split) */}
      <FloatingActionDeck
        activeTab={activeTab}
        session={session}
        launchState={launchState}
        downloadProgress={downloadProgress}
        hasUnsavedChanges={hasUnsavedChanges}
        isShaking={isShaking}
        batchActions={
          activeTab === 'mods' && selectedModIds.length > 0
            ? {
                count: selectedModIds.length,
                totalCount: draftCustomMods.length,
                isAllSelected: draftCustomMods.length > 0 && selectedModIds.length === draftCustomMods.length,
                onSelectAll: () => {
                  if (selectedModIds.length === draftCustomMods.length) {
                    setSelectedModIds([]);
                  } else {
                    setSelectedModIds(draftCustomMods.map((m) => m.id));
                  }
                },
                onEnableAll: () => {
                  setDraftCustomMods((prev) =>
                    prev.map((m) =>
                      selectedModIds.includes(m.id) && m.safetyStatus === 'approved'
                        ? { ...m, enabled: true }
                        : m
                    )
                  );
                },
                onDisableAll: () => {
                  setDraftCustomMods((prev) =>
                    prev.map((m) =>
                      selectedModIds.includes(m.id) ? { ...m, enabled: false } : m
                    )
                  );
                },
                onDeleteAll: () => {
                  setDraftCustomMods((prev) =>
                    prev.filter((m) => !selectedModIds.includes(m.id))
                  );
                  setSelectedModIds([]);
                },
                onClear: () => {
                  setSelectedModIds([]);
                },
              }
            : null
        }
        onLaunch={handleLaunchGame}
        onKill={handleKillGame}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onSave={handleSaveCurrentTab}
        onCancel={handleCancelCurrentTab}
      />

      {/* 4. Floating Bottom Notification Toast (Same placement as action deck) */}
      <FloatingNotificationToast
        toast={activeToast}
        onDismiss={() => setActiveToast(null)}
      />

      {/* 5. Notifications Drawer Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false);
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        notifications={notifications}
        onClearAll={() => setNotifications([])}
        onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
      />

      {/* 6. Discord Auth Modal */}
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
