import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { dbGet, dbRun } from '../models/db';
import {
  checkGuildMembership,
  exchangeDiscordCode,
  fetchDiscordUser,
  generateMinecraftUUID,
  getDiscordAvatarUrl,
} from '../services/discord';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { AuthSession, UserProfile } from '@quiby/shared';

const router = Router();

const mcUsernameSchema = z
  .string()
  .min(3, 'Minecraft username must be at least 3 characters')
  .max(16, 'Minecraft username cannot exceed 16 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Minecraft username can only contain letters, numbers, and underscores');

// 1. Get Discord OAuth2 Login URL
router.get('/discord/url', (req: Request, res: Response) => {
  if (!config.discord.clientId) {
    return res.status(503).json({
      error: 'Discord OAuth2 is not configured on this server yet. Use /api/auth/dev-login for local testing.',
      isConfigured: false,
    });
  }

  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: config.discord.redirectUri,
    response_type: 'code',
    scope: 'identify guilds guilds.members.read',
  });

  const url = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  return res.json({ url, isConfigured: true });
});

// 2. Discord Callback
router.post('/discord/callback', async (req: Request, res: Response) => {
  const { code, redirectUri } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const tokenData = await exchangeDiscordCode(code, redirectUri);
    const discordUser = await fetchDiscordUser(tokenData.access_token);
    const guildStatus = await checkGuildMembership(discordUser.id);

    if (!guildStatus.isMember) {
      return res.status(403).json({
        error: 'You must be a member of the quiby Discord server (or have the required role) to play.',
        discordUser,
      });
    }

    // Check if user already has a bound Minecraft account
    const existingUser = await dbGet<any>('SELECT * FROM users WHERE discord_id = ?', [discordUser.id]);

    if (!existingUser) {
      // User needs to choose their Minecraft username (one-time binding)
      return res.json({
        needsBinding: true,
        discordUser: {
          id: discordUser.id,
          username: discordUser.username,
          globalName: discordUser.global_name,
          avatar: discordUser.avatar,
          avatarUrl: getDiscordAvatarUrl(discordUser),
          roles: guildStatus.roles,
        },
      });
    }

    // Update avatar and username if changed
    await dbRun(
      'UPDATE users SET discord_username = ?, discord_global_name = ?, discord_avatar = ?, roles_json = ?, last_login_at = CURRENT_TIMESTAMP WHERE discord_id = ?',
      [
        discordUser.username,
        discordUser.global_name || null,
        discordUser.avatar || null,
        JSON.stringify(guildStatus.roles),
        discordUser.id,
      ]
    );

    const userProfile: UserProfile = {
      discordId: existingUser.discord_id,
      username: existingUser.discord_username,
      globalName: existingUser.discord_global_name || undefined,
      avatar: existingUser.discord_avatar || undefined,
      avatarUrl: getDiscordAvatarUrl(discordUser),
      mcUsername: existingUser.mc_username,
      uuid: existingUser.uuid,
      isWhitelisted: Boolean(existingUser.is_whitelisted),
      roles: guildStatus.roles,
      joinedAt: existingUser.created_at,
    };

    const token = jwt.sign(
      { discordId: userProfile.discordId, mcUsername: userProfile.mcUsername, uuid: userProfile.uuid },
      config.jwtSecret,
      { expiresIn: (config.jwtExpiresIn || '30d') as any }
    );

    const session: AuthSession = {
      token,
      user: userProfile,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    return res.json({ needsBinding: false, session });
  } catch (error: any) {
    console.error('Discord callback error:', error);
    return res.status(500).json({ error: error.message || 'Discord authentication failed' });
  }
});

