import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { ModpackManifest, NewsArticle, UserProfile } from '@quiby/shared';

// Ensure storage directory exists
if (!fs.existsSync(config.storagePath)) {
  fs.mkdirSync(config.storagePath, { recursive: true });
}

const db = new sqlite3.Database(config.dbPath);

// Helper for promise queries
export const dbRun = (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const dbAll = <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []) as T[]);
    });
  });
};

export async function initDatabase(): Promise<void> {
  // Users / Discord-Minecraft Whitelist Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT UNIQUE NOT NULL,
      discord_username TEXT NOT NULL,
      discord_global_name TEXT,
      discord_avatar TEXT,
      mc_username TEXT UNIQUE NOT NULL,
      uuid TEXT UNIQUE NOT NULL,
      is_whitelisted INTEGER DEFAULT 1,
      roles_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Modpack Versions Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS modpack_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      game_version TEXT NOT NULL,
      loader_type TEXT NOT NULL,
      loader_version TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      manifest_json TEXT NOT NULL,
      changelog TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // News Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      author_avatar TEXT,
      tag TEXT NOT NULL,
      banner_url TEXT,
      pin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Anti-Cheat: Verified Mods Table (Modrinth / CurseForge / Admin Whitelist Cache)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS verified_mods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash_sha1 TEXT UNIQUE NOT NULL,
      mod_id TEXT,
      name TEXT NOT NULL,
      version TEXT,
      summary TEXT,
      source TEXT NOT NULL,
      is_allowed INTEGER NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      categories_json TEXT DEFAULT '[]',
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Anti-Cheat: Player Mod Whitelist Requests Table
  const modColumns = await dbAll<{ name: string }>('PRAGMA table_info(verified_mods)');
  for (const column of ['icon_url', 'project_url']) {
    if (!modColumns.some(item => item.name === column)) await dbRun(`ALTER TABLE verified_mods ADD COLUMN ${column} TEXT`);
  }

  // Anti-Cheat: Player Mod Whitelist Requests Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS mod_whitelist_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_discord_id TEXT,
      mc_username TEXT,
      mod_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      hash_sha1 TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Additive migration for existing installations.
  const requestColumns = await dbAll<{ name: string }>('PRAGMA table_info(mod_whitelist_requests)');
  for (const name of ['project_url', 'reviewer_discord_id', 'decision_reason', 'reviewed_at']) {
    if (!requestColumns.some(column => column.name === name)) {
      await dbRun('ALTER TABLE mod_whitelist_requests ADD COLUMN ' + name + ' TEXT');
    }
  }
  if (!requestColumns.some(column => column.name === 'review_sequence')) {
    await dbRun('ALTER TABLE mod_whitelist_requests ADD COLUMN review_sequence INTEGER');
  }
  await dbRun('CREATE INDEX IF NOT EXISTS mod_requests_hash_review ON mod_whitelist_requests(hash_sha1, review_sequence DESC)');
  await dbRun('CREATE INDEX IF NOT EXISTS mod_requests_queue ON mod_whitelist_requests(status, id)');

  await dbRun(`
    CREATE TABLE IF NOT EXISTS mc_username_change_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      current_username TEXT NOT NULL,
      requested_username TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_discord_id TEXT,
      decision_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME
    )
  `);
  await dbRun('CREATE INDEX IF NOT EXISTS username_change_queue ON mc_username_change_requests(status, id)');

  // The review and verification cache change in the same SQLite statement/transaction.
  await dbRun(`
    CREATE TRIGGER IF NOT EXISTS mod_request_review_cache
    AFTER UPDATE OF status ON mod_whitelist_requests
    WHEN NEW.status IN ('approved', 'rejected') AND NEW.status != OLD.status
    BEGIN
      INSERT INTO verified_mods (hash_sha1, name, source, is_allowed, status, reason, categories_json, checked_at)
      VALUES (NEW.hash_sha1, NEW.mod_name, 'whitelist', NEW.status = 'approved',
        CASE WHEN NEW.status = 'approved' THEN 'approved' ELSE 'blocked' END,
        COALESCE(NEW.decision_reason, 'Решение администрации'), '["whitelist"]', CURRENT_TIMESTAMP)
      ON CONFLICT(hash_sha1) DO UPDATE SET
        name = excluded.name, source = excluded.source, is_allowed = excluded.is_allowed,
        status = excluded.status, reason = excluded.reason,
        categories_json = excluded.categories_json, checked_at = excluded.checked_at;
    END
  `);

  // Seed default Season 6 modpack version if table is empty
  const count = await dbGet<{ count: number }>('SELECT count(*) as count FROM modpack_versions');
  if (!count || count.count === 0) {
    const initialManifest: ModpackManifest = {
      id: 'quiby-s6-aeronautics',
      name: 'quiby. Season 6: Aeronautics',
      version: '6.0.0',
      gameVersion: '1.21.1',
      loader: {
        type: 'neoforge',
        version: '21.1.65'
      },
      javaVersion: 21,
      recommendedRamMb: 8192,
      minRamMb: 4096,
      jvmArgs: [
        '-XX:+UseG1GC',
        '-XX:+ParallelRefProcEnabled',
        '-XX:MaxGCPauseMillis=200',
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:+DisableExplicitGC',
        '-XX:+AlwaysPreTouch',
        '-XX:G1NewSizePercent=30',
        '-XX:G1MaxNewSizePercent=40',
        '-XX:G1ReservePercent=20',
        '-XX:G1HeapWastePercent=5',
        '-XX:G1MixedGCCountTarget=4',
        '-XX:InitiatingHeapOccupancyPercent=15',
        '-XX:G1MixedGCLiveThresholdPercent=90',
        '-XX:G1RSetUpdatingPauseTimePercent=5',
        '-XX:SurvivorRatio=32',
        '-XX:+PerfDisableSharedMem',
        '-XX:MaxTenuringThreshold=1'
      ],
      totalSize: 0,
      files: [],
      changelog: '🚀 Welcome to quiby. Season 6! Modded survival featuring Create, Create Aeronautics, optimized performance mods, shaders, and custom mechanics on Minecraft 1.21.1 NeoForge.',
      serverAddress: config.minecraft.serverIp ? `${config.minecraft.serverIp}:${config.minecraft.serverPort}` : '',
      updatedAt: new Date().toISOString()
    };

    await dbRun(`
      INSERT INTO modpack_versions (version_id, name, game_version, loader_type, loader_version, is_active, manifest_json, changelog)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      initialManifest.version,
      initialManifest.name,
      initialManifest.gameVersion,
      initialManifest.loader.type,
      initialManifest.loader.version,
      JSON.stringify(initialManifest),
      initialManifest.changelog
    ]);
  }

  // Seed sample news if empty
  const newsCount = await dbGet<{ count: number }>('SELECT count(*) as count FROM news');
  if (!newsCount || newsCount.count === 0) {
    const defaultNews: NewsArticle[] = [
      {
        id: 'news-s6-launch',
        title: '🌟 Открытие 6 Сезона quiby. Aeronautics!',
        excerpt: '6 сезон официально стартовал на версии Minecraft 1.21.1 NeoForge с новейшими модами Create!',
        content: 'Мы рады приветствовать всех игроков на 6 сезоне quiby.! В этом сезоне мы полностью переработали сервер, внедрив моды Create, дирижабли Aeronautics, уникальную экономику и Discord-авторизацию для безопасного и комфортного вайтлиста.',
        author: 'quiby Team',
        tag: 'season',
        date: new Date().toISOString(),
        bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        pin: true
      },
      {
        id: 'news-launcher-guide',
        title: '🛠 Руководство по новому лаунчеру quiby.core',
        excerpt: 'Как настроить оперативную память, обновить моды и включить шейдеры.',
        content: 'Наш новый лаунчер автоматически синхронизирует моды, конфиги и ресурспаки. Если вы хотите выделить больше памяти, откройте Настройки в лаунчере и передвиньте ползунок RAM на 6-8 ГБ для оптимальной работы.',
        author: 'Development',
        tag: 'update',
        date: new Date(Date.now() - 86400000).toISOString(),
        bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        pin: false
      }
    ];

    for (const article of defaultNews) {
      await dbRun(`
        INSERT INTO news (id, title, excerpt, content, author, tag, banner_url, pin, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        article.id,
        article.title,
        article.excerpt,
        article.content,
        article.author,
        article.tag,
        article.bannerUrl || null,
        article.pin ? 1 : 0,
        article.date
      ]);
    }
  }
}

export const closeDatabase = (): Promise<void> => new Promise((resolve, reject) => {
  db.close(error => error ? reject(error) : resolve());
});
