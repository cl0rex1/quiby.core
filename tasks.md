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

- [x] **Stage 35: Expandable Sidebar, Full Minimalist Redesign & Intelligent Anti-Cheat Mod Safety**
  - [x] Updated sidebar navigation icons (`Play` for Home, `FolderGit2` for Mods) and built smooth hover expansion with `backdrop-blur-2xl`, animated tab names, and expanded player profile info
  - [x] Completely redesigned `CharacterStage` (Home), `ModsView`, `SettingsView`, and `RamSlider` into a clean, premium zinc/onyx monochrome palette matching `SkinWardrobeView`
  - [x] Built backend Intelligent Anti-Cheat & Mod Safety service (`modSafetyService.ts`) integrating Modrinth API (SHA-1 hash lookup) and category filter (blocking `xray`, `cheat`, `grief`, `automation` while approving safe utilities)
  - [x] Implemented SQLite cache (`verified_mods`) to eliminate duplicate API requests and whitelist request queue (`mod_whitelist_requests`)
  - [x] Integrated client-side mod verification and safety badges (🟢 Одобрен, 🟡 Не проверен / В вайтлист, 🔴 Запрещен) in `ModsView`
  - [x] Verified all 50 automated tests (36 launcher + 14 backend anti-cheat) passing and completed production build

- [x] **Stage 36: Silky-Smooth Sidebar Closing Physics & Full-Window Backdrop Blur**
  - [x] Eliminated abrupt `display: none` layout pops by replacing with continuous `max-w` and `opacity` transitions with `cubic-bezier(0.16,1,0.3,1)`
  - [x] Pinned navigation icons to constant pixel offsets to prevent icon movement during expansion and collapse
  - [x] Added full-window ambient backdrop blur overlay (`bg-black/45 backdrop-blur-md`) that smoothly fades in when sidebar is hovered
  - [x] Verified all 50 automated tests passing and completed clean production build

- [x] **Stage 37: 2-Column Mods Hub, Rich 2-Column Grid Cards & Window Drag-and-Drop**
  - [x] Rebuilt `ModsView` with a sleek 2-column layout (Left: S6 Modpack Hub, Upload Dropzone & Anti-Cheat Shield; Right: Mod Browser)
  - [x] Designed rich 2-column mod cards with category chips (`#optimization`, `#utility`, `#gui`), Modrinth URLs, active emerald switches, and safety status badges
  - [x] Enabled window-wide drag-and-drop listener with animated full-window dropzone overlay for instant `.jar` hashing and verification
  - [x] Added segmented filters (`Все`, `Сборка 6 Сезона`, `Мои моды`) and real-time search
  - [x] Verified complete 50-test suite passing and completed clean production build

- [x] **Stage 38: Clean & Intuitive Mods List with Mod Logos, Concise Descriptions & Clutter-Free UI**
  - [x] Removed verbose security banners, anti-cheat text, and heavy side columns in favor of a clean, focused mod browser
  - [x] Integrated authentic Modrinth mod logo icons and created `knownMods.ts` catalog for instant high-quality logo rendering
  - [x] Added concise, clear 1-line Russian descriptions for all official and custom mods (e.g. Create, Sodium, Iris, JEI, FerriteCore)
  - [x] Added clean top-level `+ Добавить мод (.jar)` button and segment tabs (`Официальные моды` / `Мои моды`)
  - [x] Verified all 50 automated tests passing and completed production build

- [x] **Stage 39: Enlarged Toggle Controls, Batch Selection Mode & Custom Mod Badges**
  - [x] Enlarged toggle switches to 32px with comfortable tap targets and smoother hover physics
  - [x] Added multi-selection mode in `ModsView` with card selection checkboxes and "Выбрать все / Снять выбор" controls
  - [x] Verified all 50 automated tests passing and completed production build

- [x] **Stage 40: Unified Expanding Action Deck & Vertical Divider Layout**
  - [x] Tested and prototyped unified expanding capsule layout with internal vertical divider `|`
  - [x] Verified all 50 automated tests passing and completed production build

- [x] **Stage 41: Dedicated Center-Bottom Actions Deck & Restored Signature Corner Save Deck**
  - [x] Positioned Batch Actions Deck cleanly in the bottom-center (`fixed bottom-8 left-1/2 -translate-x-1/2`) with smooth slide-up entry and scale transitions
  - [x] Restored classic signature Save & Cancel Deck in the bottom-right corner (`fixed bottom-8 right-8`):
    - Smooth emerald green fill with centered scaling checkmark `[ ✓ ]`
    - 1-second hold followed by fluid slide-down exit
    - Red shake protection guard on unsaved tab switches
  - [x] Verified complete 50-test suite passing and completed production build

