import { Router, Request, Response } from 'express';
import {
  verifyMod,
  verifyModBatch,
  submitWhitelistRequest,
  getWhitelistRequests,
} from '../services/modSafetyService';

const router = Router();

/**
 * POST /api/mods/verify
 * Verifies one or multiple mod files by SHA-1 hash against Modrinth and Anti-Cheat rules.
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { mods } = req.body;

    if (!mods || !Array.isArray(mods)) {
      return res.status(400).json({ error: 'Поле mods должно быть массивом объектов с name, filename, hash_sha1' });
    }

    const results = await verifyModBatch(mods);
    return res.json({ results });
  } catch (error: any) {
    console.error('Mod verification route error:', error);
    return res.status(500).json({ error: error.message || 'Ошибка проверки модов' });
  }
});

/**
 * POST /api/mods/whitelist-request
 * Allows a player to submit an unindexed/custom mod for review and whitelisting.
 */
router.post('/whitelist-request', async (req: Request, res: Response) => {
  try {
    const { user_discord_id, mc_username, mod_name, filename, hash_sha1, reason } = req.body;

    if (!mod_name || !filename || !hash_sha1) {
      return res.status(400).json({ error: 'Обязательные поля: mod_name, filename, hash_sha1' });
    }

    await submitWhitelistRequest({
      user_discord_id,
      mc_username,
      mod_name,
      filename,
      hash_sha1,
      reason,
    });

    return res.json({
      success: true,
      message: 'Запрос на добавление мода в вайтлист успешно отправлен администрации.',
    });
  } catch (error: any) {
    console.error('Whitelist request route error:', error);
    return res.status(500).json({ error: error.message || 'Ошибка отправки запроса' });
  }
});

/**
 * GET /api/mods/whitelist-requests
 * Lists all submitted mod whitelist requests.
 */
router.get('/whitelist-requests', async (req: Request, res: Response) => {
  try {
    const requests = await getWhitelistRequests();
    return res.json({ requests });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Ошибка получения запросов' });
  }
});

export default router;
