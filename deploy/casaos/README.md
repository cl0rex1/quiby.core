# quiby.core on an existing CasaOS host

This stack runs the API and Cloudflare Tunnel connector. It does not install or reconfigure CasaOS.

## Before starting

1. Create a **remotely managed** Tunnel for the `quiby.me` zone in Cloudflare.
2. Add Public Hostname `api.quiby.me` with service `http://quiby-core-api:3001`.
3. Copy the tunnel's Docker token into `.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
4. Clone the whole repository on the CasaOS machine. In `deploy/casaos`, make `.env` from `.env.example` and replace all placeholder secrets. Keep the existing `.env` on subsequent deployments; do not publish it.
5. Start the Compose stack from CasaOS (or run `docker compose up -d --build` in this folder).
6. Check `https://api.quiby.me/api/health`.

The API database and uploaded modpack files persist in `./data`. Back up that directory before upgrades or migration. Do not expose port 3001 on the router; the tunnel makes an outbound connection and needs no public IP or inbound port forwarding.

Set `MOD_REVIEW_API_URL=https://api.quiby.me` in the bot's CasaOS app configuration and use the same `MOD_REVIEW_BOT_API_KEY` in both services.

For Discord OAuth, register `http://localhost:45678/callback` in the Discord Developer Portal and set the same value in `DISCORD_REDIRECT_URI`. The launcher opens the browser on each player's computer and listens locally for the callback; its API requests still go through `https://api.quiby.me`. Configure `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, and `DISCORD_GUILD_ID` in the existing server `.env`.

## Clean rebuild after pulling changes

For the first stable release, publish the launcher 1.0.1 installer first, then
pull the source and run `bash deploy/casaos/upgrade-release.sh` from the repository
root. It builds while the old API stays online, retains a rollback image, saves
the existing environment and a consistent online SQLite backup, sets the public
Minecraft endpoint, and replaces only the API container. The API then requires
stable launcher versions from 1.0.1 for OAuth, session validation and game tickets.
The installer also publishes `beta.yml` so existing beta clients can update.

From `deploy/casaos` on Ubuntu Server:

```bash
mkdir -p data
sudo chown -R 1000:1000 data
docker compose down
docker compose build --pull --no-cache api
docker compose up -d
docker compose ps
docker compose logs --tail=100 api
docker inspect -f '{{.RestartCount}}' quiby-core-api
curl -fsS https://api.quiby.me/api/health
docker compose logs --tail=100 cloudflared
```

Do not run `docker compose down -v`: the bind-mounted `./data` directory contains the SQLite database and uploaded files. If the API remains unhealthy, the new image's build-time sqlite3 load check will fail before deployment rather than entering a restart loop.
