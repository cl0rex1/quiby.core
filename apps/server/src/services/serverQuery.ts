import * as util from 'minecraft-server-util';
import { ServerStatus } from '@quiby/shared';
import { config } from '../config';

let cachedStatus: ServerStatus | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache

export async function getServerStatus(): Promise<ServerStatus> {
  const now = Date.now();
  if (cachedStatus && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedStatus;
  }

  const { serverIp, serverPort } = config.minecraft;

  if (!serverIp) {
    return {
      online: false,
      ip: '',
      port: serverPort,
      version: config.minecraft.targetGameVersion,
      players: { online: 0, max: 0, sample: [] },
      motd: { raw: 'Сервер готовится', clean: 'Сервер готовится' },
      latencyMs: 0,
    };
  }

  try {
    const result = await util.status(serverIp, serverPort, {
      timeout: 3000,
      enableSRV: true,
    });

    cachedStatus = {
      online: true,
      ip: serverIp,
      port: serverPort,
      version: result.version.name || config.minecraft.targetGameVersion,
      players: {
        online: result.players.online,
        max: result.players.max,
        sample: result.players.sample?.map(p => ({ name: p.name, id: p.id })) || [],
      },
      motd: {
        raw: result.motd.raw,
        clean: result.motd.clean,
        html: result.motd.html,
      },
      latencyMs: result.roundTripLatency,
      favicon: result.favicon || undefined,
    };
  } catch (error) {
    // If the server is offline or not reachable yet, return friendly offline fallback
    cachedStatus = {
      online: false,
      ip: serverIp,
      port: serverPort,
      version: `${config.minecraft.targetGameVersion} (NeoForge)`,
      players: {
        online: 0,
        max: 100,
        sample: [],
      },
      motd: {
        raw: '§bquiby. Season 6 §7| §fNeoForge 1.21.1 §8[Offline / Maintenance]',
        clean: 'quiby. Season 6 | NeoForge 1.21.1 [Offline / Maintenance]',
      },
      latencyMs: 0,
    };
  }

  lastFetchTime = now;
  return cachedStatus;
}
