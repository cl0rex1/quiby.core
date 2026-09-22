import React, { useState, useEffect } from 'react';
import { SplashWindowView } from './components/SplashWindowView';
import { WindowHeader } from './components/WindowHeader';
import { MinimalSidebar, ActiveTab } from './components/MinimalSidebar';
import { CharacterStage } from './views/CharacterStage';
import { InGameLaunchStage } from './views/InGameLaunchStage';
import { SkinWardrobeView } from './views/SkinWardrobeView';
import { ModsView, CustomModItem } from './views/ModsView';
import { SettingsView } from './views/SettingsView';
import { FloatingActionDeck } from './components/FloatingActionDeck';
import { DiscordAuthModal } from './components/DiscordAuthModal';
import { FloatingNotificationToast, ToastData } from './components/FloatingNotificationToast';
import { NotificationItem } from './components/NotificationsModal';
import { NotificationDetailView } from './views/NotificationDetailView';
import { FirstLaunchOnboardingModal } from './components/FirstLaunchOnboardingModal';
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
      message: 'Сезон VI запущен. Все моды и оптимизации готовы к игре на сервере!',
      type: 'info',
      timestamp: Date.now() - 1000 * 60 * 10,
      read: false,
    },
  ]);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>('notif-1');
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleNotify = (
    title: string,
    message?: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success',
    modInfo?: NotificationItem['modInfo']
  ) => {
    const newNotif: NotificationItem = {
      id: 'notif-' + Date.now(),
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false,
      modInfo,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setSelectedNotificationId(newNotif.id);
    setActiveToast({
      id: newNotif.id,
      title,
      message,
      type,
    });
  };

  // 1. Settings State (Auto-saving)
  const [settings, setSettings] = useState<LauncherSettings>(defaultSettings);

  const handleUpdateSettings = (newSettings: LauncherSettings) => {
    setSettings(newSettings);
    if (window.quibyApi) {
      window.quibyApi.saveSettings(newSettings);
    }
  };

  // 2. Wardrobe State (Auto-saving)
  const [selectedCape, setSelectedCape] = useState<CapePreset>(CAPE_PRESETS[1]);
  const [customSkinImg, setCustomSkinImg] = useState<HTMLImageElement | null>(null);
  const [customSkinName, setCustomSkinName] = useState<string | null>(null);
  const [activeDefaultSkinIdx, setActiveDefaultSkinIdx] = useState(0);

  const handleSelectCape = (cape: CapePreset) => {
    setSelectedCape(cape);
    localStorage.setItem('quiby_cape', cape.id);
  };

  const handleSetCustomSkin = (img: HTMLImageElement | null, name: string | null) => {
    setCustomSkinImg(img);
    setCustomSkinName(name);
    if (img && img.src) {
      localStorage.setItem('quiby_custom_skin_data', img.src);
      localStorage.setItem('quiby_custom_skin_name', name || 'custom.png');
    } else {
      localStorage.removeItem('quiby_custom_skin_data');
      localStorage.removeItem('quiby_custom_skin_name');
    }
  };

  const handleSetDefaultSkinIdx = (idx: number) => {
    setActiveDefaultSkinIdx(idx);
    localStorage.setItem('quiby_default_skin_idx', String(idx));
  };

  // 3. Custom Mods State (Auto-saving)
  const [customMods, setCustomMods] = useState<CustomModItem[]>(initialCustomMods);

  const handleUpdateCustomMods = (newMods: CustomModItem[]) => {
    setCustomMods(newMods);
    localStorage.setItem('quiby_custom_mods', JSON.stringify(newMods));
  };

  // 4. Playtime & Fast-Connect States
  const [totalPlaytimeSeconds, setTotalPlaytimeSeconds] = useState<number>(0);
  const [autoConnect, setAutoConnect] = useState<boolean>(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
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

    // Check Onboarding
    const onboarded = localStorage.getItem('quiby_onboarded');
    if (!onboarded) {
      setIsOnboardingOpen(true);
    }

    // Restore Playtime
    const savedPlaytime = localStorage.getItem('quiby_total_playtime');
    if (savedPlaytime) {
      setTotalPlaytimeSeconds(parseInt(savedPlaytime, 10) || 0);
    }

    // Restore Auto-Connect Preference
    const savedAutoConnect = localStorage.getItem('quiby_auto_connect');
    if (savedAutoConnect !== null) {
      setAutoConnect(savedAutoConnect === 'true');
    }

    // Restore Cape
    const savedCapeId = localStorage.getItem('quiby_cape');
    if (savedCapeId) {
      const found = CAPE_PRESETS.find((c) => c.id === savedCapeId);
      if (found) {
        setSelectedCape(found);
      }
    }

    // Restore Custom Skin
    const savedSkinData = localStorage.getItem('quiby_custom_skin_data');
    const savedName = localStorage.getItem('quiby_custom_skin_name');
    if (savedSkinData) {
      const img = new Image();
      img.onload = () => {
        setCustomSkinImg(img);
      };
      img.src = savedSkinData;
      setCustomSkinName(savedName || 'custom.png');
    }

    // Restore Default Skin Choice (Steve / Alex)
    const savedDefIdx = localStorage.getItem('quiby_default_skin_idx');
    if (savedDefIdx !== null) {
      const idx = parseInt(savedDefIdx, 10) || 0;
      setActiveDefaultSkinIdx(idx);
    }

    // Restore Custom Mods
    const savedModsJson = localStorage.getItem('quiby_custom_mods');
    if (savedModsJson) {
      try {
        const parsed = JSON.parse(savedModsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomMods(parsed);
        }
      } catch (_) {}
    }

    // Restore Launcher Settings from Electron IPC
    if (window.quibyApi) {
      window.quibyApi.getSettings().then((s) => {
        if (s) {
          setSettings(s);
          if (s.autoJoinServer !== undefined) {
            setAutoConnect(s.autoJoinServer);
          }
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

      const unsubscribePlaytime = window.quibyApi.onPlaytimeTick?.((sec) => {
        setTotalPlaytimeSeconds((prev) => {
          const next = prev + sec;
          localStorage.setItem('quiby_total_playtime', String(next));
          return next;
        });
      });

      return () => {
        unsubscribeProgress?.();
        unsubscribeLog?.();
        unsubscribeState?.();
        unsubscribePlaytime?.();
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

  // Instant, clean tab navigation without blocking guards
  const handleSelectTab = (nextTab: ActiveTab) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
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
    setActiveTab('home');
    try {
      if (window.quibyApi) {
        const activeModFiles = customMods
          .filter((m) => m.enabled && m.safetyStatus === 'approved')
          .map((m) => m.filename);
        await window.quibyApi.launchGame(session, settings, SERVER_URL, activeModFiles);
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
    <div className="flex flex-col h-screen w-screen bg-[#0b0e14] text-zinc-100 overflow-hidden select-none font-sans relative">
      {/* 1. Window Controls & Dragging Header (Height: 32px / h-8) */}
      <WindowHeader serverIp={settings.serverIp} serverStatus={serverStatus} />

      {/* 2. Main Content Body (Remaining Height h-[calc(100vh-32px)]) */}
      <div className="flex flex-1 h-[calc(100vh-32px)] w-full overflow-hidden relative">
        {/* Sleek Minimal Sidebar */}
        <MinimalSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setIsNotificationsOpen(false);
            handleSelectTab(tab);
          }}
          session={session}
          onOpenProfile={() => setIsAuthModalOpen(true)}
          isNotificationsOpen={isNotificationsOpen}
          onOpenNotifications={() => {
            setIsNotificationsOpen(true);
            if (!selectedNotificationId && notifications.length > 0) {
              setSelectedNotificationId(notifications[0].id);
            }
          }}
          onCloseNotifications={() => setIsNotificationsOpen(false)}
          notifications={notifications}
          selectedNotificationId={selectedNotificationId}
          onSelectNotification={(id) => {
            setSelectedNotificationId(id);
            setNotifications((prev) =>
              prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
          }}
          onMarkAllNotificationsRead={() =>
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
          }
          onClearAllNotifications={() => {
            setNotifications([]);
            setSelectedNotificationId(null);
          }}
          unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        />

        {/* Primary View Content Container */}
        <main
          className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-200 ease-out ${
            isNotificationsOpen ? 'pl-[310px]' : 'pl-[72px]'
          }`}
        >
          {isNotificationsOpen ? (
            <NotificationDetailView
              notification={
                notifications.find((n) => n.id === selectedNotificationId) || null
              }
              onDeleteNotification={(id) => {
                const remaining = notifications.filter((n) => n.id !== id);
                setNotifications(remaining);
                if (selectedNotificationId === id) {
                  setSelectedNotificationId(remaining[0]?.id || null);
                }
              }}
              onNavigateToMods={() => {
                setIsNotificationsOpen(false);
                setActiveTab('mods');
              }}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                launchState.status === 'updating' || launchState.status === 'starting' || launchState.status === 'running' ? (
                  <InGameLaunchStage
                    session={session}
                    launchState={launchState}
                    downloadProgress={downloadProgress}
                    logs={logs}
                    serverIp={settings.serverIp}
                    totalPlaytimeSeconds={totalPlaytimeSeconds}
                    customSkinImg={customSkinImg}
                    customSkinName={customSkinName}
                    activeDefaultSkinIdx={activeDefaultSkinIdx}
                    selectedCape={selectedCape}
                    onKill={handleKillGame}
                    onClearLogs={() => setLogs([])}
                  />
                ) : (
                  <CharacterStage
                    session={session}
                    serverStatus={serverStatus}
                    serverIp={settings.serverIp}
                    totalPlaytimeSeconds={totalPlaytimeSeconds}
                    customSkinImg={customSkinImg}
                    customSkinName={customSkinName}
                    activeDefaultSkinIdx={activeDefaultSkinIdx}
                    selectedCape={selectedCape}
                    isInGame={false}
                    onOpenWardrobe={() => handleSelectTab('wardrobe')}
                    onOpenLogin={() => setIsAuthModalOpen(true)}
                    onOpenNews={() => setIsNotificationsOpen(true)}
                  />
                )
              )}

              {activeTab === 'wardrobe' && (
                <SkinWardrobeView
                  customSkinImg={customSkinImg}
                  customSkinName={customSkinName}
                  activeDefaultSkinIdx={activeDefaultSkinIdx}
                  selectedCape={selectedCape}
                  onSetCustomSkin={handleSetCustomSkin}
                  onSetDefaultSkinIdx={handleSetDefaultSkinIdx}
                  onSelectCape={handleSelectCape}
                />
              )}

              {activeTab === 'mods' && (
                <ModsView
                  manifest={manifest}
                  gameDir={settings.gameDir}
                  customMods={customMods}
                  session={session}
                  selectedModIds={selectedModIds}
                  onUpdateSelectedModIds={setSelectedModIds}
                  onUpdateCustomMods={handleUpdateCustomMods}
                  onNotify={handleNotify}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}
            </>
          )}
        </main>

        {/* Solid Anchored Launch Deck & Batch Actions */}
        {!isNotificationsOpen && (
          <FloatingActionDeck
            activeTab={activeTab}
            session={session}
            launchState={launchState}
            downloadProgress={downloadProgress}
            autoConnect={autoConnect}
            onToggleAutoConnect={(val) => {
              setAutoConnect(val);
              localStorage.setItem('quiby_auto_connect', String(val));
              handleUpdateSettings({ ...settings, autoJoinServer: val });
            }}
            batchActions={
              activeTab === 'mods' && selectedModIds.length > 0
                ? {
                    count: selectedModIds.length,
                    totalCount: customMods.length,
                    isAllSelected: customMods.length > 0 && selectedModIds.length === customMods.length,
                    onSelectAll: () => {
                      if (selectedModIds.length === customMods.length) {
                        setSelectedModIds([]);
                      } else {
                        setSelectedModIds(customMods.map((m) => m.id));
                      }
                    },
                    onEnableAll: () => {
                      handleUpdateCustomMods(
                        customMods.map((m) =>
                          selectedModIds.includes(m.id) && m.safetyStatus === 'approved'
                            ? { ...m, enabled: true }
                            : m
                        )
                      );
                    },
                    onDisableAll: () => {
                      handleUpdateCustomMods(
                        customMods.map((m) =>
                          selectedModIds.includes(m.id) ? { ...m, enabled: false } : m
                        )
                      );
                    },
                    onDeleteAll: () => {
                      handleUpdateCustomMods(
                        customMods.filter((m) => !selectedModIds.includes(m.id))
                      );
                      setSelectedModIds([]);
                    },
                    onClear: () => {
                      setSelectedModIds([]);
                    },
                  }
                : null
            }
            logs={logs}
            onClearLogs={() => setLogs([])}
            onLaunch={handleLaunchGame}
            onKill={handleKillGame}
            onOpenLogin={() => setIsAuthModalOpen(true)}
          />
        )}
      </div>

      {/* Floating Bottom Notification Toast */}
      <FloatingNotificationToast
        toast={activeToast}
        onDismiss={() => setActiveToast(null)}
      />

      {/* Discord Auth Modal */}
      <DiscordAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
        serverUrl={SERVER_URL}
      />

      {/* First Launch Onboarding Modal */}
      <FirstLaunchOnboardingModal
        isOpen={isOnboardingOpen}
        settings={settings}
        onClose={() => setIsOnboardingOpen(false)}
        onApplyPreset={(updated, profile) => {
          const merged = { ...settings, ...updated };
          handleUpdateSettings(merged);

          if (profile === 'clean') {
            handleUpdateCustomMods(customMods.map((m) => ({ ...m, enabled: false })));
          } else if (profile === 'optimal') {
            handleUpdateCustomMods(
              customMods.map((m) => ({
                ...m,
                enabled: m.safetyStatus === 'approved' && !m.categories?.includes('graphics'),
              }))
            );
          } else {
            handleUpdateCustomMods(
              customMods.map((m) => ({ ...m, enabled: m.safetyStatus === 'approved' }))
            );
          }

          handleNotify('Настройки применены', 'Параметры графики и состав сборки сконфигурированы.', 'success');
        }}
      />
    </div>
  );
};

export default App;
