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

- [x] **Stage 10: Stick-Thumb RAM Slider with Measurement Ticks & Floating Tooltip**
  - [x] Removed preset boxes in favor of ultra-minimalist track
  - [x] Implemented vertical stick thumb with glowing white/purple needle
  - [x] Added measurement ticks/sticks along the track for each GB step
  - [x] Implemented floating tooltip bubble pinned directly above the moving stick thumb
  - [x] Added minimalist conditional warnings (only for < 8 GB and > 16 GB GC latency)

- [x] **Stage 11: Standalone Compact Splash Window & Unsaved Changes Shake Guard**
  - [x] Remove `8 ГБ (Create S6)` label from RAM slider
  - [x] Implement standalone compact Splash Window (`300x360`) on startup
  - [x] Limit Play button exclusively to Home page
  - [x] Transform floating button into smooth sliding action deck (Save + Cross icon Cancel)
  - [x] Implement organic smooth Shake Alert & Red Glow when leaving with unsaved changes
  - [x] Remove logs console from Settings view
  - [x] Verify build and all interaction flows

- [x] **Stage 12: Save Feedback Animation & Steve/Alex Chibi Assets Integration**
  - [x] Integrated authentic nogard.dev Steve & Alex Chibi models into default presets
  - [x] Simplified wardrobe view by removing redundant text/explanatory labels
  - [x] Added dynamic green checkmark & pulse save confirmation animation
  - [x] Verified full monorepo build and assets pipeline

- [x] **Stage 13: Native Animated Chibi GIF Integration (Steve & Alex)**
  - [x] Bundled native idle-animated `chibi_steve.gif` & `chibi_alex.gif` assets
  - [x] Removed programmatic bobbing on default skins in favor of authentic nogard.dev GIF animations
  - [x] Kept dynamic canvas Chibi slicing for custom uploaded 64x64 user skins
  - [x] Verified build and pixel-art rendering across all views

- [x] **Stage 14: Fluid Morphing Save Animation & Clean Slide-Down**
  - [x] Implemented seamless morph from Save/Cross buttons into a glowing emerald circular pill with centered checkmark
  - [x] Added slide-down exit animation in the morphed green checkmark state
  - [x] Verified full monorepo compilation and smooth UI transitions

- [x] **Stage 15: In-Place Center-Out Green Fill & 1s Confirmation Hold Before Fly-Down**
  - [x] Preserved full container size without shrinking
  - [x] Implemented smooth radial center-out emerald green fill covering the whole card
  - [x] Added centered animated checkmark icon
  - [x] Added 1.0-second confirmation pause before smoothly flying down out of view
  - [x] Verified build and animations

- [x] **Stage 16: Organic Liquid Paint Spill Animation & Seamless Full Fill**
  - [x] Created multi-layered organic paint fluid keyframes (`animate-paint-spill-1`, `animate-paint-spill-2`)
  - [x] Liquid splashes and spreads dynamically from the center until fully covering the card
  - [x] Seamlessly reveals centered checkmark icon, holds for 1s, and flies down
  - [x] Verified full monorepo build

- [x] **Stage 17: 60FPS Fluid Dynamics Paint Spill Canvas (Physics Simulation)**
  - [x] Implemented GPU-accelerated HTML5 Canvas fluid simulation (`PaintSpillCanvas.tsx`)
  - [x] Real dynamic liquid waves, organic droplets, and non-uniform fluid dispersion to all edges
  - [x] Fully smooth 60fps frame rate without any stepping or choppy stutter
  - [x] Verified full monorepo compilation and verified fluid flow

- [x] **Stage 18: Asymmetric 4-Corner Staggered Timing Paint Spread**
  - [x] Implemented quadrant-based angular velocity weights for the 4 corners
  - [x] Corner fill order: Top-Right -> Bottom-Left -> Bottom-Right -> Top-Left
  - [x] Natural fluid dispersion physics with organic spline wave blending
  - [x] Verified smooth 60fps execution across all resolutions

- [x] **Stage 19: Clean In-Place Solid Green Expansion & Fly-Down**
  - [x] Simplified save animation to smooth in-place radial emerald fill
  - [x] Centered black checkmark icon emergence
  - [x] 1.0-second confirmation pause followed by smooth fly-down
  - [x] Verified full monorepo build

