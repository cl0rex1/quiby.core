import { Router, Request, Response } from 'express';
import { getServerStatus } from '../services/serverQuery';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const status = await getServerStatus();
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
