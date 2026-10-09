import http from 'http';
import crypto from 'crypto';
import { shell } from 'electron';
import { AuthSession } from '@quiby/shared';

const LOCAL_PORT = 45678;

export interface DiscordAuthResult {
  needsBinding: boolean;
  session?: AuthSession;
  discordUser?: {
    id: string;
    username: string;
    globalName?: string;
    avatar?: string;
    avatarUrl?: string;
    roles?: string[];
  };
  error?: string;
}

export function startDiscordOAuthFlow(serverBaseUrl: string, port = LOCAL_PORT): Promise<DiscordAuthResult> {
  return new Promise((resolve) => {
    let server: http.Server | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let exchanging = false;
    const expectedState = crypto.randomBytes(32).toString('hex');

    const cleanup = () => {
      clearTimeout(timer);
      if (server) {
        server.close();
        server = null;
      }
    };

    server = http.createServer(async (req, res) => {
      const urlObj = new URL(req.url || '', `http://localhost:${port}`);
      
      if (urlObj.pathname === '/callback') {
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');

        if (urlObj.searchParams.get('state') !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Invalid authorization state. Return to the launcher and try again.');
          return;
        }

        if (error || !code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body style="background:#0b0f17;color:#ef4444;font-family:sans-serif;text-align:center;padding-top:50px;"><h2>❌ Authorization failed or cancelled</h2><p>You can close this tab and return to the quiby launcher.</p></body></html>');
          cleanup();
          return resolve({ needsBinding: false, error: error || 'No authorization code returned' });
        }

        if (exchanging) { res.writeHead(409); res.end('Authorization is already in progress.'); return; }
        exchanging = true;
        try {
          const redirectUri = `http://localhost:${port}/callback`;
          const response = await fetch(`${serverBaseUrl}/api/auth/discord/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri }),
            signal: AbortSignal.timeout(15000),
          });

          const data = await response.json();

          if (!response.ok) {
            res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<html><body style="background:#0b0f17;color:#f87171;font-family:sans-serif;text-align:center;padding-top:50px;"><h2>quiby. Access denied</h2><p>Return to the launcher for details.</p></body></html>');
            cleanup();
            return resolve({ needsBinding: false, error: data.error });
          }

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body style="background:#0b0f17;color:#22c55e;font-family:sans-serif;text-align:center;padding-top:50px;"><h2>✨ Successfully authorized with Discord!</h2><p>You can close this tab and return to quiby launcher.</p><script>setTimeout(() => window.close(), 1500);</script></body></html>');
          
          cleanup();
          return resolve(data);
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body style="background:#0b0f17;color:#ef4444;font-family:sans-serif;text-align:center;padding-top:50px;"><h2>Server Error</h2></body></html>');
          cleanup();
          return resolve({ needsBinding: false, error: err.message });
        }
      } else { res.writeHead(404); res.end('Not found'); }
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      cleanup();
      resolve({ needsBinding: false, error: error.code === 'EADDRINUSE'
        ? 'Вход уже открыт или порт авторизации занят. Завершите предыдущую попытку и повторите вход.'
        : `Не удалось открыть окно входа: ${error.message}` });
    });
    server.listen(port, '127.0.0.1', async () => {
      try {
        const res = await fetch(`${serverBaseUrl}/api/auth/discord/url`, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        if (data.url) {
          const discordAuthUrl = new URL(data.url);
          discordAuthUrl.searchParams.set('redirect_uri', `http://localhost:${port}/callback`);
          discordAuthUrl.searchParams.set('state', expectedState);
          await shell.openExternal(discordAuthUrl.toString());
        } else {
          cleanup();
          resolve({ needsBinding: false, error: data.error || 'Could not get Discord OAuth URL' });
        }
      } catch (err: any) {
        cleanup();
        resolve({ needsBinding: false, error: `Cannot reach quiby server at ${serverBaseUrl}: ${err.message}` });
      }
    });

    // Timeout after 3 minutes
    timer = setTimeout(() => {
      cleanup();
      resolve({ needsBinding: false, error: 'Время ожидания входа истекло. Попробуйте ещё раз.' });
    }, 180000);
  });
}
