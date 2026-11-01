import * as THREE from 'three';
import './style.css';
import { initGalaxyMap, LEVELS } from './galaxy-map.js';

const root = document.querySelector('#game-root');
const scoreEl = document.querySelector('#score');
const ammoEl = document.querySelector('#ammo');
const hullEl = document.querySelector('#hull');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlay-title');
const overlayCopy = document.querySelector('#overlay-copy');
const startButton = document.querySelector('#start-button');
const crosshair = document.querySelector('#crosshair');
const toast = document.querySelector('#toast');
const sectorHud = document.querySelector('#sector-hud');
const sectorTitleEl = document.querySelector('#sector-title');
const sectorObjectiveEl = document.querySelector('#sector-objective');
const bossHud = document.querySelector('#boss-hud');
const bossBarFill = document.querySelector('#boss-bar-fill');
const bossStatusEl = document.querySelector('#boss-status');
const banner = document.querySelector('#banner');
const bannerTitle = document.querySelector('#banner-title');
const bannerSub = document.querySelector('#banner-sub');
const bottomHint = document.querySelector('#bottom-hint');
const mapButton = document.querySelector('#map-button');
const floatLayer = document.querySelector('#float-layer');
const damageVignette = document.querySelector('#damage-vignette');
const hudChargeEl = document.querySelector('#hud-charge');
const tacticalFlash = document.querySelector('#tactical-flash');
const pointerCanvas = document.querySelector('#pointer-fx');
const reticle = document.querySelector('#crosshair .reticle');
const weaponSway = document.querySelector('#weapon-rig .weapon-sway');
const weaponBody = document.querySelector('#weapon-rig .weapon-body');
const stabilityAlertEl = document.querySelector('#stability-alert');
const stabilityMilestoneEl = document.querySelector('#stability-milestone');
const pauseButton = document.querySelector('#pause-button');
const pauseMenu = document.querySelector('#pause-menu');
const pauseLevelEl = document.querySelector('#pause-level');
const pauseScoreEl = document.querySelector('#pause-score');
const pauseStabilityEl = document.querySelector('#pause-stability');
const pauseResumeBtn = document.querySelector('#pause-resume');
const pauseRestartBtn = document.querySelector('#pause-restart');
const pauseMapBtn = document.querySelector('#pause-map');
const combatHud = document.querySelector('#combat-hud');
const chLevelTag = document.querySelector('#ch-level-tag');
const chLevelName = document.querySelector('#ch-level-name');
const chLevelMotif = document.querySelector('#ch-level-motif');
const hullFill = document.querySelector('#hull-fill');
const chargeValueEl = document.querySelector('#charge-value');
const chargeFill = document.querySelector('#charge-fill');
const sectorStabilityValueEl = document.querySelector('#sector-stability-value');
const sectorStabilityFillEl = document.querySelector('#sector-stability-fill');
const nebulaWave = document.querySelector('#nebula-wave');
const powerEls = {
  shield: document.querySelector('#power-shield'),
  stasis: document.querySelector('#power-stasis'),
  multiplier: document.querySelector('#power-multiplier'),
};
const powerTextEls = {
  shield: document.querySelector('#power-shield-text'),
  stasis: document.querySelector('#power-stasis-text'),
  multiplier: document.querySelector('#power-multiplier-text'),
};
const powerTimerEls = {
  shield: document.querySelector('#power-shield .power-timer'),
  stasis: document.querySelector('#power-stasis .power-timer'),
  multiplier: document.querySelector('#power-multiplier .power-timer'),
};

function showFatalError(titleHtml, message) {
  const box = document.createElement('div');
  box.id = 'fatal-error';
  box.className = 'overlay';
  box.innerHTML = `<div class="panel"><div class="eyebrow"><span></span> SYSTEM FAULT</div><h1>${titleHtml}</h1><p>${message}</p></div>`;
  root.appendChild(box);
  if (overlay) overlay.classList.add('hidden');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color('#050615');
scene.fog = new THREE.FogExp2('#0b0926', 0.027);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 0, 6);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  console.error('WebGL renderer failed to initialize:', err);
  showFatalError('WEBGL<br><em>UNAVAILABLE</em>', 'This browser or device could not start 3D rendering. Enable hardware acceleration / WebGL, then reload the page.');
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
root.prepend(renderer.domElement);
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  showFatalError('RENDERER<br><em>INTERRUPTED</em>', 'The graphics context was lost. Reload the page to continue your run.');
});

const hemiLight = new THREE.HemisphereLight(0x8abaff, 0x150b2d, 1.8); scene.add(hemiLight);
const cyanLight = new THREE.PointLight(0x24eaff, 24, 45); cyanLight.position.set(-4, 2, -12); scene.add(cyanLight);
const pinkLight = new THREE.PointLight(0xff31b8, 18, 40); pinkLight.position.set(4, -1, -28); scene.add(pinkLight);
const whiteLight = new THREE.PointLight(0xc2c8ff, 12, 25); whiteLight.position.set(0, 3, 5); scene.add(whiteLight);
const emberLight = new THREE.PointLight(0xff7a2e, 14, 48); emberLight.position.set(5, -3, -30); scene.add(emberLight);

// A deep-space gradient dome keeps the arena from ever reading as empty black.
// The shader blends electric indigo, cosmic violet, neon teal, and stellar ember.
const skyUniforms = {
  uTime: { value: 0 },
  uDeep: { value: new THREE.Color(0x040514) },
  uMid: { value: new THREE.Color(0x21104f) },
  uTeal: { value: new THREE.Color(0x0c7b82) },
  uEmber: { value: new THREE.Color(0x6b2416) },
};
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(94, 40, 24),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      varying vec3 vDir;
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uTeal;
      uniform vec3 uEmber;
      void main(){
        float h = vDir.y * 0.5 + 0.5;
        vec3 col = mix(uDeep, uMid, smoothstep(0.02, 0.68, h));
        float tealBand = pow(max(0.0, 1.0 - abs(vDir.y - 0.08) * 2.7), 4.0);
        float swirl = sin(vDir.x * 8.0 + uTime * 0.035) * sin(vDir.z * 6.0 - uTime * 0.022);
        col += uTeal * tealBand * 0.46;
        col += uEmber * smoothstep(0.34, 1.0, swirl * 0.5 + 0.5) * 0.18;
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
);
skyDome.renderOrder = -20;
scene.add(skyDome);

// A long dark tube and repeating luminous rings create the forward-motion illusion.
const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 100, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x11152c, side: THREE.BackSide, wireframe: true, transparent: true, opacity: 0.18 }));
tunnel.rotation.x = Math.PI / 2; tunnel.position.z = -38; scene.add(tunnel);
const rings = [];
const ringBaseColors = [];
for (let i = 0; i < 18; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.025, 6, 64), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x3a70ff : 0x42f4ff, transparent: true, opacity: 0.55 }));
  ring.position.z = 3 - i * 5.5; ring.scale.set(1, 0.86, 1); scene.add(ring); rings.push(ring); ringBaseColors.push(ring.material.color.clone());
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.012, 4, 64), new THREE.MeshBasicMaterial({ color: 0xff45bd, transparent: true, opacity: 0.23 }));
  hoop.position.z = ring.position.z - 1.1; hoop.scale.set(1, 0.86, 1); scene.add(hoop); rings.push(hoop); ringBaseColors.push(hoop.material.color.clone());
}
// Multi-layered parallax starfield. Each layer drifts at a different speed and
// shifts gently against the pointer, giving the deep arena real dimension.
const starLayers = [];
function makeStarLayer({ count, spreadX, spreadY, depth, size, palette, opacity, speed, parallax }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cols = palette.map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spreadX;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spreadY;
    positions[i * 3 + 2] = 8 - Math.random() * depth;
    const c = cols[(Math.random() * cols.length) | 0];
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size, vertexColors: true, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
  });
  const points = new THREE.Points(geometry, material);
  points.userData = { speed, parallax, depth };
  scene.add(points);
  starLayers.push(points);
  return points;
}
makeStarLayer({ count: 280, spreadX: 23, spreadY: 19, depth: 104, size: 0.036, palette: [0x5b6fa8, 0x8da8ff, 0x9dfbff, 0xffb36b], opacity: 0.54, speed: 4.2, parallax: 0.14 });
makeStarLayer({ count: 190, spreadX: 18, spreadY: 15, depth: 70, size: 0.058, palette: [0x35f4ff, 0x8d6bff, 0xff6bd5, 0xff9d3d], opacity: 0.7, speed: 7.0, parallax: 0.3 });
makeStarLayer({ count: 105, spreadX: 15, spreadY: 13, depth: 44, size: 0.088, palette: [0xb8ffff, 0xffc23d, 0xff6cbd, 0xff8a4a], opacity: 0.84, speed: 11.0, parallax: 0.52 });

const targetGroup = new THREE.Group(); scene.add(targetGroup);
const bossGroup = new THREE.Group(); scene.add(bossGroup); // boss + bolts live here (kept separate from targets)
const targets = [];
const projectiles = [];
const particles = [];
const flashes = [];      // short-lived additive impact blooms
const debris = [];      // rocky asteroid chunks with their own physics
const bossBolts = [];   // incoming energy bolts the player must shoot
const bossPulses = [];  // decorative expanding rings (visual only)
// One shared shard geometry for every particle; each shard only scales it.
const shardGeometry = new THREE.TetrahedronGeometry(1, 0);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();
let pointerScreenX = innerWidth / 2, pointerScreenY = innerHeight / 2;

// ---- Pointer canvas FX ------------------------------------------------------
// A lightweight 2D overlay keeps energy trails and screen-space bursts crisp
// without adding more draw calls to the Three.js scene.
const pointerCtx = pointerCanvas ? pointerCanvas.getContext('2d') : null;
const pointerTrail = [];
const pointerBursts = [];
let pointerFxW = innerWidth, pointerFxH = innerHeight;
function resizePointerFx() {
  if (!pointerCanvas || !pointerCtx) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  pointerFxW = Math.max(1, innerWidth);
  pointerFxH = Math.max(1, innerHeight);
  pointerCanvas.width = Math.round(pointerFxW * dpr);
  pointerCanvas.height = Math.round(pointerFxH * dpr);
  pointerCanvas.style.width = `${pointerFxW}px`;
  pointerCanvas.style.height = `${pointerFxH}px`;
  pointerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizePointerFx();
function fxColor(color) {
  if (color && typeof color.getHexString === 'function') return `#${color.getHexString()}`;
  if (typeof color === 'number') return `#${color.toString(16).padStart(6, '0')}`;
  return color || (LEVELS[activeLevel - 1] || LEVELS[0]).accent;
}
function rgba(hex, alpha) {
  const raw = String(fxColor(hex)).replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
function pushPointerTrail(x, y) {
  pointerTrail.push({ x, y, life: 0.5, maxLife: 0.5 });
  if (pointerTrail.length > 42) pointerTrail.shift();
}
function pointerBurst(x, y, color, count = 12) {
  const css = fxColor(color);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 190;
    const life = 0.28 + Math.random() * 0.38;
    pointerBursts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life, maxLife: life, size: 0.8 + Math.random() * 2.2, color: css,
    });
  }
  if (pointerBursts.length > 170) pointerBursts.splice(0, pointerBursts.length - 170);
}
function drawPointerFx(dt) {
  if (!pointerCtx) return;
  pointerCtx.clearRect(0, 0, pointerFxW, pointerFxH);
  pointerCtx.globalCompositeOperation = 'lighter';
  pointerCtx.lineCap = 'round';
  const accent = (LEVELS[activeLevel - 1] || LEVELS[0]).accent;

  for (let i = pointerTrail.length - 1; i >= 0; i--) {
    pointerTrail[i].life -= dt;
    if (pointerTrail[i].life <= 0) pointerTrail.splice(i, 1);
  }
  for (let i = 1; i < pointerTrail.length; i++) {
    const a = pointerTrail[i - 1], b = pointerTrail[i];
    const k = Math.max(0, b.life / b.maxLife);
    if (k <= 0) continue;
    pointerCtx.strokeStyle = rgba(accent, k * 0.5);
    pointerCtx.lineWidth = 0.8 + k * 2.2;
    pointerCtx.beginPath();
    pointerCtx.moveTo(a.x, a.y);
    pointerCtx.lineTo(b.x, b.y);
    pointerCtx.stroke();
    pointerCtx.fillStyle = rgba('#bffcff', k * 0.7);
    pointerCtx.beginPath();
    pointerCtx.arc(b.x, b.y, 0.7 + k * 1.7, 0, 6.283);
    pointerCtx.fill();
  }

  for (let i = pointerBursts.length - 1; i >= 0; i--) {
    const p = pointerBursts[i];
    p.life -= dt;
    if (p.life <= 0) { pointerBursts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.97; p.vy = p.vy * 0.97 + 22 * dt;
    const k = Math.max(0, p.life / p.maxLife);
    pointerCtx.fillStyle = rgba(p.color, k);
    pointerCtx.beginPath();
    pointerCtx.arc(p.x, p.y, p.size * (0.35 + k * 0.85), 0, 6.283);
    pointerCtx.fill();
  }
  pointerCtx.globalCompositeOperation = 'source-over';
}

// ---- Neon glow toolbox ------------------------------------------------------
// One shared radial-gradient texture powers every additive halo (targets, orbs, nebulae).
function makeGlowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.62)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const glowTexture = makeGlowTexture();
function attachGlow(parent, color, size, opacity = 0.55) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  parent.add(sprite);
  return sprite;
}

