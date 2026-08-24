import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { BrowserWindow } from 'electron';
import { AuthSession, LauncherSettings, LaunchState, LogEntry, ModpackManifest } from '@quiby/shared';
import { syncModpackFiles } from './downloader';
import { ensureMinecraftVanilla } from './mojang';
import { ensureNeoForge } from './neoforge';
import { updateDiscordRpcStatus } from '../rpc/discordRpc';

let runningGameProcess: ChildProcess | null = null;

export async function launchMinecraft(
  session: AuthSession,
  settings: LauncherSettings,
  serverBaseUrl: string,
  win: BrowserWindow | null
): Promise<void> {
  const sendLog = (level: LogEntry['level'], message: string, source: LogEntry['source'] = 'launcher') => {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source,
    };
    if (win && !win.isDestroyed()) {
      win.webContents.send('game-log', entry);
    }
  };

  const setLaunchState = (state: LaunchState) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('launch-state-change', state);
    }
  };

  try {
    setLaunchState({ status: 'updating' });
    sendLog('info', `🚀 Инициализация запуска quiby. Season 6 (Minecraft 1.21.1 NeoForge)...`);
    sendLog('info', `👤 Игрок: ${session.user.mcUsername} (Discord: ${session.user.username})`);

    // 1. Fetch Modpack Manifest from server
    sendLog('info', `🌐 Запрос актуального манифеста с сервера ${serverBaseUrl}...`);
    const manifestRes = await fetch(`${serverBaseUrl.replace(/\/$/, '')}/api/modpack/latest`);
    if (!manifestRes.ok) {
      throw new Error(`Не удалось получить манифест сборки с сервера: ${manifestRes.statusText}`);
    }
    const manifest: ModpackManifest = await manifestRes.json();
    sendLog('info', `📦 Загружен манифест версии: ${manifest.name} (v${manifest.version})`);

    const gameDir = path.resolve(settings.gameDir);
    if (!fs.existsSync(gameDir)) {
      fs.mkdirSync(gameDir, { recursive: true });
    }

    // 2. Sync Modpack Files (Mods, Configs, Shaders)
    sendLog('info', `🔍 Проверка и синхронизация модов...`);
    await syncModpackFiles(manifest, gameDir, serverBaseUrl, win);

    // 3. Ensure Vanilla Minecraft 1.21.1
    sendLog('info', `📦 Подготовка файлов Minecraft ${manifest.gameVersion}...`);
    const vanilla = await ensureMinecraftVanilla(manifest.gameVersion, gameDir, win);

    // 4. Ensure NeoForge Loader
    sendLog('info', `⚙️ Проверка загрузчика ${manifest.loader.type} ${manifest.loader.version}...`);
    const neoforge = await ensureNeoForge(manifest.gameVersion, manifest.loader.version, gameDir, settings.javaPath, win);

    // 5. Construct Launch Arguments
    sendLog('info', `🛠️ Формирование аргументов запуска JVM (Память: ${settings.ramMinMb}MB - ${settings.ramMaxMb}MB)...`);

    const jvmArgs: string[] = [
      `-Xms${settings.ramMinMb}M`,
      `-Xmx${settings.ramMaxMb}M`,
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=200',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:+AlwaysPreTouch',
      '-XX:G1NewSizePercent=30',
      '-XX:G1MaxNewSizePercent=40',
      '-XX:G1ReservePercent=20',
      '-XX:G1HeapWastePercent=5',
      '-XX:G1MixedGCCountTarget=4',
      `-Djava.library.path=${path.join(gameDir, 'natives')}`,
      `-Dminecraft.launcher.brand=quiby.core`,
      `-Dminecraft.launcher.version=1.0.0`,
    ];

    if (settings.customJvmArgs) {
      settings.customJvmArgs.split(' ').filter(Boolean).forEach(arg => jvmArgs.push(arg));
    }

    // Classpath
    const cpSeparator = process.platform === 'win32' ? ';' : ':';
    const classpathEntries = [
      vanilla.clientJar,
      ...vanilla.libraries,
    ].filter(p => fs.existsSync(p));

    jvmArgs.push('-cp', classpathEntries.join(cpSeparator));

    // Main Class & Game Args
    const mainClass = neoforge.mainClass || vanilla.versionJson.mainClass || 'net.minecraft.client.main.Main';
    const gameArgs = [
      mainClass,
      '--username', session.user.mcUsername,
      '--version', manifest.gameVersion,
      '--gameDir', gameDir,
      '--assetsDir', path.join(gameDir, 'assets'),
      '--assetIndex', vanilla.versionJson.assetIndex.id,
      '--uuid', session.user.uuid,
      '--accessToken', session.token,
      '--userType', 'mojang',
      '--versionType', 'quiby-s6',
      '--width', settings.windowWidth.toString(),
      '--height', settings.windowHeight.toString(),
    ];

    if (settings.fullscreen) {
      gameArgs.push('--fullscreen');
    }

    if (settings.serverIp) {
      gameArgs.push('--quickPlayMultiplayer', settings.serverIp);
    }

    const fullArgs = [...jvmArgs, ...gameArgs];

    sendLog('info', `🚀 Запуск Java процесса: ${settings.javaPath}`);
    setLaunchState({ status: 'starting' });

    const javaBin = settings.javaPath || 'java';
    const gameProcess = spawn(javaBin, fullArgs, {
      cwd: gameDir,
      env: { ...process.env },
    });

    runningGameProcess = gameProcess;
    setLaunchState({ status: 'running', gamePid: gameProcess.pid });
    sendLog('info', `🎮 Игра успешно запущена (PID: ${gameProcess.pid})`);

    // Discord Rich Presence update
    updateDiscordRpcStatus({
      details: 'В игре на quiby. S6',
      state: `Игрок: ${session.user.mcUsername}`,
      startTimestamp: Date.now(),
    });

    gameProcess.stdout?.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        sendLog('info', line, 'game');
      }
    });

    gameProcess.stderr?.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        const isError = line.toLowerCase().includes('error') || line.toLowerCase().includes('exception');
        sendLog(isError ? 'error' : 'warn', line, 'neoforge');
      }
    });

    gameProcess.on('error', (err) => {
      sendLog('error', `Ошибка процесса Java: ${err.message}`);
      setLaunchState({ status: 'crashed', error: err.message });
      runningGameProcess = null;
    });

    gameProcess.on('exit', (code) => {
      sendLog('info', `Процесс Minecraft завершился с кодом: ${code}`);
      setLaunchState({ status: code === 0 ? 'stopped' : 'crashed', exitCode: code || 0 });
      runningGameProcess = null;

      updateDiscordRpcStatus({
        details: 'В главном меню лаунчера',
        state: 'Готов к игре на quiby. S6',
      });
    });

  } catch (error: any) {
    sendLog('error', `Критическая ошибка запуска: ${error.message}`);
    setLaunchState({ status: 'crashed', error: error.message });
    throw error;
  }
}

export function killGameProcess(): void {
  if (runningGameProcess) {
    runningGameProcess.kill('SIGTERM');
    runningGameProcess = null;
  }
}
