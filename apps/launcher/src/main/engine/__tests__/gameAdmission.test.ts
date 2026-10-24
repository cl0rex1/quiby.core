import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareGameAdmission, requireGameLaunchAccess } from '../gameAdmission';

test('launch preflight fails closed and a closure during preparation preserves the administrator message', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), 'https://api.example/api/game/access');
      assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer session');
      return Response.json({ closed: true, message: 'Готовим новый мир' });
    };
    await assert.rejects(requireGameLaunchAccess('https://api.example/', 'session'), /Готовим новый мир/);
    globalThis.fetch = async () => Response.json({ closed: false });
    await requireGameLaunchAccess('https://api.example', 'session');
    globalThis.fetch = async () => Response.json({});
    await assert.rejects(requireGameLaunchAccess('https://api.example', 'session'), /проверить доступ/);
    globalThis.fetch = async () => { throw Error('offline'); };
    await assert.rejects(requireGameLaunchAccess('https://api.example', 'session'), /offline/);
    globalThis.fetch = async () => Response.json({ code: 'MINECRAFT_ACCESS_CLOSED', error: 'Ожидайте открытия' }, { status: 503 });
    await assert.rejects(prepareGameAdmission('https://api.example', 'session', '1.1.6'), /Ожидайте открытия/);
    globalThis.fetch = async () => Response.json({ ticket: 'valid-ticket' });
    const env = await prepareGameAdmission('https://api.example', 'session', '1.1.6');
    assert.equal(env.QUIBY_GAME_TICKET, 'valid-ticket'); assert.ok(env.QUIBY_GAME_PRIVATE_KEY);
  } finally { globalThis.fetch = original; }
});
