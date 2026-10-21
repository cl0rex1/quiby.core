import { useMotion } from './components/MotionProvider';
import { useCloudPlaytime } from './utils/useCloudPlaytime';
import { ReviewContext } from './components/ReviewContext';
import { notificationRevision, upsertNotification } from './utils/notifications';
import { createSkinSynchronizer } from './utils/skinSync';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { normalizeSettings } from '../../shared/launcherSettings';
import { selectModpackProfile } from '../../shared/modpackProfiles';
import { applyBuildToMods, selectedBuild } from './utils/buildProfiles';
import { WindowHeader } from './components/WindowHeader';
import { LauncherAccessScreen, useLauncherAccess } from './components/LauncherAccessScreen';
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
} from '@quiby/shared';

const SERVER_URL = (import.meta.env.VITE_QUIBY_API_URL || 'https://api.quiby.me').replace(/\/$/, '');

function storedSession(): AuthSession | null {
  try {
    const value = localStorage.getItem('quiby_session');
    if (!value) return null;
    const session = JSON.parse(value) as AuthSession;
    return typeof session.token === 'string' && session.token && session.expiresAt > Date.now()
      && session.user && typeof session.user.mcUsername === 'string' ? session : null;
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
  const launcherAccess = useLauncherAccess(SERVER_URL);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('quiby_sidebar_collapsed') === 'true');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [session, setSession] = useState<AuthSession | null>(storedSession);
  const [remoteManifest, setManifest] = useState<ModpackManifest | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsAvailable, setNewsAvailable] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const pendingLogs = useRef<LogEntry[]>([]);
  const clearLogs = () => { pendingLogs.current = []; setLogs([]); };
  const [launchState, setLaunchState] = useState<LaunchState>({ status: 'idle' });
  const [launcherUpdate, setLauncherUpdate] = useState<UpdateState | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [launchPending, setLaunchPending] = useState(false);
  const [launchTransition, setLaunchTransition] = useState(false);
  const { active: motionActive } = useMotion();
  useEffect(() => {
    if (!launchTransition) return;
    if (!motionActive) { setLaunchTransition(false); return; }
    const timer = window.setTimeout(() => setLaunchTransition(false), 650);
    return () => window.clearTimeout(timer);
  }, [launchTransition, motionActive]);
  const launchRequested = useRef(false);
  const latestLaunchState = useRef<LaunchState>({ status: 'idle' });
  const [selectedModIds, setSelectedModIds] = useState<string[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const dismissedNotifications = useRef<Record<string, string>>({});
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleNotify = useCallback((
    title: string,
    message?: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success',
    modInfo?: NotificationItem['modInfo']
  ) => {
    const newNotif: NotificationItem = {
      id: modInfo?.hashSha1 ? 'review-' + modInfo.hashSha1 : 'notif-' + crypto.randomUUID(),
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false,
      modInfo,
    };
    setNotifications(prev => upsertNotification(prev, newNotif));
    setSelectedNotificationId(current => current || newNotif.id);
    setActiveToast({
      id: newNotif.id,
      title,
      message,
      type,
    });
  }, []);

  useEffect(() => {
    let active = true;
    try {
      const saved = JSON.parse(localStorage.getItem('quiby_notification_dismissals') || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) dismissedNotifications.current = saved;
    } catch { /* Recover corrupt dismissal receipts. */ }
    void window.quibyApi.loadNotifications().then(saved => {
      if (!active) return;
      setNotifications(current => {
        const ids = new Set(current.map(item => item.id));
        const restored = saved.filter(item => item && typeof item.id === 'string' && !ids.has(item.id)).map(item =>
          item.modInfo?.reviewStage === 'uploading' ? { ...item, type: 'error' as const, read: false, timestamp: Date.now(),
            message: 'Отправка прервана закрытием лаунчера. Повторите заявку в разделе контента.',
            modInfo: { ...item.modInfo, reviewStage: 'error' as const } } : item);
        return [...current, ...restored]
          .sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
      });
    }).catch(() => {}).finally(() => { if (active) setNotificationsLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!notificationsLoaded) return;
    void window.quibyApi.saveNotifications(notifications).catch(error => console.error('Notifications save failed:', error));
  }, [notifications, notificationsLoaded]);

  const dismissNotifications = (items: NotificationItem[]) => {
    for (const item of items) dismissedNotifications.current[item.id] = notificationRevision(item);
    try { localStorage.setItem('quiby_notification_dismissals', JSON.stringify(dismissedNotifications.current)); }
    catch { /* Keep receipts for this session if storage is unavailable. */ }
    setActiveToast(previous => previous && items.some(item => item.id === previous.id) ? null : previous);
  };

  // 1. Settings State (Auto-saving)
  const [settings, setSettings] = useState<LauncherSettings>(defaultSettings);
  const [settingsStatus, setSettingsStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const settingsRevision = useRef(0);
  const manifest = useMemo(() => remoteManifest ? selectModpackProfile(remoteManifest, settings.modpackProfile) : null, [remoteManifest, settings.modpackProfile]);

  const handleUpdateSettings = async (newSettings: LauncherSettings) => {
    newSettings = normalizeSettings(newSettings, defaultSettings);
    const revision = ++settingsRevision.current;
    setSettings(newSettings);
    setSettingsStatus('saving');
    if (newSettings.autoJoinServer !== undefined) {
      setAutoConnect(newSettings.autoJoinServer);
      localStorage.setItem('quiby_auto_connect', String(newSettings.autoJoinServer));
    }
    try {
      if (!window.quibyApi || !await window.quibyApi.saveSettings(newSettings)) throw new Error('Settings save failed');
      if (revision === settingsRevision.current) setSettingsStatus('saved');
      return true;
    } catch {
      if (revision === settingsRevision.current) setSettingsStatus('error');
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
    if (launchRequested.current || ['updating', 'starting', 'running'].includes(latestLaunchState.current.status)) return;
    if (!session || storedSession()?.token !== session.token) return;
    setSelectedCape(cape);
    localStorage.setItem('quiby_cape', cape.id);
  };

  const skinSyncWarningShown = useRef(false);

  const handleSetCustomSkin = (img: HTMLImageElement | null, name: string | null) => {
    if (launchRequested.current || ['updating', 'starting', 'running'].includes(latestLaunchState.current.status)) return;
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
    if (launchRequested.current || ['updating', 'starting', 'running'].includes(latestLaunchState.current.status)) return;
    if (!session || storedSession()?.token !== session.token) return;
    setActiveDefaultSkinIdx(idx);
    localStorage.setItem('quiby_default_skin_idx', String(idx));
  };

  // 3. Custom Mods State (Auto-saving)
  const [customMods, setCustomMods] = useState<CustomModItem[]>(initialCustomMods);
  const modsForRefresh = useRef(customMods);
  modsForRefresh.current = customMods;

  const handleUpdateCustomMods = (update: React.SetStateAction<CustomModItem[]>) => {
    setCustomMods((previous) => {
      const next = typeof update === 'function' ? update(previous) : update;
      localStorage.setItem('quiby_custom_mods', JSON.stringify(next));
      return next;
    });
  };

  const reviewsInFlight = useRef(new Set<string>());
  const publishReview = useCallback((info: NonNullable<NotificationItem['modInfo']>, message: string) => {
    if (/\.jar$/i.test(info.filename || '') && !modsForRefresh.current.some(mod => mod.hashSha1 === info.hashSha1)) return;
    const stage = info.reviewStage!;
    const item: NotificationItem = { id: 'review-' + info.hashSha1, title: `Заявка: ${info.name}`, message,
      type: stage === 'approved' ? 'success' : ['error', 'rejected'].includes(stage) ? 'error' : 'info',
      timestamp: Date.now(), read: false, modInfo: info };
    if (dismissedNotifications.current[item.id] !== notificationRevision(item)) {
      setNotifications(previous => upsertNotification(previous, item));
    }
    setCustomMods(previous => {
      const failed = stage === 'error';
      if (!previous.some(mod => mod.hashSha1 === info.hashSha1 && Boolean(mod.reviewDeliveryFailed) !== failed)) return previous;
      const next = previous.map(mod => mod.hashSha1 === info.hashSha1 ? { ...mod, reviewDeliveryFailed: failed } : mod);
      localStorage.setItem('quiby_custom_mods', JSON.stringify(next));
      return next;
    });
    setActiveToast(previous => previous?.id === item.id && (previous.title !== item.title || previous.message !== item.message || previous.type !== item.type)
      ? { id: item.id, title: item.title, message: item.message, type: item.type } : previous);
  }, []);
  const submitReview = (mod: CustomModItem, reason: string, projectUrl: string) => {
    if (!session?.token || !mod.hashSha1) throw new Error('Выберите файл и войдите в аккаунт.');
    if (reviewsInFlight.current.has(mod.hashSha1)) throw new Error('Заявка уже отправляется. Статус — в уведомлениях.');
    const hash = mod.hashSha1;
    const info = { name: mod.name, filename: mod.filename, hashSha1: hash };
    // An explicit retry starts a new lifecycle, even if an earlier one was cleared.
    delete dismissedNotifications.current['review-' + hash];
    try { localStorage.setItem('quiby_notification_dismissals', JSON.stringify(dismissedNotifications.current)); } catch { /* Retain the in-memory reset. */ }
    reviewsInFlight.current.add(hash);
    setSelectedNotificationId('review-' + hash);
    publishReview({ ...info, reviewStage: 'uploading' }, 'Файл отправляется в фоне…');
    setActiveToast({ id: 'review-' + hash, title: 'Отправляем заявку', message: 'Статус — в уведомлениях.', type: 'info' });
    void window.quibyApi.uploadModReview(hash, session.token, { mod_name: mod.name.slice(0, 100), filename: mod.filename, reason, project_url: projectUrl })
      .then(result => {
        if (!result.success) throw new Error(result.message || 'Не удалось отправить заявку');
        publishReview({ ...info, reviewStage: result.delivered ? 'pending' : 'queued' }, result.delivered ? 'Файл доставлен. Ожидаем решения.' : 'Заявка принята. Ожидаем доставки.');
        handleUpdateCustomMods(previous => previous.map(item => item.hashSha1 === hash ? { ...item, safetyStatus: 'pending', safetyReason: 'Ожидаем решения' } : item));
      }).catch(error => publishReview({ ...info, reviewStage: 'error' }, error instanceof Error ? error.message : 'Не удалось отправить файл. Повторите заявку.'))
      .finally(() => reviewsInFlight.current.delete(hash));
  };
  useEffect(() => {
    if (!session?.token || !notificationsLoaded || settingsStatus === 'loading') return;
    const controller = new AbortController();
    let busy = false;
    const refresh = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const response = await fetch(`${SERVER_URL}/api/mods/reviews/mine`, { headers: { Authorization: `Bearer ${session.token}` }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) return;
        const items = await response.json();
        if (controller.signal.aborted || !Array.isArray(items)) return;
        // The endpoint includes historical requests, including deleted files.
        const packs = items.some(item => typeof item.filename === 'string' && /\.zip$/i.test(item.filename))
          ? await window.quibyApi.getResourcePackInventory(settings.gameDir) : [];
        if (controller.signal.aborted) return;
        for (const item of items) {
          if (typeof item.filename !== 'string' || typeof item.hashSha1 !== 'string') continue;
          if (reviewsInFlight.current.has(item.hashSha1)) continue;
          if (/\.zip$/i.test(item.filename) && !packs.some(pack => pack.filename === item.filename)) continue;
          publishReview({ name: item.name, filename: item.filename, hashSha1: item.hashSha1, reviewStage: item.stage }, item.message);
        }
      } catch { /* Keep the last confirmed status while offline. */ }
      finally { busy = false; }
    };
    void refresh();
    const timer = setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [session?.token, publishReview, notificationsLoaded, settings.gameDir, settingsStatus === 'loading']);
  useEffect(() => {
    let cancelled = false, busy = false;
    const refresh = async () => {
      if (busy || document.hidden || !window.quibyApi) return;
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
  const { total: totalPlaytimeSeconds, add: addPlaytime } = useCloudPlaytime(session, SERVER_URL);
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
    let active = true;
    const initialRevision = settingsRevision.current;
    // Check Onboarding
    const onboarded = localStorage.getItem('quiby_onboarded');
    if (!onboarded) {
      setIsOnboardingOpen(true);
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
      img.onload = () => { if (active) setCustomSkinImg(img); };
      img.src = savedSkinData;
      setCustomSkinName(savedName || 'custom.png');
    }

    // Restore Default Skin Choice (Steve / Alex)
    const savedDefIdx = localStorage.getItem('quiby_default_skin_idx');
    if (savedDefIdx !== null) {
      const idx = savedDefIdx === '1' ? 1 : 0;
      setActiveDefaultSkinIdx(idx);
    }

    // Restore Custom Mods
    const savedModsJson = localStorage.getItem('quiby_custom_mods');
    if (savedModsJson) {
      try {
        const parsed = JSON.parse(savedModsJson);
        if (Array.isArray(parsed)) setCustomMods(parsed.filter((mod) => mod && typeof mod.id === 'string' && typeof mod.filename === 'string' && typeof mod.name === 'string' && !mod.id.startsWith('test-')));
      } catch (_) {}
    }

    // Restore Launcher Settings from Electron IPC
    if (window.quibyApi) {
      window.quibyApi.getSettings().then((s) => {
        if (active && s && initialRevision === settingsRevision.current) {
          setSettings(normalizeSettings(s, defaultSettings));
          if (s.modpackProfile === 'full') setIsOnboardingOpen(true);
          setSettingsStatus('saved');
          if (s.autoJoinServer !== undefined) {
            setAutoConnect(s.autoJoinServer);
          }
        }
      }).catch(() => {
        if (!active) return;
        setSettingsStatus('error');
        handleNotify('Не удалось загрузить настройки', 'Откройте настройки и повторите сохранение перед запуском.', 'error');
      });

      const unsubscribeProgress = window.quibyApi.onDownloadProgress((p) => {
        setDownloadProgress(p);
      });

      // Minecraft can emit hundreds of messages per second. Render one bounded batch.
      const logTimer = window.setInterval(() => {
        if (!pendingLogs.current.length) return;
        const batch = pendingLogs.current;
        pendingLogs.current = [];
        setLogs(previous => [...previous, ...batch].slice(-1000));
      }, 100);
      const unsubscribeLog = window.quibyApi.onGameLog(log => {
        pendingLogs.current.push(log);
        if (pendingLogs.current.length > 1000) pendingLogs.current.shift();
      });

      let receivedLiveState = false;
      const unsubscribeState = window.quibyApi.onLaunchStateChange((state) => {
        receivedLiveState = true;
        latestLaunchState.current = state;
        setLaunchState(state);
        if (state.status === 'crashed') {
          setLaunchTransition(false);
          handleNotify('Сбой Minecraft', state.error || `Игра завершилась с кодом ${state.exitCode ?? 'неизвестно'}.`, 'error');
        }
      });
      void window.quibyApi.getLaunchState().then(state => {
        if (!active || receivedLiveState) return;
        latestLaunchState.current = state;
        setLaunchState(state);
      }).catch(() => {});

      const unsubscribePlaytime = window.quibyApi.onPlaytimeTick?.((sec) => {
        addPlaytime(sec);
      });

      const unsubscribePlaytimeEnd = window.quibyApi.onPlaytimeSessionEnd?.((sec) => {
        addPlaytime(sec);
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
        active = false;
        unsubscribeProgress?.();
        unsubscribeLog?.();
        window.clearInterval(logTimer);
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
    const getJson = (route: string) => fetch(`${SERVER_URL}${route}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) })
      .then(response => response.ok ? response.json() : null).catch(() => null);
    const refresh = async () => {
      if (!document.hidden) {
        const refreshContent = Date.now() >= nextContentRefresh;
        const [, content] = await Promise.all([
          getJson('/api/news').then(articles => {
            if (stopped) return;
            if (Array.isArray(articles)) setNews(articles);
            setNewsAvailable(Array.isArray(articles)); setNewsLoading(false);
          }),
          refreshContent ? Promise.all([
            window.quibyApi?.getLatestModpackManifest().catch(() => null) ?? getJson('/api/modpack/latest'),
          ]) : null,
        ]);
        if (stopped) return;
        if (content) {
          if (content[0]) setManifest(content[0]);
          nextContentRefresh = Date.now() + 300000;
        }
      }
      if (!stopped) timer = setTimeout(refresh, 30000);
    };
    void refresh();
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, []);

  useEffect(() => {
    if (!notificationsLoaded) return;
    const key = 'quiby_news_seen';
    let seen: Record<string, string> = {};
    try { const value = JSON.parse(localStorage.getItem(key) || '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) seen = value; } catch { /* Recover corrupt receipts. */ }
    const incoming: NotificationItem[] = [];
    for (const article of news) {
      if (!article.broadcastRevision || seen[article.id] === article.broadcastRevision) continue;
      seen[article.id] = article.broadcastRevision;
      incoming.push({ id: 'news-' + article.id, newsRevision: article.broadcastRevision, title: article.title, message: article.content, timestamp: Date.now(), read: false, type: 'info' });
    }
    if (!incoming.length) return;
    setNotifications(previous => incoming.reduce((items, item) => upsertNotification(items, item), previous));
    setActiveToast({ id: incoming[0].id, title: incoming.length === 1 ? incoming[0].title : 'Новые объявления', message: 'Откройте почту, чтобы прочитать.', type: 'info' });
    try { localStorage.setItem(key, JSON.stringify(Object.fromEntries(Object.entries(seen).slice(-500)))); } catch { /* Notifications still persist through the desktop bridge. */ }
  }, [news, notificationsLoaded]);

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
    if (settings.modpackProfile === 'full') { setIsOnboardingOpen(true); return; }
    if (launchRequested.current || ['updating', 'starting', 'running'].includes(latestLaunchState.current.status)) return;
    if (settingsStatus !== 'saved') {
      handleNotify('Настройки ещё не сохранены', 'Дождитесь сохранения или повторите его в настройках.', 'warning');
      return;
    }
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
    launchRequested.current = true;
    setLaunchTransition(motionActive);
    setLaunchPending(true);
    setDownloadProgress(null);
    clearLogs();
    latestLaunchState.current = { status: 'idle' };
    try {
      const selectedSkin = localStorage.getItem('quiby_custom_skin_data');
      if (selectedSkin) await syncSelectedSkin(session, selectedSkin);
    } catch (err) {
      setLaunchTransition(false);
      handleNotify('Не удалось синхронизировать скин', err instanceof Error ? err.message : 'Проверьте соединение и попробуйте снова.', 'error');
      launchRequested.current = false;
      setLaunchPending(false);
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
      setLaunchTransition(false);
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
      // Engine failures already arrive with a crash report; preflight failures do not.
      if (latestLaunchState.current.status !== 'crashed') {
        handleNotify('Не удалось запустить игру', err instanceof Error ? err.message : 'Повторите запуск.', 'error');
      }
    } finally {
      launchRequested.current = false;
      setLaunchPending(false);
    }
  };

  const handleKillGame = () => {
    void window.quibyApi?.killGame().catch(error => handleNotify('Не удалось остановить игру', String(error), 'error'));
  };

  // Otherwise, render the Main Launcher Window:
  if (!launcherAccess.access || launcherAccess.access.closed) return <div className="launcher-app flex flex-col h-screen bg-[#0c0c0d] text-zinc-100">
    <WindowHeader/><LauncherUpdateBanner state={launcherUpdate}/>
    <LauncherAccessScreen checking={launcherAccess.checking} loading={!launcherAccess.access && !launcherAccess.error} unavailable={!launcherAccess.access && Boolean(launcherAccess.error)}
      message={launcherAccess.access?.message || launcherAccess.error || 'Соединяемся с Quiby…'} onRetry={launcherAccess.retry}/>
  </div>;
  return (
    <ReviewContext.Provider value={submitReview}><div style={{ '--sidebar-width': isNotificationsOpen ? '310px' : sidebarCollapsed ? '72px' : '192px' } as React.CSSProperties} className="launcher-app flex flex-col h-screen w-screen bg-[#0c0c0d] text-zinc-100 overflow-hidden select-none font-sans relative">
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
            dismissNotifications(notifications);
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
              newsLoading={newsLoading}
              notification={
                notifications.find((n) => n.id === selectedNotificationId) || null
              }
              onDeleteNotification={(id) => {
                dismissNotifications(notifications.filter(n => n.id === id));
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
                !launchTransition && ((launchPending && launchState.status !== 'crashed') || launchState.status === 'updating' || launchState.status === 'starting' || launchState.status === 'running') ? (
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
                    onClearLogs={clearLogs}
                  />
                ) : (
                  <CharacterStage background={settings.homeBackground} manifest={manifest} buildId={selectedBuild(settings).id} totalPlaytimeSeconds={totalPlaytimeSeconds} launching={launchTransition}/>
                )
              )}

              {activeTab === 'wardrobe' && (
                <SkinWardrobeView
                  background={settings.wardrobeBackground}
                  gameActive={launchPending || ['updating', 'starting', 'running'].includes(launchState.status)}
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
                  gameActive={launchPending || ['updating', 'starting', 'running'].includes(launchState.status)}
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
                  saveStatus={settingsStatus}
                  onRetrySave={() => void handleUpdateSettings(settings)}
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
            transitioning={launchTransition}
            session={session}
            launchState={launchState}
            launchPending={launchPending || settingsStatus === 'loading' || settingsStatus === 'saving'}
            launchBlocked={launcherUpdate?.required ? 'Обновите лаунчер' : settingsStatus === 'error' ? 'Проверьте настройки' : undefined}
            onLaunch={handleLaunchGame}
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
        gameActive={launchPending || ['updating', 'starting', 'running'].includes(launchState.status)}
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
        isOpen={isOnboardingOpen && !isAuthModalOpen && settingsStatus !== 'loading'}
        settings={settings}
        onClose={() => setIsOnboardingOpen(false)}
        onApplyPreset={async (updated, profile) => {
          const merged = { ...settings, ...updated };
          if (!await handleUpdateSettings(merged)) throw new Error("Settings save failed");

          handleUpdateCustomMods(applyBuildToMods(customMods, profile));

          handleNotify('Настройки сохранены', 'Память и клиентские моды настроены.', 'success');
        }}
      />
    </div></ReviewContext.Provider>
  );
};

export default App;
