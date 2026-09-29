import path from 'path';
import controlRoutes from './routes/control';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { initDatabase } from './models/db';
import authRoutes from './routes/auth';
import modpackRoutes from './routes/modpack';
import newsRoutes from './routes/news';
import statusRoutes from './routes/status';
import adminRoutes from './routes/admin';
import modsRoutes from './routes/mods';
import botRoutes from './routes/bot';
import skinsRoutes from './routes/skins';
import { getLatestManifest, publishModpackVersion } from './services/modpackService';
import { ModpackManifest } from '@quiby/shared';

async function refreshReleasedModpack(): Promise<void> {
  try {
    const response = await fetch('https://github.com/cl0rex1/quiby-modpacks/releases/latest/download/manifest.json', {
      headers: { 'User-Agent': 'quiby-core-api' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const manifest = await response.json() as ModpackManifest;
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || manifest.gameVersion !== '1.21.1'
      || manifest.loader?.type !== 'neoforge' || !Array.isArray(manifest.files) || manifest.files.length === 0
      || !manifest.files.every(file => typeof file.path === 'string' && !file.path.includes('..')
        && /^[a-f0-9]{64}$/i.test(file.sha256) && Number.isSafeInteger(file.size) && file.size > 0
        && typeof file.downloadUrl === 'string'
        && (file.downloadUrl.startsWith('https://github.com/cl0rex1/quiby-modpacks/releases/download/')
          || file.downloadUrl.startsWith('https://cdn.modrinth.com/')))) {
      throw new Error('Invalid release manifest');
    }
    const current = await getLatestManifest();
    if (!current || manifest.version.localeCompare(current.version, undefined, { numeric: true }) > 0) {
      await publishModpackVersion(manifest);
      console.log(`📦 Activated modpack release ${manifest.version}`);
    }
  } catch (error) {
    console.warn('Modpack release sync skipped:', error);
  }
}

async function bootstrap() {
  const app = express();

  // Security & Middleware
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Database
  await initDatabase();
  console.log('✅ SQLite database initialized successfully.');
  void refreshReleasedModpack();
  setInterval(() => void refreshReleasedModpack(), 10 * 60 * 1000).unref();

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'quiby.core backend server',
      version: '6.0.0-neoforge-1.21.1',
      time: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/modpack', modpackRoutes);
  app.use('/api/news', newsRoutes);
  app.use('/api/status', statusRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/control', controlRoutes);
  app.use('/admin', express.static(path.join(__dirname, '../public/admin'), { index: 'index.html', maxAge: 0 }));
  app.use('/api/mods', modsRoutes);
  app.use('/api/bot', botRoutes);
  app.use('/api/skins', skinsRoutes);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  const server = app.listen(config.port, config.host, () => {
    console.log(`🚀 quiby.core backend running at http://${config.host}:${config.port}`);
    console.log(`🎮 Target Minecraft: ${config.minecraft.targetGameVersion} (${config.minecraft.targetLoader} ${config.minecraft.targetLoaderVersion})`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Порт ${config.port} уже занят другим процессом.`);
      console.error(`👉 Чтобы освободить порт на macOS/Linux: npx kill-port ${config.port}`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
