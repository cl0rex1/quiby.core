#!/usr/bin/env bash
set -euo pipefail
PACK_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SERVER_DIR:-$PACK_DIR}"
mkdir -p -- "$DATA_DIR"
cd -- "$DATA_DIR"
JAVA="${JAVA_HOME:+$JAVA_HOME/bin/}java"
java_version="$("$JAVA" -version 2>&1 | head -n 1)"
if [[ ! "$java_version" =~ \"21[\.\"] ]]; then
  echo "Java 21 required. Found: $java_version" >&2
  exit 1
fi
python3 "$PACK_DIR/prepare.py" --pack "$PACK_DIR" --data "$DATA_DIR"
if [[ "${EULA:-false}" == "true" ]]; then
  printf '# Accepted by server operator via EULA=true\neula=true\n' > eula.txt
fi
if ! grep -Eq '^eula[[:space:]]*=[[:space:]]*true[[:space:]]*$' eula.txt; then
  echo 'Read https://aka.ms/MinecraftEULA and set eula=true in eula.txt, or EULA=true.' >&2
  exit 1
fi
INSTALLER="neoforge-21.1.250-installer.jar"
echo '0e47a91ba2139a8db4bf7627af081f7b5789b508bb039ee8dea1272b79693d60  '"$PACK_DIR/$INSTALLER" | sha256sum --check --status
if [[ ! -f libraries/net/neoforged/neoforge/21.1.250/unix_args.txt || ! -f libraries/net/neoforged/neoforge/21.1.250/neoforge-21.1.250-server.jar ]]; then
  "$JAVA" -jar "$PACK_DIR/$INSTALLER" --installServer
fi
# Deliberately ignore a machine-specific user_jvm_args.txt from another install.
exec "$JAVA" "-Xms${MIN_MEMORY:-2G}" "-Xmx${MAX_MEMORY:-8G}" @libraries/net/neoforged/neoforge/21.1.250/unix_args.txt nogui "$@"