- [x] **Stage 42: Harmonized Sizing and Geometry for Actions Deck and Save Deck**
  - [x] Calibrated Actions Deck to exact matching height (`h-[52px]`), padding (`p-1.5`), and button heights (`h-10`) as the Save Deck
  - [x] Styled circular 40px action buttons and count badge for pixel-perfect visual balance
  - [x] Verified complete 50-test suite passing and completed production build

- [x] **Stage 43: Smooth Exit Physics for Actions Deck with Cached State Snapshot**
  - [x] Resolved unmount pop by caching batch actions during transition lifecycle
  - [x] Engineered continuous slide-down (`translate-y-8`), scale (`scale-95`), and motion blur (`blur-[2px]`) exit animation with `cubic-bezier(0.16,1,0.3,1)`
  - [x] Verified complete 50-test suite passing and completed production build

- [x] **Stage 44: Synchronized Selection Reset on Save & Dedicated Select-All Controls**
  - [x] Wired automatic selection reset (`selectedModIds = []`) on "Сохранить" and "Отменить", triggering smooth simultaneous slide-down dismissal of both windows
  - [x] Enhanced the "Выбрать все" / "Снять выбор" button in `ModsView` tab bar with prominent pill styling and counts
  - [x] Made the batch count badge in `FloatingActionDeck` interactive to toggle selection across all mods with 1 click
  - [x] Verified complete 50-test suite passing and completed production build

- [x] **Stage 45: Layered Switcher Mode & Complete Multi-Badge Test Showcase**
  - [x] Seeded rich test mods showcasing all 5 security and status badges:
    - 🟢 **Одобрен • Modrinth** (Embeddium, Jade)
    - 🟢 **Одобрен • Вайтлист** (Sound Physics Remastered)
    - 🟡 **Не в каталоге (Запрос в вайтлист)** (Simple Voice Chat)
    - 🔴 **Запрещен (Чит)** (X-Ray Ultimate Plus)
    - ⏳ **Проверка...** (Memory Leak Fix)
  - [x] Verified complete 50-test suite passing and completed production build

- [x] **Stage 46: Text Layer Switcher, Subtle Minimalist Badges & Discord Whitelist Channel Redirect**
  - [x] Built tactile sliding capsule switcher with clear text (`Сборка` vs `Мои моды`)
  - [x] Redesigned badges into calm, non-intrusive status dots (`• Проверен`, `• Вайтлист`, `• Не в каталоге`, `• Запрещен`, `• Проверка`)
  - [x] Linked whitelist requests directly to Discord channel (`https://discord.com/channels/1093897814712520734/1186665851991109732`)
  - [x] Verified complete 50-test suite passing and completed clean production build

- [x] **Stage 47: Sliding Pill Background Switcher & Clean 'Запросить доступ' Action**
  - [x] Engineered continuous sliding background thumb (`absolute bg-zinc-800 border-white/15`) gliding with `cubic-bezier(0.16,1,0.3,1)` behind the tab labels
  - [x] Renamed unverified mod action label to concise **«Запросить доступ»** with direct Discord channel redirection
  - [x] Verified complete 50-test suite passing and completed clean production build

- [x] **Stage 48: Security Toggle Locking & Instant Cheat Auto-Scanner**
  - [x] Locked mod activation switches (`disabled`, `opacity-25`, `cursor-not-allowed`) for all non-approved mods (`blocked`, `unverified`, `checking`) with explanatory tooltips
  - [x] Built client-side and server-side fast keyword scanner detecting 35+ cheat signatures (`xray`, `baritone`, `meteor`, `wurst`, `autoclicker`, `esp`, `freecam`, `flyhack`, `killaura`, etc.)
  - [x] Added `modVerifier.test.ts` test suite; 61 / 61 monorepo tests passing with 0 errors

- [x] **Stage 49: Sidebar Icon Centering, Clean Segmented Switcher & 1-Click Discord Auto-Template**
  - [x] Calibrated sidebar geometry to exact 36px central axis for all icons, brand logo, and profile avatars (48px fixed icon slots inside 72px rail)
  - [x] Redesigned mods layer switcher into clean, modern segmented buttons (`Сборка` vs `Мои моды`) without awkward sliding layer overlaps
  - [x] Verified complete 61-test suite passing and completed clean production build

