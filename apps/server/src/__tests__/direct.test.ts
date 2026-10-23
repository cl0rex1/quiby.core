import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';
import net from 'node:net';
import tls from 'node:tls';
import { createHash } from 'node:crypto';
import { spawn, execFileSync, ChildProcess } from 'node:child_process';
import { MINIMUM_LAUNCHER_VERSION } from '@quiby/shared';

test('direct tickets restrict proxy publishing and recheck current player access', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-direct-'));
  process.env.DB_PATH = path.join(directory, 'test.sqlite'); process.env.STORAGE_PATH = directory;
  process.env.DIRECT_SERVER = '185.146.157.76'; process.env.DIRECT_CA = 'test-ca'; process.env.DIRECT_PROVIDER_KEY = 'p'.repeat(64);
  const { config } = await import('../config');
  const { initDatabase, dbRun, closeDatabase } = await import('../models/db'); await initDatabase();
  let loginDelay = 0, delayedLogins = 0;
  const app = express(); app.use(express.json());
  app.use('/api/direct/authorize', async (req, _res, next) => {
    if (loginDelay && req.query.op === 'Login' && req.body.content?.user === 'quiby-player') {
      delayedLogins++; await new Promise(resolve => setTimeout(resolve, loginDelay));
    }
    next();
  });
  app.use('/api/direct', (await import('../routes/direct')).default);
  const { requireAuth } = await import('../middleware/auth'); app.get('/protected', requireAuth, (_req, res) => res.sendStatus(204));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const id = '123456789012345678';
  const token = jwt.sign({ discordId: id, mcUsername: 'Tester', authMethod: 'discord' }, config.jwtSecret);
  const headers = { Authorization: `Bearer ${token}`, 'x-quiby-launcher-version': MINIMUM_LAUNCHER_VERSION };
  const authorize = async (op: string, content: unknown) => (await (await fetch(base + '/api/direct/authorize?op=' + op,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })).json()).reject;
  try {
    await dbRun('INSERT INTO users(discord_id,discord_username,mc_username,uuid,is_whitelisted) VALUES(?,?,?,?,1)', [id, 'Tester', 'Tester', 'f4606112-bd19-394a-bd0b-0b7f6f6a5001']);
    assert.equal((await fetch(base + '/api/direct/config')).status, 426);
    const response = await fetch(base + '/api/direct/config', { headers }); assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const c = await response.json(); const user = { user: c.user, metas: { ticket: c.ticket } };
    assert.equal(await authorize('Login', user), false);
    assert.equal(await authorize('Ping', { user }), false);
    assert.equal(await authorize('Login', { user: c.user, metas: { ticket: token } }), true);
    assert.equal(await authorize('Login', { ...user, user: 'quiby-host' }), true);
    assert.equal(await authorize('NewProxy', { user, proxy_type: 'tcp', proxy_name: c.user + '.evil' }), true);
    const provider = { user: 'quiby-host', metas: { providerKey: config.direct.providerKey } };
    assert.equal(await authorize('Login', provider), false);
    assert.equal(await authorize('NewProxy', { user: provider, proxy_type: 'xtcp', proxy_name: 'quiby-host.minecraft-direct' }), false);
    assert.equal(await authorize('NewProxy', { user: provider, proxy_type: 'tcp', proxy_name: 'quiby-host.minecraft-direct' }), true);
    if (process.env.QUIBY_FRP_TEST_DIR) {
      await checkFrp(directory, base, c, provider.metas.providerKey, () => { loginDelay = 1800; });
      if (process.platform === 'win32') assert.ok(delayedLogins > 0, 'launcher regression did not delay frpc Login');
    }
    assert.equal((await fetch(base + '/protected', { headers: { Authorization: `Bearer ${c.ticket}` } })).status, 401);
    await dbRun('UPDATE users SET is_whitelisted=0 WHERE discord_id=?', [id]);
    assert.equal(await authorize('Ping', { user }), true);
    await dbRun('UPDATE users SET is_whitelisted=1 WHERE discord_id=?', [id]);
    await dbRun("INSERT INTO launcher_access(id,closed,message) VALUES(1,1,'Closed')");
    assert.equal(await authorize('Ping', { user }), true);
    await dbRun('UPDATE users SET launcher_access_exempt=1 WHERE discord_id=?', [id]);
    assert.equal(await authorize('Ping', { user }), false);
    await dbRun('DELETE FROM users WHERE discord_id=?', [id]);
    assert.equal(await authorize('Ping', { user }), true);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await closeDatabase(); await fs.rm(directory, { recursive: true, force: true }); }
});

