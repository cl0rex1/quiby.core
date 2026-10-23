import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { minecraftPing, waitForMinecraft, preferDirect, prepareDirectRoute, directExecutable, directError, readDirectReport } from '../directRoute';

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

test('network reports handle a missing file and reject malformed measurements', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-network-report-'));
  const report = {at:new Date().toISOString(),reason:'direct',normal:[90,91,92,93,94],direct:[10,11,12,13,14]};
  try {
    assert.equal(await readDirectReport(directory),null);
    await fs.mkdir(path.join(directory,'direct'));
    const file = path.join(directory,'direct/latest-route.json');
    await fs.writeFile(file,JSON.stringify(report));
    assert.deepEqual(await readDirectReport(directory),report);
    await fs.writeFile(file,JSON.stringify({...report,direct:['invalid']}));
    await assert.rejects(readDirectReport(directory),/повреждён/);
    await fs.writeFile(file,' '.repeat(65537));
    await assert.rejects(readDirectReport(directory),/слишком большой/);
  } finally { await fs.rm(directory,{recursive:true,force:true}); }
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

test('Minecraft RTT excludes status handshake latency', async () => {
  let clock = 0;
  const now = mock.method(performance, 'now', () => clock);
  const server = net.createServer(socket => {
    let status = false;
    socket.on('data', data => {
      if (!status) {
        status = true; clock = 1000;
        const json = Buffer.from('{"version":{"protocol":767}}');
        socket.write(Buffer.concat([Buffer.from([json.length + 2, 0, json.length]), json]));
      } else { clock = 1017; socket.write(data); }
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try { assert.equal(await minecraftPing('127.0.0.1', (server.address() as net.AddressInfo).port), 17); }
  finally { now.mock.restore(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('tunnel readiness retries refused sockets, bounds stalls and stops with frpc', async () => {
  const peers = new Set<net.Socket>();
  const server = net.createServer(socket => {
    peers.add(socket); socket.on('close', () => peers.delete(socket));
    let status = false;
    socket.on('data', data => {
      if (!status) {
        status = true;
        const json = Buffer.from('{"version":{"protocol":767}}');
        socket.write(Buffer.concat([Buffer.from([json.length + 2, 0, json.length]), json]));
      } else socket.write(data);
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as net.AddressInfo).port;
  await new Promise<void>(resolve => server.close(() => resolve()));
  // Reproduce a visitor which only starts listening after its remote Login completes.
  const listening = new Promise<void>(resolve => setTimeout(() => server.listen(port, '127.0.0.1', resolve), 100));
  try {
    await assert.rejects(minecraftPing('127.0.0.1', port, 50), /ECONNREFUSED/);
    await waitForMinecraft('127.0.0.1', port, 1500);
    await listening;
    await assert.rejects(waitForMinecraft('127.0.0.1', port, 1500, () => true), /frpc stopped/);
    const stalled = net.createServer(socket => { peers.add(socket); socket.on('close', () => peers.delete(socket)); });
    await new Promise<void>(resolve => stalled.listen(0, '127.0.0.1', resolve));
    try {
      const start = performance.now();
      await assert.rejects(waitForMinecraft('127.0.0.1', (stalled.address() as net.AddressInfo).port, 80), /timeout/);
      assert.ok(performance.now() - start < 1000, 'readiness exceeded its total deadline');
    } finally {
      for (const peer of peers) peer.destroy();
      await new Promise<void>(resolve => stalled.close(() => resolve()));
    }
  } finally {
    await listening;
    for (const peer of peers) peer.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
