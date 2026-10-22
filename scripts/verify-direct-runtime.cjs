const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const runtime = require('../apps/launcher/direct-runtime.json');

module.exports = async context => {
  if (context.electronPlatformName !== 'win32') return;
  const directory = path.join(context.appOutDir, 'resources/direct');
  const bytes = await fs.readFile(path.join(directory, runtime.filename));
  if (createHash('sha256').update(bytes).digest('hex') !== runtime.executableSha256) throw new Error('Packaged frpc SHA-256 mismatch');
  for (const name of ['LICENSE', 'NOTICE.txt']) await fs.access(path.join(directory, name));
};