- [x] **Stage 20: Persistent Skin & Cape Storage & Standalone Splash BrowserWindow**
  - [x] Implemented persistent LocalStorage / state pipeline for custom uploaded skins (`.png`), default skins (Steve / Alex), and selected capes
  - [x] Automatic skin restoration on launcher startup
  - [x] Created separate standalone Electron Splash `BrowserWindow` (`320x380`, frameless, center) that closes seamlessly upon completion to reveal the main window
  - [x] Verified full monorepo compilation and app lifecycle

- [x] **Stage 21: Rectangular Ultra-Minimalist Splash Window**
  - [x] Set splash window size to sleek horizontal rectangle (`440x160`, frameless, no exit buttons)
  - [x] Deep onyx background with clean `quiby.` title in top-left
  - [x] Slider-style horizontal progress track at the bottom without stick thumb or icons
  - [x] Verified build and transition to main window

- [x] **Stage 22: Minecraft Chibi Live Style Engine Extraction & Standalone Test Suite**
  - [x] Extracted Minecraft Live chibi rendering algorithms (`ML_PARTS`, `ML_BOXES`, `ML_CAMERAS`, `ML_GROUPS`)
  - [x] Implemented exact user configuration (Alex model, `34-right` view, `idle` animation, `blocky` native 36x42 grid, per-part `mlEdgeColor` outline, 53% shading)
  - [x] Implemented multi-frame animation baker (`_bakeAnim`) with upperDy squash cycle and union bounding box
  - [x] Created isolated test suite (`chibiLiveEngine.test.ts`) with 26 passing automated unit tests
  - [x] Created reusable React canvas component (`ChibiLiveCanvas.tsx`) without altering existing production wardrobe UI
  - [x] Verified full monorepo build and typechecking

- [x] **Stage 23: Production Integration of Minecraft Live Chibi Engine**
  - [x] Connected `ChibiCharacterDisplay` directly to the `chibiLive` rendering engine
  - [x] Integrated auto skin body type detection (`alex` vs `steve`), custom skin canvas composition, and animated idle loops (500ms delay, `gifSpeed: 0.75`)
  - [x] Integrated dynamic Cape rendering and ground drop shadows behind the Live Chibi model
  - [x] Verified seamless live character rendering across CharacterStage and SkinWardrobeView
  - [x] Monorepo build and test suite passing cleanly

- [x] **Stage 24: Authentic Official Minecraft Steve & Alex Default Textures Integration**
  - [x] Imported official user-provided 64x64 PNG textures for Steve and Alex into assets
  - [x] Embedded Base64 Data URIs (`STEVE_SKIN_DATA_URI`, `ALEX_SKIN_DATA_URI`) and integrated instant RGBA decoding in `defaultSkins.ts`
  - [x] Added `loadSkinCanvasAsync` pipeline to `ChibiCharacterDisplay` for asynchronous texture resolving
  - [x] Re-verified complete 26-test suite passing and production build

- [x] **Stage 25: Fixed PNG Paeth Decompression & Alex Color Palette Calibration**
  - [x] Identified and corrected the Paeth filter calculation (`left + up - upLeft`) in `decodeBase64Png`
  - [x] Eliminated vertical color-striping distortion on Alex's face, hair, eyes, and shirt
  - [x] Optimized browser texture resolution using native Chromium `Image` decoding
  - [x] Verified full monorepo build and clean 26-test run

- [x] **Stage 26: Bit-for-bit Alex Base64 Binary Injection & Exact 35x40 Bounding Box Calibration**
  - [x] Detected and resolved binary payload difference between raw `alex.png` and embedded base64 string
  - [x] Verified 100% bit-for-bit binary equality between uploaded PNG assets and embedded Data URIs
  - [x] Confirmed native live sprite dimensions calibrated to clean 35x40 box
  - [x] Re-ran test suite (26/26 passing) and completed launcher production build

