import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import {
  verifyMod,
  verifyModBatch,
  submitWhitelistRequest,
  getWhitelistRequests,
} from '../services/modSafetyService';

const router = Router();

export const whitelistRequestSchema = z.object({
  user_discord_id: z.string().optional(),
  mc_username: z.string().min(3).max(16).regex(/^[a-zA-Z0-9_]+$/).optional(),
  mod_name: z.string().min(1).max(100),
  filename: z.string().min(1).max(255).regex(/\.jar$/i, 'Must be a .jar file'),
  hash_sha1: z.string().length(40, 'Must be 40-char hex SHA-1').regex(/^[a-fA-F0-9]+$/),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
  project_url: z.union([z.literal(''), z.string().max(2048).url().refine(value => /^https?:\/\//i.test(value))]).optional(),
});

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
router.post('/whitelist-request', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = whitelistRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Ошибка валидации данных',
        errors: parseResult.error.errors,
        details: parseResult.error.errors,
      });
    }

    const { mod_name, filename, hash_sha1, reason, project_url } = parseResult.data;

    const request = await submitWhitelistRequest({
      user_discord_id: req.user!.discordId,
      mc_username: req.user!.mcUsername,
      mod_name,
      filename,
      hash_sha1,
      reason,
      project_url,
    });

    return res.json({
      success: true,
      request,
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
router.get('/whitelist-requests', requireAdmin, async (req: Request, res: Response) => {
  try {
    const requests = await getWhitelistRequests();
    return res.json({ requests });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Ошибка получения запросов' });
  }
});

export default router;
