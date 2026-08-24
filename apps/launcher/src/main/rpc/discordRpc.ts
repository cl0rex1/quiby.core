import DiscordRPC from 'discord-rpc';

const CLIENT_ID = '123456789012345678'; // Can be configured via settings or default
let rpcClient: DiscordRPC.Client | null = null;
let isConnected = false;

export function initDiscordRpc(clientId: string = CLIENT_ID): void {
  if (rpcClient) return;

  try {
    rpcClient = new DiscordRPC.Client({ transport: 'ipc' });

    rpcClient.on('ready', () => {
      isConnected = true;
      console.log('✅ Discord RPC Connected');
      updateDiscordRpcStatus({
        details: 'В главном меню',
        state: 'quiby. Season 6 (1.21.1 NeoForge)',
        startTimestamp: Date.now(),
      });
    });

    rpcClient.login({ clientId }).catch(() => {
      console.log('ℹ️ Discord is not running locally, RPC disabled.');
    });
  } catch (err) {
    console.log('ℹ️ Discord RPC initialization skipped.');
  }
}

export function updateDiscordRpcStatus(activity: {
  details: string;
  state: string;
  startTimestamp?: number;
  partySize?: number;
  partyMax?: number;
}): void {
  if (!rpcClient || !isConnected) return;

  try {
    rpcClient.setActivity({
      details: activity.details,
      state: activity.state,
      startTimestamp: activity.startTimestamp,
      largeImageKey: 'quiby_logo',
      largeImageText: 'quiby. Season 6: Aeronautics',
      smallImageKey: 'neoforge_badge',
      smallImageText: 'Minecraft 1.21.1 NeoForge',
      instance: false,
    }).catch(() => {});
  } catch (_) {}
}
