// Inspect locally: neither the archive nor its contents are uploaded or executed.
export async function readResourcePackZip(file) {
  if(!/\.zip$/i.test(file.name)||!file.size||file.size>100*1024*1024)throw Error('Выберите ZIP размером до 100 МиБ');
  const bytes=await file.arrayBuffer(),view=new DataView(bytes);
  if(bytes.byteLength<22)throw Error('Некорректный ZIP-архив');
  let end=bytes.byteLength-22;
  for(;end>=Math.max(0,bytes.byteLength-65557);end--){if(view.getUint32(end,true)===0x06054b50&&end+22+view.getUint16(end+20,true)===bytes.byteLength)break;}
  if(end<Math.max(0,bytes.byteLength-65557))throw Error('Некорректный ZIP-архив');
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-1',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
  return {name:file.name.replace(/\.zip$/i,'').slice(0,100),filename:file.name,hash,version:''};
}

export async function readModJar(file) {
  if (!/\.jar$/i.test(file.name) || !file.size || file.size > 512 * 1024 * 1024) throw Error('Выберите JAR размером до 512 МБ');
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer);
  const text = new TextDecoder();
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end--) {
    if (view.getUint32(end, true) === 0x06054b50 && end + 22 + view.getUint16(end + 20, true) === bytes.length) break;
  }
  if (end < 0 || view.getUint32(end, true) !== 0x06054b50) throw Error('Некорректный JAR-архив');
  let offset = view.getUint32(end + 16, true), metadata;
  const count = view.getUint16(end + 10, true);
  if (count > 30000) throw Error('Слишком много файлов в архиве');
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw Error('Повреждён каталог JAR');
    const nameLength = view.getUint16(offset + 28, true);
    const name = text.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (/^(META-INF\/(neoforge\.mods|mods)\.toml|fabric\.mod\.json|quilt\.mod\.json|mcmod\.info)$/i.test(name) && !metadata) {
      const size = view.getUint32(offset + 24, true), packed = view.getUint32(offset + 20, true);
      const local = view.getUint32(offset + 42, true), method = view.getUint16(offset + 10, true);
      if (size > 1024 * 1024 || packed > 1024 * 1024 || local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) throw Error('Некорректные метаданные JAR');
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      if (start + packed > offset || (view.getUint16(offset + 8, true) & 1)) throw Error('Неподдерживаемый JAR');
      let data = bytes.slice(start, start + packed);
      if (method === 8) {
        const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
        const chunks = []; let total = 0;
        try { while (true) { const {value, done} = await reader.read(); if (done) break; total += value.length; if (total > 1024 * 1024) throw Error('Метаданные JAR слишком большие'); chunks.push(value); } }
        finally { await reader.cancel(); }
        data = new Uint8Array(total); let at = 0; for (const chunk of chunks) { data.set(chunk, at); at += chunk.length; }
      } else if (method !== 0) throw Error('Неподдерживаемое сжатие JAR');
      if (data.length !== size) throw Error('Повреждённые метаданные JAR');
      const raw = text.decode(data);
      if (/\.toml$/i.test(name)) {
        const field = key => raw.match(new RegExp('^\\s*' + key + '\\s*=\\s*["\x27]([^"\x27\\r\\n]+)', 'm'))?.[1];
        metadata = { name: field('displayName') || field('modId'), version: field('version') };
      } else {
        const parsed = JSON.parse(raw), mod = parsed.quilt_loader || (Array.isArray(parsed) ? parsed[0] : parsed.modList?.[0] || parsed);
        metadata = { name: mod.metadata?.name || mod.name || mod.id || mod.modid, version: mod.version };
      }
    }
    offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  if (!metadata?.name || typeof metadata.name !== 'string') throw Error('Метаданные мода не найдены. Используйте ручной ввод SHA-1.');
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-1', bytes))].map(v => v.toString(16).padStart(2,'0')).join('');
  return { name: metadata.name.slice(0,100), filename: file.name, hash, version: typeof metadata.version === 'string' && !metadata.version.includes('${') ? metadata.version : '' };
}
