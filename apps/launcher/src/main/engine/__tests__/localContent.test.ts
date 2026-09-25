import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { contentDirectory, contentFilePath, installLocalContent, listLocalContent } from '../localContent';

test('content paths reject traversal and unknown content types', () => {
  for (const name of ['../escape.zip', '..', '.', '/escape.zip', 'C:\\escape.zip', 'a/b.zip', 'a\0.zip']) {
    assert.throws(() => contentFilePath('/game', 'shaderpacks', name));
  }
  assert.throws(() => contentDirectory('/game', 'mods' as any));
});

test('local libraries read disk, import files, and never overwrite an existing file', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-content-'));
  try {
    assert.deepEqual(await listLocalContent(dir, 'shaderpacks'), []);
    const original = new Uint8Array([80, 75, 3, 4]);
    await installLocalContent(dir, 'shaderpacks', 'My_pack.ZIP', original);
    await assert.rejects(
      installLocalContent(dir, 'shaderpacks', 'My_pack.ZIP', new Uint8Array([1])),
      /уже есть/,
    );
    assert.deepEqual(
      new Uint8Array(await fs.readFile(path.join(dir, 'shaderpacks', 'My_pack.ZIP'))),
      original,
    );
    await fs.writeFile(path.join(dir, 'shaderpacks', 'ignored.txt'), 'ignore');
    await fs.symlink(path.join(dir, 'shaderpacks', 'My_pack.ZIP'), path.join(dir, 'shaderpacks', 'link.zip'));
    await fs.mkdir(path.join(dir, 'shaderpacks', 'unpacked'));
    const files = await listLocalContent(dir, 'shaderpacks');
    assert.deepEqual(files.map((f) => f.filename).sort(), ['My_pack.ZIP', 'unpacked']);
    assert.equal(files.find((f) => f.filename === 'My_pack.ZIP')?.name, 'My pack');
    for (const extension of ['nbt', 'schem', 'schematic']) {
      await installLocalContent(dir, 'schematics', `build.${extension}`, new Uint8Array([1]));
    }
    assert.equal((await listLocalContent(dir, 'schematics')).length, 3);
    await assert.rejects(installLocalContent(dir, 'schematics', 'wrong.zip', original));
    await assert.rejects(installLocalContent(dir, 'shaderpacks', 'empty.zip', new Uint8Array()));
    await assert.rejects(
      installLocalContent(dir, 'shaderpacks', 'huge.zip', new Uint8Array(100 * 1024 * 1024 + 1)),
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
