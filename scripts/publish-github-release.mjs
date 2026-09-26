import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const owner = 'cl0rex1';
const kind = process.argv[2];
if (!['pack', 'launcher'].includes(kind)) throw new Error('Usage: node scripts/publish-github-release.mjs pack|launcher');
const repo = kind === 'pack' ? 'quiby-modpacks' : 'quiby-launcher-releases';
const api = `https://api.github.com/repos/${owner}/${repo}`;
const token = process.env.GITHUB_TOKEN || execFileSync('git', ['-c', 'credential.interactive=never', 'credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'],
}).match(/^password=(.+)$/m)?.[1];
if (!token) throw new Error('GitHub credential not found. Sign in to git or set GITHUB_TOKEN.');
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'quiby-release-publisher', 'X-GitHub-Api-Version': '2022-11-28' };

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response.json();
}
async function release(tag, name, description, prerelease) {
  const existing = await fetch(`${api}/releases/tags/${encodeURIComponent(tag)}`, { headers });
  if (existing.ok) {
    const value = await existing.json();
    if (!value.draft) throw new Error(`${tag} is already published. Use a new version for changes.`);
    return value;
  }
  if (existing.status !== 404) throw new Error(`Cannot inspect release: ${existing.status}`);
  return request(`${api}/releases`, { method: 'POST', body: JSON.stringify({ tag_name: tag, name, body: description, draft: true, prerelease }) });
}
async function upload(value, filename, bytes, contentType = 'application/octet-stream') {
  const url = `${value.upload_url.replace(/\{.*$/, '')}?name=${encodeURIComponent(filename)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': contentType, 'Content-Length': String(bytes.length) }, body: bytes });
    if (response.ok) return;
    const message = (await response.text()).slice(0, 300);
    if (attempt === 3 || ![429, 502, 503].includes(response.status)) throw new Error(`Upload ${filename}: ${response.status} ${message}`);
    await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
  }
}
async function listedAssets(value) {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await request(`${api}/releases/${value.id}/assets?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}
async function publish(value) {
  const updated = await request(`${api}/releases/${value.id}`, { method: 'PATCH', body: JSON.stringify({ draft: false }) });
  console.log(`Published ${updated.html_url}`);
}

if (kind === 'pack') {
  const source = JSON.parse(await fs.readFile(path.join(root, 'modpacks/quiby-s6/manifest.json'), 'utf8'));
  const tag = `v${source.version}`;
  const assetBase = `https://github.com/${owner}/${repo}/releases/download/${tag}/`;
  const payloads = new Map();
  const addAsset = async (url, expectedHash) => {
    if (!url.startsWith('/api/modpack/files/')) throw new Error(`Unexpected source URL: ${url}`);
    const relative = decodeURIComponent(url.slice('/api/modpack/files/'.length));
    const sourcePath = path.resolve(root, 'apps/server/storage/files', relative);
    if (!sourcePath.startsWith(path.resolve(root, 'apps/server/storage/files') + path.sep)) throw new Error(`Unsafe file path: ${relative}`);
    const bytes = await fs.readFile(sourcePath);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    if (expectedHash && expectedHash !== hash) throw new Error(`Hash mismatch: ${relative}`);
    const extension = path.extname(sourcePath).toLowerCase();
    const filename = `${hash}${extension}`;
    payloads.set(filename, sourcePath);
    return assetBase + filename;
  };
  for (const file of source.files) {
    file.downloadUrl = await addAsset(file.downloadUrl, file.sha256);
    if (file.modIconUrl?.startsWith('/api/modpack/files/')) file.modIconUrl = await addAsset(file.modIconUrl);
  }
  if (process.argv.includes('--check')) {
    console.log(`Validated ${source.files.length} manifest files and ${payloads.size} unique release assets`);
    process.exit(0);
  }
  const value = await release(tag, `quiby. Season 6 ${source.version}`, 'Visual, Standard, Draft — Minecraft 1.21.1 / NeoForge 21.1.250. Files are selected by SHA-256 manifest.', false);
  const existing = new Map((await listedAssets(value)).map(asset => [asset.name, asset]));
  let uploaded = 0;
  for (const [filename, sourcePath] of payloads) {
    const bytes = await fs.readFile(sourcePath);
    if (existing.has(filename)) {
      if (existing.get(filename).size !== bytes.length) throw new Error(`Wrong size on existing asset: ${filename}`);
      continue;
    }
    await upload(value, filename, bytes);
    uploaded++;
    if (uploaded % 10 === 0) console.log(`Uploaded ${uploaded}/${payloads.size} assets`);
  }
  const manifest = Buffer.from(JSON.stringify(source, null, 2) + '\n');
  if (existing.has('manifest.json')) throw new Error('Manifest already uploaded to draft; inspect before publishing.');
  await upload(value, 'manifest.json', manifest, 'application/json');
  await publish(value);
} else {
  const launcher = JSON.parse(await fs.readFile(path.join(root, 'apps/launcher/package.json'), 'utf8'));
  const version = launcher.version;
  const value = await release(`v${version}`, `quiby.core ${version}`, 'Предварительная сборка лаунчера. Локальный вход доступен при подключении к локальному API. Установщик пока не подписан.', version.includes('-'));
  const releaseDir = path.join(root, 'apps/launcher/release');
  const names = [
    [`quiby.core Setup ${version}.exe`, `quiby.core-Setup-${version}.exe`],
    [`quiby.core Setup ${version}.exe.blockmap`, `quiby.core-Setup-${version}.exe.blockmap`],
    ['beta.yml', 'beta.yml'],
  ];
  const existing = new Map((await listedAssets(value)).map(asset => [asset.name, asset]));
  for (const [sourceName, assetName] of names) {
    const bytes = await fs.readFile(path.join(releaseDir, sourceName));
    if (existing.has(assetName)) {
      if (existing.get(assetName).size !== bytes.length) throw new Error(`Wrong size on existing asset: ${assetName}`);
      continue;
    }
    await upload(value, assetName, bytes);
    console.log(`Uploaded ${assetName}`);
  }
  await publish(value);
}