// 3. Bind Minecraft IGN to Discord Account (1:1 strict binding)
router.post('/bind-mc', async (req: Request, res: Response) => {
  const { discordId, discordUsername, discordGlobalName, discordAvatar, roles, mcUsername } = req.body;

  if (!discordId || !discordUsername || !mcUsername) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate Minecraft IGN format
  const parseResult = mcUsernameSchema.safeParse(mcUsername.trim());
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.errors[0].message });
  }

  const cleanUsername = parseResult.data;

  // Check if Discord ID is already bound
  const existingDiscord = await dbGet<any>('SELECT * FROM users WHERE discord_id = ?', [discordId]);
  if (existingDiscord) {
    return res.status(400).json({ error: `This Discord account is already bound to Minecraft username "${existingDiscord.mc_username}"` });
  }

  // Check if Minecraft username is already taken by another Discord account
  const existingMC = await dbGet<any>('SELECT * FROM users WHERE LOWER(mc_username) = LOWER(?)', [cleanUsername]);
  if (existingMC) {
    return res.status(409).json({ error: `The Minecraft username "${cleanUsername}" is already linked to another Discord account.` });
  }

  const uuid = generateMinecraftUUID(cleanUsername);

  await dbRun(
    `INSERT INTO users (discord_id, discord_username, discord_global_name, discord_avatar, mc_username, uuid, is_whitelisted, roles_json, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      discordId,
      discordUsername,
      discordGlobalName || null,
      discordAvatar || null,
      cleanUsername,
      uuid,
      JSON.stringify(roles || []),
    ]
  );

  const userProfile: UserProfile = {
    discordId,
    username: discordUsername,
    globalName: discordGlobalName || undefined,
    avatar: discordAvatar || undefined,
    avatarUrl: discordAvatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/0.png`,
    mcUsername: cleanUsername,
    uuid,
    isWhitelisted: true,
    roles: roles || [],
    joinedAt: new Date().toISOString(),
  };

  const token = jwt.sign(
    { discordId: userProfile.discordId, mcUsername: userProfile.mcUsername, uuid: userProfile.uuid },
    config.jwtSecret,
    { expiresIn: (config.jwtExpiresIn || '30d') as any }
  );

  const session: AuthSession = {
    token,
    user: userProfile,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };

  return res.json({ session });
});

// 4. Dev / Local Test Login
router.post('/dev-login', async (req: Request, res: Response) => {
  const { username, discordTag } = req.body;
  const cleanUsername = (username || 'QuibyPlayer').trim();
  const cleanTag = (discordTag || 'quiby_tester#0001').trim();

  const parseResult = mcUsernameSchema.safeParse(cleanUsername);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.errors[0].message });
  }

  const devDiscordId = `dev_${cleanTag.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const uuid = generateMinecraftUUID(cleanUsername);

  let user = await dbGet<any>('SELECT * FROM users WHERE discord_id = ? OR LOWER(mc_username) = LOWER(?)', [
    devDiscordId,
    cleanUsername,
  ]);

  if (!user) {
    await dbRun(
      `INSERT INTO users (discord_id, discord_username, discord_global_name, mc_username, uuid, is_whitelisted, roles_json)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [devDiscordId, cleanTag, cleanTag, cleanUsername, uuid, JSON.stringify(['tester', 'player'])]
    );
    user = await dbGet<any>('SELECT * FROM users WHERE discord_id = ?', [devDiscordId]);
  } else {
    await dbRun('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
  }

  const userProfile: UserProfile = {
    discordId: user.discord_id,
    username: user.discord_username,
    globalName: user.discord_global_name || undefined,
    avatar: user.discord_avatar || undefined,
    avatarUrl: `https://api.dicebear.com/8.x/bottts/svg?seed=${user.mc_username}`,
    mcUsername: user.mc_username,
    uuid: user.uuid,
    isWhitelisted: Boolean(user.is_whitelisted),
    roles: JSON.parse(user.roles_json || '[]'),
    joinedAt: user.created_at,
  };

  const token = jwt.sign(
    { discordId: userProfile.discordId, mcUsername: userProfile.mcUsername, uuid: userProfile.uuid },
    config.jwtSecret,
    { expiresIn: (config.jwtExpiresIn || '30d') as any }
  );

  const session: AuthSession = {
    token,
    user: userProfile,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };

  return res.json({ session });
});

// 5. Get current profile (requires JWT)
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// 6. Verify Session for Minecraft Server (Anti-Alt & Whitelist Gateway)
router.post('/verify-session', async (req: Request, res: Response) => {
  const { username, token, uuid } = req.body;
  if (!username || !token) {
    return res.status(400).json({ valid: false, error: 'Missing username or token' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as any;
    if (payload.mcUsername.toLowerCase() !== username.toLowerCase()) {
      return res.status(403).json({ valid: false, error: 'Token does not match Minecraft username' });
    }

    const user = await dbGet<any>('SELECT * FROM users WHERE discord_id = ?', [payload.discordId]);
    if (!user || !user.is_whitelisted) {
      return res.status(403).json({ valid: false, error: 'Player is not whitelisted on quiby.' });
    }

    return res.json({
      valid: true,
      player: {
        discordId: user.discord_id,
        mcUsername: user.mc_username,
        uuid: user.uuid,
        roles: JSON.parse(user.roles_json || '[]'),
      },
    });
  } catch (err) {
    return res.status(401).json({ valid: false, error: 'Invalid or expired session token' });
  }
});

export default router;
