import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { ArrowUpRight, Link as LinkIcon } from 'lucide-react';

const server = (import.meta.env.VITE_QUIBY_API_URL || 'https://api.quiby.me').replace(/\/$/, '');
function LinkPreview({ url }: { url: string }) {
  const parsed = new URL(url);
  const [preview, setPreview] = useState<{ title?: string; description?: string; image?: string; siteName?: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${server}/api/news/link-preview?url=${encodeURIComponent(url)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) })
      .then(response => response.ok ? response.json() : null).then(value => { if (!controller.signal.aborted) setPreview(value); }).catch(() => {});
    return () => controller.abort();
  }, [url]);
  const youtube = ['www.youtube.com', 'youtube.com', 'youtu.be'].includes(parsed.hostname)
    ? (parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v')) : null;
  if (youtube && /^[a-zA-Z0-9_-]{11}$/.test(youtube)) return <iframe className="news-video-embed" src={`https://www.youtube-nocookie.com/embed/${youtube}`} title={preview?.title || 'Видео YouTube'} loading="lazy" referrerPolicy="no-referrer" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation"/>;
  return <a className="news-link-preview" href={url} target="_blank" rel="noopener noreferrer">
    {preview?.image && /^https?:\/\//i.test(preview.image) ? <img src={preview.image} alt="" loading="lazy"/> : <LinkIcon size={24}/>}
    <span><small>{preview?.siteName || parsed.hostname}</small><strong>{preview?.title || parsed.hostname + parsed.pathname}</strong>{preview?.description && <span>{preview.description}</span>}</span><ArrowUpRight size={17}/>
  </a>;
}

export function NewsContent({ html, text }: { html?: string; text: string }) {
  const safeHtml = useMemo(() => {
    const safe = DOMPurify.sanitize(html || '', { ADD_TAGS: ['iframe'], ADD_ATTR: ['allowfullscreen', 'loading', 'sandbox', 'referrerpolicy', 'controls', 'preload'], FORBID_TAGS: ['form', 'input', 'style'] });
    const doc = new DOMParser().parseFromString(safe, 'text/html');
    for (const iframe of doc.querySelectorAll('iframe')) {
      try { if (!['www.youtube-nocookie.com', 'www.youtube.com', 'player.vimeo.com'].includes(new URL(iframe.src).hostname)) iframe.remove(); }
      catch { iframe.remove(); }
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    }
    return doc.body.innerHTML;
  }, [html]);
  const links = useMemo(() => {
    const doc = new DOMParser().parseFromString(safeHtml, 'text/html');
    return [...new Set(Array.from(doc.querySelectorAll('a[href]'), link => link.getAttribute('href')!).filter(url => {
      try { return ['https:', 'http:'].includes(new URL(url).protocol); } catch { return false; }
    }))].slice(0, 3);
  }, [safeHtml]);
  return <><div className="news-rich-content">{html ? <div dangerouslySetInnerHTML={{ __html: safeHtml }}/> : <p>{text}</p>}</div>
    {links.length > 0 && <div className="news-link-previews">{links.map(url => <LinkPreview key={url} url={url}/>)}</div>}</>;
}
