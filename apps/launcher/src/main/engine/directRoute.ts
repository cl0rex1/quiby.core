import net from 'node:net';
import fs from 'node:fs/promises';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { open, Entry } from 'yauzl';
import { downloadFile } from './downloader';

const archiveHash = 'b90074b2b6a1d792a7a40f085ac6d276bcab2d1bc60201f8a86ca53ce65ce821';
const executableHash = '23d11640bee87207c7a99d006b84c554df997feeba7ac7243db20a88a9cb5e01';
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const integer = (n: number) => { const bytes: number[] = []; do { const b = n & 127; n >>>= 7; bytes.push(b | (n ? 128 : 0)); } while (n); return Buffer.from(bytes); };
const packet = (bytes: Buffer) => Buffer.concat([integer(bytes.length), bytes]);
function varint(bytes: Buffer, offset: number): [number, number] | undefined {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    if (offset + i >= bytes.length) return;
    const b = bytes[offset + i]; value |= (b & 127) << (i * 7);
    if (!(b & 128)) return [value >>> 0, offset + i + 1];
  }
  throw new Error('Invalid VarInt');
}

/** Measures the actual Minecraft status ping/pong, including tunnel setup. */
export function minecraftPing(host: string, port: number, timeout = 4000): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0), status = false, settled = false;
    const nonce = Buffer.alloc(8); nonce.writeBigInt64BE(BigInt(Date.now()));
    const timer = setTimeout(() => finish(new Error('Minecraft ping timeout')), timeout);
    const finish = (error?: Error) => { if (settled) return; settled = true; clearTimeout(timer); socket.destroy(); error ? reject(error) : resolve(performance.now() - start); };
    socket.on('error', finish); socket.on('end', () => finish(new Error('Minecraft ping closed')));
    socket.once('connect', () => {
      const name = Buffer.from(host); const p = Buffer.alloc(2); p.writeUInt16BE(port);
      socket.write(Buffer.concat([packet(Buffer.concat([Buffer.from([0]), integer(767), integer(name.length), name, p, Buffer.from([1])])), Buffer.from([1, 0])]));
    });
    socket.on('data', chunk => {
      try {
        buffer = Buffer.concat([buffer, chunk]);
        if (buffer.length > 1048581) throw new Error('Oversized status');
        while (buffer.length) {
          const size = varint(buffer, 0); if (!size) return;
          if (size[0] > 1048576) throw new Error('Oversized packet');
          if (buffer.length < size[1] + size[0]) return;
          const data = buffer.subarray(size[1], size[1] + size[0]); buffer = buffer.subarray(size[1] + size[0]);
          if (!status) {
            const length = varint(data, 1);
            if (data[0] !== 0 || !length || length[0] !== data.length - length[1]
              || !JSON.parse(data.subarray(length[1]).toString()).version) throw new Error('Invalid status');
            status = true; socket.write(packet(Buffer.concat([Buffer.from([1]), nonce])));
          } else {
            if (data.length !== 9 || data[0] !== 1 || !data.subarray(1).equals(nonce)) throw new Error('Invalid pong');
            finish(); return;
          }
        }
      } catch (error) { finish(error as Error); }
    });
  });
}

export function preferDirect(normal: number[], direct: number[]): boolean {
  if (direct.length !== 5 || direct.some(n => !Number.isFinite(n) || n <= 0)) return false;
  if (normal.length !== 5) return true;
  const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
  const a = sorted(normal), b = sorted(direct);
  return b[2] + 5 < a[2] && b[4] - b[0] <= Math.max(20, a[4] - a[0] + 5) && b[4] <= a[4] + 5;
}

async function executable(directory: string): Promise<string> {
  await fs.mkdir(directory, { recursive: true });
  const binary = path.join(directory, 'frpc-0.71.1.exe');
  if (await fs.readFile(binary).then(bytes => hash(bytes) === executableHash).catch(() => false)) return binary;
  const archive = path.join(directory, 'frp-0.71.1.zip');
  let downloaded = 0;
  await downloadFile('https://github.com/fatedier/frp/releases/download/v0.71.1/frp_0.71.1_windows_amd64.zip', archive,
    bytes => { if ((downloaded += bytes) > 32 * 1024 * 1024) throw new Error('Oversized frp archive'); }, archiveHash, 15000);
  const bytes = await new Promise<Buffer>((resolve, reject) => {
    open(archive, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(error);
      zip.on('error', reject); zip.on('end', () => reject(new Error('frpc missing')));
      zip.on('entry', (entry: Entry) => {
        if (entry.fileName !== 'frp_0.71.1_windows_amd64/frpc.exe') return zip.readEntry();
        if (entry.uncompressedSize > 32 * 1024 * 1024) { zip.close(); return reject(new Error('Oversized frpc')); }
        zip.openReadStream(entry, (error, stream) => {
          if (error || !stream) { zip.close(); return reject(error); }
          const chunks: Buffer[] = []; stream.on('data', chunk => chunks.push(chunk));
          stream.on('error', reject); stream.on('end', () => { zip.close(); resolve(Buffer.concat(chunks)); });
        });
      }); zip.readEntry();
    });
  });
  if (hash(bytes) !== executableHash) throw new Error('frpc checksum mismatch');
  await fs.writeFile(binary, bytes); await fs.rm(archive, { force: true }); return binary;
}

