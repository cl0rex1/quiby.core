import { createSkinSynchronizer } from './utils/skinSync';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { selectModpackProfile } from '../../shared/modpackProfiles';
import { applyBuildToMods, selectedBuild } from './utils/buildProfiles';
import { WindowHeader } from './components/WindowHeader';
import { LauncherUpdateBanner } from './components/LauncherUpdateBanner';
import type { UpdateState } from '../../main/updates';
import { version as LAUNCHER_VERSION } from '../../../package.json';
import { MinimalSidebar, ActiveTab } from './components/MinimalSidebar';
import { CharacterStage } from './views/CharacterStage';
import { InGameLaunchStage } from './views/InGameLaunchStage';
import { getSavedSkinLibrary, getSkinDisplayName } from './utils/skinLibrary';
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

const syncSelectedSkin = createSkinSynchronizer(SERVER_URL, fetch, candidate => storedSession()?.token === candidate.token);

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
  const [launcherUpdate, setLauncherUpdate] = useState<UpdateState | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [selectedModIds, setSelectedModIds] = useState<string[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
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
      id: 'notif-' + crypto.randomUUID(),
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false,
      modInfo,
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 100));
    setSelectedNotificationId(newNotif.id);
    setActiveToast({
      id: newNotif.id,
      title,
      message,
      type,
    });
  };

  useEffect(() => {
    let active = true;
    void window.quibyApi.loadNotifications().then(saved => {
      if (!active) return;
      setNotifications(current => {
        const ids = new Set(current.map(item => item.id));
        return [...current, ...saved.filter(item => item && typeof item.id === 'string' && !ids.has(item.id))]
          .sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
      });
    }).catch(() => {}).finally(() => { if (active) setNotificationsLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!notificationsLoaded) return;
    void window.quibyApi.saveNotifications(notifications).catch(error => console.error('Notifications save failed:', error));
  }, [notifications, notificationsLoaded]);

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
  const [skinLibrary, setSkinLibrary] = useState(getSavedSkinLibrary);
  const skinDisplayName = getSkinDisplayName(skinLibrary, customSkinName, customSkinImg?.src);
  const [activeDefaultSkinIdx, setActiveDefaultSkinIdx] = useState(0);

  const handleSelectCape = (cape: CapePreset) => {
    if (!session || storedSession()?.token !== session.token) return;
    setSelectedCape(cape);
    localStorage.setItem('quiby_cape', cape.id);
  };

  const skinSyncWarningShown = useRef(false);

  const handleSetCustomSkin = (img: HTMLImageElement | null, name: string | null) => {
    if (!session || storedSession()?.token !== session.token) return;
    setCustomSkinImg(img);
    setCustomSkinName(name);
    if (img && img.src) {
      localStorage.setItem('quiby_custom_skin_data', img.src);
      localStorage.setItem('quiby_custom_skin_name', name || 'custom.png');
    } else {
      localStorage.removeItem('quiby_custom_skin_data');
      localStorage.removeItem('quiby_custom_skin_name');
    }
    if (session) void syncSelectedSkin(session, img?.src || null).then(() => {
      skinSyncWarningShown.current = false;
    }).catch((error: unknown) => {
      if (skinSyncWarningShown.current) return;
      skinSyncWarningShown.current = true;
      handleNotify('Скин пока не обновлён в игре', error instanceof Error ? error.message : 'Проверьте соединение с сервером и повторите выбор.', 'warning');
    });
  };

  const handleSetDefaultSkinIdx = (idx: number) => {
    if (!session || storedSession()?.token !== session.token) return;
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

  const modsForRefresh = useRef(customMods);
  modsForRefresh.current = customMods;
  useEffect(() => {
    let cancelled = false, busy = false;
    const refresh = async () => {
      if (busy || !window.quibyApi) return;
      busy = true;
      try {
        for (const mod of modsForRefresh.current) {
          if (cancelled) break;
          if (!mod.hashSha1) continue;
          try {
            const result = await window.quibyApi.refreshCustomMod(settings.gameDir, mod.filename, mod.hashSha1, session?.token);
            if (cancelled) break;
            const latest = modsForRefresh.current.find(item => item.id === mod.id && item.hashSha1 === mod.hashSha1);
            if (!latest) continue;
            const nextStatus = result.status === 'unverified' && latest.safetyStatus === 'pending' ? 'pending' : result.status;
            if (nextStatus !== latest.safetyStatus) {
              handleNotify(result.isAllowed ? 'Мод разрешён' : 'Статус мода изменён', `${mod.name}: ${result.reason}`, result.isAllowed ? 'success' : 'warning');
              handleUpdateCustomMods(previous => previous.map(item => item.id !== mod.id ? item : {
                ...item, safetyStatus: nextStatus, safetyReason: result.reason,
                enabled: result.isAllowed ? item.enabled : false,
              }));
            }
          } catch { /* Retain decisions on network errors; launch verifies again. */ }
        }
      } finally { busy = false; }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 20000);
    const focus = () => void refresh(); window.addEventListener('focus', focus);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener('focus', focus); };
  }, [settings.gameDir, session?.token]);

  // 4. Playtime & Fast-Connect States
  const [totalPlaytimeSeconds, setTotalPlaytimeSeconds] = useState<number>(0);
  const [autoConnect, setAutoConnect] = useState<boolean>(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => !storedSession());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifiedUpdateVersion = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.token) return;
    const token = session.token;
    const controller = new AbortController();
    let checking = false;
    const refreshAccess = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(`${SERVER_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}`, 'x-quiby-launcher-version': LAUNCHER_VERSION },
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        });
        if (controller.signal.aborted || storedSession()?.token !== token) return;
        if (response.status === 401) {
          localStorage.removeItem('quiby_session');
          setSession(null);
          setIsProfileOpen(false);
          setIsAuthModalOpen(true);
          return;
        }
        if (!response.ok) return;
        const { user } = await response.json() as { user: AuthSession['user'] };
        const current = storedSession();
        if (!user || controller.signal.aborted || current?.token !== token) return;
        const verified = { ...current, user };
        localStorage.setItem('quiby_session', JSON.stringify(verified));
        setSession(verified);
      } catch {
        // Network errors must not change access or sign the player out.
      } finally { checking = false; }
    };
    void refreshAccess();
    const timer = window.setInterval(refreshAccess, 30000);
    window.addEventListener('focus', refreshAccess);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refreshAccess); };
  }, [session?.token]);

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

      const showAvailableUpdate = (state: UpdateState) => {
        setLauncherUpdate(state);
        if (state.status !== 'available' || !state.latestVersion || notifiedUpdateVersion.current === state.latestVersion) return;
        notifiedUpdateVersion.current = state.latestVersion;
        handleNotify('Доступно обновление лаунчера', `Версия ${state.latestVersion}. Нажмите «Скачать обновление» на баннере сверху.`, 'info');
      };
      const unsubscribeUpdate = window.quibyApi.onUpdateState(showAvailableUpdate);
      void window.quibyApi.getUpdateState().then(showAvailableUpdate).catch(() => {});

      return () => {
        unsubscribeProgress?.();
        unsubscribeLog?.();
        unsubscribeState?.();
        unsubscribePlaytime?.();
        unsubscribePlaytimeEnd?.();
        unsubscribeUpdate?.();
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
    if (launcherUpdate?.required) {
      handleNotify('Обновление обязательно', 'Установите обновление лаунчера из верхней плашки перед запуском игры.', 'error');
      return;
    }
    if (!session || session.expiresAt <= Date.now()) {
      setSession(null);
      localStorage.removeItem('quiby_session');
      setIsAuthModalOpen(true);
      return;
    }
    if (!session.user.isWhitelisted) {
      handleNotify('Доступ к лаунчеру закрыт', 'Обратитесь к администрации quiby в Discord.', 'error');
      return;
    }
    setActiveTab('home');
    if (!window.quibyApi) return;
    try {
      const selectedSkin = localStorage.getItem('quiby_custom_skin_data');
      if (selectedSkin) await syncSelectedSkin(session, selectedSkin);
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
      if (err instanceof Error && err.message.includes('У аккаунта нет доступа')) {
        const current = storedSession();
        if (current?.token === session.token) {
          const blocked = { ...current, user: { ...current.user, isWhitelisted: false } };
          localStorage.setItem('quiby_session', JSON.stringify(blocked));
          setSession(blocked);
          handleNotify('Доступ к лаунчеру закрыт', 'Обратитесь к администрации quiby в Discord.', 'error');
        }
        return;
      }
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

      {!isAuthModalOpen && session && <>

      {/* Workspace owns the update banner so sidebar padding applies to it. */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
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
          <LauncherUpdateBanner state={launcherUpdate} />
          {session && !session.user.isWhitelisted && (
            <section role="alert" className="shrink-0 border-b border-red-400/40 bg-red-950/80 px-6 py-4 text-red-100">
              <h2 className="font-bold">Доступ к лаунчеру закрыт</h2>
              <p className="mt-1 text-sm">Запуск игры недоступен. Обратитесь к администрации quiby в Discord. После разрешения доступа плашка исчезнет автоматически.</p>
            </section>
          )}
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
                    customSkinName={skinDisplayName}
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
                    customSkinName={skinDisplayName}
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
                  onLibraryChange={() => setSkinLibrary(getSavedSkinLibrary())}
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
                  disabledBundledMods={settings.disabledBundledMods || []}
                  onToggleBundledMod={modId => { const disabled = settings.disabledBundledMods || []; void handleUpdateSettings({ ...settings, disabledBundledMods: disabled.includes(modId) ? disabled.filter(id => id !== modId) : [...disabled, modId] }); }}
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
        isOpen={isAuthModalOpen || !session}
        onClose={() => { if (storedSession()) setIsAuthModalOpen(false); }}
        onSuccess={handleLoginSuccess}
        serverUrl={SERVER_URL}
      />

      <ProfileDialog
        session={isProfileOpen ? session : null}
        serverUrl={SERVER_URL}
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
