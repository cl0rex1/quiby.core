import http from 'http';
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

export function startDiscordOAuthFlow(serverBaseUrl: string): Promise<DiscordAuthResult> {
  return new Promise((resolve, reject) => {
    let server: http.Server | null = null;

    const cleanup = () => {
      if (server) {
        server.close();
        server = null;
      }
    };

    server = http.createServer(async (req, res) => {
      const urlObj = new URL(req.url || '', `http://localhost:${LOCAL_PORT}`);
      
      if (urlObj.pathname === '/callback') {
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');

        if (error || !code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body style="background:#0b0f17;color:#ef4444;font-family:sans-serif;text-align:center;padding-top:50px;"><h2>❌ Authorization failed or cancelled</h2><p>You can close this tab and return to the quiby launcher.</p></body></html>');
          cleanup();
          return resolve({ needsBinding: false, error: error || 'No authorization code returned' });
        }

        try {
          const redirectUri = `http://localhost:${LOCAL_PORT}/callback`;
          const response = await fetch(`${serverBaseUrl}/api/auth/discord/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri }),
          });

          const data = await response.json();

          if (!response.ok) {
            res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<html><body style="background:#0b0f17;color:#f87171;font-family:sans-serif;text-align:center;padding-top:50px;"><h2>⚠️ quiby. Access Notice</h2><p>${data.error || 'Access denied'}</p></body></html>`);
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
      }
    });

    server.listen(LOCAL_PORT, '127.0.0.1', async () => {
      try {
        const res = await fetch(`${serverBaseUrl}/api/auth/discord/url`);
        const data = await res.json();
        
        if (data.url) {
          const discordAuthUrl = new URL(data.url);
          discordAuthUrl.searchParams.set('redirect_uri', `http://localhost:${LOCAL_PORT}/callback`);
          shell.openExternal(discordAuthUrl.toString());
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
    setTimeout(() => {
      cleanup();
      resolve({ needsBinding: false, error: 'Authentication timed out' });
    }, 180000);
  });
}
