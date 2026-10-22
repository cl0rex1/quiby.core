const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const yauzl = require('yauzl');
const runtime = require('../apps/launcher/direct-runtime.json');
const directory = path.resolve(__dirname, '../apps/launcher/direct');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function prepare(context) {
  if (context && context.electronPlatformName !== 'win32') return;
  const binary = path.join(directory, runtime.filename);
  const verified = await fs.readFile(binary).then(bytes => hash(bytes) === runtime.executableSha256).catch(() => false);
  if (verified && await fs.stat(path.join(directory, 'LICENSE')).then(() => true).catch(() => false)) return;
  const response = await fetch(runtime.archiveUrl, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`frp build dependency: HTTP ${response.status}`);
  const archive = Buffer.from(await response.arrayBuffer());
  if (hash(archive) !== runtime.archiveSha256) throw new Error('frp archive SHA-256 mismatch');
  const files = await new Promise((resolve, reject) => yauzl.fromBuffer(archive, { lazyEntries: true }, (error, zip) => {
    if (error) return reject(error);
    const files = new Map();
    zip.on('error', reject); zip.on('end', () => resolve(files));
    zip.on('entry', entry => {
      const name = entry.fileName.split('/');
      if (name.length !== 2 || name[0] !== `frp_${runtime.version}_windows_amd64` || !['frpc.exe', 'LICENSE'].includes(name[1])) return zip.readEntry();
      if (entry.uncompressedSize > 32 * 1024 * 1024) { zip.close(); return reject(new Error('Oversized frp build dependency')); }
      zip.openReadStream(entry, (error, stream) => {
        if (error) { zip.close(); return reject(error); }
        const chunks = []; stream.on('error', reject); stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => { files.set(name[1], Buffer.concat(chunks)); zip.readEntry(); });
      });
    });
    zip.readEntry();
  }));
  if (!files.has('LICENSE') || !files.has('frpc.exe') || hash(files.get('frpc.exe')) !== runtime.executableSha256) throw new Error('Incomplete or invalid frp runtime');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(binary, files.get('frpc.exe'));
  await fs.writeFile(path.join(directory, 'LICENSE'), files.get('LICENSE'));
  await fs.writeFile(path.join(directory, 'NOTICE.txt'), `frp ${runtime.version}\nCopyright The frp Authors\nApache License 2.0; see LICENSE.\nSource: https://github.com/fatedier/frp/tree/v${runtime.version}\nOfficial archive: ${runtime.archiveUrl}\n`);
  console.log(`Verified bundled frpc ${runtime.version}`);
}
module.exports = prepare;
if (require.main === module) prepare().catch(error => { console.error(error.message); process.exitCode = 1; });