// Smooth animated plasma tunnel (custom shader) layered inside the wireframe tube.
const plasmaUniforms = {
  uTime: { value: 0 },
  uColorA: { value: new THREE.Color(0x24eaff) },
  uColorB: { value: new THREE.Color(0xff3ea0) },
};
const plasmaTunnel = new THREE.Mesh(
  new THREE.CylinderGeometry(7.72, 7.72, 100, 48, 1, true),
  new THREE.ShaderMaterial({
    uniforms: plasmaUniforms,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB;
      void main(){
        float flow = sin(vUv.y * 46.0 - uTime * 2.4) * 0.5 + 0.5;
        float flow2 = sin(vUv.y * 18.0 + uTime * 1.15) * 0.5 + 0.5;
        float band = pow(flow, 7.0) * 0.75 + pow(flow2, 12.0) * 0.55;
        float edge = smoothstep(0.0, 0.32, vUv.x) * smoothstep(1.0, 0.68, vUv.x);
        vec3 col = mix(uColorA, uColorB, vUv.x);
        gl_FragColor = vec4(col * band * edge * 1.25, band * edge * 0.5);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
  })
);
plasmaTunnel.rotation.x = Math.PI / 2; plasmaTunnel.position.z = -38; scene.add(plasmaTunnel);

// Deep nebulae give the arena depth behind the targets. Their base positions and
// scales are stored so the main loop can drift, scroll, and breathe them slowly.
const nebulaSprites = [];
for (const [color, x, y, z, size, op] of [
  [0x2a1b6b, -16, 4, -78, 50, 0.17],
  [0x0c7b82, 14, -4, -72, 44, 0.14],
  [0x7a2cff, 0, 7, -88, 56, 0.13],
  [0xb8401f, 18, 6, -96, 44, 0.1],
  [0xff3fb8, -20, -7, -84, 38, 0.09],
  [0x1d5f8f, 8, -8, -64, 40, 0.11],
]) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sprite.position.set(x, y, z); sprite.scale.set(size, size, 1);
  sprite.userData = { baseX: x, baseY: y, baseZ: z, baseScale: size, baseOpacity: op, phase: Math.random() * Math.PI * 2 };
  scene.add(sprite); nebulaSprites.push(sprite);
}

// ---- Living deep-space environment -----------------------------------------
// Scrolling dust fields, atmospheric planets, and distant fighter silhouettes
// are all fog-exempt so they stay readable behind the high-density combat lane.
const dustLayers = [];
function makeDustLayer({ count, spreadX, spreadY, depth, size, speed, opacity, palette, parallax }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cols = palette.map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spreadX;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spreadY;
    positions[i * 3 + 2] = 8 - Math.random() * depth;
    const c = cols[(Math.random() * cols.length) | 0];
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size, map: glowTexture, vertexColors: true, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
  });
  const points = new THREE.Points(geometry, material);
  points.userData = { speed, depth, parallax };
  scene.add(points); dustLayers.push(points);
  return points;
}
makeDustLayer({ count: 170, spreadX: 38, spreadY: 26, depth: 94, size: 0.16, speed: 2.1, opacity: 0.3, palette: [0x2a1b6b, 0x6b3dff, 0x1d7f8f, 0xb84b1f], parallax: 0.12 });
makeDustLayer({ count: 95, spreadX: 28, spreadY: 20, depth: 62, size: 0.29, speed: 3.5, opacity: 0.2, palette: [0x8b3dff, 0xff6b2e, 0x1de5d4, 0xff3fb8], parallax: 0.26 });

