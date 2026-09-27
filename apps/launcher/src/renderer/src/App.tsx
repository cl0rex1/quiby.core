import React, { useState, useEffect, useMemo } from 'react';
import { selectModpackProfile } from '../../shared/modpackProfiles';
import { applyBuildToMods, selectedBuild } from './utils/buildProfiles';
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
import type { NotificationItem } from './utils/notifications';
import { NotificationDetailView } from './views/NotificationDetailView';
import { FirstLaunchOnboardingModal } from './components/FirstLaunchOnboardingModal';
import { ProfileDialog } from './components/ProfileDialog';
import { CAPE_PRESETS, CapePreset } from './utils/chibiRenderer';
import { 
  AuthSession, 
  DownloadProgress, 
  LauncherSettings, 
  LaunchState, 
  LogEntry, 
  ModpackManifest, 
  NewsArticle,
  ServerStatus 
} from '@quiby/shared';

const SERVER_URL = (import.meta.env.VITE_QUIBY_API_URL || 'https://api.quiby.me').replace(/\/$/, '');

function storedSession(): AuthSession | null {
  try {
    const value = localStorage.getItem('quiby_session');
    if (!value) return null;
    const session = JSON.parse(value) as AuthSession;
    return session.token && session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

async function syncSelectedSkin(session: AuthSession, dataUri: string | null): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/skins/me`, {
    method: dataUri ? 'PUT' : 'DELETE',
    headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
    ...(dataUri ? { body: JSON.stringify({ dataUri }) } : {}),
  });
  if (!response.ok) throw new Error('Скин не удалось сохранить на сервере');
}

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
};

const initialCustomMods: CustomModItem[] = [];

export const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('quiby_sidebar_collapsed') === 'true');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [session, setSession] = useState<AuthSession | null>(storedSession);
  const [remoteManifest, setManifest] = useState<ModpackManifest | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsAvailable, setNewsAvailable] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [launchState, setLaunchState] = useState<LaunchState>({ status: 'idle' });
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [selectedModIds, setSelectedModIds] = useState<string[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
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
  const manifest = useMemo(() => remoteManifest ? selectModpackProfile(remoteManifest, settings.modpackProfile) : null, [remoteManifest, settings.modpackProfile]);

  const handleUpdateSettings = async (newSettings: LauncherSettings) => {
    setSettings(newSettings);
    if (newSettings.autoJoinServer !== undefined) {
      setAutoConnect(newSettings.autoJoinServer);
      localStorage.setItem('quiby_auto_connect', String(newSettings.autoJoinServer));
    }
    try {
      if (window.quibyApi) await window.quibyApi.saveSettings(newSettings);
      return true;
    } catch {
      handleNotify('Не удалось сохранить настройки', 'Проверьте доступ к папке лаунчера.', 'error');
      return false;
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
    if (session) void syncSelectedSkin(session, img?.src || null).catch(() =>
      handleNotify('Скин пока не обновлён в игре', 'Проверьте соединение с сервером и повторите выбор.', 'warning'));
  };

  const handleSetDefaultSkinIdx = (idx: number) => {
    setActiveDefaultSkinIdx(idx);
    localStorage.setItem('quiby_default_skin_idx', String(idx));
  };

  // 3. Custom Mods State (Auto-saving)
  const [customMods, setCustomMods] = useState<CustomModItem[]>(initialCustomMods);

  const handleUpdateCustomMods = (update: React.SetStateAction<CustomModItem[]>) => {
    setCustomMods((previous) => {
      const next = typeof update === 'function' ? update(previous) : update;
      localStorage.setItem('quiby_custom_mods', JSON.stringify(next));
      return next;
    });
  };

  // 4. Playtime & Fast-Connect States
  const [totalPlaytimeSeconds, setTotalPlaytimeSeconds] = useState<number>(0);
  const [autoConnect, setAutoConnect] = useState<boolean>(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => !storedSession());
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem('quiby_session');
    if (!savedSession) return;
    const restored = storedSession();
    if (!restored) {
      localStorage.removeItem('quiby_session');
      return;
    }
    const controller = new AbortController();
    void fetch(`${SERVER_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${restored.token}` },
      signal: controller.signal,
    }).then(async response => {
      if (response.status === 401 || response.status === 403) {
        if (localStorage.getItem('quiby_session') === savedSession) {
          localStorage.removeItem('quiby_session');
          setSession(null);
          setIsProfileOpen(false);
          setIsAuthModalOpen(true);
        }
        return null;
      }
      if (!response.ok) return null;
      return response.json() as Promise<{ user: AuthSession['user'] }>;
    }).then(result => {
      if (!result || localStorage.getItem('quiby_session') !== savedSession) return;
      const { user } = result;
      if (!user?.isWhitelisted) return;
      const verifiedSession = { ...restored, user };
      localStorage.setItem('quiby_session', JSON.stringify(verifiedSession));
      setSession(verifiedSession);
      setIsAuthModalOpen(false);
    }).catch(() => {
      // A temporary network failure must not sign the player out.
    });
    return () => controller.abort();
  }, []);

  // Initial Load (Saved Storage & IPC)
  useEffect(() => {
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
        if (Array.isArray(parsed)) setCustomMods(parsed.filter((mod) => !String(mod.id).startsWith('test-')));
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
        if (state.status === 'crashed') {
          handleNotify('Сбой Minecraft', state.error || `Игра завершилась с кодом ${state.exitCode ?? 'неизвестно'}.`, 'error');
        }
      });

      const unsubscribePlaytime = window.quibyApi.onPlaytimeTick?.((sec) => {
        setTotalPlaytimeSeconds((prev) => {
          const next = prev + sec;
          localStorage.setItem('quiby_total_playtime', String(next));
          return next;
        });
      });

      const unsubscribePlaytimeEnd = window.quibyApi.onPlaytimeSessionEnd?.((sec) => {
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
        unsubscribePlaytimeEnd?.();
      };
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let nextContentRefresh = 0;
    const controller = new AbortController();
    const getJson = (route: string) => fetch(`${SERVER_URL}${route}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null).catch(() => null);
    const refresh = async () => {
      if (!document.hidden) {
        const refreshContent = Date.now() >= nextContentRefresh;
        const [status, content] = await Promise.all([
          getJson('/api/status'),
          refreshContent ? Promise.all([
            window.quibyApi?.getLatestModpackManifest().catch(() => null) ?? getJson('/api/modpack/latest'),
            getJson('/api/news'),
          ]) : null,
        ]);
        if (stopped) return;
        setServerStatus(status);
        if (content) {
          setManifest(content[0]);
          setNews(Array.isArray(content[1]) ? content[1] : []);
          setNewsAvailable(Array.isArray(content[1]));
          nextContentRefresh = Date.now() + 300000;
        }
      }
      if (!stopped) timer = setTimeout(refresh, 30000);
    };
    void refresh();
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
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
    if (!session || session.expiresAt <= Date.now()) {
      setSession(null);
      localStorage.removeItem('quiby_session');
      setIsAuthModalOpen(true);
      return;
    }
    setActiveTab('home');
    if (!window.quibyApi) return;
    try {
      await syncSelectedSkin(session, localStorage.getItem('quiby_custom_skin_data'));
    } catch (err) {
      handleNotify('Не удалось синхронизировать скин', err instanceof Error ? err.message : 'Проверьте соединение и попробуйте снова.', 'error');
      return;
    }
    const activeModFiles = customMods
      .filter((m) => m.enabled && m.safetyStatus === 'approved')
      .map((m) => m.filename);
    const disabledModFiles = customMods
      .filter((m) => !m.enabled || m.safetyStatus !== 'approved')
      .map((m) => m.filename);
    try {
      await window.quibyApi.launchGame(session, settings, activeModFiles, disabledModFiles);
    } catch (err) {
      // The main process sends a crash state with the full diagnostic report.
      console.error('Launch Error:', err);
    }
  };

  const handleKillGame = () => {
    window.quibyApi?.killGame();
  };

  // Otherwise, render the Main Launcher Window:
  return (
    <div style={{ '--sidebar-width': isNotificationsOpen ? '310px' : sidebarCollapsed ? '72px' : '192px' } as React.CSSProperties} className="launcher-app flex flex-col h-screen w-screen bg-[#0c0c0d] text-zinc-100 overflow-hidden select-none font-sans relative">
      {/* 1. Window Controls & Dragging Header (Height: 32px / h-8) */}
      <WindowHeader />

      {!isAuthModalOpen && <>
      {/* 2. Main Content Body (Remaining Height h-[calc(100vh-32px)]) */}
      <div className="flex flex-1 h-[calc(100vh-32px)] w-full overflow-hidden relative">
        {/* Sleek Minimal Sidebar */}
        <MinimalSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(previous => {
            localStorage.setItem('quiby_sidebar_collapsed', String(!previous));
            return !previous;
          })}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setIsNotificationsOpen(false);
            handleSelectTab(tab);
          }}
          session={session}
          onOpenProfile={() => session ? setIsProfileOpen(true) : setIsAuthModalOpen(true)}
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
          className="launcher-workspace flex-1 flex flex-col overflow-hidden relative"
        >
          {isNotificationsOpen ? (
            <NotificationDetailView
              onToast={(title, type) => setActiveToast({ id: `copy-${Date.now()}`, title, type })}
              news={news}
              newsAvailable={newsAvailable}
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
                    manifest={manifest}
                    serverStatus={serverStatus}
                    totalPlaytimeSeconds={totalPlaytimeSeconds}
                    customSkinImg={customSkinImg}
                    customSkinName={customSkinName}
                    activeDefaultSkinIdx={activeDefaultSkinIdx}
                    selectedCape={selectedCape}
                    isInGame={false}
                    buildId={selectedBuild(settings).id}
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
                  serverUrl={SERVER_URL}
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
                  onChooseBuild={() => setIsOnboardingOpen(true)}
                  hasServerAddress={Boolean(manifest?.serverAddress)}
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
            serverStatus={serverStatus}
            hasServerAddress={Boolean(manifest?.serverAddress)}
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
                    onDeleteAll: async () => {
                      try {
                        if (window.quibyApi) {
                          await Promise.all(customMods
                            .filter((m) => selectedModIds.includes(m.id))
                            .map((m) => window.quibyApi.removeCustomMod(settings.gameDir, m.filename)));
                        }
                        handleUpdateCustomMods(customMods.filter((m) => !selectedModIds.includes(m.id)));
                        setSelectedModIds([]);
                      } catch (error) {
                        handleNotify('Не удалось удалить моды', error instanceof Error ? error.message : 'Проверьте папку mods.', 'error');
                      }
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

      </>}

      {/* Discord Auth Page */}
      <DiscordAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
        serverUrl={SERVER_URL}
      />

      <ProfileDialog
        session={isProfileOpen ? session : null}
        onClose={() => setIsProfileOpen(false)}
        onSignOut={() => {
          localStorage.removeItem('quiby_session');
          setSession(null);
          setIsProfileOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* First Launch Onboarding Modal */}
      <FirstLaunchOnboardingModal
        isOpen={isOnboardingOpen && !isAuthModalOpen}
        settings={settings}
        onClose={() => setIsOnboardingOpen(false)}
        onApplyPreset={async (updated, profile) => {
          const merged = { ...settings, ...updated };
          if (!await handleUpdateSettings(merged)) throw new Error("Settings save failed");

          handleUpdateCustomMods(applyBuildToMods(customMods, profile));

          handleNotify('Настройки сохранены', 'Память и клиентские моды настроены.', 'success');
        }}
      />
    </div>
  );
};

export default App;
