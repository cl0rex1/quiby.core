import crypto from 'crypto';
import { config } from '../config';

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
  bot?: boolean;
}

export interface DiscordGuildMember {
  user: DiscordUser;
  roles: string[];
  joined_at: string;
}

// Generates offline player UUID (compatible with standard Minecraft Offline / Custom Auth)
export function generateMinecraftUUID(username: string): string {
  const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest('hex');
  // Format as standard UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // In Java standard: version 3 (MD5-based), variant 2 (IETF)
  const bytes = Buffer.from(hash, 'hex');
  bytes[6] = (bytes[6] & 0x0f) | 0x30; // set version 3
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // set variant 2
  const hex = bytes.toString('hex');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

export async function exchangeDiscordCode(code: string, redirectUri?: string): Promise<DiscordTokenResponse> {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri || config.discord.redirectUri,
  });

  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange Discord code: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as DiscordTokenResponse;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Discord user: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as DiscordUser;
}

export async function checkGuildMembership(userId: string): Promise<{ isMember: boolean; roles: string[] }> {
  // If guild checking is disabled / unconfigured, grant pass
  if (!config.discord.botToken || !config.discord.guildId) {
    return { isMember: true, roles: [] };
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${config.discord.guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${config.discord.botToken}` },
    });

    if (response.status === 404) {
      return { isMember: false, roles: [] };
    }

    if (!response.ok) {
      console.warn(`Discord Guild check warning: ${response.status}`);
      return { isMember: true, roles: [] }; // fallback to avoid blocking users on Discord API hiccups
    }

    const member = (await response.json()) as DiscordGuildMember;
    const hasRequiredRole = !config.discord.requiredRoleId || member.roles.includes(config.discord.requiredRoleId);

    return {
      isMember: hasRequiredRole,
      roles: member.roles || [],
    };
  } catch (err) {
    console.error('Error querying Discord Guild API:', err);
    return { isMember: true, roles: [] };
  }
}

export function getDiscordAvatarUrl(user: DiscordUser): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  // Default discord avatar based on discriminator or user ID
  const index = user.discriminator === '0' 
    ? (BigInt(user.id) >> 22n) % 6n 
    : parseInt(user.discriminator, 10) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