- [x] **Stage 27: Minecraft Skin Format & Anatomy Validation Pipeline**
  - [x] Created `skinValidator.ts` analyzing resolution (64x64, 64x32 legacy, HD multiples), file extension (.png), and transparency ratio
  - [x] Implemented Minecraft UV anatomy analysis (verifying transparent corners `[0,0,8,8]` & `[24,0,8,8]`, populated face region `[8,8,8,8]`)
  - [x] Added automatic legacy 64x32 to 64x64 texture converter (`convertLegacySkinTo64x64`)
  - [x] Integrated visual error feedback alerts and Drag-and-Drop UX in `SkinWardrobeView`
  - [x] Created automated test suite `skinValidator.test.ts` (10/10 tests passed) and verified clean build

- [x] **Stage 28: Minimalist Wardrobe UI Refinement**
  - [x] Removed redundant metadata pill from wardrobe view for a cleaner layout
  - [x] Retained robust file validation, error alerts on invalid files, and drag-and-drop support
  - [x] Verified full monorepo build and clean typechecking

- [x] **Stage 29: Persistent Skin Library, Live Chibi Thumbnails & Locked Capes**
  - [x] Implemented `skinLibrary.ts` with persistent collection storage in LocalStorage
  - [x] Added automatic generation of crisp Live Chibi avatar previews (`chibiPreviewUri`) for every uploaded skin
  - [x] Built library collection gallery in `SkinWardrobeView` with one-click selection, Chibi PNG export/download, and deletion
  - [x] Added clean "Базовые скины" section title above Steve and Alex default choices
  - [x] Disabled and locked Capes section with sleek "Недоступно в этом сезоне" badge
  - [x] Verified all 36 automated tests passing across modules and clean build

- [x] **Stage 30: Unified Steve Chibi Proportions & Minimalist UI/UX Redesign**
  - [x] Standardized all Chibi rendering on classic Steve 4px proportions for consistent chibi avatars across both Steve and Alex textures
  - [x] Completely redesigned `SkinWardrobeView` with a sleek, minimalist zinc/onyx monochrome aesthetic
  - [x] Reduced visual clutter and removed heavy purple glows in favor of restrained, premium styling
  - [x] Optimized canvas rendering performance and animation frame teardown
  - [x] Verified all 36 tests passing and completed launcher production build

- [x] **Stage 31: Uniform Chibi Thumbnail Scaling, 5 Skin Limit & Enhanced Save Animation**
  - [x] Standardized thumbnail generation with `bakeChibiLiveAnimation` at uniform scale (resolving smaller Alex thumbnail bug)
  - [x] Enlarged collection card dimensions with a clean 5-skin limit
  - [x] Positioned download and delete action buttons cleanly in the top-right corner of each card frame
  - [x] Removed redundant bottom text notes from wardrobe view
  - [x] Enhanced green save confirmation animation in `FloatingActionDeck` with an emerald/teal glow and zoom checkmark
  - [x] Verified complete 36-test suite passing and clean monorepo build

- [x] **Stage 32: Centered Sidebar, Window-Wide Drag-and-Drop & Replacement Modal**
  - [x] Vertically centered navigation icons in `MinimalSidebar` for balanced layout
  - [x] Enabled window-wide drag-and-drop file listener with animated full-window dropzone overlay
  - [x] Further enlarged collection cards (`h-28`, `w-20` avatars) and added larger, easily clickable top-right buttons
  - [x] Implemented replacement confirmation modal when attempting to add a 6th skin (showing visual old vs new comparison)
  - [x] Verified complete 36-test suite passing and completed production build

- [x] **Stage 33: Fixed Collection Card Overflow & Contained Responsive Avatar Scaling**
  - [x] Resolved horizontal image overflow in the 5-column collection grid by applying responsive `max-w-full max-h-full` containment
  - [x] Added strict `overflow-hidden` on collection cards to eliminate cross-card overlap
  - [x] Verified all 36 automated tests passing and completed clean production build

- [x] **Stage 34: Spacious 3x2 Collection Grid with 6-Skin Limit**
  - [x] Reorganized collection gallery into a clean, spacious 3x2 grid (`grid-cols-3`) with 3 skins on row 1 and 3 skins on row 2
  - [x] Increased maximum player skin collection capacity to 6 skins
  - [x] Updated replacement confirmation dialog threshold and counters to 6 skins
  - [x] Verified full monorepo typecheck and production build