- [x] **Stage 50: Custom In-App Whitelist Submission Modal & Discord Bot Forwarding**
  - [x] Removed clipboard auto-copy mechanism in favor of a native in-launcher modal dialog (`ModWhitelistModal.tsx`)
  - [x] Form fields: Pre-filled Mod name, file, SHA-1, applicant player username, mandatory purpose/reason textarea, optional project URL, and anti-cheat compliance checkbox
  - [x] Connected backend `/api/mods/whitelist-request` to forward structured Rich Embeds directly to Discord moderation channel
  - [x] Verified complete 61-test suite passing and completed clean production build

- [x] **Stage 51: Pre-Submission Antivirus Security Scanner, Ultra-Minimal Form & Persistent 'На рассмотрении' Status**
  - [x] Implemented pre-submission malware & infostealer scanner (`scanFileForMalware`) detecting Fractureiser, Redline, token grabbers, and suspicious payloads to protect server moderators
  - [x] Redesigned `ModWhitelistModal` into a compact, ultra-minimalist layout with real-time antivirus status feedback
  - [x] Added persistent `safetyStatus: 'pending'` with subtle `• На рассмотрении` badge on cards that remains active until moderation verdict
  - [x] Added unit tests for malware scanner; 63 / 63 monorepo tests passing with 0 errors

- [x] **Stage 52: 4 Strict Mod States, Clean 2-Field Whitelist Modal with Background Antivirus, Bottom Notification Deck & Sidebar Notifications Tab**
  - [x] Standardized mod security states to strictly 4 statuses: `Проверен` (🟢), `На рассмотрении` (🟡), `Запрещен` (🔴), and `Не в каталоге` (⚪)
  - [x] Polished «Запросить доступ» action button with sleek dark pill styling
  - [x] Redesigned `ModWhitelistModal` to display mod logo + exactly 2 user inputs (`Описание / Назначение` and optional `Ссылка на мод`), running antivirus and payload dispatch in the background on send
  - [x] Created `FloatingNotificationToast` positioned at bottom center (matching Action Deck placement and spring physics)
  - [x] Added `Notifications` tab in sidebar above avatar with unread counter and interactive `NotificationsModal`
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 53: Elimination of Verbose Status Details & Streamlined Mod Card Layout**
  - [x] Removed long explanatory sub-reasons and tooltips from mod status badges
  - [x] Eliminated redundant duplicate status text in card footers, keeping only size indicator and «Запросить доступ» action button
  - [x] Verified clean UI and 0 build errors across monorepo