const planets = [];
function createPlanet({ x, y, z, radius, base, accent, atmo, ring = false, moon = false }) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const uniforms = {
    uTime: { value: 0 },
    uBase: { value: new THREE.Color(base) },
    uAccent: { value: new THREE.Color(accent) },
    uAtmo: { value: new THREE.Color(atmo) },
  };
  const planetMat = new THREE.ShaderMaterial({
    uniforms,
    fog: false,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      void main(){
        vNormal = normalize(normalMatrix * normal);
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      uniform float uTime;
      uniform vec3 uBase;
      uniform vec3 uAccent;
      uniform vec3 uAtmo;
      void main(){
        vec3 n = normalize(vNormal);
        float light = 0.34 + 0.66 * max(dot(n, normalize(vec3(-0.45, 0.65, 0.8))), 0.0);
        float bands = sin(vPos.y * 7.0 + sin(vPos.x * 2.0 + uTime * 0.04) * 1.4) * 0.5 + 0.5;
        float swirl = sin(vPos.x * 4.0 + vPos.z * 3.0 + uTime * 0.06) * 0.5 + 0.5;
        vec3 col = mix(uBase, uAccent, bands * 0.45 + swirl * 0.18);
        col *= light;
        float rim = pow(1.0 - abs(dot(n, vec3(0.0, 0.0, 1.0))), 2.6);
        col += uAtmo * rim * 0.8;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), planetMat);
  group.add(sphere);

  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uAtmo: { value: new THREE.Color(atmo) }, uTime: uniforms.uTime },
    fog: false,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main(){
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      uniform vec3 uAtmo;
      uniform float uTime;
      void main(){
        float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.2);
        float pulse = 0.82 + 0.18 * sin(uTime * 0.7);
        gl_FragColor = vec4(uAtmo * rim * 1.6 * pulse, rim * 0.55);
      }`,
  });
  const atmoShell = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, 48, 32), atmoMat);
  group.add(atmoShell);
  const halo = attachGlow(group, atmo, radius * 3.1, 0.17);
  halo.renderOrder = -2;

  if (ring) {
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.38, radius * 1.96, 72),
      new THREE.MeshBasicMaterial({ color: atmo, transparent: true, opacity: 0.18, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    ringMesh.rotation.x = Math.PI * 0.5 + 0.34;
    ringMesh.rotation.z = 0.22;
    group.add(ringMesh);
    group.userData.ring = ringMesh;
  }
  if (moon) {
    const moonMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius * 0.16, 1),
      new THREE.MeshStandardMaterial({ color: 0x8d88a8, roughness: 0.9, metalness: 0.1, emissive: 0x1b1630, emissiveIntensity: 0.4, fog: false })
    );
    moonMesh.position.set(radius * 1.7, radius * 0.3, radius * 0.2);
    group.add(moonMesh);
    group.userData.moon = moonMesh;
  }
  group.userData = { ...group.userData, baseX: x, baseY: y, baseZ: z, phase: Math.random() * 6.283, radius, uniforms };
  scene.add(group); planets.push(group);
  return group;
}
createPlanet({ x: -35, y: 16, z: -86, radius: 7.5, base: 0x1a0f4d, accent: 0x2a7cff, atmo: 0x39f7ff, moon: true });
createPlanet({ x: 44, y: -17, z: -104, radius: 9.5, base: 0x3a0c14, accent: 0xff7a1a, atmo: 0xffb347, ring: true });
createPlanet({ x: 29, y: 21, z: -92, radius: 4.6, base: 0x1c1140, accent: 0x9d4dff, atmo: 0xc38bff });

const fighters = [];
function createFighter({ x, y, z, dir, speed, scale, accent, phase }) {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x182346, emissive: 0x12336b, emissiveIntensity: 1.0, metalness: 0.82, roughness: 0.34, flatShading: true, fog: false });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.25, 5), hullMat);
  body.rotation.x = -Math.PI / 2;
  group.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.06, 0.36), hullMat);
  wing.position.z = 0.16;
  group.add(wing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.48), hullMat);
  fin.position.set(0, 0.18, 0.38);
  group.add(fin);
  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9, fog: false })
  );
  cockpit.position.set(0, 0.09, 0.12);
  group.add(cockpit);
  const trimMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.78, fog: false });
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 0.94), trimMat);
  spine.position.set(0, 0.055, 0.1);
  group.add(spine);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), trimMat);
    tip.position.set(side * 0.66, 0.02, 0.16);
    group.add(tip);
    const tipGlow = attachGlow(group, accent, 0.24, 0.72);
    tipGlow.position.copy(tip.position);
  }
  const engine = attachGlow(group, accent, 0.7, 0.95);
  engine.position.z = 0.72;
  const trail = attachGlow(group, accent, 0.44, 0.45);
  trail.position.z = 1.0;
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  group.userData = { baseY: y, baseZ: z, dir, speed, phase, engine, trail, accent };
  scene.add(group); fighters.push(group);
  return group;
}
createFighter({ x: -31, y: 9, z: -62, dir: 1, speed: 2.5, scale: 1.7, accent: 0x45f7ff, phase: 0.4 });
createFighter({ x: 29, y: -10, z: -78, dir: -1, speed: 1.9, scale: 2.2, accent: 0xff7a2e, phase: 2.1 });
createFighter({ x: -23, y: -13, z: -88, dir: 1, speed: 1.25, scale: 2.8, accent: 0xa06bff, phase: 4.3 });
createFighter({ x: 35, y: 12, z: -92, dir: -1, speed: 1.55, scale: 2.5, accent: 0x2af6ff, phase: 5.2 });

// ---- Game state -------------------------------------------------------------
// phase: 'menu' | 'sector' | 'transition' | 'bossintro' | 'boss' | 'won' | 'lost'
let running = false, phase = 'menu';
let score = 0, ammo = 24, hull = 100;
let spawnTimer = 0, fireCooldown = 0, toastTimer = 0, bannerTimer = 0;
let elapsed = 0, sectorElapsed = 0;
let sectorIndex = 0, objectiveCount = 0;
let currentRingSpeed = 7.5, currentSpeedMul = 1, currentMaxTargets = 8;
let transitionTimer = 0, victoryTimer = 0, victoryPending = false, victoryFxTimer = 0;
let displayScore = 0, lastShownScore = -1;
let camX = 0, camY = 0, shake = 0;
let activeLevel = 1;
let stability = 0;         // 0–100; the single sector objective
let stabilityMilestone = 0; // last 25/50/75 alert reached
let paused = false;        // gameplay is frozen while the pause menu is open

// ---- Cosmic charge + power-ups ----------------------------------------------
let cosmicCharge = 0;      // 0–100; fills from successful hits
let shieldCharges = 0;     // Quantum Shield: absorbs one Red Hazard collision per charge
let stasisTimer = 0;       // Stasis Field: 50% target speed for 5 s
let multiplierTimer = 0;   // Score Multiplier: 2× points for 7 s
let nebulaTimer = 8.5;     // Level 4 pulse cadence
let nebulaFlash = 0;       // Remaining colour-shift time
let nebulaPulseCount = 0;

const POWERUPS = {
  shield: {
    name: 'QUANTUM SHIELD', icon: '⬡', color: 0x53f7ff, css: '#53f7ff',
    toast: 'QUANTUM SHIELD ONLINE · 1 HAZARD ABSORBED',
  },
  stasis: {
    name: 'STASIS FIELD', icon: '❄', color: 0x9a8bff, css: '#9a8bff',
    toast: 'STASIS FIELD · TARGETS SLOWED 50%',
  },
  multiplier: {
    name: 'SCORE MULTIPLIER', icon: '×2', color: 0xffd24a, css: '#ffd24a',
    toast: 'SCORE MULTIPLIER · 2× POINTS FOR 7 S',
  },
};
const POWER_KEYS = Object.keys(POWERUPS);

// Level modifiers are keyed by the 1–5 constellation IDs passed from the map.
// Each constellation now hosts one stability sector; these rules reshape it.
const LEVEL_MODIFIERS = {
  1: { key: 'training', label: 'STANDARD TRAINING PARAMETERS' },
  2: { key: 'serpentine', speedMul: 1.04, label: 'SERPENTINE DRIFTING TARGETS' },
  3: { key: 'solar', bonusChance: 0.28, bonusLife: 4.2, label: 'SOLAR BONUS SURGE' },
  4: { key: 'nebula', pulseInterval: 8.5, pulseDuration: 1.55, label: 'PERIODIC NEBULA PULSE' },
  5: { key: 'chaos', speedMul: 1.28, extraTargets: 4, spawnMul: 0.62, doubleSpawn: 0.72, hazardChance: 0.17, label: 'SUPERNOVA HIGH-CHAOS MODE' },
};
function levelMod() { return LEVEL_MODIFIERS[activeLevel] || LEVEL_MODIFIERS[1]; }

// ---- Sector missions --------------------------------------------------------
// Each constellation is one structured sector. Reach 100% Sector Stability by
// hitting targets; the run ends with a SECTOR SECURED sequence, not a boss loop.
const SECTORS = [
  {
    id: 1, title: 'SECTOR 01 — THE NEON PRISM', objective: 'Stabilize the prism lattice',
    spawnInterval: 1.7, spawnMin: 1.15, speedMul: 0.85, maxTargets: 7,
    mix: { standard: 76, precision: 14, bonus: 6, hazard: 4 },
    ringSpeed: 6.4, fogDensity: 0.026, cyanI: 24, pinkI: 14, hemiI: 1.8,
    accent: new THREE.Color(0x42f4ff),
  },
  {
    id: 2, title: 'SECTOR 02 — THE VOID SERPENT', objective: 'Trace the serpent through dead space',
    spawnInterval: 1.5, spawnMin: 0.98, speedMul: 1.0, maxTargets: 8,
    mix: { standard: 55, precision: 25, bonus: 8, hazard: 12 },
    ringSpeed: 7.4, fogDensity: 0.03, cyanI: 22, pinkI: 20, hemiI: 1.6,
    accent: new THREE.Color(0xa06bff),
  },
  {
    id: 3, title: 'SECTOR 03 — SOLAR CROWN', objective: 'Bank the solar surge',
    spawnInterval: 1.3, spawnMin: 0.86, speedMul: 1.08, maxTargets: 8,
    mix: { standard: 45, precision: 25, bonus: 18, hazard: 12 },
    ringSpeed: 8.2, fogDensity: 0.032, cyanI: 18, pinkI: 24, hemiI: 1.5,
    accent: new THREE.Color(0xffc23d),
  },
  {
    id: 4, title: 'SECTOR 04 — NEBULA HEART', objective: 'Survive the spectral pulses',
    spawnInterval: 1.2, spawnMin: 0.78, speedMul: 1.12, maxTargets: 9,
    mix: { standard: 42, precision: 28, bonus: 10, hazard: 20 },
    ringSpeed: 9.0, fogDensity: 0.035, cyanI: 20, pinkI: 28, hemiI: 1.4,
    accent: new THREE.Color(0xff3fb8),
  },
  {
    id: 5, title: 'SECTOR 05 — SUPERNOVA CORE', objective: 'Hold the collapsing core',
    spawnInterval: 1.05, spawnMin: 0.68, speedMul: 1.2, maxTargets: 10,
    mix: { standard: 36, precision: 26, bonus: 10, hazard: 28 },
    ringSpeed: 10.5, fogDensity: 0.04, cyanI: 22, pinkI: 30, hemiI: 1.3,
    accent: new THREE.Color(0x9d7bff),
  },
];

// ---- Target types -----------------------------------------------------------
// Weighted spawn table (weights overridden per-sector via SECTORS[].mix).
const TARGET_TYPES = {
  standard:  { points: 100, hullDamage: 15 },
  precision: { points: 250, hullDamage: 15 },
  hazard:    { points: 0,   hullDamage: 25 },
  bonus:     { points: 500, hullDamage: 15 },
};
// Every successful hit feeds the Sector Stability objective. Hazards add less,
// but clipping one still feels useful and encourages a clean tunnel.
const STABILITY_GAIN = { standard: 9, precision: 14, bonus: 20, hazard: 4 };
const STABILITY_MAX = 100;
function pickType() {
  const mod = levelMod();
  if (mod.key === 'solar' && Math.random() < mod.bonusChance) return 'bonus';
  if (mod.key === 'chaos' && Math.random() < mod.hazardChance) return 'hazard';
  const mix = (SECTORS[sectorIndex] && SECTORS[sectorIndex].mix) || { standard: 100 };
  const entries = Object.entries(mix);
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total;
  for (const [id, w] of entries) { r -= w; if (r <= 0) return id; }
  return 'standard';
}
// ---- Cosmic gem + asteroid builders ----------------------------------------
function makeRockGeometry(radius, detail = 2) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453;
    const noise = n - Math.floor(n);
    const jag = 0.72 + noise * 0.5;
    v.multiplyScalar(jag);
    v.y *= 0.88 + noise * 0.18;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
const asteroidChunkGeometry = makeRockGeometry(1, 0);

function buildAsteroid(radius) {
  const group = new THREE.Group();
  const geo = makeRockGeometry(radius, 2);
  const rockColor = new THREE.Color().setHSL(0.045 + Math.random() * 0.018, 0.18 + Math.random() * 0.1, 0.24 + Math.random() * 0.1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: rockColor, emissive: 0x3a0c05, emissiveIntensity: 0.8,
    metalness: 0.08, roughness: 0.94, flatShading: true, fog: false,
  });
  group.add(new THREE.Mesh(geo, rockMat));
  const crack = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0xff5a24, wireframe: true, transparent: true, opacity: 0.34,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  crack.scale.setScalar(1.014);
  group.add(crack);
  const warnRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.18, 0.026, 6, 36),
    new THREE.MeshBasicMaterial({ color: 0xff5a2e, transparent: true, opacity: 0.44, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  warnRing.rotation.x = 0.18;
  group.add(warnRing);
  const aura = attachGlow(group, 0xff4a2a, radius * 3.5, 0.38);
  return { group, glow: crack, aura, warnRing, hotColor: new THREE.Color(0xff6a2e) };
}

function buildGem({ radius, height, color, accent, facets = 8 }) {
  const group = new THREE.Group();
  const mainMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 1.85,
    metalness: 0.28, roughness: 0.14, flatShading: true,
    transparent: true, opacity: 0.94, fog: false,
  });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius, height * 0.34, facets, 1, false), mainMat);
  crown.position.y = height * 0.17;
  group.add(crown);
  const pavilion = new THREE.Mesh(new THREE.ConeGeometry(radius, height * 0.66, facets), mainMat);
  pavilion.rotation.x = Math.PI;
  pavilion.position.y = -height * 0.33;
  group.add(pavilion);
  const girdle = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.01, Math.max(0.012, height * 0.014), 5, facets * 2),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  girdle.rotation.x = Math.PI / 2;
  group.add(girdle);
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(radius * 0.38, 0),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  core.scale.set(1, 1.5, 1);
  group.add(core);
  const glow = new THREE.Mesh(
    new THREE.OctahedronGeometry(radius * 1.25, 0),
    new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  glow.scale.set(1, height / (radius * 2.1), 1);
  group.add(glow);
  const sparkleA = attachGlow(group, accent, radius * 0.9, 0.8); sparkleA.position.y = height * 0.34;
  const sparkleB = attachGlow(group, accent, radius * 0.72, 0.55); sparkleB.position.y = -height * 0.66;
  const aura = attachGlow(group, accent, radius * 4.2, 0.46);
  return { group, glow, core, aura, sparkles: [sparkleA, sparkleB] };
}

// Creates one target of the given type and returns it. userData carries all gameplay data.
// Sizes are tuned so silhouettes are clearly distinct during play.
function makeTarget(z = -42, type = 'standard') {
  let obj, glow, visualSize, collisionRadius, speed, spinX, spinY, spinZ = 0;
  let wobbleAmp, wobbleFreq, pulse = 0, color, core = null, sparkles = [], aura = null, warnRing = null, life = null, isAsteroid = false;
  if (type === 'precision') {
    // Neon-pink elongated gem — clearly smaller (~55-62% of standard width), faster.
    visualSize = 0.3 + Math.random() * 0.1;
    color = new THREE.Color(Math.random() > 0.5 ? 0xff4fd8 : 0xff7ae0);
    const built = buildGem({ radius: visualSize, height: visualSize * 2.8, color, accent: 0xffb3ff, facets: 8 });
    obj = built.group; glow = built.glow; core = built.core; aura = built.aura; sparkles = built.sparkles;
    collisionRadius = Math.max(visualSize * 1.35, visualSize * 2.8 * 0.44);
    speed = (6.8 + Math.random() * 2.4);
    spinX = 0.8; spinY = 1.8; spinZ = 0.26; wobbleAmp = 0.4; wobbleFreq = 1.35; pulse = 3.1;
  } else if (type === 'bonus') {
    // Radiant soul-orange/gold gem — visibly larger, gentler spin, brighter aura.
    visualSize = 0.56 + Math.random() * 0.08;
    color = new THREE.Color(Math.random() > 0.5 ? 0xffb02e : 0xff8a1f);
    const built = buildGem({ radius: visualSize, height: visualSize * 1.78, color, accent: 0xfff0a8, facets: 10 });
    obj = built.group; glow = built.glow; core = built.core; aura = built.aura; sparkles = built.sparkles;
    collisionRadius = visualSize * 1.12;
    speed = (4.4 + Math.random() * 1.4);
    spinX = 0.34; spinY = 0.55; spinZ = 0.16; wobbleAmp = 0.28; wobbleFreq = 0.8; pulse = 2.6;
    life = levelMod().bonusLife || 8.0; // Solar Crown shortens the collection window
  } else if (type === 'hazard') {
    // Jagged tumbling asteroid — larger, slower rotation than the old mine, hot fissures.
    visualSize = 0.54 + Math.random() * 0.16;
    const built = buildAsteroid(visualSize);
    obj = built.group; glow = built.glow; aura = built.aura; warnRing = built.warnRing;
    color = built.hotColor; isAsteroid = true;
    collisionRadius = visualSize * 0.95;
    speed = (6.0 + Math.random() * 2.6);
    spinX = 1.4 + Math.random(); spinY = 1.1 + Math.random() * 1.5; spinZ = 0.4 + Math.random() * 0.6;
    wobbleAmp = 0.35; wobbleFreq = 1.3; pulse = 3.2;
  } else {
    // Electric-blue cosmic gem — medium baseline, bright internal core.
    visualSize = 0.48 + Math.random() * 0.14;
    color = new THREE.Color(Math.random() > 0.5 ? 0x35f4ff : 0x4d9bff);
    const built = buildGem({ radius: visualSize, height: visualSize * 1.45, color, accent: 0xb6ffff, facets: 8 });
    obj = built.group; glow = built.glow; core = built.core; aura = built.aura; sparkles = built.sparkles;
    collisionRadius = visualSize * 1.06;
    speed = (5.4 + Math.random() * 2.1);
    spinX = 0.62; spinY = 1.2; spinZ = 0.18; wobbleAmp = 0.32; wobbleFreq = 1; pulse = 2.8;
  }
  obj.position.set((Math.random() - 0.5) * 7.2, (Math.random() - 0.5) * 5.5, z);
  obj.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);

  const cfg = TARGET_TYPES[type] || TARGET_TYPES.standard;
  const tintables = [];
  obj.traverse((child) => {
    if (!child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) if (mat.color) tintables.push({ mat, base: mat.color.clone() });
  });
  const serpentine = activeLevel === 2;
  obj.userData = {
    type, points: cfg.points, hullDamage: cfg.hullDamage,
    size: collisionRadius, // swept-collision radius (shape-appropriate)
    visualSize, color, speed,
    wobble: Math.random() * 5, wobbleAmp, wobbleFreq,
    baseX: obj.position.x, baseY: obj.position.y,
    spinX, spinY, spinZ, pulse, glow, alive: true,
    aura, auraSize: aura ? aura.scale.x : 0, auraYFactor: 1, warnRing, life,
    core, sparkles, isAsteroid,
    serpentine,
    driftX: serpentine ? (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.75) : 0,
    driftY: serpentine ? (Math.random() - 0.5) * 0.55 : 0,
    tintables,
  };
  targetGroup.add(obj); targets.push(obj);
  return obj;
}

// ---- Power-up orbs ----------------------------------------------------------
const powerGlyphTextures = new Map();
function powerGlyphTexture(power) {
  if (powerGlyphTextures.has(power)) return powerGlyphTextures.get(power);
  const cfg = POWERUPS[power] || POWERUPS.shield;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 72px Orbitron, sans-serif';
  g.shadowColor = cfg.css; g.shadowBlur = 22;
  g.fillStyle = '#ffffff';
  g.fillText(cfg.icon, 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  powerGlyphTextures.set(power, tex);
  return tex;
}
function randomPowerup() { return POWER_KEYS[(Math.random() * POWER_KEYS.length) | 0]; }
// A power-up orb is a special entry in `targets`: shoot it to activate, miss it and
// it simply fades away (no hull damage, no objective credit).
function makePowerupOrb(power = randomPowerup(), z = -44) {
  const cfg = POWERUPS[power] || POWERUPS.shield;
  const color = new THREE.Color(cfg.color);
  const group = new THREE.Group();
  const coreMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.8, metalness: 0.35, roughness: 0.16, flatShading: true });
  let coreGeo;
  if (power === 'shield') coreGeo = new THREE.IcosahedronGeometry(0.44, 0);
  else if (power === 'stasis') coreGeo = new THREE.OctahedronGeometry(0.48, 0);
  else coreGeo = new THREE.TetrahedronGeometry(0.56, 0);
  const core = new THREE.Mesh(coreGeo, coreMat);
  if (power === 'stasis') core.scale.set(1, 1.55, 1);
  group.add(core);

  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.028, 6, 48), ringMat);
  group.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.028, 6, 48), ringMat);
  ring2.rotation.x = Math.PI / 2;
  if (power === 'multiplier') ring2.rotation.z = Math.PI / 4;
  group.add(ring2);

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.88, 1),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  group.add(shell);
  const glyph = new THREE.Sprite(new THREE.SpriteMaterial({ map: powerGlyphTexture(power), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glyph.scale.set(0.72, 0.72, 1);
  group.add(glyph);

  const aura = attachGlow(group, cfg.color, 3.8, 0.62);
  group.position.set((Math.random() - 0.5) * 6.2, (Math.random() - 0.5) * 4.2, z);
  group.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  group.userData = {
    type: 'powerup', power, label: cfg.name, points: 0, hullDamage: 0,
    size: 0.78, visualSize: 0.72, color, speed: 3.6,
    wobble: Math.random() * 5, wobbleAmp: 0.4, wobbleFreq: 0.9,
    baseX: group.position.x, baseY: group.position.y,
    spinX: 1.1, spinY: 1.6, pulse: 3.1, glow: shell, alive: true,
    aura, auraSize: 3.8, auraYFactor: 1, warnRing: null, life: 15,
    serpentine: false, driftX: 0, driftY: 0, tintables: [],
  };
  targetGroup.add(group); targets.push(group);
  return group;
}
function powerupCount() { return targets.reduce((n, t) => n + (t.userData.type === 'powerup' ? 1 : 0), 0); }
function spawnPowerupOrb(power = randomPowerup(), force = false, announce = true) {
  if (powerupCount() >= 2 && !force) return null;
  const orb = makePowerupOrb(power);
  if (announce) showToast(`${POWERUPS[power].name} SIGNAL DETECTED`);
  return orb;
}

// ---- HUD / feedback ---------------------------------------------------------
function updateHud() {
  const shown = Math.round(displayScore);
  if (shown !== lastShownScore) {
    lastShownScore = shown;
    scoreEl.textContent = String(shown).padStart(4, '0');
  }
  ammoEl.textContent = String(ammo).padStart(2, '0');
  hullEl.textContent = `${hull}%`;
  hullEl.style.color = hull <= 30 ? '#ff426d' : '#ffd7e8';
  updateCombatHud();
}
function updateCombatHud() {
  if (!combatHud) return;
  const lvl = LEVELS[activeLevel - 1] || LEVELS[0];
  if (combatHud.dataset.level !== String(activeLevel)) {
    combatHud.dataset.level = String(activeLevel);
    chLevelTag.textContent = lvl.tag;
    chLevelName.textContent = lvl.name;
    chLevelMotif.textContent = lvl.motif;
    combatHud.style.setProperty('--level-accent', lvl.accent);
  }
  hullFill.style.width = `${Math.max(0, Math.min(100, hull))}%`;
  hullFill.classList.toggle('critical', hull <= 30);
  chargeFill.style.width = `${cosmicCharge}%`;
  chargeValueEl.textContent = `${Math.round(cosmicCharge)}%`;
  if (hudChargeEl) hudChargeEl.textContent = `${Math.round(cosmicCharge)}%`;

  // Shield is charge-based (persists until a hazard is absorbed).
  const shieldOn = shieldCharges > 0;
  powerEls.shield.classList.toggle('active', shieldOn);
  powerTextEls.shield.textContent = shieldOn ? `${shieldCharges} CHARGE${shieldCharges > 1 ? 'S' : ''} READY` : 'STANDBY';
  powerTimerEls.shield.style.transform = `scaleX(${shieldOn ? 1 : 0})`;

  const stasisOn = stasisTimer > 0;
  powerEls.stasis.classList.toggle('active', stasisOn);
  powerTextEls.stasis.textContent = stasisOn ? `${stasisTimer.toFixed(1)}S ACTIVE` : 'STANDBY';
  powerTimerEls.stasis.style.transform = `scaleX(${Math.max(0, stasisTimer / 5)})`;

  const multOn = multiplierTimer > 0;
  powerEls.multiplier.classList.toggle('active', multOn);
  powerTextEls.multiplier.textContent = multOn ? `${multiplierTimer.toFixed(1)}S ACTIVE` : 'STANDBY';
  powerTimerEls.multiplier.style.transform = `scaleX(${Math.max(0, multiplierTimer / 7)})`;
}
function addCharge(amount, announce = true) {
  if (!running) return null;
  let orb = null;
  cosmicCharge = Math.min(100, cosmicCharge + amount);
  if (cosmicCharge >= 100) {
    cosmicCharge = 0;
    orb = spawnPowerupOrb(randomPowerup(), true, false);
    if (announce) showToast(orb ? `CHARGE FULL · ${POWERUPS[orb.userData.power].name} ORB DEPLOYED` : 'CHARGE FULL · ORB CAP REACHED');
    popStat(chargeValueEl);
  }
  updateCombatHud();
  return orb;
}
function activatePowerup(power) {
  if (power === 'shield') {
    shieldCharges = Math.min(3, shieldCharges + 1);
  } else if (power === 'stasis') {
    stasisTimer = 5;
  } else {
    multiplierTimer = 7;
  }
  const cfg = POWERUPS[power] || POWERUPS.shield;
  showToast(cfg.toast);
  popStat(powerTextEls[power]);
  updateCombatHud();
}
function updateSectorHud() {
  const sec = SECTORS[sectorIndex];
  if (!sec) return;
  sectorTitleEl.textContent = sec.title;
  sectorObjectiveEl.textContent = stability >= STABILITY_MAX ? 'SECTOR SECURED' : (sec.objective || 'STABILIZE THE RIFT').toUpperCase();
  updateStabilityHud();
}
function updateStabilityHud() {
  const pct = Math.max(0, Math.min(STABILITY_MAX, stability));
  const rounded = Math.round(pct);
  if (sectorStabilityValueEl) sectorStabilityValueEl.textContent = `${rounded}%`;
  if (sectorStabilityFillEl) {
    sectorStabilityFillEl.style.width = `${pct}%`;
    sectorStabilityFillEl.classList.toggle('full', pct >= STABILITY_MAX);
  }
  if (stabilityAlertEl) {
    let alert;
    if (pct >= STABILITY_MAX) alert = 'SECTOR SECURED · RIFT STABILIZED';
    else if (pct >= 75) alert = `SECTOR RIFT CLOSING: ${rounded}% · FINAL PUSH`;
    else if (pct >= 50) alert = `SECTOR RIFT CLOSING: ${rounded}%`;
    else if (pct >= 25) alert = `RIFT DESTABILIZING · ${rounded}%`;
    else alert = 'SECTOR RIFT STABLE · ENGAGE COSMIC GEMS';
    stabilityAlertEl.textContent = alert;
  }
  if (stabilityMilestoneEl) {
    const next = pct >= STABILITY_MAX ? 100 : pct >= 75 ? 100 : pct >= 50 ? 75 : pct >= 25 ? 50 : 25;
    stabilityMilestoneEl.textContent = pct >= STABILITY_MAX ? 'COMPLETE' : `NEXT ${next}%`;
  }
  sectorHud?.classList.toggle('secured', pct >= STABILITY_MAX);
  sectorHud?.classList.toggle('closing', pct >= 50 && pct < 75);
  sectorHud?.classList.toggle('critical', pct >= 75 && pct < STABILITY_MAX);
}
function addStability(type) {
  if (phase !== 'sector' || victoryPending) return;
  const gain = STABILITY_GAIN[type] || 0;
  if (!gain) return;
  const before = stability;
  stability = Math.min(STABILITY_MAX, stability + gain);
  updateStabilityHud();
  popStat(sectorStabilityValueEl);
  if (stability >= STABILITY_MAX) {
    secureSector();
    return;
  }
  for (const milestone of [25, 50, 75]) {
    if (before < milestone && stability >= milestone) {
      stabilityMilestone = milestone;
      const alert = milestone === 25
        ? 'RIFT DESTABILIZING · 25%'
        : milestone === 50
          ? 'SECTOR RIFT CLOSING: 50%'
          : 'SECTOR RIFT CLOSING: 75% · FINAL PUSH';
      showToast(alert);
      sectorHud?.classList.remove('milestone');
      void sectorHud?.offsetWidth;
      sectorHud?.classList.add('milestone');
    }
  }
}
function tacticalFlashPulse(kind = 'hazard') {
  if (!tacticalFlash) return;
  tacticalFlash.classList.remove('active', 'hazard', 'damage', 'victory');
  void tacticalFlash.offsetWidth;
  tacticalFlash.classList.add('active', kind);
}
function secureSector() {
  if (phase !== 'sector' || victoryPending) return;
  phase = 'secured';
  victoryPending = true;
  victoryTimer = 3.4;
  stability = STABILITY_MAX;
  const bonus = pointsFor(2500);
  score += bonus;
  ammo += 8;
  updateHud();
  updateStabilityHud();
  updateSectorHud();
  pauseButton?.classList.add('is-hidden');
  showBanner('SECTOR SECURED', `CONSTELLATION STABILIZED · +${bonus} CLEAR BONUS`, 3.2);
  tacticalFlashPulse('victory');
  addShake(0.32);
  const palette = [0x9dfbff, 0xffd24a, 0xff3fb8, 0xa06bff];
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Vector3((Math.random() - 0.5) * 7.5, (Math.random() - 0.5) * 5.5, -9 - Math.random() * 24);
    burst(p, palette[i % palette.length], 24, 12);
  }
  pointerBurst(innerWidth / 2, innerHeight / 2, '#ffd24a', 46);
}
function showToast(text) { toast.textContent = text; toast.style.opacity = '1'; toastTimer = 0.85; }
function showBanner(title, sub = '', duration = 2.0) {
  bannerTitle.textContent = title; bannerSub.textContent = sub;
  banner.classList.remove('is-hidden'); banner.style.opacity = '1'; bannerTimer = duration;
}
function hideBanner() { banner.style.opacity = '0'; banner.classList.add('is-hidden'); }
function burst(position, color, count = 13, spread = 8) {
  const n = Math.min(count, Math.max(0, 280 - particles.length));
  for (let i = 0; i < n; i++) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const bit = new THREE.Mesh(shardGeometry, material);
    bit.scale.setScalar(0.045 + Math.random() * 0.08);
    bit.position.copy(position); scene.add(bit);
    const velocity = new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
    particles.push({ mesh: bit, velocity, life: 0.55 + Math.random() * 0.55, maxLife: 1.1 });
  }
  spawnImpactFlash(position, color, Math.max(0.7, count * 0.05));
}
// A single additive sprite bloom makes every shatter read as a bright neon pop.
function spawnImpactFlash(position, color, size = 1) {
  const material = new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.setScalar(size);
  scene.add(sprite);
  flashes.push({ sprite, life: 0.34, maxLife: 0.34, size });
}
// Asteroids break into actual tumbling rock chunks rather than a neon pop.
// Chunks use the shared distorted-icosahedron geometry and per-chunk materials
// so each one can fade independently without allocating new geometry.
function shatterAsteroid(position, data, strength = 1) {
  const scaleBase = Math.max(0.55, (data.visualSize || 0.6) / 0.6);
  for (let i = 0; i < 13; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.045 + Math.random() * 0.02, 0.18, 0.15 + Math.random() * 0.13),
      emissive: 0x2a0804, emissiveIntensity: 0.35,
      metalness: 0.06, roughness: 0.96, flatShading: true,
      transparent: true, opacity: 1, fog: false,
    });
    const chunk = new THREE.Mesh(asteroidChunkGeometry, material);
    chunk.scale.setScalar((0.07 + Math.random() * 0.19) * scaleBase);
    chunk.position.copy(position).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.7,
      (Math.random() - 0.5) * 0.7,
      (Math.random() - 0.5) * 0.7
    ));
    chunk.rotation.set(Math.random() * 6.283, Math.random() * 6.283, Math.random() * 6.283);
    scene.add(chunk);
    const life = 1.0 + Math.random() * 0.8;
    debris.push({
      mesh: chunk,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      ).multiplyScalar(strength),
      spin: new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9),
      life, maxLife: life,
    });
  }
  burst(position, 0xff6a2e, 16, 10);
  spawnImpactFlash(position, 0xff7a3a, 1.25);
}
function updateDebris(dt) {
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.life -= dt;
    if (d.life <= 0) { removeDebris(d); continue; }
    d.mesh.position.addScaledVector(d.velocity, dt);
    d.velocity.multiplyScalar(0.985);
    d.mesh.rotation.x += d.spin.x * dt;
    d.mesh.rotation.y += d.spin.y * dt;
    d.mesh.rotation.z += d.spin.z * dt;
    d.mesh.material.opacity = Math.max(0, Math.min(1, d.life / 0.55));
  }
}

// ---- Floating combat text + feedback ---------------------------------------
const _proj = new THREE.Vector3();
function worldToScreen(pos) {
  _proj.copy(pos).project(camera);
  return { x: (_proj.x * 0.5 + 0.5) * innerWidth, y: (-_proj.y * 0.5 + 0.5) * innerHeight, behind: _proj.z > 1 };
}
function floatText(worldPos, text, cls = '') {
  if (!floatLayer) return;
  const p = worldToScreen(worldPos);
  if (p.behind) return;
  const el = document.createElement('div');
  el.className = `float-pop ${cls}`.trim();
  el.textContent = text;
  el.style.left = `${p.x.toFixed(1)}px`;
  el.style.top = `${p.y.toFixed(1)}px`;
  floatLayer.appendChild(el);
  if (floatLayer.childElementCount > 26) floatLayer.firstElementChild?.remove();
  el.addEventListener('animationend', () => el.remove(), { once: true });
}
function flashDamage() {
  if (!damageVignette) return;
  damageVignette.classList.remove('active');
  void damageVignette.offsetWidth;
  damageVignette.classList.add('active');
}
function addShake(v) { shake = Math.min(1.2, shake + v); }
function popStat(el) {
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}
function spawnTrail(pos, color) {
  if (particles.length > 230) return;
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const bit = new THREE.Mesh(shardGeometry, material);
  bit.scale.setScalar(0.018 + Math.random() * 0.03);
  bit.position.copy(pos);
  scene.add(bit);
  particles.push({
    mesh: bit,
    velocity: new THREE.Vector3((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9),
    life: 0.24 + Math.random() * 0.16, maxLife: 0.4,
  });
}

// ---- Shooting ---------------------------------------------------------------
function triggerRecoil() {
  if (reticle) {
    reticle.classList.remove('recoil');
    void reticle.offsetWidth;
    reticle.classList.add('recoil');
  }
  if (weaponBody) {
    weaponBody.classList.remove('recoil');
    void weaponBody.offsetWidth;
    weaponBody.classList.add('recoil');
  }
}
function fire() {
  if (!running || paused || (phase !== 'sector' && phase !== 'boss') || fireCooldown > 0) return; // only fire during active play
  if (ammo <= 0) { showToast('ENERGY DEPLETED'); return; }
  ammo--; fireCooldown = 0.22; updateHud();
  triggerRecoil();
  pointerBurst(pointerScreenX, pointerScreenY, (LEVELS[activeLevel - 1] || LEVELS[0]).accent, 7);
  raycaster.setFromCamera(pointer, camera);
  const direction = raycaster.ray.direction.clone().normalize();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), new THREE.MeshBasicMaterial({ color: 0xd9ffff }));
  orb.position.copy(camera.position).add(direction.clone().multiplyScalar(0.7)); scene.add(orb);
  attachGlow(orb, 0x47f5ff, 0.85, 0.85);
  const glow = new THREE.PointLight(0x47f5ff, 2, 3); orb.add(glow);
  projectiles.push({ mesh: orb, velocity: direction.multiplyScalar(48), life: 1.5, prev: orb.position.clone() });
}

// ---- Game over --------------------------------------------------------------
function endGame(won = false) {
  if (!running) return; // first outcome of a frame wins; a loss can never be overwritten by a win
  running = false; phase = won ? 'won' : 'lost';
  paused = false;
  root.classList.remove('paused', 'in-mission');
  pauseMenu?.classList.add('is-hidden');
  pauseMenu?.setAttribute('aria-hidden', 'true');
  pauseButton?.classList.add('is-hidden');
  sectorHud.classList.add('is-hidden'); bossHud.classList.add('is-hidden');
  combatHud.classList.add('is-hidden');
  nebulaWave?.classList.remove('active');
  restoreNebulaTint();
  hideBanner();
  if (won) {
    // Celebrate on the galaxy map: burst + permanently draw the constellation.
    overlay.classList.add('hidden');
    galaxyMap.show({ victoryLevel: activeLevel - 1, score });
    return;
  }
  overlay.classList.remove('hidden');
  overlayTitle.innerHTML = 'SIGNAL<br><em>LOST</em>';
  overlayCopy.textContent = `Your run ended with ${score} points. Reinitialize and push deeper into the rift.`;
  startButton.innerHTML = 'PLAY AGAIN <span>↗</span>';
  mapButton.classList.remove('is-hidden');
}

// ---- Disposal ---------------------------------------------------------------
function disposeMeshTree(rootObj) {
  rootObj.traverse((child) => {
    if (child.isSprite) { child.material?.dispose(); return; } // sprite geometry is shared; never dispose it
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material.dispose();
    }
  });
}
function removeTarget(target) {
  targetGroup.remove(target);
  disposeMeshTree(target);
  const idx = targets.indexOf(target);
  if (idx !== -1) targets.splice(idx, 1);
}
function removeProjectile(item) {
  scene.remove(item.mesh);
  disposeMeshTree(item.mesh);
  const idx = projectiles.indexOf(item);
  if (idx !== -1) projectiles.splice(idx, 1);
}
function removeParticle(item) {
  scene.remove(item.mesh);
  item.mesh.material.dispose(); // geometry is shared; only per-shard material is disposed
  const idx = particles.indexOf(item);
  if (idx !== -1) particles.splice(idx, 1);
}
function removeDebris(item) {
  scene.remove(item.mesh);
  item.mesh.material.dispose(); // shared chunk geometry is intentionally not disposed
  const idx = debris.indexOf(item);
  if (idx !== -1) debris.splice(idx, 1);
}
function removeFlash(item) {
  scene.remove(item.sprite);
  item.sprite.material.dispose();
  const idx = flashes.indexOf(item);
  if (idx !== -1) flashes.splice(idx, 1);
}
function removeBolt(item) {
  bossGroup.remove(item.mesh);
  disposeMeshTree(item.mesh);
  const idx = bossBolts.indexOf(item);
  if (idx !== -1) bossBolts.splice(idx, 1);
}
function removePulse(item) {
  bossGroup.remove(item.mesh);
  disposeMeshTree(item.mesh);
  const idx = bossPulses.indexOf(item);
  if (idx !== -1) bossPulses.splice(idx, 1);
}
// Clears every transient entity (targets, projectiles, particles, bolts, pulses) so
// nothing carries across a sector transition or restart.
function clearAllEntities() {
  for (const t of [...targets]) removeTarget(t);
  for (const p of [...projectiles]) removeProjectile(p);
  for (const p of [...particles]) removeParticle(p);
  for (const f of [...flashes]) removeFlash(f);
  for (const d of [...debris]) removeDebris(d);
  for (const b of [...bossBolts]) removeBolt(b);
  for (const p of [...bossPulses]) removePulse(p);
  targets.length = 0; projectiles.length = 0; particles.length = 0; flashes.length = 0; debris.length = 0; bossBolts.length = 0; bossPulses.length = 0;
}

// ---- Sector flow ------------------------------------------------------------
function applySectorVisuals(sec) {
  scene.fog.density = sec.fogDensity;
  cyanLight.intensity = sec.cyanI; pinkLight.intensity = sec.pinkI; hemiLight.intensity = sec.hemiI;
  currentRingSpeed = sec.ringSpeed;
  const secondary = [0x6b4dff, 0xff3fb8, 0xff7a2e, 0xc21bff, 0xff7a2e][activeLevel - 1] || 0x6b4dff;
  plasmaUniforms.uColorA.value.copy(sec.accent);
  plasmaUniforms.uColorB.value.set(secondary);
  root.style.setProperty('--reticle-accent', `#${sec.accent.getHexString()}`);
  root.style.setProperty('--level-accent', `#${sec.accent.getHexString()}`);
  // Tint the alternating hoops toward the sector accent for a stronger colour identity.
  for (let i = 0; i < rings.length; i++) {
    rings[i].material.color.copy(i % 2 ? sec.accent : new THREE.Color(secondary));
  }
}
function applyResupply(sec) {
  if (!sec.resupply) return;
  const a = sec.resupply.ammo, h = sec.resupply.hull;
  if (a) ammo += a;
  if (h) hull = Math.min(100, hull + h);
  updateHud();
  showBanner('RESUPPLY', `+${a} ORBS · +${h}% HULL`, 1.8);
}
function startSector(index) {
  sectorIndex = index; sectorElapsed = 0; objectiveCount = 0;
  stability = 0; stabilityMilestone = 0;
  const sec = SECTORS[index];
  const mod = levelMod();
  currentSpeedMul = sec.speedMul * (mod.speedMul || 1);
  currentMaxTargets = sec.maxTargets + (mod.extraTargets || 0);
  applySectorVisuals(sec);
  clearAllEntities();
  applyResupply(sec);
  sectorHud.classList.remove('is-hidden');
  updateSectorHud();
  phase = 'sector';
  spawnTimer = sec.spawnInterval * (mod.spawnMul || 1);
  showToast(sec.title);
}

