# quiby.core on an existing CasaOS host

This stack runs the API and Cloudflare Tunnel connector. It does not install or reconfigure CasaOS.

## Before starting

1. In Cloudflare, add a domain/zone if you do not already have one and create a **remotely managed** Tunnel.
2. Add a Public Hostname such as `api.example.com` with service `http://quiby-core-api:3001`. Replace the example hostname with yours.
3. Copy the tunnel's Docker token into `.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
4. Copy this folder to the CasaOS machine, make `.env` from `.env.example`, and replace all placeholder secrets. Do not publish `.env`.
5. Start the Compose stack from CasaOS (or run `docker compose up -d --build` in this folder).
6. Check `https://api.example.com/api/health`.

The API database and uploaded modpack files persist in `./data`. Back up that directory before upgrades or migration. Do not expose port 3001 on the router; the tunnel makes an outbound connection and needs no public IP or inbound port forwarding.

Set `MOD_REVIEW_API_URL=https://api.example.com` in the bot's CasaOS app configuration and use the same `MOD_REVIEW_BOT_API_KEY` in both services. For a private setup, use the server's LAN URL instead.

For Discord OAuth, set the exact public callback URL in the Discord Developer Portal and in `DISCORD_REDIRECT_URI`.
