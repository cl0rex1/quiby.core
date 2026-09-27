import test from 'node:test';
import assert from 'node:assert/strict';
import type { AuthSession } from '@quiby/shared';
import { createSkinSynchronizer } from '../skinSync';

const session = { token: 'test-token' } as AuthSession;

test('skin selection coalesces repeats and preserves the final selection order', async () => {
  const uploads: Array<string | null> = [];
  const sync = createSkinSynchronizer('https://example.invalid', (async (_url, init) => {
    uploads.push(init?.body ? JSON.parse(String(init.body)).dataUri : null);
    await new Promise(resolve => setTimeout(resolve, 5));
    return new Response('{}');
  }) as typeof fetch);
  const first = sync(session, 'skin-a');
  assert.equal(sync(session, 'skin-a'), first);
  const second = sync(session, 'skin-b');
  const last = sync(session, 'skin-a');
  await Promise.all([first, second, last]);
  assert.deepEqual(uploads, ['skin-a', 'skin-b', 'skin-a']);
  await sync(session, 'skin-a');
  assert.equal(uploads.length, 3);
  await sync(session, null);
  assert.equal(uploads.at(-1), null);
});

test('failed skin upload retains the API reason and allows a retry', async () => {
  let attempts = 0;
  const sync = createSkinSynchronizer('https://example.invalid', (async () => {
    attempts++;
    return attempts === 1 ? new Response(JSON.stringify({ error: 'Session expired' }), { status: 401 }) : new Response('{}');
  }) as typeof fetch);
  await assert.rejects(sync(session, 'skin-a'), /HTTP 401.*Session expired/);
  await sync(session, 'skin-a');
  assert.equal(attempts, 2);
});
