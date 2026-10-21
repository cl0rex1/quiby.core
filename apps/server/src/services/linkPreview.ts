import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { parse as parseAddress } from 'ipaddr.js';

export function publicPreviewUrl(value: string): URL {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('Unsupported URL');
  return url;
}
function publicAddress(address: string): boolean {
  const parsed = parseAddress(address.replace(/^\[|\]$/g, ''));
  if (parsed.kind() === 'ipv6' && (parsed as import('ipaddr.js').IPv6).isIPv4MappedAddress()) return publicAddress((parsed as import('ipaddr.js').IPv6).toIPv4Address().toString());
  return parsed.range() === 'unicast';
}

async function readPage(url: URL, redirects = 0): Promise<{ html: string; url: URL }> {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error('Private network addresses are unavailable');
  // Pin the checked address to the connection; DNS cannot switch to a private host.
  const selected = addresses.find(item => item.family === 4) || addresses[0];
  const result = await new Promise<{ body: string; location?: string }>((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(url, {
      headers: { 'User-Agent': 'Quiby-News-Preview/1.0', Accept: 'text/html' },
      family: selected.family,
      lookup: (_hostname, _options, callback) => callback(null, selected.address, selected.family),
    }, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) { response.resume(); resolve({ body: '', location: response.headers.location }); return; }
      if (response.statusCode !== 200 || !response.headers['content-type']?.includes('text/html')) { response.resume(); reject(new Error('No HTML preview')); return; }
      const chunks: Buffer[] = []; let size = 0;
      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk.subarray(0, Math.max(0, 256 * 1024 - size))); size += chunk.length;
        if (size >= 256 * 1024) { resolve({ body: Buffer.concat(chunks).toString('utf8') }); request.destroy(); }
      });
      response.on('end', () => resolve({ body: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.setTimeout(5000, () => request.destroy(new Error('Preview timed out')));
    request.on('error', reject);
  });
  if (result.location) { if (redirects >= 3) throw new Error('Too many redirects'); return readPage(publicPreviewUrl(new URL(result.location, url).href), redirects + 1); }
  return { html: result.body, url };
}
const cache = new Map<string, { expires: number; value: object }>();
export async function getLinkPreview(value: string) {
  const initial = publicPreviewUrl(value);
  const cached = cache.get(initial.href);
  if (cached && cached.expires > Date.now()) return cached.value;
  const { html, url } = await readPage(initial);
  const decode = (text = '') => text.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Math.min(Number(code), 0x10ffff))).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim().slice(0, 500);
  const meta = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]{0,4000}>/gi) || []) {
    const attrs = new Map(Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g), match => [match[1].toLowerCase(), match[2] ?? match[3]]));
    const key = attrs.get('property') || attrs.get('name'); if (key && attrs.has('content')) meta.set(key.toLowerCase(), attrs.get('content')!);
  }
  let image: string | undefined;
  try { const candidate = publicPreviewUrl(new URL(meta.get('og:image') || '', url).href); if (meta.get('og:image') && candidate.hostname === url.hostname) image = candidate.href; } catch { /* Text-only preview. */ }
  const result = { url: initial.href, title: decode(meta.get('og:title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]) || url.hostname, description: decode(meta.get('og:description') || meta.get('description')), image, siteName: decode(meta.get('og:site_name')) || url.hostname };
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(initial.href, { expires: Date.now() + 15 * 60 * 1000, value: result });
  return result;
}