// ---- Final boss -------------------------------------------------------------
const BOSS_Z = -26;
const boss = {
  group: null, core: null, eye: null, shield: null, nodesPivot: null, nodes: [],
  nodesLeft: 3, health: 100, maxHealth: 100, coreRadius: 1.9, phase: 'shielded',
  boltTimer: 3.5, pulseTimer: 2.4, eyeFlash: 0, active: false,
};
function createBoss() {
  boss.group = new THREE.Group();
  boss.group.position.set(0, 0, BOSS_Z - 40);
  boss.group.scale.setScalar(0.2);
  boss.nodes = []; boss.nodesLeft = 3; boss.health = boss.maxHealth; boss.phase = 'shielded';
  boss.boltTimer = 3.2; boss.pulseTimer = 2.2; boss.eyeFlash = 0; boss.active = true;

  // Core body (the weak point once the shield drops).
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x7a1c5a, emissive: 0xff2f9e, emissiveIntensity: 1.3, metalness: 0.5, roughness: 0.25, flatShading: true });
  boss.core = new THREE.Mesh(new THREE.IcosahedronGeometry(boss.coreRadius, 2), coreMat);
  boss.group.add(boss.core);
  // Bright pulsing eye = visible weak point.
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd6f2 });
  boss.eye = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), eyeMat);
  boss.group.add(boss.eye);
  const eyeLight = new THREE.PointLight(0xff54b0, 30, 40); boss.group.add(eyeLight); boss.eyeLight = eyeLight;

  // Shield shell (removed when all nodes are destroyed).
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0x64f6ff, wireframe: true, transparent: true, opacity: 0.32 });
  boss.shield = new THREE.Mesh(new THREE.IcosahedronGeometry(3.0, 3), shieldMat);
  boss.group.add(boss.shield);

  // Three energy nodes orbiting the core — shoot all three to drop the shield.
  boss.nodesPivot = new THREE.Group(); boss.group.add(boss.nodesPivot);
  const nodeColors = [0x64f6ff, 0xffd24a, 0xb06bff];
  for (let i = 0; i < 3; i++) {
    const ang = Math.PI / 2 + i * (Math.PI * 2 / 3);
    const nodeMat = new THREE.MeshStandardMaterial({ color: nodeColors[i], emissive: nodeColors[i], emissiveIntensity: 2.2, metalness: 0.3, roughness: 0.2, flatShading: true });
    const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.44, 0), nodeMat);
    node.position.set(Math.cos(ang) * 3.0, Math.sin(ang) * 3.0, 0);
    node.scale.set(1, 1.5, 1);
    const nGlow = new THREE.Mesh(new THREE.OctahedronGeometry(0.66, 0), new THREE.MeshBasicMaterial({ color: nodeColors[i], wireframe: true, transparent: true, opacity: 0.4 }));
    node.add(nGlow);
    node.userData = { alive: true, radius: 0.5, color: new THREE.Color(nodeColors[i]) };
    boss.nodesPivot.add(node); boss.nodes.push(node);
  }
  bossGroup.add(boss.group);
  bossHud.classList.remove('is-hidden');
  updateBossHud();
}
function updateBossHud() {
  if (!boss.active) return;
  const pct = Math.max(0, boss.health / boss.maxHealth) * 100;
  bossBarFill.style.width = `${pct}%`;
  if (boss.phase === 'shielded') bossStatusEl.textContent = `SHIELD ACTIVE — ${boss.nodesLeft} / 3 NODES`;
  else if (boss.phase === 'exposed') bossStatusEl.textContent = `EXPOSED — CORE INTEGRITY ${Math.ceil(pct)}%`;
  else bossStatusEl.textContent = 'CORE COLLAPSING';
}
function startBossIntro() {
  phase = 'bossintro';
  createBoss();
  showBanner('SECTOR 03 — THE CORE', 'RIFT CORE INBOUND', 2.4);
  transitionTimer = 2.9; // entrance duration
}
function destroyNode(node) {
  if (!node.userData.alive) return;
  node.userData.alive = false;
  const wp = new THREE.Vector3(); node.getWorldPosition(wp);
  burst(wp, node.userData.color, 20);
  boss.nodesPivot.remove(node); disposeMeshTree(node);
  boss.nodesLeft--; ammo += 1; score += pointsFor(150); addCharge(12); updateHud(); updateBossHud();
  showToast('SHIELD NODE DOWN');
  if (boss.nodesLeft <= 0) {
    boss.phase = 'exposed';
    if (boss.shield) { bossGroup.remove(boss.shield); disposeMeshTree(boss.shield); boss.shield = null; }
    showBanner('SHIELD DOWN', 'STRIKE THE CORE', 2.0);
    boss.boltTimer = 1.6;
  }
}
function damageCore() {
  boss.health -= 14; ammo += 1; score += pointsFor(75); boss.eyeFlash = 1; addCharge(8); updateHud(); updateBossHud();
  showToast('CORE HIT  -14 INTEGRITY');
  if (boss.health <= 0) bossDefeat();
}
function launchBolt() {
  boss.eyeFlash = 1; // telegraph flash
  const mat = new THREE.MeshStandardMaterial({ color: 0xffb02b, emissive: 0xff7a1a, emissiveIntensity: 2.4, metalness: 0.3, roughness: 0.25, flatShading: true });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat);
  mesh.position.copy(boss.group.position);
  const g = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), new THREE.MeshBasicMaterial({ color: 0xffd48a, wireframe: true, transparent: true, opacity: 0.4 }));
  mesh.add(g);
  bossGroup.add(mesh);
  const dir = new THREE.Vector3().subVectors(camera.position, boss.group.position).normalize();
  bossBolts.push({ mesh, velocity: dir.multiplyScalar(11), prev: mesh.position.clone(), radius: 0.5, color: new THREE.Color(0xffb02b) });
  boss.boltTimer = 3.4;
}
function spawnPulseFx() {
  const mat = new THREE.MeshBasicMaterial({ color: 0xff5cc0, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.08, 6, 48), mat);
  mesh.position.copy(boss.group.position);
  bossGroup.add(mesh);
  bossPulses.push({ mesh, life: 1.1, maxLife: 1.1 });
}
function bossDefeat() {
  boss.phase = 'dying'; victoryPending = true; victoryTimer = 1.9;
  showBanner('CORE DESTROYED', 'RIFT STABILIZED', 2.2);
  const p = boss.group.position;
  for (let i = 0; i < 5; i++) {
    const off = new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    burst(p.clone().add(off), i % 2 ? 0xffd24a : 0xff3ea0, 24);
  }
  updateBossHud();
}
function removeBoss() {
  if (boss.group) { bossGroup.remove(boss.group); disposeMeshTree(boss.group); }
  boss.group = null; boss.core = null; boss.eye = null; boss.shield = null; boss.nodesPivot = null; boss.nodes = [];
  boss.active = false;
  bossHud.classList.add('is-hidden');
}
function updateBoss(dt) {
  if (!boss.group) return;
  if (phase === 'bossintro') {
    transitionTimer -= dt;
    const k = Math.min(1, (2.9 - transitionTimer) / 2.9);
    boss.group.position.z = THREE.MathUtils.lerp(BOSS_Z - 40, BOSS_Z, k);
    boss.group.scale.setScalar(THREE.MathUtils.lerp(0.2, 1, k));
    boss.group.rotation.y += dt * 0.4;
    if (transitionTimer <= 0) { phase = 'boss'; showBanner('SHIELD ONLINE', 'DESTROY THE 3 NODES', 2.0); updateBossHud(); }
    return;
  }
  // Core + eye animation
  boss.core.rotation.y += dt * 0.35; boss.core.rotation.x += dt * 0.15;
  boss.eye.rotation.y -= dt * 0.8;
  boss.eyeFlash = Math.max(0, boss.eyeFlash - dt * 2.5);
  const eyePulse = 1 + Math.sin(elapsed * 4) * 0.12 + boss.eyeFlash * 0.5;
  boss.eye.scale.setScalar(eyePulse);
  boss.eye.material.color.setRGB(1, 0.84 + boss.eyeFlash * 0.16, 0.95);
  if (boss.shield) { boss.shield.rotation.y += dt * 0.25; boss.shield.material.opacity = 0.24 + Math.sin(elapsed * 3) * 0.1; }
  if (boss.nodesPivot && boss.phase === 'shielded') boss.nodesPivot.rotation.z += dt * 0.5;

  if (boss.phase === 'dying') {
    victoryTimer -= dt;
    boss.group.scale.multiplyScalar(1 - dt * 0.9);
    boss.group.rotation.z += dt * 3;
    if (Math.random() < 0.4) burst(boss.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0)), Math.random() > 0.5 ? 0xffd24a : 0xff3ea0, 6);
    if (victoryTimer <= 0) endGame(true);
    return;
  }
  if (boss.phase !== 'exposed') return; // no attacks while shielded — focus on nodes

  // Incoming bolts (telegraphed via eye flash) — the player must shoot them.
  boss.boltTimer -= dt;
  if (boss.boltTimer <= 0) launchBolt();
  // Decorative expanding pulse rings for drama.
  boss.pulseTimer -= dt;
  if (boss.pulseTimer <= 0) { spawnPulseFx(); boss.pulseTimer = 2.6; }
}

