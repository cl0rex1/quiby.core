import DiscordRPC from 'discord-rpc';

// Public Application ID of the Quiby Discord application used for OAuth.
const CLIENT_ID = process.env.QUIBY_DISCORD_CLIENT_ID || '1181194494398451762';
let rpcClient: DiscordRPC.Client | null = null;
let isConnected = false;
let enabled = false;
let retry: NodeJS.Timeout | null = null;
let activity = { details: 'В главном меню лаунчера', state: 'quiby. Season 6 · Minecraft 1.21.1', startTimestamp: Date.now() };

function connect(): void {
  if (!enabled || rpcClient) return;
  const client = new DiscordRPC.Client({ transport: 'ipc' });
  rpcClient = client;
  const disconnected = () => {
    if (rpcClient !== client) return;
    rpcClient = null;
    isConnected = false;
    void client.destroy().catch(() => {});
    if (enabled && !retry) {
      retry = setTimeout(() => { retry = null; connect(); }, 15000);
      retry.unref();
    }
  };
  client.on('ready', () => {
    if (rpcClient !== client || !enabled) return;
    isConnected = true;
    updateDiscordRpcStatus(activity);
  });
  client.on('disconnected', disconnected);
  client.on('error', disconnected);
  void client.login({ clientId: CLIENT_ID }).catch(disconnected);
}

export function configureDiscordRpc(value: boolean): void {
  enabled = value;
  if (enabled) { connect(); return; }
  if (retry) clearTimeout(retry);
  retry = null;
  const client = rpcClient;
  rpcClient = null;
  isConnected = false;
  if (client) void client.destroy().catch(() => {});
}

export function updateDiscordRpcStatus(next: { details: string; state: string; startTimestamp?: number }): void {
  activity = { ...next, startTimestamp: next.startTimestamp ?? Date.now() };
  if (!enabled || !isConnected || !rpcClient) return;
  void rpcClient.setActivity({ ...activity, instance: false }).catch(() => {});
}
