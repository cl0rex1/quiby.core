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

- [x] **Stage 6: Complete UI Redesign (X / Twitter Style with Subtle Purple Accents)**
  - [x] Update Tailwind theme with deep black `#000000`, surfaces `#16181c`, borders `#2f3336`, and purple accents `#8b5cf6`
  - [x] Implement modern 3-column desktop layout (Left Nav, Center Feed/Stage, Right Widgets)
  - [x] Redesign Sidebar with minimalist icons, solid white/purple pill CTA buttons, and profile card
  - [x] Implement Right Sidebar with search, server status card, trending topics, and active players
  - [x] Rebuild PlayView with X-style feed tabs, launch card with progress, and rich media posts
  - [x] Restyle ModpackView, NewsView, ConsoleView, and SettingsView into clean minimalist dark theme
  - [x] Verify build and UI layout across all views

- [x] **Stage 7: Bespoke Cinematic Launcher & Smooth Launch Experience**
  - [x] Implement animated Splash Screen with brand reveal and loading sequence
  - [x] Remove all social feed clutter, tweets, and unnecessary widgets
  - [x] Design cinematic Season 6 Aeronautics main canvas with dark ambient lighting
  - [x] Build bottom-anchored Launch Deck (Discord Profile, Radiant Play Button, Specs HUD, Live Progress)
  - [x] Create sleek glass modals for Modpack Explorer, Console Logs, and Settings (RAM slider, Java 21)
  - [x] Verify build and interactive flow end-to-end

- [x] **Stage 8: Ultra-Minimalist Redesign, Standalone Splash Window & Chibi Skins**
  - [x] Separate small Splash Window (`360x440`) in Electron with onyx black/purple gradient
  - [x] Implement pixel-accurate thin vertical icon sidebar matching the reference photo
  - [x] Build Canvas Chibi Skin & Cape Renderer with idle animations and skin texture parser
  - [x] Custom skins upload, cycling default skin presets, and custom cloak/cape selector
  - [x] Clean onyx black canvas with shimmering purple ambient background
  - [x] Floating Play Button in bottom-right corner with download progress
  - [x] Custom user mods manager (support adding personal client mods)
  - [x] Build and verify all components

- [x] **Stage 9: Strict 4-Button Minimalist Launcher & Dedicated Wardrobe Page**
  - [x] Implement floating ambient purple nebula background (smooth drift, no aggressive pulse)
  - [x] Simplify left sidebar to exactly 4 essential icons + bottom avatar
  - [x] Build dedicated Skin & Cape Wardrobe page with live Chibi preview and presets
  - [x] Build unified clean Mods Manager page (official S6 + custom client mods)
  - [x] Build clean Settings page (RAM slider, Java 21, directory, embedded logs)
  - [x] Build and verify all components end-to-end