- [x] **Stage 54: Notification Deck Form Factor, Perimeter Contour Countdown Timer & Detail-Free Toast**
  - [x] Matched `FloatingNotificationToast` geometry and styling identically to `FloatingActionDeck` (bottom-8 center, pill shape, glassmorphism)
  - [x] Removed manual `X` close button from floating toast in favor of smooth auto-dismissal
  - [x] Stripped detailed message subtext from floating deck for concise single-line title presentation
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 55: Top-Center Contour Origin, Exact Deck Physics & Crisp Glow-Free Presentation**
  - [x] Reprogrammed SVG perimeter path to start drawing exactly from the middle of the top edge (`(cx, 1)`) and progress clockwise
  - [x] Replaced abrupt unmounting with smooth entrance (`translate-y-0 opacity-100 scale-100 blur-0`) and exit (`translate-y-8 opacity-0 scale-95 blur-[2px]`) identical to other action decks
  - [x] Removed neon glow/halo shadows in favor of crisp, clean, subtle dark deck borders
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 56: Suppressing Unsaved Changes & Save Window on Safety State Transitions**
  - [x] Refactored `hasUnsavedChanges` for mods to only check user-toggleable states (`enabled` flags and mod additions/deletions)
  - [x] Synchronized `savedCustomMods` and `draftCustomMods` during whitelist requests and status updates so the save prompt never triggers inappropriately
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 57: Zero-Jitter Synchronous Layout Measurement & Forward Contour Fill Animation**
  - [x] Reversed contour animation so that stroke starts at 0% and draws itself (`appears`) clockwise from top-center to 100% full
  - [x] Used `useLayoutEffect` and precise SVG `viewBox` matching pre-paint bounding rects to eliminate layout jitter and glitches
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 58: Fixed Deck Geometry (360x52) with Exact Outer Perimeter Contour**
  - [x] Locked notification window dimensions to a solid `360x52px` pill matching the `FloatingActionDeck` action form factor
  - [x] Implemented pixel-exact outer contour SVG vector loop (`-inset-[1px] w-[362px] h-[54px]`) wrapping cleanly around the border
  - [x] Configured `strokeDasharray="100 100"` with clockwise fill from top-center `(180, 1)` with 0 clipping or glitching
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 59: Morphing Sidebar Email-Like Inbox & Split Master-Detail Notification System**
  - [x] Rebuilt `MinimalSidebar` to smoothly morph into a `310px` email inbox pane with top Back navigation button, item list, unread indicators, and quick actions (Mark all read, Clear)
  - [x] Created `NotificationDetailView` filling the right workspace with rich inspection details, mod metadata cards, antivirus verification status, SHA-1 fingerprints, and mod redirection shortcuts
  - [x] Synchronized layout transition (`pl-[310px]` $\leftrightarrow$ `pl-[72px]`) with smooth cubic-bezier easing
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 60: Bottom Origin Drawer Blooming, Top-Right Blue Unread Dots & Bottom-Only Back Button**
  - [x] Configured `origin-bottom-left` physics on the inbox drawer so the panel emerges and expands directly out of the notification bell button
  - [x] Placed clean, glowing blue unread indicator dots in the top-right corner of each unread notification card
  - [x] Removed redundant top back button from the header, keeping exclusively the full-width bottom navigation Back button
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 61: Brand Metallic Purple Logo, Up/Down Morphing Drawer Expansion from Bell Slot & Subtext Cleanup**
  - [x] Integrated official high-res purple metallic `quiby_logo.png` into sidebar brand anchor with soft neon glow
  - [x] Rebuilt notification drawer animation to physically expand from the exact coordinates of the Bell button upwards to `top: 0`, downwards to `bottom: 0`, and outwards to `310px`
  - [x] Removed "Quiby Core Notification System • Season VI" footer text from notification inspection view
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 62: Dynamic Brand Transition: Letter 'q' to Full Metallic 'quiby' Wordmark**
  - [x] Embedded official purple metallic single-letter `quiby_q_logo.png` in closed sidebar rail (72px centered slot)
  - [x] Seamlessly cross-faded into the full metallic `quiby_logo.png` wordmark upon sidebar expansion without redundant text
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 63: Full-Width Header Brand Scaling for Expanded Sidebar**
  - [x] Scaled full `quiby` metallic logo to span the entire width of the expanded sidebar header (`h-14 w-full px-1`) with high-res glow
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 64: Fixed-Dimension Viewport-Stable Logo Sizing**
  - [x] Locked expanded `quiby` logo to an exact, non-adaptive fixed box (`w-[180px] h-11 shrink-0`) filling 85% of sidebar width without distorting parent dimensions
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 65: Auto-Trimmed Logo Transparency & Edge-to-Edge Prominent Branding**
  - [x] Trimmed all empty transparent whitespace from logo PNG assets (`quiby_logo.png` 1000x1000 $\rightarrow$ 641x251; `quiby_q_logo.png` 1000x1000 $\rightarrow$ 264x353)
  - [x] Scaled full metallic `quiby` wordmark to tightly fill the entire width of the expanded sidebar header with massive, crisp lettering and neon purple glow
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 66: Volumetric Soft Neon Aura Backdrop Behind Brand Logos**
  - [x] Added layered ambient purple/fuchsia glow backdrops (`bg-fuchsia-600/30 blur-xl`) and multi-layer CSS drop-shadow filters behind both letter 'q' and 'quiby' wordmark
  - [x] Completely eliminated hard clipping edges, creating smooth, luminous outer bloom
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 67: Apple Design Elevation: Translucent Materials, Spring Physics & Tactile Interaction Hierarchy**
  - [x] Implemented Apple translucent glass materials (`glass-panel`, `glass-card`, `glass-floating`) with specular top highlights (`border-t-white/15...35`) simulating physical light catching surfaces
  - [x] Applied instant tactile press feedback (`active:scale-[0.97]` with 100ms recovery) across all buttons, cards, switches, and sliders
  - [x] Configured optical typography tracking (tight display headings, clean body copy, wide uppercase micro-tags) and Apple system font stack
  - [x] Rebuilt segmented switcher control in ModsView into an authentic sliding Apple-style pill switcher
  - [x] Formatted SettingsView into macOS-style grouped glass cards and upgraded SkinWardrobeView with glass tiles
  - [x] Added comprehensive accessibility support for `prefers-reduced-motion` and `prefers-reduced-transparency`
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 68: Frontend Design Polish: Hero Pedestal, Cape Wardrobe Picker, RAM Presets & Discord Modal**
  - [x] Rebuilt Hero Stage in `CharacterStage.tsx` with luminous volumetric pedestal lighting, live server status radar ping (`play.quiby.fun`), and active cape badge
  - [x] Integrated dedicated Cape Selection Picker into `SkinWardrobeView.tsx` with real-time swatch rendering on the Chibi model
  - [x] Enhanced `RamSlider.tsx` with quick preset chips (`4 GB`, `6 GB`, `8 GB (Оптимально)`, `12 GB`, `16 GB`), memory breakdown, and tactile spring gauge
  - [x] Modernized `DiscordAuthModal.tsx` with Apple glass aesthetic, animated glow headers, and clear verification states
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 69: Locked Capes Wardrobe Section with Centered Lock Badge**
  - [x] Locked Cape selection in `SkinWardrobeView.tsx` with `opacity-25 blur-[1.5px]` background grid and `pointer-events-none`
  - [x] Added centered floating lock badge with `Lock` icon and "Плащи станут доступны позже • Обновление Season VI" notice
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 70: Minimalist Centered Glass Lock Badge (Ponytail Mode)**
  - [x] Simplified the lock overlay in `SkinWardrobeView.tsx` to a single clean centered glass icon badge (`w-11 h-11 rounded-2xl glass-floating`)
  - [x] Removed bulky redundant text descriptions for maximum minimalist aesthetics
  - [x] Verified 63 / 63 unit tests passing and completed clean production build

