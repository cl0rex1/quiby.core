import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { PlayView } from './views/PlayView';
import { ModpackView } from './views/ModpackView';
import { NewsView } from './views/NewsView';
import { ConsoleView } from './views/ConsoleView';
import { SettingsView } from './views/SettingsView';
import { DiscordAuthModal } from './components/DiscordAuthModal';
import { AuthSession, DownloadProgress, LauncherSettings, LaunchState, LogEntry, ModpackManifest, NewsArticle, ServerStatus } from '@quiby/shared';

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
  const [currentTab, setCurrentTab] = useState<NavTab>('play');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [settings, setSettings] = useState<LauncherSettings>(defaultSettings);
  const [manifest, setManifest] = useState<ModpackManifest | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [launchState, setLaunchState] = useState<LaunchState>({ status: 'idle' });
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 1. Initial Load (Settings & Saved Session)
  useEffect(() => {
    const saved = localStorage.getItem('quiby_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (_) {}
    }

    if (window.quibyApi) {
      window.quibyApi.getSettings().then(s => {
        if (s) setSettings(s);
      });

      // IPC event listeners
      const unsubscribeProgress = window.quibyApi.onDownloadProgress((p) => {
        setDownloadProgress(p);
      });

      const unsubscribeLog = window.quibyApi.onGameLog((log) => {
        setLogs(prev => [...prev.slice(-1000), log]); // Keep last 1000 lines
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

  // 2. Fetch Remote Manifest, News, and Server Ping
  const fetchRemoteData = async () => {
    try {
      // Manifest
      const manRes = await fetch(`${SERVER_URL}/api/modpack/latest`);
      if (manRes.ok) {
        setManifest(await manRes.json());
      }

      // News
      const newsRes = await fetch(`${SERVER_URL}/api/news`);
      if (newsRes.ok) {
        setNewsArticles(await newsRes.json());
      }

      // Server Status
      const statusRes = await fetch(`${SERVER_URL}/api/status`);
      if (statusRes.ok) {
        setServerStatus(await statusRes.json());
      }
    } catch (e) {
      console.warn('Backend server not reachable yet, operating in standalone/mock mode.');
    }
  };

  useEffect(() => {
    fetchRemoteData();
    const interval = setInterval(fetchRemoteData, 30000); // Ping every 30s
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
    <div className="flex flex-col h-screen w-screen bg-quiby-dark text-slate-100 overflow-hidden select-none font-sans">
      {/* Top Header */}
      <Header
        session={session}
        serverStatus={serverStatus}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main App Body with Sidebar & Dynamic View */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          logsCount={logs.length}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-quiby-dark to-slate-950">
          {currentTab === 'play' && (
            <PlayView
              session={session}
              settings={settings}
              manifest={manifest}
              serverStatus={serverStatus}
              launchState={launchState}
              downloadProgress={downloadProgress}
              onLaunch={handleLaunchGame}
              onKill={handleKillGame}
              onOpenLogin={() => setIsAuthModalOpen(true)}
            />
          )}

          {currentTab === 'modpack' && (
            <ModpackView
              manifest={manifest}
              onRefresh={fetchRemoteData}
            />
          )}

          {currentTab === 'news' && (
            <NewsView
              articles={newsArticles}
            />
          )}

          {currentTab === 'console' && (
            <ConsoleView
              logs={logs}
              onClearLogs={() => setLogs([])}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>
      </div>

      {/* Discord OAuth Modal */}
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