export async function prepareDirectRoute(base: string, token: string, version: string, directory: string,
  normalAddress: string, log: (message: string) => void): Promise<{ address: string; close: () => void }> {
  const fallback = { address: normalAddress, close: () => {} };
  if (process.platform !== 'win32' || !normalAddress) return fallback;
  let close = () => {};
  let stage = 'API';
  const report = async (result: Record<string, unknown>) => {
    const folder = path.join(directory, 'direct'); await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, 'latest-route.json'), JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2)).catch(() => {});
  };
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/api/direct/config`, {
      headers: { Authorization: `Bearer ${token}`, 'x-quiby-launcher-version': version }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) { log(`Direct: API отклонил проверку (${response.status}). Используем обычный маршрут.`); await report({ reason: 'api', status: response.status }); return fallback; }
    const c = await response.json();
    if (!c.enabled) { log('Direct отключён на сервере. Используем обычный маршрут.'); await report({ reason: 'disabled' }); return fallback; }
    if (typeof c.server !== 'string' || !/^[a-zA-Z0-9.-]{1,253}$/.test(c.server) || !Number.isInteger(c.port) || c.port < 1 || c.port > 65535
      || typeof c.ca !== 'string' || c.ca.length > 8192 || !c.ca.startsWith('-----BEGIN CERTIFICATE-----')
      || c.user !== 'quiby-player' || typeof c.ticket !== 'string' || c.ticket.length > 4096) return fallback;
    stage = 'frpc';
    const binary = await executable(path.join(directory, 'direct'));
    const run = await fs.mkdtemp(path.join(directory, 'direct/session-'));
    close = () => { void fs.rm(run, { recursive: true, force: true }).catch(() => {}); };
    const listener = net.createServer(); await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', resolve));
    const port = (listener.address() as net.AddressInfo).port;
    await new Promise<void>(resolve => listener.close(() => resolve()));
    const caFile = path.join(run, 'ca.pem'); await fs.writeFile(caFile, c.ca, { mode: 0o600 });
    const visitor = { serverUser: 'quiby-host', secretKey: '', bindAddr: '127.0.0.1', transport: { useEncryption: true } };
    await fs.writeFile(path.join(run, 'frpc.json'), JSON.stringify({ serverAddr: c.server, serverPort: c.port, user: c.user,
      metadatas: { ticket: c.ticket }, natHoleStunServer: 'stun.easyvoip.com:3478', loginFailExit: true,
      transport: { tcpMux: false, tls: { enable: true, serverName: 'quiby-direct', trustedCaFile: caFile }, heartbeatInterval: 15, heartbeatTimeout: 45 },
      log: { level: 'error', to: path.join(run, 'frpc.log'), maxDays: 1 },
      visitors: [{ ...visitor, name: 'relay', type: 'stcp', serverName: 'minecraft-relay', bindPort: -1 },
        { ...visitor, name: 'direct', type: 'xtcp', serverName: 'minecraft-direct', bindPort: port,
          fallbackTo: 'relay', fallbackTimeoutMs: 20000, keepTunnelOpen: true, minRetryInterval: 30, maxRetriesAnHour: 30 }],
    }), { mode: 0o600 });
    const child = spawn(binary, ['-c', path.join(run, 'frpc.json')], { cwd: run, windowsHide: true, stdio: 'ignore' });
    let stopped = false;
    const exitCleanup = () => { child.kill(); try { rmSync(run, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} };
    close = () => { if (stopped) return; stopped = true; process.off('exit', exitCleanup); child.kill(); void fs.rm(run, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {}); };
    child.unref(); process.once('exit', exitCleanup);
    child.once('error', close); child.once('exit', close);
    await new Promise(resolve => setTimeout(resolve, 750));
    const [host, rawPort] = normalAddress.split(':');
    const samples = async (h: string, p: number) => {
      const values: number[] = [];
      for (let i = 0; i < 5; i++) { try { values.push(await minecraftPing(h, p)); } catch { return []; } }
      return values;
    };
    stage = 'NAT';
    log('Проверяем direct: создаём соединение между игроком и сервером (до 20 сек.)…');
    // A 2.5-second STCP fallback used to finish the check before NAT punching
    // could succeed. A probe shorter than fallback only accepts the direct path.
    try { await minecraftPing('127.0.0.1', port, 19000); }
    catch { close(); await report({ reason: 'nat-timeout' }); log('Direct не прошёл через NAT. Используем обычный маршрут.'); return fallback; }
    stage = 'ping';
    const [normal, direct] = await Promise.all([samples(host, Number(rawPort || 25565)), samples('127.0.0.1', port)]);
    const selected = !stopped && preferDirect(normal, direct);
    await report({ reason: selected ? 'direct' : 'quality', normal, direct });
    const median = (values: number[]) => values.length === 5 ? `${Math.round([...values].sort((a, b) => a - b)[2])} мс` : 'нет ответа';
    log(`Маршруты: обычный — ${median(normal)}, direct — ${median(direct)}.`);
    if (!selected) { close(); log('Обычный маршрут стабильнее — подключаемся через него.'); return fallback; }
    log('Туннель быстрее и стабилен — подключаемся автоматически.');
    return { address: `127.0.0.1:${port}`, close };
  } catch { close(); await report({ reason: 'error', stage }).catch(() => {}); log(`Direct: проверка ${stage} не завершена. Используем обычное подключение.`); return fallback; }
}