// ---- Pause / menu -----------------------------------------------------------
function refreshPauseMenu() {
  const lvl = LEVELS[activeLevel - 1] || LEVELS[0];
  if (pauseLevelEl) pauseLevelEl.textContent = `${lvl.tag} · ${lvl.name}`;
  if (pauseScoreEl) pauseScoreEl.textContent = String(Math.round(score)).padStart(4, '0');
  if (pauseStabilityEl) pauseStabilityEl.textContent = `${Math.round(stability)}%`;
}
function openPause() {
  if (!running || paused || victoryPending) return;
  paused = true;
  refreshPauseMenu();
  pauseMenu?.classList.remove('is-hidden');
  pauseMenu?.setAttribute('aria-hidden', 'false');
  root.classList.add('paused');
  pauseButton?.setAttribute('aria-label', 'Resume game');
  pauseButton?.classList.add('is-paused');
}
function closePause() {
  paused = false;
  pauseMenu?.classList.add('is-hidden');
  pauseMenu?.setAttribute('aria-hidden', 'true');
  root.classList.remove('paused');
  pauseButton?.setAttribute('aria-label', 'Pause game');
  pauseButton?.classList.remove('is-paused');
}
function togglePause() {
  if (paused) closePause(); else openPause();
}
function restartSector() {
  if (!running) return;
  closePause();
  startRun();
  showToast('SECTOR RESTARTED');
}
function returnToGalaxyMap() {
  closePause();
  running = false;
  phase = 'menu';
  victoryPending = false;
  root.classList.remove('in-mission');
  clearAllEntities();
  removeBoss();
  sectorHud.classList.add('is-hidden');
  bossHud.classList.add('is-hidden');
  combatHud.classList.add('is-hidden');
  pauseButton?.classList.add('is-hidden');
  nebulaWave?.classList.remove('active');
  restoreNebulaTint();
  hideBanner();
  overlay.classList.add('hidden');
  mapButton.classList.add('is-hidden');
  galaxyMap.show({ selectLevel: activeLevel - 1 });
}

