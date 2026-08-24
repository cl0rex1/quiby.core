# quiby.core - Project Task Tracker

## 📌 Minecraft Target Specification
- **Minecraft Version**: `1.21.1`
- **Mod Loader**: `NeoForge` (Target 1.21.1 NeoForge specification)

---

## 📌 Stage Overview & Status

- [x] **Stage 1: Project Architecture & Monorepo Setup**
  - [x] Initialize root monorepo (`package.json`, workspaces: `apps/server`, `apps/launcher`, `packages/pack-builder`, `packages/shared`)
  - [x] Shared TypeScript configurations, ESLint, TailwindCSS, build scripts
  - [x] Environment configuration templates

- [x] **Stage 2: Backend API & Distribution Server (`apps/server`)**
  - [x] Express & TypeScript server with clean modular architecture
  - [x] SQLite database models & service layer (Players, Discord Accounts, Modpack Versions, News)
  - [x] Discord OAuth2 integration & Whitelist 1:1 player binder (anti-alt, duplicate check)
  - [x] Modpack manifest distribution API with hash verification & static file streaming
  - [x] News & Server status ping API (Minecraft 1.21.1 server query)
  - [x] Admin endpoints for version management and player whitelist management

- [x] **Stage 3: Modpack Management Tool (`packages/pack-builder`)**
  - [x] Fast parallel SHA-256 / SHA-1 hasher for mods, configs, resourcepacks, shaders
  - [x] NeoForge / Forge / Fabric mod metadata extractor (from `META-INF/neoforge.mods.toml` / `mods.toml` / `fabric.mod.json`)
  - [x] Manifest generator (`manifest.json` / `version.json` targeting MC 1.21.1 NeoForge)
  - [x] CLI commands (`init`, `scan`, `build`, `publish`, `diff`, `export`)
  - [x] Direct publishing integration with `quiby-server`

- [x] **Stage 4: Cross-Platform Launcher Desktop App (`apps/launcher`)**
  - [x] Electron + Vite + React 18 + TailwindCSS + Lucide + Framer Motion setup
  - [x] Season 6 NeoForge Theme, animated hero banner, server status widget, news tab
  - [x] Discord OAuth2 Authentication UI (Profile card, Discord tag, Minecraft IGN binding)
  - [x] Differential Sync Engine (Delta downloader, hash verification, obsolete mod cleanup)
  - [x] Minecraft 1.21.1 NeoForge Launcher Engine (Mojang version metadata resolver, NeoForge loader installer/resolver, Java 21 runtime detection/download, JVM args generator, process spawner)
  - [x] Settings Panel (RAM allocation slider, Java path selector, resolution, JVM flags)
  - [x] Live Console & Crash log inspector
  - [x] Discord Rich Presence (RPC) integration

- [x] **Stage 5: Integration, End-to-End Testing & Verification**
  - [x] Monorepo build and packaging verification
  - [x] Test modpack publishing workflow end-to-end with 1.21.1 NeoForge sample
  - [x] Test download and differential sync with mock/live modpack
  - [x] Verify Discord auth & whitelist validation flow
  - [x] Documentation and deployment guide
