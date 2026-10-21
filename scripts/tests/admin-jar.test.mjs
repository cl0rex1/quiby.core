import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readModJar, readResourcePackZip } from '../../apps/server/public/admin/jar.mjs';

function jar(name, content) {
  const filename = Buffer.from(name), source = Buffer.from(content), packed = deflateRawSync(source);
  const local = Buffer.alloc(30), central = Buffer.alloc(46), end = Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(8,8); local.writeUInt16LE(filename.length,26);
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(8,10);
  central.writeUInt32LE(packed.length,20); central.writeUInt32LE(source.length,24); central.writeUInt16LE(filename.length,28);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1,10); end.writeUInt32LE(46+filename.length,12); end.writeUInt32LE(30+filename.length+packed.length,16);
  return new File([local,filename,packed,central,filename,end],'utility.jar');
}
test('reads compressed NeoForge and Fabric metadata and hashes exact bytes', async () => {
  for (const [name,content] of [['META-INF/neoforge.mods.toml','[[mods]]\nmodId="utility"\ndisplayName="Utility"\nversion="1.2"'],['fabric.mod.json','{"name":"Utility","version":"1.2"}']]) {
    const file=jar(name,content), result=await readModJar(file);
    assert.equal(result.name,'Utility'); assert.equal(result.version,'1.2');
    assert.equal(result.hash,createHash('sha1').update(Buffer.from(await file.arrayBuffer())).digest('hex'));
  }
});
test('rejects non-mod archives, malformed inputs and oversized metadata', async () => {
  await assert.rejects(readModJar(jar('other.txt','hello')),/Метаданные/);
  await assert.rejects(readModJar(new File(['bad'],'bad.jar')));
  await assert.rejects(readModJar(jar('fabric.mod.json','a'.repeat(1024*1024+1))),/метаданные/i);
});
test('resource pack ZIP imports its real filename and SHA-1 without requiring mod metadata',async()=>{
  const source=jar('pack.mcmeta','{"pack":{"pack_format":34,"description":"Textures"}}');
  const bytes=await source.arrayBuffer(),file=new File([bytes],'My Textures.ZIP');
  const result=await readResourcePackZip(file);
  assert.equal(result.name,'My Textures');assert.equal(result.filename,'My Textures.ZIP');
  assert.equal(result.hash,createHash('sha1').update(Buffer.from(bytes)).digest('hex'));
  await assert.rejects(readResourcePackZip(new File(['bad'],'broken.zip')),/ZIP/);
});
