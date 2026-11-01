# NEON RIFT

An original neon-tunnel 3D arcade game built with Three.js and Vite, wrapped in an animated five-constellation galaxy map. The game uses procedural geometry and code-generated particle effects; it does not use Smash Hit's assets.

## Requirements
- Node.js 20.19+ or 22.12+
- VS Code (recommended)
- Internet connection for installing packages and loading the optional Google Fonts

## Run locally
1. Unzip the project.
2. Open the `neon-rift` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open the local URL Vite prints, usually `http://localhost:5173`.

## Controls
- **Move mouse / trackpad** or **drag a finger** to aim.
- **Left-click / tap** to fire.
- **Pause button** (top-right of the inner HUD) or **Escape** opens the pause menu.
- **Galaxy map:** click a constellation to select it; click **Launch Level** (or the selected constellation again) to start the 0.8 s warp.
- **Locked constellation:** clicking it flashes the info panel red and shows `SEALED — CLEAR PREVIOUS SECTOR`.

Gameplay is pointer-only by design: there are no arrow-key controls, keyboard firing, or virtual gameplay buttons, so the same loop works on desktop and touch devices.

## Galaxy map and sequential progression
The game boots straight into a live galaxy map instead of a plain start screen. The background is a canvas nebula with three parallax star layers, drifting dust, slowly wandering gas clouds, and occasional shooting stars. Constellations are drawn as animated SVG star networks connected by a flowing route.

Only **Level 01 — The Neon Prism** is unlocked when progress starts at **0/5**. Clearing a sector permanently marks its constellation as restored, lights its route segment, and unlocks the **next adjacent constellation**. Progress is stored in `localStorage` under `neon-rift-galaxy-v1`.

| Level | Constellation | Motif | Initial status | Modifier |
|-------|---------------|-------|----------------|----------|
| **01** | The Neon Prism | Neon teal / electric indigo | Unlocked | Standard training parameters |
| **02** | The Void Serpent | Cosmic violet / deep indigo | Sealed | Serpentine drifting targets |
| **03** | Solar Crown | Stellar orange / solar gold | Sealed | Solar bonus surge |
| **04** | Nebula Heart | Neon magenta / cosmic pink | Sealed | Periodic nebula pulse |
| **05** | Supernova Core | Prismatic chaos | Sealed | Supernova high-chaos mode |

- **Locked constellations** are dimmed, marked `⌁ SEALED`, and show `SEALED — CLEAR PREVIOUS SECTOR` in the info panel. They cannot be launched.
- **Hover** an unlocked constellation to scale it up and flood it with a double neon glow; its halo, stars and name brighten in the level's accent colour.
- **Launching** runs a full-screen star-stretch hyperdrive animation for **0.8 seconds** before the arena fades in. A timer fallback guarantees the launch even if animation frames are throttled.
- **Clearing a sector** returns you to the map, fires a particle burst from the constellation, permanently draws its lines with a pulsing neon energy gradient, and automatically selects the newly unsealed next sector.
- Clearing an already-restored sector keeps it lit and shows `SECTOR RESTABILIZED`.

## Sector Stability mission
Every constellation hosts one structured stability sector. There is no endless random-shooting loop: hit targets to fill the glowing **Sector Stability** bar from **0% to 100%**.

| Result | Stability gain |
|--------|----------------|
| Standard target | **+9%** |
| Precision target | **+14%** |
| Bonus crystal | **+20%** |
| Red Hazard clipped | **+4%** |

- The top-center HUD shows the live stability percentage, segmented neon bar, sector name, mission prompt, and a **NEXT 25%** milestone readout.
- The alert line escalates with progress: `SECTOR RIFT STABLE`, `RIFT DESTABILIZING · 25%`, `SECTOR RIFT CLOSING: 50%`, `SECTOR RIFT CLOSING: 75% · FINAL PUSH`, then `SECTOR SECURED · RIFT STABILIZED`. The HUD border shifts from teal to ember orange and pulses through the final push.
- At **100% stability** the run enters a **SECTOR SECURED** victory sequence: a full-screen tactical flash, celebratory particle bursts, a **+2500 clear bonus**, and an automatic return to the galaxy map.
- The next constellation is unlocked on that return and becomes immediately selectable.
- A run is lost if **hull reaches 0** or if **energy orbs are exhausted** (`SIGNAL LOST`). The loss screen offers **Play Again** and **Galaxy Map**.
- Each sector uses a level-specific target mix, spawn cadence, speed multiplier, ring speed, fog density and accent colour.

## Target types
Each sector streams a weighted mix of targets down the tunnel. They are told apart by **shape, size and colour**, not colour alone — bonus and hazard are both noticeably larger than the standard target.

| Type | Look | Size | Points | Stability | Notes |
|------|------|------|--------|-----------|-------|
| **Standard** | Electric-blue cosmic gem with faceted crown, pavilion, glowing girdle, inner core and energy halo | Medium (reference size) | 100 | +9% | Common, easy to hit |
| **Precision** | Neon-pink elongated gem with a hot magenta core and tighter aura | ~0.6× standard width, taller than wide | 250 | +14% | Narrower and faster, worth more |
| **Bonus** | Radiant soul-orange/gold gem with a bright internal core and amber halo | ~1.2× standard | 500 | +20% | Rare and optional — despawns after ~8 s (only ~4.2 s on Solar Crown) |
| **Hazard** | Jagged tumbling asteroid with glowing fissures, a hot warning ring and rocky silhouette | ~1.25× standard | 0 | +4% | Shatters into tumbling rock debris when shot or destroyed on proximity; if it reaches you it deals a heavy 25% hull hit |

