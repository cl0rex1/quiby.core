import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { minecraftPing, preferDirect, prepareDirectRoute } from '../directRoute';

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
    const route = await prepareDirectRoute('http://127.0.0.1:1', 'fake', '1.1.0', '', 'play.quiby.me:25565', () => {});
    assert.equal(route.address, 'play.quiby.me:25565'); route.close();
  } finally { for (const peer of peers) peer.destroy(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
