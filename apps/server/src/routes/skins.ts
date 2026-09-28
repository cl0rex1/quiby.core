import { Router, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { dbGet } from '../models/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { PNG } from 'pngjs';

const router = Router();
const skinDir = path.join(config.storagePath, 'skins');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

router.put('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const dataUri = req.body?.dataUri;
  if (typeof dataUri !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUri)) {
    return res.status(400).json({ error: 'Ожидается PNG-скин' });
  }
  const bytes = Buffer.from(dataUri.slice('data:image/png;base64,'.length), 'base64');
  if (bytes.length < 45 || bytes.length > 2_000_000 || !bytes.subarray(0, 8).equals(pngSignature)
      || bytes.toString('ascii', 12, 16) !== 'IHDR') {
    return res.status(400).json({ error: 'Некорректный PNG-скин' });
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!Number.isInteger(width) || width < 64 || width > 1024 || height !== width) {
    return res.status(400).json({ error: 'Скин должен быть квадратным PNG от 64 до 1024 пикселей' });
  }
  let cleanPng: Buffer;
  try {
    cleanPng = PNG.sync.write(PNG.sync.read(bytes, { checkCRC: true }));
  } catch {
    return res.status(400).json({ error: 'PNG-файл повреждён' });
  }
  const uuid = req.user!.uuid.replace(/-/g, '');
  await fs.mkdir(skinDir, { recursive: true });
  const target = path.join(skinDir, `${uuid}.png`);
  const temporary = path.join(skinDir, `${uuid}.${Date.now()}.tmp`);
  try {
    await fs.writeFile(temporary, cleanPng);
    await fs.rename(temporary, target);
  } finally {
    await fs.rm(temporary, { force: true });
  }
  return res.json({ ok: true });
});

router.delete('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uuid = req.user!.uuid.replace(/-/g, '');
  await fs.rm(path.join(skinDir, `${uuid}.png`), { force: true });
  return res.json({ ok: true });
});

// The Quiby client mod requests this public URL for every player on the server.
router.get('/uuid/:uuid.png', async (req, res) => {
  const uuid = req.params.uuid.replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(uuid)) return res.status(404).end();
  const user = await dbGet<{ uuid: string }>("SELECT uuid FROM users WHERE LOWER(REPLACE(uuid, '-', '')) = ?", [uuid]);
  if (!user) return res.status(404).end();
  const file = path.join(skinDir, `${user.uuid.replace(/-/g, '')}.png`);
  try {
    await fs.access(file);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(file);
  } catch {
    return res.status(404).end();
  }
});

router.get('/:username.png', async (req, res) => {
  const username = req.params.username;
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) return res.status(404).end();
  const user = await dbGet<{ uuid: string }>('SELECT uuid FROM users WHERE mc_username = ? COLLATE NOCASE', [username]);
  if (!user) return res.status(404).end();
  const file = path.join(skinDir, `${user.uuid.replace(/-/g, '')}.png`);
  try {
    await fs.access(file);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(file);
  } catch {
    return res.status(404).end();
  }
});

export default router;
