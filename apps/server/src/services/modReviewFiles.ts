import fs from 'fs';
import path from 'path';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config';

export function reviewFilePath(hash: string): string {
  if (!/^[a-f0-9]{40}$/.test(hash)) throw new Error('Invalid SHA-1');
  return path.join(config.storagePath, 'mod-reviews', hash + '.jar');
}
// Migrate away from permanent JAR storage; only remove our own named regular files.
const legacyDirectory = path.join(config.storagePath, 'mod-reviews');
if (fs.existsSync(legacyDirectory) && !fs.lstatSync(legacyDirectory).isSymbolicLink()) {
  for (const name of fs.readdirSync(legacyDirectory)) {
    if (!/^[a-f0-9]{40}\.jar$/.test(name)) continue;
    const file = path.join(legacyDirectory, name);
    if (fs.lstatSync(file).isFile()) fs.unlinkSync(file);
  }
}
const signature = (hash: string, expires: number) => createHmac('sha256', config.jwtSecret)
  .update(`mod-review:${hash}:${expires}`).digest('hex');
export const REVIEW_FILE_LIMIT = 8 * 1024 * 1024;
const pending = new Map<string, { bytes: Buffer; expires: number }>();
function prune() {
  for (const [hash, item] of pending) if (item.expires <= Date.now()) pending.delete(hash);
}
setInterval(prune, 30000).unref();
export function putReviewFile(hash: string, bytes: Buffer) {
  reviewFilePath(hash); // Validate identifier, never write the new upload to disk.
  prune();
  if (!bytes.length || bytes.length > REVIEW_FILE_LIMIT) throw new Error('JAR должен быть не больше 8 МиБ для вложения Discord');
  const total = [...pending.entries()].reduce((sum, [key, value]) => sum + (key === hash ? 0 : value.bytes.length), 0);
  if (total + bytes.length > 64 * 1024 * 1024) throw new Error('Очередь отправки заполнена. Повторите позже.');
  pending.set(hash, { bytes, expires: Date.now() + 10 * 60 * 1000 });
}
export function getReviewFile(hash: string) {
  prune();
  return pending.get(hash)?.bytes;
}
export function removeReviewFile(hash: string) {
  pending.delete(hash);
  // Remove a legacy on-disk attachment too, if present.
  fs.rmSync(reviewFilePath(hash), { force: true });
}
export function reviewFileInfo(hash: string) {
  const bytes = getReviewFile(hash);
  if (!bytes) return null;
  const expires = Math.floor(Date.now() / 1000) + 600;
  return { size: bytes.length, path: `/api/mods/review-file/${hash}?expires=${expires}&signature=${signature(hash, expires)}` };
}
export function validReviewLink(hash: string, expires: number, value: string): boolean {
  if (!/^[a-f0-9]{40}$/.test(hash) || !Number.isSafeInteger(expires) || expires < Date.now() / 1000 || !/^[a-f0-9]{64}$/.test(value)) return false;
  return timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(signature(hash, expires), 'hex'));
}