// ---- Input ------------------------------------------------------------------
function updatePointerPosition(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  pointerScreenX = event.clientX;
  pointerScreenY = event.clientY;
  crosshair.style.left = `${event.clientX}px`;
  crosshair.style.top = `${event.clientY}px`;
}
startButton.addEventListener('click', startRun);
renderer.domElement.addEventListener('pointermove', (event) => {
  updatePointerPosition(event);
  if (running && !paused) pushPointerTrail(event.clientX, event.clientY);
});
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 && event.pointerType !== 'touch') return;
  event.preventDefault();
  updatePointerPosition(event);
  if (!running || paused) return;
  pushPointerTrail(event.clientX, event.clientY);
  fire();
});
pauseButton?.addEventListener('click', togglePause);
pauseResumeBtn?.addEventListener('click', closePause);
pauseRestartBtn?.addEventListener('click', restartSector);
pauseMapBtn?.addEventListener('click', returnToGalaxyMap);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' || event.key === 'Escape') {
    if (running) { event.preventDefault(); togglePause(); }
  }
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  resizePointerFx();
});

// ---- Collision helpers ------------------------------------------------------
function closestPointOnSegment(a, b, p) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = len2 > 0 ? ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return new THREE.Vector3(a.x + abx * t, a.y + aby * t, a.z + abz * t);
}
function segmentHitsSphere(a, b, center, radius) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = len2 > 0 ? ((center.x - a.x) * abx + (center.y - a.y) * aby + (center.z - a.z) * abz) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = a.x + abx * t - center.x, dy = a.y + aby * t - center.y, dz = a.z + abz * t - center.z;
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}
const _tmpVec = new THREE.Vector3();
// Swept hit test of a projectile against the boss (nodes while shielded, core when exposed).
function tryHitBoss(p) {
  if (!boss.active || !boss.group || phase !== 'boss') return false;
  boss.group.updateMatrixWorld(true); // ensure node/core world positions are current for the swept test
  if (boss.phase === 'shielded') {
    for (const node of boss.nodes) {
      if (!node.userData.alive) continue;
      node.getWorldPosition(_tmpVec);
      if (segmentHitsSphere(p.prev, p.mesh.position, _tmpVec, node.userData.radius + 0.18)) { destroyNode(node); return true; }
    }
  } else if (boss.phase === 'exposed') {
    boss.core.getWorldPosition(_tmpVec);
    if (segmentHitsSphere(p.prev, p.mesh.position, _tmpVec, boss.coreRadius + 0.18)) { damageCore(); return true; }
  }
  return false;
}

// ---- Level 4 nebula pulse ---------------------------------------------------
const NEBULA_TINTS = [0xff3fb8, 0x2af6ff, 0xa06bff, 0x4dff9e, 0xffc23d].map((c) => new THREE.Color(c));
function triggerNebulaPulse() {
  if (nebulaFlash > 0) return;
  nebulaFlash = levelMod().pulseDuration || 1.55;
  const tint = NEBULA_TINTS[nebulaPulseCount++ % NEBULA_TINTS.length];
  for (const target of targets) {
    if (target.userData.type === 'powerup') continue;
    for (const t of target.userData.tintables || []) t.mat.color.copy(t.base).lerp(tint, 0.72);
  }
  if (nebulaWave) {
    nebulaWave.classList.remove('active');
    void nebulaWave.offsetWidth;
    nebulaWave.classList.add('active');
  }
  showToast('NEBULA PULSE · SPECTRUM SHIFT');
  addShake(0.1);
}
function restoreNebulaTint() {
  for (const target of targets) {
    for (const t of target.userData.tintables || []) t.mat.color.copy(t.base);
  }
}
function pointsFor(base) { return base * (multiplierTimer > 0 ? 2 : 1); }