async function checkFrp(directory: string, api: string, visitor: { user: string; ticket: string }, providerKey: string, delayLauncherLogin: () => void) {
  const binaries = path.resolve(process.env.QUIBY_FRP_TEST_DIR!);
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const openssl = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl';
  execFileSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'server.key', '-out', 'server.crt',
    '-days', '1', '-subj', '/CN=quiby-direct', '-addext', 'subjectAltName=DNS:quiby-direct'], { cwd: directory, stdio: 'ignore', windowsHide: true });
  const freePort = async () => { const s = net.createServer(); await new Promise<void>(r => s.listen(0, '127.0.0.1', r)); const p = (s.address() as net.AddressInfo).port; await new Promise<void>(r => s.close(() => r())); return p; };
  const port = await freePort(), local = await freePort();
  const echo = net.createServer(s => {
    s.on('error', () => {});
    let status = false;
    s.on('data', data => {
      if (data.toString().startsWith('quiby-authenticated')) { s.write(data); return; }
      if (status) { s.write(data); return; }
      status = true; const json = Buffer.from('{"version":{"protocol":767}}');
      s.write(Buffer.concat([Buffer.from([json.length + 2, 0, json.length]), json]));
    });
  }); await new Promise<void>(r => echo.listen(0, '127.0.0.1', r));
  const children: ChildProcess[] = [];
  let logs = '';
  const start = async (name: string, binary: string, settings: object) => {
    const configFile = path.join(directory, name + '.json'); await fs.writeFile(configFile, JSON.stringify(settings));
    const child = spawn(path.join(binaries, binary + suffix), ['-c', configFile], { cwd: directory, windowsHide: true });
    children.push(child); child.stdout?.on('data', d => { logs += d.toString(); }); child.stderr?.on('data', d => { logs += d.toString(); });
    await new Promise<void>((r, reject) => { child.once('spawn', r); child.once('error', reject); }); return child;
  };
  const common = { serverAddr: '127.0.0.1', serverPort: port, loginFailExit: true,
    transport: { tcpMux: false, tls: { enable: true, serverName: 'quiby-direct', trustedCaFile: path.join(directory, 'server.crt') } } };
  try {
    await start('server', 'frps', { bindAddr: '127.0.0.1', bindPort: port, transport: { tcpMux: false, tls: { force: true, certFile: 'server.crt', keyFile: 'server.key' } },
      httpPlugins: [{ name: 'quiby', addr: api.replace('http://', ''), path: '/api/direct/authorize', ops: ['Login', 'Ping', 'NewProxy'] }] });
    await new Promise(r => setTimeout(r, 300));
    await start('provider', 'frpc', { ...common, user: 'quiby-host', metadatas: { providerKey }, proxies: [
      ...['stcp', 'xtcp'].map(type => ({ name: type === 'stcp' ? 'minecraft-relay' : 'minecraft-direct', type, localIP: '127.0.0.1', localPort: (echo.address() as net.AddressInfo).port, secretKey: '', allowUsers: ['quiby-player'], transport: { useEncryption: true } }))] });
    await new Promise(r => setTimeout(r, 300));
    await start('visitor', 'frpc', { ...common, user: visitor.user, metadatas: { ticket: visitor.ticket }, visitors: [
      { name: 'test', type: 'stcp', serverUser: 'quiby-host', serverName: 'minecraft-relay', secretKey: '', bindAddr: '127.0.0.1', bindPort: local, transport: { useEncryption: true } }] });
    await new Promise(r => setTimeout(r, 500));
    const received = await new Promise<string>((resolve, reject) => {
      const socket = net.connect(local, '127.0.0.1');
      const timer = setTimeout(() => { socket.destroy(); reject(new Error('frp did not forward traffic')); }, 5000);
      socket.on('error', e => { clearTimeout(timer); reject(e); }); socket.once('connect', () => socket.write('quiby-authenticated'));
      socket.once('data', d => { clearTimeout(timer); socket.destroy(); resolve(d.toString()); });
    });
    assert.equal(received, 'quiby-authenticated');
    // frp also supports legacy visitor sockets without a Login. The provider's
    // allowUsers must reject that path even when the proxy secret is empty.
    const legacy = await new Promise<string>((resolve, reject) => {
      const socket = tls.connect({ host: '127.0.0.1', port, servername: 'quiby-direct', ca: execFileSync(openssl, ['x509', '-in', 'server.crt'], { cwd: directory, windowsHide: true }) });
      const timer = setTimeout(() => { socket.destroy(); reject(new Error('Legacy visitor timed out')); }, 3000);
      socket.on('error', error => { clearTimeout(timer); reject(error); });
      socket.once('secureConnect', () => {
        const timestamp = Math.floor(Date.now() / 1000);
        const json = Buffer.from(JSON.stringify({ proxy_name: 'quiby-host.minecraft-relay', timestamp,
          sign_key: createHash('md5').update(String(timestamp)).digest('hex'), use_encryption: false }));
        const header = Buffer.alloc(9); header[0] = 'v'.charCodeAt(0); header.writeBigInt64BE(BigInt(json.length), 1);
        socket.write(Buffer.concat([header, json]));
      });
      let response = Buffer.alloc(0);
      socket.on('data', chunk => { response = Buffer.concat([response, chunk]); if (response.length < 9) return;
        const size = Number(response.readBigInt64BE(1)); if (response.length < size + 9) return;
        clearTimeout(timer); socket.destroy(); resolve(JSON.parse(response.subarray(9, 9 + size).toString()).error || ''); });
    });
    assert.match(legacy, /not allowed|access denied/i, 'unauthenticated legacy visitor bypassed Login');
    if (process.platform === 'win32') {
      const { config } = await import('../config');
      config.direct.server = '127.0.0.1'; config.direct.port = port; config.direct.ca = await fs.readFile(path.join(directory, 'server.crt'), 'utf8');
      const launcher = path.join(directory, 'launcher'); await fs.mkdir(path.join(launcher, 'direct'), { recursive: true });
      await fs.copyFile(path.join(binaries, 'frpc.exe'), path.join(launcher, 'direct/frpc-0.71.1.exe'));
      // Dynamic test-only cross-workspace import; never part of the server build.
      const launcherModule = '../../../launcher/src/main/engine/directRoute.ts';
      const { prepareDirectRoute, minecraftPing } = await import(launcherModule);
      const token = jwt.sign({ discordId: (jwt.decode(visitor.ticket) as jwt.JwtPayload).sub, mcUsername: 'Tester', authMethod: 'discord' }, config.jwtSecret);
      delayLauncherLogin(); // Longer than the launcher's original fixed 750 ms startup grace.
      const route = await prepareDirectRoute(api, token, MINIMUM_LAUNCHER_VERSION, launcher, '127.0.0.1:1', () => {});
      try {
        assert.notEqual(route.address, '127.0.0.1:1', 'launcher did not start the authenticated tunnel');
        const routePort = Number(route.address.split(':')[1]); assert.ok(await minecraftPing('127.0.0.1', routePort, 6000) > 0);
        const report=JSON.parse(await fs.readFile(path.join(launcher,'direct/latest-route.json'),'utf8'));
        assert.ok(['relay','direct','direct-kcp'].includes(report.reason));
        assert.equal(report.relay.length,5,'authenticated TCP relay must be measured even if NAT punching fails');
        assert.ok(Array.isArray(report.kcp)&&Array.isArray(report.details));
        assert.equal(report.schema,2); assert.equal(report.measurement,'minecraft-pong-rtt');
        assert.equal(report.probeErrors.relay,undefined,'relay was discarded during delayed Login');
        assert.equal(JSON.stringify(report).includes(visitor.ticket),false,'route diagnostics leaked admission ticket');
      } finally { route.close(); }
      await new Promise(r => setTimeout(r, 500));
      assert.equal((await fs.readdir(path.join(launcher, 'direct'))).filter(name => name.startsWith('session-')).length, 0, 'private visitor config was retained');
    }
    const intruder = await start('intruder', 'frpc', { ...common, user: 'anonymous', metadatas: {} });
    await new Promise(r => setTimeout(r, 500)); assert.notEqual(intruder.exitCode, null, 'anonymous frpc remained authenticated');
    assert.ok(logs.includes('login to server success'), 'real frpc did not log in');
  } finally {
    for (const child of children) child.kill();
    await Promise.all(children.map(child => child.exitCode !== null ? Promise.resolve() : new Promise<void>(r => child.once('exit', () => r()))));
    await new Promise<void>(r => echo.close(() => r()));
  }
}