- [x] **Stage 71: Project Roadmap & High-Impact Feature Ideation**
  - [x] Formulated top practical feature proposals for quiby.core ecosystem (Create S6, launcher UX, server ops, mod safety)
  - [x] Categorized by impact vs complexity under ponytail principles (minimum boilerplate, maximum player value)

- [x] **Stage 72: Playtime Tracking, Content Hub (Schematics/Shaders/Mods), Onboarding Presets & Fast-Connect Auto-Join**
  - [x] Integrated real-time process heartbeat playtime tracker (`playtime-tick`) and cumulative season hours display (`14.5 ч в игре`) in `CharacterStage.tsx`
  - [x] Rebuilt Mods view into unified 3-segment Content Hub (`Контент`): `Моды` (official/custom), `Схематики Create` (`.nbt` explorer with drag-and-drop), and `Шейдеры` (`.zip` shaderpacks)
  - [x] Added `[✓] Сразу на сервер` Fast-Connect toggle beside Play button passing `--quickPlayMultiplayer play.quiby.fun`
  - [x] Created `FirstLaunchOnboardingModal.tsx` and quick presets card in `SettingsView.tsx` (Potato 4GB / Optimal 8GB / Ultra 12GB+)
  - [x] Enhanced Discord mod whitelist webhook with pre-verified antivirus status, SHA-1, player IGN, and project links
  - [x] Added test suite `contentFeatures.test.ts`; 71 / 71 unit tests passing and completed clean production build

- [x] **Stage 73: In-Game Cinematic Transformation (Chibi Left Relocation + Walk Anim & Stop-Anchored Live Logs Drawer)**
  - [x] Supported dynamic animation switching (`idle` vs `walk`) and scale in `ChibiCharacterDisplay.tsx`
  - [x] Implemented smooth spring relocation of Chibi to the left side and scaling up when game is running in `CharacterStage.tsx`
  - [x] Built minimalist glass logs drawer `InGameLogsDrawer.tsx` emerging from the Stop button in bottom-right
  - [x] Verified animations, layout transitions, 74 / 74 unit tests passing, and clean monorepo production build

- [x] **Stage 74: Unified Morphing Sync-to-Console HUD (Progress Bar Expands into Live Logs Console)**
  - [x] Merged sync/download HUD and live in-game logs console into a single morphing card directly anchored above the action deck in `FloatingActionDeck.tsx`
  - [x] Implemented smooth upward expansion (`w-80` -> `w-[520px] h-[320px]`) when download completes and game process launches
  - [x] Included collapsible state, auto-scroll, log syntax styling, and copy/clear actions in the unified card
  - [x] Verified seamless transition, 74 / 74 unit tests passing, and clean monorepo production build























































