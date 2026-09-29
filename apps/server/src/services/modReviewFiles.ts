import fs from 'fs';
import path from 'path';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config';

export function reviewFilePath(hash: string): string {
  if (!/^[a-f0-9]{40}$/.test(hash)) throw new Error('Invalid SHA-1');
  return path.join(config.storagePath, 'mod-reviews', hash + '.jar');
}
const signature = (hash: string, expires: number) => createHmac('sha256', config.jwtSecret)
  .update(`mod-review:${hash}:${expires}`).digest('hex');
export function reviewFileInfo(hash: string) {
  const file = reviewFilePath(hash);
  if (!fs.existsSync(file)) return null;
  const expires = Math.floor(Date.now() / 1000) + 3600;
  return { size: fs.statSync(file).size, path: `/api/mods/review-file/${hash}?expires=${expires}&signature=${signature(hash, expires)}` };
}
export function validReviewLink(hash: string, expires: number, value: string): boolean {
  if (!/^[a-f0-9]{40}$/.test(hash) || !Number.isSafeInteger(expires) || expires < Date.now() / 1000 || !/^[a-f0-9]{64}$/.test(value)) return false;
  return timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(signature(hash, expires), 'hex'));
}
