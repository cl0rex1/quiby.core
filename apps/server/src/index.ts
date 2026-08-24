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

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  app.listen(config.port, config.host, () => {
    console.log(`🚀 quiby.core backend running at http://${config.host}:${config.port}`);
    console.log(`🎮 Target Minecraft: ${config.minecraft.targetGameVersion} (${config.minecraft.targetLoader} ${config.minecraft.targetLoaderVersion})`);
    console.log(`🔑 Admin API Key: ${config.adminApiKey}`);
  });
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
