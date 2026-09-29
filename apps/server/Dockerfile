FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS build
# sqlite3 is a native addon. Build it against this image's glibc instead of
# relying on a downloaded prebuilt binary with an unknown glibc baseline.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --build-from-source=sqlite3 \
    && node -e "require('sqlite3'); console.log('sqlite3 loads in build image')"

COPY apps/server apps/server
COPY packages/shared packages/shared
RUN npm run build:shared && npm run build:server && npm prune --omit=dev \
    && node -e "require('sqlite3'); console.log('sqlite3 loads after prune')"

FROM base AS runtime
ENV NODE_ENV=production PORT=3001 HOST=0.0.0.0 STORAGE_PATH=/app/data DB_PATH=/app/data/quiby.sqlite
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/server/package.json ./apps/server/package.json
COPY --from=build --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=node:node /app/apps/server/public ./apps/server/public
COPY --from=build --chown=node:node /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
RUN mkdir -p /app/data && chown node:node /app/data
USER node
RUN node -e "require('sqlite3'); console.log('sqlite3 loads in runtime image')"
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "apps/server/dist/index.js"]
