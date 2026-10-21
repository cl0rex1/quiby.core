import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

if (process.env.NODE_ENV === 'production' && ((process.env.JWT_SECRET?.length || 0) < 32 || (process.env.ADMIN_API_KEY?.length || 0) < 32)) {
  throw new Error('JWT_SECRET and ADMIN_API_KEY must each contain at least 32 characters in production');
}

if (process.env.MOD_REVIEW_BOT_API_KEY && process.env.MOD_REVIEW_BOT_API_KEY.length < 32) {
  throw new Error('MOD_REVIEW_BOT_API_KEY must contain at least 32 characters');
}
if (process.env.GAME_BRIDGE_API_KEY && process.env.GAME_BRIDGE_API_KEY.length < 32) throw new Error('GAME_BRIDGE_API_KEY must contain at least 32 characters');

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  adminApiKey: process.env.ADMIN_API_KEY || crypto.randomBytes(32).toString('hex'),
  
  modReviewBotApiKey: process.env.MOD_REVIEW_BOT_API_KEY || '',
  gameBridgeApiKey: process.env.GAME_BRIDGE_API_KEY || '',

  // Discord OAuth2 Configuration
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:45678/callback',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    guildId: process.env.DISCORD_GUILD_ID || '', // quiby Discord Server ID
    requiredRoleId: process.env.DISCORD_REQUIRED_ROLE_ID || '', // Optional role required to play
  },

  // Minecraft Server
  minecraft: {
    serverIp: process.env.MC_SERVER_IP || 'play.quiby.me',
    serverPort: parseInt(process.env.MC_SERVER_PORT || '25565', 10),
    targetGameVersion: '1.21.1',
    targetLoader: 'neoforge',
    targetLoaderVersion: '21.1.250',
  },

  // Storage
  storagePath: path.resolve(process.env.STORAGE_PATH || path.join(__dirname, '../../storage')),
  dbPath: path.resolve(process.env.DB_PATH || path.join(__dirname, '../../storage/quiby.sqlite')),
};
