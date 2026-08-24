import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { getAllVersions, getLatestManifest, getManifestByVersion } from '../services/modpackService';

const router = Router();

// 1. Get Latest Active Manifest
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const manifest = await getLatestManifest();
    if (!manifest) {
      return res.status(404).json({ error: 'No active modpack manifest found' });
    }
    return res.json(manifest);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get All Versions
router.get('/versions', async (req: Request, res: Response) => {
  try {
    const versions = await getAllVersions();
    return res.json(versions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Get Specific Version Manifest
router.get('/manifest/:version', async (req: Request, res: Response) => {
  try {
    const manifest = await getManifestByVersion(req.params.version);
    if (!manifest) {
      return res.status(404).json({ error: `Manifest version ${req.params.version} not found` });
    }
    return res.json(manifest);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Download Modpack File
router.get('/files/*', (req: Request, res: Response) => {
  const relativePath = req.params[0];
  if (!relativePath || relativePath.includes('..')) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  const filePath = path.join(config.storagePath, 'files', relativePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on distribution server' });
  }

  // Set immutable cache headers for hashed mod files
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.sendFile(filePath);
});

export default router;