## Scoring, ammo and hull
- Standard / Precision / Bonus targets add their point value, recycle **1 energy orb** (some also drop a **+2 orb** bonus), and build **Cosmic Charge**.
- **Score Multiplier** doubles all point awards — target hits and the sector clear bonus — while active.
- Hazard: shooting it clears the threat, adds **+4% stability**, and never subtracts score. It gives no points or orbs.
- Any target that flies past you damages your hull: **15%** for score targets and **25%** for an asteroid. A **Quantum Shield** charge absorbs one asteroid collision completely and shatters it into debris.
- Reach **100% Sector Stability** to secure the sector. The galaxy map then unlocks the next constellation.

## Cosmic Charge and power-ups
Successful hits fill the **Cosmic Charge** meter. When it reaches 100% it resets and deploys a power-up orb; scoring hits also have a small (~6%) chance to deploy one tactically.

- **Power-up orbs** are special targets in the arena, marked with a bright neon icon, two rotating rings and a coloured aura. Shoot an orb to activate it. Missed orbs fade away harmlessly — no hull damage and no stability credit.
- **Quantum Shield** (cyan `⬡`): absorbs **1 asteroid collision**. Charges stack up to **3** and persist until used.
- **Stasis Field** (violet `❄`): slows all target velocities by **50%** for **5 seconds**.
- **Score Multiplier** (gold `×2`): doubles point values for **7 seconds**.

The inner HUD shows the live **score**, current **level name/motif**, **Hull Integrity** bar, **Cosmic Charge** bar, and three power-up slots. Active power-ups light up with a pulsing neon icon and a draining timer bar; shield slots show how many charges are ready.

## Pause menu
A glassmorphism pause overlay is available at any time during an active sector from the top-right **PAUSE** button or the **Escape** key. Gameplay, projectiles, timers and target movement freeze while the background nebula and starfield keep drifting gently.

- **[ RESUME ]** closes the menu and returns to the run.
- **[ RESTART SECTOR ]** resets the current run at full hull and 24 orbs with stability back at 0%.
- **[ RETURN TO GALAXY MAP ]** abandons the run without marking the constellation cleared and returns to the map with the current sector selected.

## Visual and feedback polish
- A custom **plasma shader tunnel** flows inside the wireframe arena, tinted per sector, wrapped in a living **cosmic sky dome** that blends deep electric indigo, cosmic violet, neon teal and stellar ember.
- **Three distant shader planets** carry banded atmospheres, additive rim shells, an orbiting moon and a tilted ring; **four procedural fighter silhouettes** cross the deep background with pulsing engine trails.
- **Six additive nebula sprites** and **two scrolling cosmic dust layers** drift, breathe, rotate and react to pointer parallax, backed by a **three-layer parallax starfield** in teal, indigo, magenta and orange.
- The **Sector Stability** HUD glows teal-to-gold, animates its fill, escalates through closing/critical alert states, and pulses at every 25% milestone and at 100%.
- A **cinematic targeting reticle** tracks the pointer with rotating dashed rings, corner brackets, cardinal ticks, a scanning line, a glowing diamond core and a `TARGET LOCK` label. A bottom-center **spaceship weapon rig** with glowing barrel, energy core and muzzle diamond sways with aim; both reticle and rig kick back with a muzzle flash on every shot.
- **Cosmic gems** carry faceted crowns and pavilions, glowing girdles, pulsing internal cores, sparkles and coloured energy auras. **Asteroids** use distorted rock meshes with hot wireframe fissures and a rotating warning ring, then shatter into tumbling rocky chunks with their own velocity, spin and fade.
- Projectiles leave **additive particle trails**; hits produce **additive shard bursts plus a bright impact bloom**.
- **Floating combat text** rises from each impact (`+100`, `+250`, `+500`, `ASTEROID SHATTERED`, `-25% HULL`, `POWER ORB LOST`), score ticks up with a tween, hull/score values pop, a red **damage vignette** flashes, and the camera shakes on impacts.
- A bright **tactical flash** fires whenever an asteroid is shattered, a shield absorbs an impact, or hull damage is taken; the victory sequence uses a gold/cyan flash.
- A dedicated 2D canvas draws **pointer-following energy trails** and screen-space neon bursts on every shot and impact.
- Level 4 adds a **Nebula Pulse** DOM wave plus per-target material hue shifts, then restores the original colours.
- Floating text, debris and asteroid chunks are capped and cleaned up automatically, and shared glow textures and rock geometry are reused to keep memory stable.

## Project structure
- `index.html` — game HUD, targeting reticle, weapon rig, Sector Stability bar, pause menu, galaxy map, warp canvas, pointer FX canvas, floating-text layer and start/game-over overlay
- `src/main.js` — Three.js scene, living space environment, pointer aiming, weapon recoil, projectiles, gem/asteroid targets, asteroid debris, stability mission, pause/restart flow, scoring, effects and game loop
- `src/galaxy-map.js` — animated galaxy canvas, five constellation definitions, sequential unlock logic, sealed state, selection/hover logic, warp transition and saved progress
- `src/style.css` — responsive neon UI, reticle and weapon-rig styling, stability HUD alerts, glass pause menu, pointer FX, tactical flash, constellation hover/glow, glitch, warp and combat-feedback animations

## Build for production
Run `npm run build`. The deployable site is created in `dist/`.
