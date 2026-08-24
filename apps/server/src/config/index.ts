import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'quiby-super-secret-jwt-key-change-in-prod-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  adminApiKey: process.env.ADMIN_API_KEY || 'quiby-admin-secret-key-s6',
  
  // Discord OAuth2 Configuration
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/auth/discord/callback',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    guildId: process.env.DISCORD_GUILD_ID || '', // quiby Discord Server ID
    requiredRoleId: process.env.DISCORD_REQUIRED_ROLE_ID || '', // Optional role required to play
  },

  // Minecraft Server
  minecraft: {
    serverIp: process.env.MC_SERVER_IP || 'play.quiby.fun',
    serverPort: parseInt(process.env.MC_SERVER_PORT || '25565', 10),
    targetGameVersion: '1.21.1',
    targetLoader: 'neoforge',
    targetLoaderVersion: '21.1.65',
  },

  // Storage
  storagePath: path.resolve(process.env.STORAGE_PATH || path.join(__dirname, '../../storage')),
  dbPath: path.resolve(process.env.DB_PATH || path.join(__dirname, '../../storage/quiby.sqlite')),
};
