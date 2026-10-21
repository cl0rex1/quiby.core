#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="backups/$stamp"

# Publish the Windows installer before the API starts rejecting beta clients.
curl -fsIL 'https://github.com/cl0rex1/quiby-launcher-releases/releases/download/v1.0.0/quiby.core-Setup-1.0.0.exe' >/dev/null
test -f .env
mkdir -p "$backup"
cp .env "$backup/environment"
docker tag "$(docker inspect -f '{{.Image}}' quiby-core-api)" "quiby-core-api:before-$stamp"
echo "Building API; existing service stays online. Rollback image: quiby-core-api:before-$stamp"
docker compose build api

# SQLite's online backup API includes committed writes without copying a live WAL.
docker exec -i quiby-core-api node - "$stamp" <<'NODE'
const fs = require('node:fs');
const sqlite = require('sqlite3');
fs.mkdirSync('/app/data/backups', { recursive: true });
const db = new sqlite.Database('/app/data/quiby.sqlite', sqlite.OPEN_READONLY);
const backup = db.backup('/app/data/backups/pre-release-' + process.argv[2] + '.sqlite');
backup.step(-1, error => {
  if (error) { console.error(error); process.exitCode = 1; }
  backup.finish(error => { if (error) { console.error(error); process.exitCode = 1; } db.close(); });
});
NODE

sed -i '/^MC_SERVER_IP=/d; /^MC_SERVER_PORT=/d' .env
printf '\nMC_SERVER_IP=play.quiby.me\nMC_SERVER_PORT=25565\n' >> .env
docker compose up -d --no-deps api
for attempt in $(seq 1 60); do
  if [ "$(docker inspect -f '{{.State.Health.Status}}' quiby-core-api)" = healthy ]; then
    docker exec quiby-core-api node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>r.json()).then(h=>{console.log(JSON.stringify(h));if(h.minimumLauncherVersion!=='1.0.0')process.exitCode=1}).catch(()=>process.exitCode=1)"
    echo "API upgraded. Environment backup: $backup/environment; database: data/backups/pre-release-$stamp.sqlite"
    exit 0
  fi
  sleep 2
done
echo "API did not become healthy. Roll back with: docker tag quiby-core-api:before-$stamp quiby-core-api:latest && docker compose up -d --no-deps api" >&2
exit 1