// ---- Main loop --------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  elapsed += dt;
  if (!paused) {
    fireCooldown = Math.max(0, fireCooldown - dt);
    if (toastTimer > 0) { toastTimer -= dt; toast.style.opacity = String(Math.max(0, toastTimer * 2)); }
    if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) hideBanner(); }
  }
  const moving = running && !paused;
  skyUniforms.uTime.value = elapsed;
  plasmaUniforms.uTime.value = elapsed;
  nebulaSprites.forEach((s) => {
    const ud = s.userData;
    const tx = ud.baseX + Math.sin(elapsed * 0.035 + ud.phase) * 3.1 - pointer.x * 0.34;
    const ty = ud.baseY + Math.cos(elapsed * 0.028 + ud.phase * 1.3) * 2.2 - pointer.y * 0.26;
    s.position.x += (tx - s.position.x) * Math.min(1, dt * 0.55);
    s.position.y += (ty - s.position.y) * Math.min(1, dt * 0.55);
    s.position.z += (moving ? 0.9 : 0.18) * dt;
    if (s.position.z > 10) s.position.z = ud.baseZ;
    const breathe = 1 + Math.sin(elapsed * 0.13 + ud.phase) * 0.06;
    s.scale.set(ud.baseScale * breathe, ud.baseScale * breathe, 1);
    s.material.opacity = ud.baseOpacity * (0.82 + 0.18 * Math.sin(elapsed * 0.22 + ud.phase));
    s.material.rotation += dt * 0.012;
  });
  starLayers.forEach((layer) => {
    const { speed, parallax, depth } = layer.userData;
    const attr = layer.geometry.attributes.position;
    const step = (moving ? speed : speed * 0.14) * dt;
    for (let i = 2; i < attr.array.length; i += 3) {
      attr.array[i] += step;
      if (attr.array[i] > 8) attr.array[i] -= depth;
    }
    attr.needsUpdate = true;
    const px = -pointer.x * parallax;
    const py = -pointer.y * parallax;
    layer.position.x += (px - layer.position.x) * Math.min(1, dt * 1.8);
    layer.position.y += (py - layer.position.y) * Math.min(1, dt * 1.8);
  });
  dustLayers.forEach((layer) => {
    const { speed, depth, parallax } = layer.userData;
    const attr = layer.geometry.attributes.position;
    const step = (moving ? speed : speed * 0.22) * dt;
    for (let i = 2; i < attr.array.length; i += 3) {
      attr.array[i] += step;
      if (attr.array[i] > 8) attr.array[i] -= depth;
    }
    attr.needsUpdate = true;
    layer.position.x += ((-pointer.x * parallax * 6) - layer.position.x) * Math.min(1, dt * 1.2);
    layer.position.y += ((-pointer.y * parallax * 4) - layer.position.y) * Math.min(1, dt * 1.2);
  });
  planets.forEach((planet, i) => {
    const ud = planet.userData;
    planet.position.x = ud.baseX + Math.sin(elapsed * 0.02 + ud.phase) * 1.4 - pointer.x * 1.8;
    planet.position.y = ud.baseY + Math.cos(elapsed * 0.017 + ud.phase) * 1.0 - pointer.y * 1.2;
    planet.rotation.y += dt * (0.012 + i * 0.003);
    ud.uniforms.uTime.value = elapsed;
    if (ud.moon) {
      const orbit = elapsed * 0.11 + ud.phase;
      ud.moon.position.set(Math.cos(orbit) * ud.radius * 1.75, ud.radius * 0.3 + Math.sin(orbit * 1.3) * ud.radius * 0.18, Math.sin(orbit) * ud.radius * 1.1);
    }
    if (ud.ring) ud.ring.rotation.z += dt * 0.01;
  });
  fighters.forEach((fighter) => {
    const ud = fighter.userData;
    fighter.position.x += ud.dir * ud.speed * dt;
    if (ud.dir > 0 && fighter.position.x > 40) fighter.position.x = -40;
    if (ud.dir < 0 && fighter.position.x < -40) fighter.position.x = 40;
    fighter.position.y = ud.baseY + Math.sin(elapsed * 0.35 + ud.phase) * 1.1 - pointer.y * 0.5;
    fighter.position.z = ud.baseZ + Math.sin(elapsed * 0.18 + ud.phase) * 2.5;
    fighter.rotation.y = ud.dir > 0 ? -Math.PI / 2 + 0.5 : Math.PI / 2 - 0.5;
    fighter.rotation.z = Math.sin(elapsed * 0.6 + ud.phase) * 0.08;
    if (ud.engine) ud.engine.material.opacity = 0.62 + 0.38 * Math.sin(elapsed * 7 + ud.phase);
    if (ud.trail) ud.trail.material.opacity = 0.18 + 0.2 * (0.5 + 0.5 * Math.sin(elapsed * 9 + ud.phase));
  });
  emberLight.position.x = Math.sin(elapsed * 0.37 + 1.2) * 6;
  emberLight.intensity = 12 + Math.sin(elapsed * 1.1) * 3;
  if (weaponSway) {
    weaponSway.style.transform = `translate3d(${(pointer.x * 20).toFixed(1)}px, ${(pointer.y * 4).toFixed(1)}px, 0) rotate(${(pointer.x * 1.4).toFixed(2)}deg)`;
  }
  drawPointerFx(dt);
  if (displayScore !== score) {
    displayScore += (score - displayScore) * Math.min(1, dt * 9);
    if (Math.abs(score - displayScore) < 0.6) displayScore = score;
    updateHud();
  }
  shake = Math.max(0, shake - dt * 2.4);
  const shakeX = (Math.random() - 0.5) * shake * 0.45;
  const shakeY = (Math.random() - 0.5) * shake * 0.38;
  rings.forEach((ring, i) => { ring.position.z += (moving ? currentRingSpeed : 1.1) * dt; if (ring.position.z > 8) ring.position.z -= 99; ring.rotation.z = Math.sin(elapsed * 0.25 + i) * 0.04; });
  cyanLight.position.x = Math.sin(elapsed * 0.5) * 4;
  pinkLight.position.x = Math.cos(elapsed * 0.42) * 4;
  camX += (pointer.x * 0.55 - camX) * Math.min(1, dt * 2.5);
  camY += (pointer.y * 0.4 - camY) * Math.min(1, dt * 2.5);
  camera.position.x = camX + shakeX;
  camera.position.y = camY + shakeY;
  camera.position.z = 6;
  camera.lookAt(camX + pointer.x * 0.8 + shakeX * 0.4, camY + pointer.y * 0.6 + shakeY * 0.4, -18);

  if (running && !paused) {
    sectorElapsed += dt;
    if (stasisTimer > 0) { stasisTimer = Math.max(0, stasisTimer - dt); if (stasisTimer === 0) showToast('STASIS FIELD OFFLINE'); }
    if (multiplierTimer > 0) { multiplierTimer = Math.max(0, multiplierTimer - dt); if (multiplierTimer === 0) showToast('MULTIPLIER EXPIRED'); }
    if (activeLevel === 4 && phase !== 'transition' && phase !== 'bossintro') {
      nebulaTimer -= dt;
      if (nebulaTimer <= 0) { nebulaTimer = levelMod().pulseInterval || 8.5; triggerNebulaPulse(); }
    }
    if (nebulaFlash > 0) { nebulaFlash -= dt; if (nebulaFlash <= 0) restoreNebulaTint(); }
    updateCombatHud();
    // 1) spawn new targets — only during an active (non-boss, non-transition) sector
    if (phase === 'sector') {
      spawnTimer -= dt;
      const mod = levelMod();
      const scoring = targets.reduce((n, t) => n + (t.userData.type !== 'powerup' ? 1 : 0), 0);
      if (spawnTimer <= 0 && scoring < currentMaxTargets) {
        const type = pickType();
        // Supernova hazards are injected closer to the player; normal spawns stay deep in the tunnel.
        makeTarget(mod.key === 'chaos' && type === 'hazard' ? -39 : -53, type);
        if (mod.key === 'chaos' && Math.random() < mod.doubleSpawn) {
          for (let k = 0; k < 1 && scoring + 1 + k < currentMaxTargets; k++) {
            const extraType = pickType();
            makeTarget(extraType === 'hazard' ? -41 : -56, extraType);
          }
        }
        const baseInterval = Math.max(SECTORS[sectorIndex].spawnMin, SECTORS[sectorIndex].spawnInterval - sectorElapsed * 0.01);
        spawnTimer = baseInterval * (mod.spawnMul || 1);
      }
    }

    // 2) move + animate targets (hull-damage pass deferred until after projectile hits)
    for (let i = targets.length - 1; i >= 0; i--) {
      const target = targets[i]; const data = target.userData;
      const stasisMul = stasisTimer > 0 ? 0.5 : 1;
      target.position.z += data.speed * currentSpeedMul * stasisMul * dt;
      if (data.serpentine) {
        // Void Serpent: targets weave laterally and slowly drift across the tunnel.
        data.baseX += data.driftX * dt;
        data.baseY += data.driftY * dt;
        if (data.baseX > 3.8) { data.baseX = 3.8; data.driftX = -Math.abs(data.driftX); }
        else if (data.baseX < -3.8) { data.baseX = -3.8; data.driftX = Math.abs(data.driftX); }
        if (data.baseY > 2.9) { data.baseY = 2.9; data.driftY = -Math.abs(data.driftY); }
        else if (data.baseY < -2.9) { data.baseY = -2.9; data.driftY = Math.abs(data.driftY); }
        target.position.x = data.baseX + Math.sin(elapsed * 1.05 * data.wobbleFreq + data.wobble) * (data.wobbleAmp + 0.7);
        target.position.y = data.baseY + Math.cos(elapsed * 1.25 * data.wobbleFreq + data.wobble) * (data.wobbleAmp * 0.8 + 0.45);
      } else {
        target.position.x = data.baseX + Math.sin(elapsed * 1.25 * data.wobbleFreq + data.wobble) * data.wobbleAmp;
        target.position.y = data.baseY + Math.cos(elapsed * 1.5 * data.wobbleFreq + data.wobble) * data.wobbleAmp * 0.8;
      }
      target.rotation.x += dt * data.spinX;
      target.rotation.y += dt * data.spinY;
      target.rotation.z += dt * (data.spinZ || 0);
      if (data.glow && !data.isAsteroid) data.glow.rotation.y -= dt * data.spinY * 0.6;
      if (data.pulse && data.glow && !data.isAsteroid) data.glow.scale.setScalar(1 + Math.sin(elapsed * data.pulse) * 0.14);
      if (data.core) {
        const corePulse = 1 + Math.sin(elapsed * (data.pulse || 2.6) * 1.55 + data.wobble) * 0.18;
        data.core.scale.set(corePulse, corePulse * 1.5, corePulse);
        data.core.material.opacity = 0.62 + 0.3 * (0.5 + 0.5 * Math.sin(elapsed * 4.1 + data.wobble));
      }
      if (data.sparkles) {
        for (let s = 0; s < data.sparkles.length; s++) {
          const sparkle = data.sparkles[s];
          sparkle.material.opacity = (s === 0 ? 0.5 : 0.35) + 0.4 * (0.5 + 0.5 * Math.sin(elapsed * 5.2 + data.wobble + s * 2.1));
        }
      }
      if (data.aura) {
        const k = 1 + Math.sin(elapsed * (data.pulse || 2.4) + data.wobble) * 0.12;
        data.aura.scale.set(data.auraSize * k, data.auraSize * data.auraYFactor * k, 1);
        data.aura.material.opacity = (data.type === 'hazard' ? 0.26 : 0.38) + 0.18 * (0.5 + 0.5 * Math.sin(elapsed * (data.pulse || 2.2) + data.wobble));
      }
      if (data.warnRing) {
        data.warnRing.rotation.z += dt * 1.8;
        data.warnRing.scale.setScalar(1 + Math.sin(elapsed * 4.2 + data.wobble) * 0.18);
        data.warnRing.material.opacity = 0.22 + 0.2 * (0.5 + 0.5 * Math.sin(elapsed * 5));
      }
      if (data.life != null) {
        data.life -= dt;
        if (data.life <= 0) {
          burst(target.position, data.color, 12);
          floatText(target.position, data.type === 'powerup' ? 'POWER ORB LOST' : 'BONUS SIGNAL LOST', 'muted');
          removeTarget(target);
          continue;
        }
        if (data.life < 2.2) target.visible = Math.sin(elapsed * 34) > -0.35;
      }
    }

    // 3) move projectiles; resolve hits vs targets, boss, and incoming bolts (swept test)
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.prev.copy(p.mesh.position);
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (Math.random() < 0.85) spawnTrail(p.mesh.position, 0x47f5ff);
      p.life -= dt;
      let consumed = false;
      // targets
      for (let j = targets.length - 1; j >= 0; j--) {
        const target = targets[j];
        const data = target.userData;
        if (segmentHitsSphere(p.prev, p.mesh.position, target.position, data.size + 0.18)) {
          const impact = closestPointOnSegment(p.prev, p.mesh.position, target.position);
          const impactScreen = worldToScreen(impact);
          if (!impactScreen.behind) pointerBurst(impactScreen.x, impactScreen.y, data.color, data.type === 'hazard' ? 18 : 12);
          if (data.type === 'powerup') {
            burst(impact, data.color, 28, 10);
            removeTarget(target);
            activatePowerup(data.power);
            floatText(impact, `${data.label} ACQUIRED`, 'powerup');
            updateHud(); consumed = true; break;
          }
          const isHazard = data.type === 'hazard';
          if (isHazard) {
            shatterAsteroid(impact, data, 1.05);
            removeTarget(target);
            addCharge(4, false);
            addShake(0.34);
            tacticalFlashPulse('hazard');
            addStability('hazard');
            floatText(impact, 'ASTEROID SHATTERED', 'muted');
            showToast('ASTEROID SHATTERED  ·  STABILITY +4'); // no points, no orbs, never subtracts score
          } else {
            burst(impact, data.color, 24, 10);
            removeTarget(target);
            const gained = pointsFor(data.points);
            score += gained;
            objectiveCount++; // scoring targets count toward the sector objective
            const bonusOrbs = Math.random() < 0.35 ? 2 : 0;
            ammo += 1 + bonusOrbs;
            const chargeOrb = addCharge(data.type === 'bonus' ? 18 : data.type === 'precision' ? 12 : 8, false);
            const dropOrb = Math.random() < (activeLevel === 5 ? 0.08 : 0.06) ? spawnPowerupOrb(randomPowerup(), false, false) : null;
            const deployed = chargeOrb || dropOrb;
            addShake(0.08);
            addStability(data.type);
            floatText(impact, multiplierTimer > 0 ? `+${gained} ×2` : `+${gained}`, data.type);
            popStat(scoreEl);
            const label = data.type === 'bonus' ? 'BONUS GEM' : data.type === 'precision' ? 'PRECISION GEM' : 'COSMIC GEM';
            const orbNote = deployed ? ` · ${POWERUPS[deployed.userData.power].name} ORB` : bonusOrbs ? ' · +2 ORBS' : ' · +1 ORB';
            showToast(`${label}  +${gained}${orbNote}`);
            updateSectorHud();
          }
          updateHud(); consumed = true; break;
        }
      }
      // boss
      if (!consumed && tryHitBoss(p)) consumed = true;
      // incoming bolts
      if (!consumed) {
        for (let j = bossBolts.length - 1; j >= 0; j--) {
          const bolt = bossBolts[j];
          if (segmentHitsSphere(p.prev, p.mesh.position, bolt.mesh.position, bolt.radius + 0.18)) {
            burst(bolt.mesh.position, bolt.color, 16);
            removeBolt(bolt);
            ammo += 1; score += pointsFor(25); addCharge(4); updateHud(); showToast('BOLT NEUTRALIZED');
            consumed = true; break;
          }
        }
      }
      if (consumed || p.life <= 0) removeProjectile(p);
    }

    // 4) hull damage from targets that passed the camera (skipped once victory is pending)
    if (!victoryPending) {
      for (let i = targets.length - 1; i >= 0; i--) {
        const target = targets[i];
        const data = target.userData;
        if (target.position.z > camera.position.z - 0.3) {
          if (data.type === 'powerup') {
            burst(target.position, data.color, 10);
            removeTarget(target);
            floatText(camera.position.clone().add(new THREE.Vector3(0, 0, -2)), 'POWER ORB LOST', 'muted');
            showToast('POWER ORB LOST');
            continue;
          }
          if (data.type === 'hazard' && shieldCharges > 0) {
            shieldCharges--;
            shatterAsteroid(target.position, data, 1.2);
            removeTarget(target);
            addShake(0.35);
            tacticalFlashPulse('hazard');
            pointerBurst(pointerScreenX, pointerScreenY, '#53f7ff', 22);
            floatText(camera.position.clone().add(new THREE.Vector3(0, 0, -2)), 'SHIELD ABSORBED', 'shield');
            showToast('QUANTUM SHIELD SHATTERED ASTEROID');
            popStat(powerEls.shield);
            updateCombatHud();
            continue;
          }
          if (data.type === 'hazard') shatterAsteroid(target.position, data, 1.3);
          else burst(target.position, data.color, 8, 8);
          removeTarget(target);
          hull = Math.max(0, hull - data.hullDamage); updateHud();
          popStat(hullEl); flashDamage(); addShake(data.type === 'hazard' ? 0.95 : 0.4);
          tacticalFlashPulse(data.type === 'hazard' ? 'hazard' : 'damage');
          pointerBurst(pointerScreenX, pointerScreenY, '#ff4d5e', data.type === 'hazard' ? 26 : 12);
          floatText(camera.position.clone().add(new THREE.Vector3(0, 0, -2)), `-${data.hullDamage}% HULL`, 'damage');
          showToast(data.type === 'hazard' ? `ASTEROID IMPACT  -${data.hullDamage}%` : `HULL IMPACT  -${data.hullDamage}%`);
        }
      }
    }

    // 5) boss update + incoming bolts
    if (phase === 'bossintro' || phase === 'boss' || phase === 'dying') updateBoss(dt);
    // bolts travel toward the camera; shooting them is handled above
    for (let i = bossBolts.length - 1; i >= 0; i--) {
      const bolt = bossBolts[i];
      bolt.prev.copy(bolt.mesh.position);
      bolt.mesh.position.addScaledVector(bolt.velocity, dt);
      bolt.mesh.rotation.x += dt * 3; bolt.mesh.rotation.y += dt * 2;
      if (!victoryPending && bolt.mesh.position.z > camera.position.z - 0.3) {
        burst(bolt.mesh.position, bolt.color, 12);
        removeBolt(bolt);
        hull = Math.max(0, hull - 12); updateHud();
        popStat(hullEl); flashDamage(); addShake(0.45);
        tacticalFlashPulse('damage');
        pointerBurst(pointerScreenX, pointerScreenY, '#ff4d5e', 16);
        floatText(camera.position.clone().add(new THREE.Vector3(0, 0, -2)), '-12% HULL', 'damage');
        showToast('ENERGY BOLT HIT  -12%');
      }
    }
    // decorative pulses
    for (let i = bossPulses.length - 1; i >= 0; i--) {
      const pulse = bossPulses[i];
      pulse.life -= dt;
      const k = 1 - pulse.life / pulse.maxLife;
      pulse.mesh.scale.setScalar(1 + k * 3.2);
      pulse.mesh.material.opacity = Math.max(0, 0.5 * (1 - k));
      if (pulse.life <= 0) removePulse(pulse);
    }

    // 6) particles, asteroid debris + impact flashes
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt; p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.multiplyScalar(0.975); p.mesh.rotation.x += dt * 5; p.mesh.rotation.y += dt * 4; p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) removeParticle(p);
    }
    updateDebris(dt);
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.life -= dt;
      const k = 1 - f.life / f.maxLife;
      f.sprite.scale.setScalar(f.size * (0.65 + k * 2.1));
      f.sprite.material.opacity = Math.max(0, 0.92 * (1 - k));
      if (f.life <= 0) removeFlash(f);
    }

    // 7) mission completion + end conditions (strict priority, no conflicting win/loss)
    if (phase === 'secured') {
      victoryTimer -= dt;
      if (victoryTimer <= 0) endGame(true);
    }
    if (!victoryPending && hull <= 0) endGame(false);
    else if (!victoryPending && ammo <= 0 && projectiles.length === 0 && phase === 'sector') endGame(false);
  } else if (!paused) {
    // menu / end idle
    targets.forEach((target, i) => { target.rotation.y += dt * 0.22; target.position.y += Math.sin(elapsed + i) * dt * 0.08; });
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= dt; p.mesh.position.addScaledVector(p.velocity, dt); p.mesh.material.opacity = Math.max(0, p.life / p.maxLife); if (p.life <= 0) removeParticle(p); }
    updateDebris(dt);
    for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.life -= dt; const k = 1 - f.life / f.maxLife; f.sprite.scale.setScalar(f.size * (0.65 + k * 2.1)); f.sprite.material.opacity = Math.max(0, 0.92 * (1 - k)); if (f.life <= 0) removeFlash(f); }
  }
  renderer.render(scene, camera);
}

