import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { minecraftPing, preferDirect, prepareDirectRoute, directExecutable, directError } from '../directRoute';

test('bundled direct works offline with an empty or corrupted cache and reports useful errors', { skip: !existsSync(path.resolve('apps/launcher/direct/frpc-0.71.1.exe')) && 'run npm run prepare:direct --workspace=apps/launcher for the packaging fixture' }, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-проверка direct-'));
  const binary = path.resolve('apps/launcher/direct/frpc-0.71.1.exe');
  try {
    await fs.access(binary); // npm run prepare:direct --workspace=apps/launcher
    assert.equal(await directExecutable(directory, binary), binary);
    assert.deepEqual(await fs.readdir(directory), []);
    await fs.writeFile(path.join(directory, path.basename(binary)), 'corrupted');
    assert.equal(await directExecutable(directory, binary), binary);
    await assert.rejects(directExecutable(directory, path.join(directory, 'missing.exe')), /повреждён/);
    await fs.copyFile(binary, path.join(directory, path.basename(binary)));
    assert.equal(await directExecutable(directory, path.join(directory, 'missing.exe')), path.join(directory, path.basename(binary)));
    const failure = new Error('write failed eyJsecret.jwt.signature', { cause: Object.assign(new Error('access denied'), { code: 'EACCES' }) });
    assert.deepEqual(directError(failure), { code: 'EACCES', message: 'write failed [redacted]: access denied' });
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('port and process failures preserve their exact stage without reaching NAT', { skip: process.platform !== 'win32' || !existsSync(path.resolve('apps/launcher/direct/frpc-0.71.1.exe')) }, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-direct ошибки-'));
  await fs.mkdir(path.join(directory, 'direct'));
  await fs.copyFile(path.resolve('apps/launcher/direct/frpc-0.71.1.exe'), path.join(directory, 'direct/frpc-0.71.1.exe'));
  const api = mock.method(globalThis, 'fetch', async () => Response.json({ enabled: true, server: '127.0.0.1', port: 1,
    ca: '-----BEGIN CERTIFICATE-----invalid', user: 'quiby-player', ticket: 'eyJsecret.jwt.signature' }));
  const listener = mock.method(net, 'createServer', () => new class extends EventEmitter {
    listen() { queueMicrotask(() => this.emit('error', Object.assign(new Error('port access denied'), { code: 'EACCES' }))); }
  }() as unknown as net.Server);
  const address = 'play.quiby.me:25565';
  try {
    assert.equal((await prepareDirectRoute('http://unused.invalid', 'fake', 'test', directory, address, () => {})).address, address);
    let report = JSON.parse(await fs.readFile(path.join(directory, 'direct/latest-route.json'), 'utf8'));
    assert.equal(report.stage, 'port'); assert.equal(report.error.code, 'EACCES');
    listener.mock.restore();
    assert.equal((await prepareDirectRoute('http://unused.invalid', 'fake', 'test', directory, address, () => {})).address, address);
    report = JSON.parse(await fs.readFile(path.join(directory, 'direct/latest-route.json'), 'utf8'));
    assert.equal(report.stage, 'startup'); assert.match(report.error.message, /frpc завершился/);
    assert.equal(JSON.stringify(report).includes('eyJsecret'), false);
  } finally { listener.mock.restore(); api.mock.restore(); await fs.rm(directory, { recursive: true, force: true }); }
});

test('route selection rejects jitter, failed probes and marginal improvements', () => {
  assert.equal(preferDirect([90, 91, 93, 90, 95], [30, 31, 30, 32, 31]), true);
  assert.equal(preferDirect([90, 91, 93, 90, 95], [30, 31, 90, 32, 31]), false);
  assert.equal(preferDirect([40, 41, 42, 40, 43], [39, 39, 40, 39, 41]), false);
  assert.equal(preferDirect([90, 91, 93, 90, 95], [30, 31]), false);
  assert.equal(preferDirect([], [30, 31, 30, 32, 31]), true);
});

test('Minecraft probes wait for a matching pong and bound stalled responses', async () => {
  let mode = 'ok';
  const peers = new Set<net.Socket>();
  const server = net.createServer(socket => {
    peers.add(socket); socket.on('close', () => peers.delete(socket));
    let status = false;
    socket.on('data', data => {
      if (mode === 'stall') return;
      if (!status) { status = true; const json = Buffer.from('{"version":{"protocol":767}}'); socket.write(Buffer.concat([Buffer.from([json.length + 2, 0, json.length]), json])); }
      else { const pong = Buffer.from(data); if (mode === 'bad') pong[pong.length - 1] ^= 1; socket.write(pong); }
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); const port = (server.address() as net.AddressInfo).port;
  try {
    assert.ok(await minecraftPing('127.0.0.1', port) > 0);
    mode = 'bad'; await assert.rejects(minecraftPing('127.0.0.1', port), /Invalid pong/);
    mode = 'stall'; await assert.rejects(minecraftPing('127.0.0.1', port, 50), /timeout/);
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-route-test-'));
    try {
      const route = await prepareDirectRoute('http://127.0.0.1:1', 'fake', '1.1.0', directory, 'play.quiby.me:25565', () => {});
      assert.equal(route.address, 'play.quiby.me:25565'); route.close();
      if (process.platform === 'win32') assert.equal(JSON.parse(await fs.readFile(path.join(directory, 'direct/latest-route.json'), 'utf8')).stage, 'API');
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
  } finally { for (const peer of peers) peer.destroy(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
