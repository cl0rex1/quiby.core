import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/** One renderer for the public feed and the administrator's preview. */
export function renderNewsContent(content: string): string {
  const html = marked.parse(content, { async: false, gfm: true, breaks: true });
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'video', 'source', 'iframe', 'del'],
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title', 'loading'],
      video: ['src', 'controls', 'poster', 'preload'], source: ['src', 'type'],
      iframe: ['src', 'title', 'allowfullscreen', 'loading', 'referrerpolicy', 'sandbox'],
    },
    allowedSchemes: ['https', 'http'], allowProtocolRelative: false,
    allowedIframeHostnames: ['www.youtube-nocookie.com', 'www.youtube.com', 'player.vimeo.com'],
    transformTags: {
      a: (_tag, attrs) => ({ tagName: 'a', attribs: { ...attrs, target: '_blank', rel: 'noopener noreferrer' } }),
      img: (_tag, attrs): sanitizeHtml.Tag => /\.(mp4|webm)(?:$|[?#])/i.test(attrs.src || '')
        ? { tagName: 'video', attribs: { src: attrs.src, controls: '', preload: 'metadata' } }
        : { tagName: 'img', attribs: { ...attrs, loading: 'lazy' } },
      iframe: (_tag, attrs) => ({ tagName: 'iframe', attribs: { ...attrs, loading: 'lazy', referrerpolicy: 'no-referrer', sandbox: 'allow-scripts allow-same-origin allow-presentation' } }),
    },
  });
}
