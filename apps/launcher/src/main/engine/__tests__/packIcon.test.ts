import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readPackIcon } from '../packIcon';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==', 'base64');
const archive = Buffer.from('UEsDBBQAAAAIADB7TF2kD5ITPwAAAEYAAAAIAAAAcGFjay5wbmfrDPBz5+WS4mJgYOD19HAJAtKMIMzBBiTlRY90giVcHEM4ZJN/nD/wQZ6BtYHJ3vPQ2y1ACQZPVz+XdU4JTQBQSwECFAAUAAAACAAwe0xdpA+SEz8AAABGAAAACAAAAAAAAAAAAAAAgAEAAAAAcGFjay5wbmdQSwUGAAAAAAEAAQA2AAAAZQAAAAAA', 'base64');
const oversized = Buffer.from('UEsDBBQAAAAIADB7TF1EZhcNDQIAAAEACAAIAAAAcGFjay5wbmftwYEAAAAAw6D5Ux/hAlUBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHANQSwECFAAUAAAACAAwe0xdRGYXDQ0CAAABAAgACAAAAAAAAAAAAAAAgAEAAAAAcGFjay5wbmdQSwUGAAAAAAEAAQA2AAAAMwIAAAAA', 'base64');

test('pack icons read from ZIP and folders, cache invalidation follows file changes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-icons-'));
  try {
    const filename = path.join(root, 'pack.zip');
    await fs.writeFile(filename, archive);
    const expected = `data:image/png;base64,${png.toString('base64')}`;
    assert.deepEqual(await Promise.all([readPackIcon(filename), readPackIcon(filename)]), [expected, expected]);
    await fs.writeFile(filename, 'broken zip');
    assert.equal(await readPackIcon(filename), undefined);
    const folder = path.join(root, 'shader'); await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, 'pack.png'), png);
    assert.equal(await readPackIcon(folder), expected);
    await fs.writeFile(path.join(folder, 'pack.png'), Buffer.alloc(600000));
    assert.equal(await readPackIcon(folder), undefined);
    await fs.writeFile(filename, oversized);
    assert.equal(await readPackIcon(filename), undefined);
    const huge = Buffer.from(png); huge.writeUInt32BE(100000, 16);
    await fs.writeFile(path.join(folder, 'pack.png'), huge);
    assert.equal(await readPackIcon(folder), undefined);
    assert.equal(await readPackIcon(path.join(root, 'missing.zip')), undefined);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
