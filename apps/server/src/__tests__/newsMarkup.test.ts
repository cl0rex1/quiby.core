import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNewsContent } from '../services/newsMarkup';
import { getLinkPreview, publicPreviewUrl } from '../services/linkPreview';

test('news renders formatting, images and videos without executable markup', () => {
  const html = renderNewsContent('## Встреча\n\n**Сегодня**\n\n- Первый\n- Второй\n\n![Фото](https://example.com/pic.png)\n\n![Видео](https://example.com/movie.mp4)\n\n[Сайт](https://example.com)\n<script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">bad</a><iframe src="https://evil.example/"></iframe><iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk"></iframe>');
  for (const part of ['<h2>Встреча</h2>', '<strong>Сегодня</strong>', '<ul>', 'loading="lazy"', '<video', 'controls', 'rel="noopener noreferrer"', 'https://www.youtube-nocookie.com/embed/abcdefghijk', 'sandbox=']) assert.ok(html.includes(part), part);
  for (const part of ['<script', 'onerror', 'javascript:', 'https://evil.example/']) assert.ok(!html.includes(part), part);
});

test('link previews reject local, reserved, mapped IPv6 and credential-bearing URLs', async () => {
  for (const url of ['file:///etc/passwd', 'http://user:pass@example.com', 'http://example.com:8080']) assert.throws(() => publicPreviewUrl(url));
  for (const url of ['http://127.0.0.1', 'http://10.0.0.1', 'http://169.254.169.254', 'http://192.168.18.100', 'http://[::1]', 'http://[::ffff:127.0.0.1]', 'http://100.64.0.1', 'http://localhost']) {
    await assert.rejects(getLinkPreview(url), /Private network/);
  }
});
