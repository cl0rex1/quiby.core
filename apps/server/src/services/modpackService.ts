import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ModpackManifest, ModpackFile } from '@quiby/shared';
import { config } from '../config';
import { dbAll, dbGet, dbRun } from '../models/db';

export async function getLatestManifest(): Promise<ModpackManifest | null> {
  const row = await dbGet<{ manifest_json: string }>(
    'SELECT manifest_json FROM modpack_versions WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
  );
  if (!row) return null;
  return JSON.parse(row.manifest_json) as ModpackManifest;
}

export async function getManifestByVersion(versionId: string): Promise<ModpackManifest | null> {
  const row = await dbGet<{ manifest_json: string }>(
    'SELECT manifest_json FROM modpack_versions WHERE version_id = ?',
    [versionId]
  );
  if (!row) return null;
  return JSON.parse(row.manifest_json) as ModpackManifest;
}

export async function getAllVersions(): Promise<Array<{ version_id: string; name: string; game_version: string; loader_type: string; loader_version: string; is_active: boolean; changelog: string; created_at: string }>> {
  const rows = await dbAll<any>(
    'SELECT version_id, name, game_version, loader_type, loader_version, is_active, changelog, created_at FROM modpack_versions ORDER BY id DESC'
  );
  return rows.map(r => ({
    ...r,
    is_active: Boolean(r.is_active),
  }));
}

export async function publishModpackVersion(manifest: ModpackManifest, makeActive: boolean = true): Promise<void> {
  if (makeActive) {
    await dbRun('UPDATE modpack_versions SET is_active = 0');
  }

  // Check if version already exists
  const existing = await dbGet<{ id: number }>('SELECT id FROM modpack_versions WHERE version_id = ?', [manifest.version]);
  if (existing) {
    await dbRun(
      'UPDATE modpack_versions SET name = ?, game_version = ?, loader_type = ?, loader_version = ?, is_active = ?, manifest_json = ?, changelog = ? WHERE version_id = ?',
      [
        manifest.name,
        manifest.gameVersion,
        manifest.loader.type,
        manifest.loader.version,
        makeActive ? 1 : 0,
        JSON.stringify(manifest),
        manifest.changelog,
        manifest.version,
      ]
    );
  } else {
    await dbRun(
      'INSERT INTO modpack_versions (version_id, name, game_version, loader_type, loader_version, is_active, manifest_json, changelog) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        manifest.version,
        manifest.name,
        manifest.gameVersion,
        manifest.loader.type,
        manifest.loader.version,
        makeActive ? 1 : 0,
        JSON.stringify(manifest),
        manifest.changelog,
      ]
    );
  }
}

export function computeFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
