import net from 'node:net';
import fs from 'node:fs/promises';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import runtime from '../../../direct-runtime.json';

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

/** Packaged direct needs no first-run download; every executable remains hash pinned. */
export async function directExecutable(directory: string, bundled = path.join(
  process.defaultApp ? path.resolve(__dirname, '../../direct') : path.join(process.resourcesPath || '', 'direct'), runtime.filename
)): Promise<string> {
  for (const candidate of [bundled, path.join(directory, runtime.filename)]) {
    let bytes: Buffer;
    try { bytes = await fs.readFile(candidate); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    if (hash(bytes) === runtime.executableSha256) return candidate;
  }
  throw new Error('Проверенный frpc отсутствует или повреждён. Переустановите актуальный лаунчер.');
}

export function directError(error: unknown): { code?: string; message: string } {
  const value = error instanceof Error ? error : new Error(String(error));
  const cause = value.cause instanceof Error ? `: ${value.cause.message}` : '';
  const code = (value as NodeJS.ErrnoException).code || (value.cause as NodeJS.ErrnoException | undefined)?.code;
  return { ...(code ? { code } : {}), message: (value.message + cause).replace(/eyJ[A-Za-z0-9_.-]+/g, '[redacted]').slice(0, 600) };
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
    stage = 'binary';
    const binary = await directExecutable(path.join(directory, 'direct'));
    stage = 'session';
    await fs.mkdir(path.join(directory, 'direct'), { recursive: true });
    const run = await fs.mkdtemp(path.join(directory, 'direct/session-'));
    close = () => { void fs.rm(run, { recursive: true, force: true }).catch(() => {}); };
    stage = 'port';
    const listener = net.createServer(); await new Promise<void>((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve); });
    const port = (listener.address() as net.AddressInfo).port;
    await new Promise<void>(resolve => listener.close(() => resolve()));
    stage = 'configuration';
    const caFile = path.join(run, 'ca.pem'); await fs.writeFile(caFile, c.ca, { mode: 0o600 });
    const visitor = { serverUser: 'quiby-host', secretKey: '', bindAddr: '127.0.0.1', transport: { useEncryption: true } };
    await fs.writeFile(path.join(run, 'frpc.json'), JSON.stringify({ serverAddr: c.server, serverPort: c.port, user: c.user,
      metadatas: { ticket: c.ticket }, natHoleStunServer: 'stun.easyvoip.com:3478', loginFailExit: true,
      transport: { tcpMux: false, tls: { enable: true, serverName: 'quiby-direct', trustedCaFile: caFile }, heartbeatInterval: 15, heartbeatTimeout: 45 },
      log: { level: 'warn', to: path.join(run, 'frpc.log'), maxDays: 1 },
      visitors: [{ ...visitor, name: 'relay', type: 'stcp', serverName: 'minecraft-relay', bindPort: -1 },
        { ...visitor, name: 'direct', type: 'xtcp', serverName: 'minecraft-direct', bindPort: port,
          fallbackTo: 'relay', fallbackTimeoutMs: 35000, keepTunnelOpen: true, minRetryInterval: 5, maxRetriesAnHour: 120 }],
    }), { mode: 0o600 });
    stage = 'spawn';
    const child = spawn(binary, ['-c', path.join(run, 'frpc.json')], { cwd: run, windowsHide: true, stdio: 'ignore' });
    let stopped = false;
    const exitCleanup = () => { child.kill(); try { rmSync(run, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} };
    close = () => { if (stopped) return; stopped = true; process.off('exit', exitCleanup); child.kill(); void fs.rm(run, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {}); };
    child.unref(); process.once('exit', exitCleanup);
    const spawned = new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    child.once('error', close); child.once('exit', close);
    await spawned;
    stage = 'startup';
    await new Promise(resolve => setTimeout(resolve, 750));
    if (stopped) throw new Error(`frpc завершился при запуске: код ${child.exitCode}, сигнал ${child.signalCode || 'нет'}`);
    const [host, rawPort] = normalAddress.split(':');
    const samples = async (h: string, p: number) => {
      const values: number[] = [];
      for (let i = 0; i < 5; i++) { try { values.push(await minecraftPing(h, p)); } catch { return []; } }
      return values;
    };
    stage = 'NAT';
    log('Проверяем direct: создаём соединение между игроком и сервером (до 35 сек.)…');
    // A 2.5-second STCP fallback used to finish the check before NAT punching
    // could succeed. A probe shorter than fallback only accepts the direct path.
    try { await minecraftPing('127.0.0.1', port, 34000); }
    catch {
      const details = await fs.readFile(path.join(run, 'frpc.log'), 'utf8').then(text => text.split('\n')
        .filter(line => /stun|nathole|login.*fail|timeout|refused/i.test(line))
        .slice(-3).map(line => line.replace(/eyJ[A-Za-z0-9_.-]+/g, '[redacted]'))).catch(() => []);
      close(); await report({ reason: 'nat-timeout', details }); log('Direct не прошёл через NAT. Используем обычный маршрут.'); return fallback;
    }
    stage = 'ping';
    const [normal, direct] = await Promise.all([samples(host, Number(rawPort || 25565)), samples('127.0.0.1', port)]);
    const selected = !stopped && preferDirect(normal, direct);
    await report({ reason: selected ? 'direct' : 'quality', normal, direct });
    const median = (values: number[]) => values.length === 5 ? `${Math.round([...values].sort((a, b) => a - b)[2])} мс` : 'нет ответа';
    log(`Маршруты: обычный — ${median(normal)}, direct — ${median(direct)}.`);
    if (!selected) { close(); log('Обычный маршрут стабильнее — подключаемся через него.'); return fallback; }
    log('Туннель быстрее и стабилен — подключаемся автоматически.');
    return { address: `127.0.0.1:${port}`, close };
  } catch (error) { close(); const details = directError(error); await report({ reason: 'error', stage, error: details }).catch(() => {}); log(`Direct: ${stage} — ${details.message}. Используем обычное подключение.`); return fallback; }
}
