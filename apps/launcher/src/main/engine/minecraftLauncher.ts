import { spawn, exec, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { BrowserWindow } from 'electron';
import { AuthSession, LauncherSettings, LaunchState, LogEntry, ModpackManifest } from '@quiby/shared';
import { syncModpackFiles } from './downloader';
import { ensureMinecraftVanilla } from './mojang';
import { ensureNeoForge } from './neoforge';
import { hashCustomModFile, requireApprovedCustomMod } from './customModVerification';
import { updateDiscordRpcStatus } from '../rpc/discordRpc';
import { selectModpackProfile } from '../../shared/modpackProfiles';
import { applyResourcePackProfile } from './resourcePackProfile';
import { resolveJava21 } from './javaDetector';
import { getLatestModpackManifest } from './manifestSource';
import { readCrashDetails } from './crashDetails';

let runningGameProcess: ChildProcess | null = null;
let gameStartTime: number | null = null;
let playtimeInterval: NodeJS.Timeout | null = null;
let launchInProgress = false;
let trackedPlaytimeSeconds = 0;
let stopRequested = false;

export async function launchMinecraft(
  session: AuthSession,
  settings: LauncherSettings,
  serverBaseUrl: string,
  win: BrowserWindow | null,
  activeCustomModFilenames: string[] = [],
  disabledCustomModFilenames: string[] = []
): Promise<void> {
  if (launchInProgress || runningGameProcess) {
    throw new Error('Minecraft уже запускается или запущен');
  }
  launchInProgress = true;
  stopRequested = false;
  const recentGameOutput: string[] = [];
  const sendLog = (level: LogEntry['level'], message: string, source: LogEntry['source'] = 'launcher') => {
    if (source !== 'launcher') {
      recentGameOutput.push(message);
      if (recentGameOutput.length > 300) recentGameOutput.shift();
    }
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

  const stopPlaytimeTracking = () => {
    if (playtimeInterval) {
      clearInterval(playtimeInterval);
      playtimeInterval = null;
    }
    if (gameStartTime) {
      const elapsedSec = Math.round((Date.now() - gameStartTime) / 1000);
      if (win && !win.isDestroyed()) {
        win.webContents.send('playtime-session-end', Math.max(0, elapsedSec - trackedPlaytimeSeconds));
      }
      gameStartTime = null;
      trackedPlaytimeSeconds = 0;
    }
  };

  try {
    setLaunchState({ status: 'updating' });
    const profileName = settings.modpackProfile === 'full' ? 'Visual' : settings.modpackProfile === 'clean' ? 'Draft' : 'Standard';
    updateDiscordRpcStatus({ details: 'Готовится к игре', state: `Сборка ${profileName} · quiby. S6` });
    sendLog('info', `🚀 Инициализация запуска quiby. Season 6 (Minecraft 1.21.1 NeoForge)...`);
    sendLog('info', `👤 Игрок: ${session.user.mcUsername} (Discord: ${session.user.username})`);

    // 1. Fetch Modpack Manifest from server
    sendLog('info', '🌐 Запрос актуального манифеста сборки...');
    const manifest = selectModpackProfile(await getLatestModpackManifest(serverBaseUrl), settings.modpackProfile);
    const javaBin = await resolveJava21(settings.javaPath, path.join(settings.gameDir, 'runtime'), (label, downloaded, total) => {
      if (!win || win.isDestroyed()) return;
      win.webContents.send('download-progress', {
        stage: 'java', stageLabel: label, currentFile: 'Java 21',
        filesProcessed: downloaded === total && total > 0 ? 1 : 0, totalFiles: 1,
        bytesDownloaded: downloaded, totalBytes: total, speedBps: 0,
        progressPercent: total ? Math.min(100, downloaded / total * 100) : 0,
      });
    });
    sendLog('info', `📦 Загружен манифест версии: ${manifest.name} (v${manifest.version})`);

    const gameDir = path.resolve(settings.gameDir);
    if (!fs.existsSync(gameDir)) {
      fs.mkdirSync(gameDir, { recursive: true });
    }

    const modsDir = path.join(gameDir, 'mods');
    fs.mkdirSync(modsDir, { recursive: true });
    const officialMods = new Set(manifest.files.map((file) => file.path.replace(/\\/g, '/')));
    for (const filename of disabledCustomModFilenames) {
      if (!/^[^/\\]+\.jar$/i.test(filename) || officialMods.has(`mods/${filename}`)) continue;
      const activePath = path.join(modsDir, filename);
      if (fs.existsSync(activePath)) fs.renameSync(activePath, `${activePath}.disabled`);
    }
    for (const filename of activeCustomModFilenames) {
      if (!/^[^/\\]+\.jar$/i.test(filename) || officialMods.has(`mods/${filename}`)) continue;
      const activePath = path.join(modsDir, filename);
      if (!fs.existsSync(activePath) && fs.existsSync(`${activePath}.disabled`)) {
        fs.renameSync(`${activePath}.disabled`, activePath);
      }
    }

    const approvedCustomMods = new Map<string, string>();
    for (const filename of new Set(activeCustomModFilenames)) {
      if (!/^[^/\\]+\.jar$/i.test(filename) || officialMods.has(`mods/${filename}`)) continue;
      const modPath = path.join(modsDir, filename);
      if (!fs.existsSync(modPath)) continue;
      const stat = fs.lstatSync(modPath);
      if (!stat.isFile() || stat.size > 100 * 1024 * 1024) {
        throw new Error(`Недопустимый пользовательский мод: ${filename}`);
      }
      const hash = await hashCustomModFile(modPath);
      await requireApprovedCustomMod(filename, hash, stat.size, serverBaseUrl);
      approvedCustomMods.set(filename, hash);
    }

    // 2. Sync Modpack Files (Mods, Configs, Shaders) with custom mod protection
    sendLog('info', `🔍 Проверка и синхронизация модов...`);
    const protectedFilenames = new Set(approvedCustomMods.keys());
    if (protectedFilenames.size > 0) {
      sendLog('info', `🛡️ Защита ${protectedFilenames.size} активных клиентских модов от очистки`);
    }
    await syncModpackFiles(manifest, gameDir, serverBaseUrl, win, protectedFilenames);
    await applyResourcePackProfile(gameDir, settings.modpackProfile, manifest.files.map(file => file.path));

    // 3. Ensure Vanilla Minecraft 1.21.1
    sendLog('info', `📦 Подготовка файлов Minecraft ${manifest.gameVersion}...`);
    const vanilla = await ensureMinecraftVanilla(manifest.gameVersion, gameDir, win);

    // 4. Ensure NeoForge Loader
    sendLog('info', `⚙️ Проверка загрузчика ${manifest.loader.type} ${manifest.loader.version}...`);
    const neoforge = await ensureNeoForge(manifest.gameVersion, manifest.loader.version, gameDir, javaBin, win);

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
      `-Dquiby.skinApi=${serverBaseUrl.replace(/\/$/, '')}`,
    ];

    // Append NeoForge specific JVM arguments (modulepath, exports, args.txt)
    if (neoforge.jvmArgs && neoforge.jvmArgs.length > 0) {
      jvmArgs.push(...neoforge.jvmArgs);
    }

    if (settings.customJvmArgs) {
      settings.customJvmArgs.split(' ').filter(Boolean).forEach(arg => jvmArgs.push(arg));
    }

    // Classpath: Merge Vanilla + NeoForge libraries
    const cpSeparator = process.platform === 'win32' ? ';' : ':';
    const allLibraries = Array.from(new Set([...vanilla.libraries, ...neoforge.libraries]));
    const classpathEntries = [
      ...allLibraries,
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
      // The Discord/API session is not a Minecraft credential and must stay out of the game process.
      '--accessToken', '0',
      '--userType', 'mojang',
      '--versionType', 'quiby-s6',
      '--width', settings.windowWidth.toString(),
      '--height', settings.windowHeight.toString(),
    ];

    if (neoforge.gameArgs && neoforge.gameArgs.length > 0) {
      gameArgs.push(...neoforge.gameArgs);
    }

    if (settings.fullscreen) {
      gameArgs.push('--fullscreen');
    }

    // Fast-Connect Auto-Join flag
    if (settings.autoJoinServer !== false && manifest.serverAddress) {
      sendLog('info', '⚡ Быстрый вход на сервер');
      gameArgs.push('--quickPlayMultiplayer', manifest.serverAddress);
    }

    const fullArgs = [...jvmArgs, ...gameArgs];

    for (const [filename, approvedHash] of approvedCustomMods) {
      const currentHash = await hashCustomModFile(path.join(modsDir, filename));
      if (currentHash !== approvedHash) throw new Error(`Мод ${filename} изменился после проверки. Запустите игру снова.`);
    }

    sendLog('info', `🚀 Запуск Java 21: ${javaBin}`);
    setLaunchState({ status: 'starting' });

    const gameProcess = spawn(javaBin, fullArgs, {
      cwd: gameDir,
      env: { ...process.env },
      windowsHide: true,
    });

    await new Promise<void>((resolve, reject) => {
      const onSpawn = () => {
        gameProcess.off('error', onError);
        resolve();
      };
      const onError = (error: Error) => {
        gameProcess.off('spawn', onSpawn);
        reject(error);
      };
      gameProcess.once('spawn', onSpawn);
      gameProcess.once('error', onError);
    });

    runningGameProcess = gameProcess;
    launchInProgress = false;
    gameStartTime = Date.now();
    trackedPlaytimeSeconds = 0;

    // Start 60-second heartbeat playtime tracker
    if (playtimeInterval) clearInterval(playtimeInterval);
    playtimeInterval = setInterval(() => {
      trackedPlaytimeSeconds += 60;
      if (win && !win.isDestroyed()) {
        win.webContents.send('playtime-tick', 60);
      }
    }, 60000);

    setLaunchState({ status: 'running', gamePid: gameProcess.pid });
    sendLog('info', `🎮 Игра успешно запущена (PID: ${gameProcess.pid})`);

    // Discord Rich Presence update
    updateDiscordRpcStatus({
      details: 'В игре на quiby. S6',
      state: `${profileName} · Игрок: ${session.user.mcUsername}`,
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

    let finished = false;
    gameProcess.on('error', (err) => {
      if (finished) return;
      finished = true;
      stopPlaytimeTracking();
      sendLog('error', `Ошибка процесса Java: ${err.message}`);
      setLaunchState({ status: 'crashed', error: err.message });
      updateDiscordRpcStatus({ details: 'В главном меню лаунчера', state: 'quiby. Season 6 · Minecraft 1.21.1' });
      runningGameProcess = null;
    });

    gameProcess.on('exit', (code) => {
      if (finished) return;
      finished = true;
      const startedAt = gameStartTime || Date.now();
      stopPlaytimeTracking();
      sendLog('info', `Процесс Minecraft завершился с кодом: ${code}`);
      const crashed = code !== 0 && !stopRequested;
      setLaunchState({
        status: crashed ? 'crashed' : 'stopped',
        exitCode: code ?? undefined,
        error: crashed ? readCrashDetails(gameDir, startedAt, code, recentGameOutput) : undefined,
      });
      runningGameProcess = null;

      updateDiscordRpcStatus({
        details: 'В главном меню лаунчера',
        state: 'Готов к игре на quiby. S6',
      });
    });

  } catch (error: any) {
    launchInProgress = false;
    stopPlaytimeTracking();
    updateDiscordRpcStatus({ details: 'В главном меню лаунчера', state: 'quiby. Season 6 · Minecraft 1.21.1' });
    sendLog('error', `Критическая ошибка запуска: ${error.message}`);
    setLaunchState({ status: 'crashed', error: error.message });
    throw error;
  }
}

export function killGameProcess(): void {
  stopRequested = true;
  if (playtimeInterval) {
    clearInterval(playtimeInterval);
    playtimeInterval = null;
  }
  if (runningGameProcess) {
    if (process.platform === 'win32' && runningGameProcess.pid) {
      const pid = runningGameProcess.pid;
      exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) {
          console.error(`Failed to kill game process tree (PID ${pid}):`, err);
        }
      });
    } else {
      runningGameProcess.kill('SIGTERM');
    }
  }
}
