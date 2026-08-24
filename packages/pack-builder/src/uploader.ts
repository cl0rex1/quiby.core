import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { ModpackManifest } from '@quiby/shared';

export interface PublishProgressCallback {
  (current: number, total: number, file: string): void;
}

export async function uploadModpack(
  dirPath: string,
  manifest: ModpackManifest,
  serverUrl: string,
  adminApiKey: string,
  onProgress?: PublishProgressCallback
): Promise<void> {
  const absDir = path.resolve(dirPath);
  const cleanServerUrl = serverUrl.replace(/\/$/, '');

  // 1. Upload files
  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i];
    const fullPath = path.join(absDir, file.path);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File does not exist: ${fullPath}`);
    }

    if (onProgress) {
      onProgress(i + 1, manifest.files.length, file.path);
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(fullPath));

    const response = await fetch(`${cleanServerUrl}/api/admin/modpack/upload-file`, {
      method: 'POST',
      headers: {
        'x-admin-key': adminApiKey,
        'x-file-path': file.path,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to upload ${file.path}: ${response.status} - ${err}`);
    }
  }

  // 2. Publish Manifest
  const manifestRes = await fetch(`${cleanServerUrl}/api/admin/modpack/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminApiKey,
    },
    body: JSON.stringify(manifest),
  });

  if (!manifestRes.ok) {
    const err = await manifestRes.text();
    throw new Error(`Failed to publish manifest: ${manifestRes.status} - ${err}`);
  }
}
