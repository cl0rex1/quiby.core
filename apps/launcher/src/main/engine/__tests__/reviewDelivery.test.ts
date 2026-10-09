import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewDelivery } from '../reviewDelivery';

test('delivery distinguishes a queued file, confirmed attachment, and expired queue', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ delivered: false, queued: true });
    assert.equal(await reviewDelivery('https://example.test', 'a'.repeat(40), 'test', 2, 0), 'queued');
    globalThis.fetch = async () => Response.json({ delivered: true, queued: false });
    assert.equal(await reviewDelivery('https://example.test', 'a'.repeat(40), 'test', 2, 0), 'delivered');
    globalThis.fetch = async () => Response.json({ delivered: false, queued: false });
    await assert.rejects(reviewDelivery('https://example.test', 'a'.repeat(40), 'test', 2, 0), /отсутствует/);
    globalThis.fetch = async () => new Response('', { status: 401 });
    await assert.rejects(reviewDelivery('https://example.test', 'a'.repeat(40), 'test', 2, 0), /проверить доставку/);
  } finally { globalThis.fetch = original; }
});