// Manual frame stepping for automated verification in environments where rAF is paused.
// The rAF call inside animate() is muted so stepping never starts a second loop.
function step(dt = 1 / 60) {
  const originalDelta = clock.getDelta;
  const originalRaf = window.requestAnimationFrame;
  clock.getDelta = () => dt;
  window.requestAnimationFrame = () => 0;
  try { animate(); } finally {
    clock.getDelta = originalDelta;
    window.requestAnimationFrame = originalRaf;
  }
}

// ---- Run lifecycle ----------------------------------------------------------
function startRun() {
  closePause();
  clearAllEntities();
  removeBoss();
  score = 0; ammo = 24; hull = 100; fireCooldown = 0; elapsed = 0;
  displayScore = 0; lastShownScore = -1;
  camX = 0; camY = 0; shake = 0;
  cosmicCharge = 0; shieldCharges = 0; stasisTimer = 0; multiplierTimer = 0;
  stability = 0; stabilityMilestone = 0;
  nebulaTimer = levelMod().pulseInterval || 8.5; nebulaFlash = 0; nebulaPulseCount = 0;
  victoryPending = false; victoryTimer = 0; transitionTimer = 0;
  running = true;
  root.classList.remove('map-open');
  root.classList.add('in-mission');
  overlay.classList.add('hidden');
  mapButton.classList.add('is-hidden');
  pauseButton?.classList.remove('is-hidden', 'is-paused');
  pauseButton?.setAttribute('aria-label', 'Pause game');
  hideBanner();
  nebulaWave?.classList.remove('active');
  combatHud.classList.remove('is-hidden');
  const lvl = LEVELS[activeLevel - 1] || LEVELS[0];
  const mod = levelMod();
  combatHud.dataset.level = '';
  updateCombatHud();
  updateStabilityHud();
  bottomHint.textContent = `${lvl.tag} · ${lvl.name} — CLICK / TAP TO FIRE`;
  showBanner(lvl.name, mod.label, 2.2);
  updateHud();
  startSector(activeLevel - 1); // one structured stability sector per constellation
}
updateHud();
// A few standard targets drift behind the start menu for ambience.
for (let i = 0; i < 5; i++) makeTarget(-24 - i * 12, 'standard');

// ---- Galaxy map / meta progression -----------------------------------------
const galaxyMap = initGalaxyMap({
  onLaunch: (levelId) => {
    activeLevel = Math.min(5, Math.max(1, Number.isFinite(levelId) ? Math.round(levelId) : 1));
    galaxyMap.hide();
    startRun();
  },
});
mapButton.addEventListener('click', () => {
  overlay.classList.add('hidden');
  mapButton.classList.add('is-hidden');
  galaxyMap.show({ selectLevel: activeLevel - 1 });
});

// Debug/verification hook (harmless; exposes state for automated tests).
window.__NEON_RIFT__ = {
  THREE, camera, scene, renderer, targetGroup, bossGroup, targets, projectiles, particles, flashes, debris, bossBolts,
  planets, fighters, dustLayers, makeTarget, makePowerupOrb, spawnPowerupOrb, activatePowerup, addCharge, pointsFor, fire, updateHud, updateCombatHud, endGame, startRun, startSector, secureSector, addStability, updateStabilityHud, openPause, closePause, togglePause, restartSector, returnToGalaxyMap, shatterAsteroid, SECTORS, TARGET_TYPES, LEVELS, LEVEL_MODIFIERS, POWERUPS, pickType, boss, galaxyMap, triggerNebulaPulse, pointerBurst, step,
  get score() { return score; }, set score(v) { score = v; },
  get ammo() { return ammo; }, set ammo(v) { ammo = v; },
  get hull() { return hull; }, set hull(v) { hull = v; },
  get activeLevel() { return activeLevel; }, set activeLevel(v) { activeLevel = Math.min(5, Math.max(1, Math.round(v))); updateCombatHud(); },
  get stability() { return stability; }, set stability(v) { stability = Math.max(0, Math.min(STABILITY_MAX, v)); updateStabilityHud(); },
  get paused() { return paused; },
  get cosmicCharge() { return cosmicCharge; }, set cosmicCharge(v) { cosmicCharge = Math.max(0, Math.min(100, v)); updateCombatHud(); },
  get shieldCharges() { return shieldCharges; }, set shieldCharges(v) { shieldCharges = Math.max(0, Math.min(3, v | 0)); updateCombatHud(); },
  get stasisTimer() { return stasisTimer; }, set stasisTimer(v) { stasisTimer = Math.max(0, v); updateCombatHud(); },
  get multiplierTimer() { return multiplierTimer; }, set multiplierTimer(v) { multiplierTimer = Math.max(0, v); updateCombatHud(); },
  get nebulaTimer() { return nebulaTimer; }, set nebulaTimer(v) { nebulaTimer = Math.max(0, v); },
  get nebulaFlash() { return nebulaFlash; },
  get running() { return running; },
  get phase() { return phase; },
  get sectorIndex() { return sectorIndex; },
  get objectiveCount() { return objectiveCount; }, set objectiveCount(v) { objectiveCount = v; },
  get victoryPending() { return victoryPending; },
};

// Boot into the animated galaxy map instead of a bare start overlay.
overlay.classList.add('hidden');
mapButton.classList.add('is-hidden');
galaxyMap.show();

animate();
