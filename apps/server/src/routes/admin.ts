import { newsSchema, saveNews } from '../services/newsService';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAdmin } from '../middleware/auth';
import { publishModpackVersion } from '../services/modpackService';
import { config } from '../config';
import { dbAll, dbGet, dbRun } from '../models/db';
import { ModpackManifest, NewsArticle } from '@quiby/shared';

const router = Router();
router.use(requireAdmin);

// Multer storage for modpack files
const filesDir = path.join(config.storagePath, 'files');
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Relative target path passed in headers or body
    const rawRelPath = (req.headers['x-file-path'] as string) || '';
    const safeRelPath = path.normalize(rawRelPath).replace(/^(\.\.[\/\\])+/, '');
    const targetDir = path.resolve(filesDir, path.dirname(safeRelPath));
    const resolvedBase = path.resolve(filesDir);
    if (targetDir !== resolvedBase && !targetDir.startsWith(resolvedBase + path.sep)) {
      return cb(new Error('Invalid destination path: Path traversal detected'), filesDir);
    }
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const rawRelPath = (req.headers['x-file-path'] as string) || file.originalname;
    const safeFilename = path.basename(path.normalize(rawRelPath));
    cb(null, safeFilename);
  },
});

const upload = multer({ storage });

// 1. Publish Modpack Manifest
router.post('/modpack/publish', async (req: Request, res: Response) => {
  try {
    const manifest = req.body as ModpackManifest;
    if (!manifest || !manifest.version || !manifest.gameVersion || !manifest.loader) {
      return res.status(400).json({ error: 'Invalid manifest payload' });
    }

    await publishModpackVersion(manifest, true);
    return res.json({ success: true, message: `Version ${manifest.version} published and activated successfully!` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Upload Modpack File (for pack-builder CLI)
router.post('/modpack/upload-file', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const relPath = req.headers['x-file-path'] as string || req.file.filename;
  return res.json({
    success: true,
    path: relPath,
    size: req.file.size,
  });
});

// 3. Get All Registered Players
router.get('/players', async (req: Request, res: Response) => {
  try {
    const players = await dbAll<any>(
      'SELECT id, discord_id, discord_username, discord_global_name, discord_avatar, mc_username, uuid, is_whitelisted, roles_json, created_at, last_login_at FROM users ORDER BY id DESC'
    );

    return res.json(
      players.map(p => ({
        id: p.id,
        discordId: p.discord_id,
        discordUsername: p.discord_username,
        discordGlobalName: p.discord_global_name,
        discordAvatar: p.discord_avatar,
        mcUsername: p.mc_username,
        uuid: p.uuid,
        isWhitelisted: Boolean(p.is_whitelisted),
        roles: JSON.parse(p.roles_json || '[]'),
        createdAt: p.created_at,
        lastLoginAt: p.last_login_at,
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Toggle Whitelist for Player
router.post('/players/:discordId/toggle-whitelist', async (req: Request, res: Response) => {
  try {
    const user = await dbGet<any>('SELECT is_whitelisted FROM users WHERE discord_id = ?', [req.params.discordId]);
    if (!user) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const newStatus = user.is_whitelisted ? 0 : 1;
    await dbRun('UPDATE users SET is_whitelisted = ? WHERE discord_id = ?', [newStatus, req.params.discordId]);

    return res.json({ success: true, isWhitelisted: Boolean(newStatus) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Delete / Unlink Player Account
router.delete('/players/:discordId', async (req: Request, res: Response) => {
  try {
    await dbRun('DELETE FROM users WHERE discord_id = ?', [req.params.discordId]);
    return res.json({ success: true, message: 'Player unlinked successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Create News Article
router.post('/news', async (req: Request, res: Response) => {
  try {
    const parsed = newsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Проверьте заголовок, текст, автора и параметры новости' });
    return res.status(201).json({ success: true, ...await saveNews(parsed.data) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
