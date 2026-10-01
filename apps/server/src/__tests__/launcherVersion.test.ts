import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { supportsLauncher, MINIMUM_LAUNCHER_VERSION } from '@quiby/shared';
import { requireSupportedLauncher } from '../middleware/launcherVersion';

test('required launcher versions compare numerically, including beta and stable', () => {
  for (const version of [undefined, '', 'fake', '1.0.1-beta.9', '1.0.1-beta.18', '1.0.0']) assert.equal(supportsLauncher(version), false);
  for (const version of ['1.0.1-beta.19', '1.0.1-beta.20', '1.0.1', '1.0.2-beta.1', '2.0.0']) assert.equal(supportsLauncher(version), true);
});

test('launch preflight rejects older launchers even without a version header', async () => {
  const app = express();
  app.get('/me', requireSupportedLauncher, (_req, res) => res.sendStatus(204));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/me`;
  try {
    for (const version of ['', '1.0.1-beta.18']) {
      const response = await fetch(url, { headers: version ? { 'x-quiby-launcher-version': version } : {} });
      assert.equal(response.status, 426);
      assert.equal((await response.json()).minimumVersion, MINIMUM_LAUNCHER_VERSION);
    }
    assert.equal((await fetch(url, { headers: { 'x-quiby-launcher-version': MINIMUM_LAUNCHER_VERSION } })).status, 204);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
