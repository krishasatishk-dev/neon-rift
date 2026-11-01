// Interactive animated galaxy map: nebula backdrop + 5 constellation levels.
const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 1200;
const VIEW_H = 700;
const STORAGE_KEY = 'neon-rift-galaxy-v1';

export const LEVELS = [
  {
    id: 0, name: 'THE NEON PRISM', tag: 'LEVEL 01', motif: 'NEON TEAL / ELECTRIC INDIGO',
    desc: 'A lattice of living light. Break the teal facets and let the prism sing.',
    accent: '#22f5e6', colors: ['#22f5e6', '#3d6bff', '#9dfbff'],
    cx: 150, cy: 318, scale: 56,
    points: [[-1.05, 0.62], [0.66, 0.62], [-0.18, -0.72], [-0.42, -0.02], [1.28, -0.02], [0.42, -1.36]],
    lines: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]],
  },
  {
    id: 1, name: 'THE VOID SERPENT', tag: 'LEVEL 02', motif: 'COSMIC VIOLET / DEEP INDIGO',
    desc: 'It coils through dead space, patient and silent. Follow the violet scales before they vanish.',
    accent: '#a06bff', colors: ['#a06bff', '#4a1fd6', '#d9a0ff'],
    cx: 385, cy: 292, scale: 50,
    points: [[-1.95, 0.6], [-1.28, 0.98], [-0.55, 0.72], [0.02, 0.06], [0.62, -0.48], [1.28, -0.55], [1.72, -0.02], [2.06, -0.34], [2.06, 0.28], [1.5, -0.32]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [6, 8]],
  },
  {
    id: 2, name: 'SOLAR CROWN', tag: 'LEVEL 03', motif: 'STELLAR ORANGE / SOLAR GOLD',
    desc: 'A crown forged in a dying star. Its amber spikes still burn with borrowed daylight.',
    accent: '#ff9d2e', colors: ['#ff9d2e', '#ff5e1f', '#ffd98a'],
    cx: 615, cy: 330, scale: 54,
    points: [[-1.75, 0.62], [-1.18, 0.3], [-0.58, 0.08], [0, -0.02], [0.58, 0.08], [1.18, 0.3], [1.75, 0.62], [-1.34, -0.5], [-0.62, -0.86], [0, -1.12], [0.62, -0.86], [1.34, -0.5]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]],
  },
  {
    id: 3, name: 'NEBULA HEART', tag: 'LEVEL 04', motif: 'NEON MAGENTA / COSMIC PINK',
    desc: 'A heartbeat buried in gas and dust. Its pulse draws everything toward the dark.',
    accent: '#ff4fd8', colors: ['#ff4fd8', '#b81fd6', '#ff9ae6'],
    cx: 845, cy: 300, scale: 52,
    points: [[0, 1.02], [-0.72, 0.38], [-1.16, -0.18], [-1.08, -0.78], [-0.56, -1.06], [0, -0.62], [0.56, -1.06], [1.08, -0.78], [1.16, -0.18], [0.72, 0.38], [0, 0.02]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0], [10, 2], [10, 4], [10, 6], [10, 8]],
  },
  {
    id: 4, name: 'SUPERNOVA CORE', tag: 'LEVEL 05', motif: 'PRISMATIC CHAOS',
    desc: 'The final light. Every colour in the rift converges here before the long dark.',
    accent: '#9d7bff', colors: ['#22f5e6', '#ff4fd8', '#ff9d2e', '#a06bff', '#4dff9e'],
    cx: 1055, cy: 318, scale: 50,
    points: (() => {
      const pts = [[0, 0]];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const r = 1.12 + (i % 2) * 0.3 + ((i * 37) % 10) / 42;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return pts;
    })(),
    lines: (() => {
      const ls = [];
      for (let i = 1; i <= 12; i++) ls.push([0, i]);
      for (let i = 1; i <= 12; i++) ls.push([i, i === 12 ? 1 : i + 1]);
      return ls;
    })(),
  },
];

// Sequential gating: level 0 is always available; every later constellation
// unlocks only when the previous one has been cleared.
const UNLOCKED = new Set([0]);

function computeUnlocked(clearedSet) {
  const unlocked = new Set([0]);
  for (let i = 1; i < LEVELS.length; i++) {
    if (!clearedSet.has(i - 1)) break;
    unlocked.add(i);
  }
  return unlocked;
}

function loadCleared() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return new Set(Array.isArray(raw.cleared) ? raw.cleared.filter((n) => Number.isInteger(n) && n >= 0 && n < LEVELS.length) : []);
  } catch {
    return new Set();
  }
}
function saveCleared(set) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ cleared: [...set] })); } catch { /* storage unavailable */ }
}

function makeBlob(r, g, b, size = 512) {
  const off = document.createElement('canvas');
  off.width = off.height = size;
  const ctx = off.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(0.38, `rgba(${r},${g},${b},0.22)`);
  grad.addColorStop(0.72, `rgba(${r},${g},${b},0.06)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return off;
}

function createGalaxy(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, DPR = 1, raf = 0, running = false, lastT = 0;
  let stars = [], dust = [], blobs = [], bursts = [], shooting = null, nextShoot = 2.5;

  const blobImgs = [
    makeBlob(78, 38, 220),    // deep electric indigo
    makeBlob(10, 180, 175),   // neon teal
    makeBlob(255, 92, 28),    // fiery stellar orange
    makeBlob(122, 40, 255),   // cosmic purple
    makeBlob(255, 48, 160),   // neon magenta
    makeBlob(96, 70, 255),    // ultraviolet violet
  ];

  function resize() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    stars = [];
    const counts = [120, 78, 46];
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < counts[layer]; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: 0.45 + layer * 0.55 + Math.random() * 0.65,
          sp: 0.3 + layer * 0.7 + Math.random() * 0.5,
          tw: 0.6 + Math.random() * 2.4, ph: Math.random() * 6.283,
          hue: Math.random() < 0.18 ? '255,150,80' : Math.random() < 0.3 ? '130,255,244' : Math.random() < 0.46 ? '255,130,235' : Math.random() < 0.6 ? '178,200,255' : '228,238,255',
          layer,
        });
      }
    }
    dust = [];
    for (let i = 0; i < 150; i++) {
      const c = Math.random() < 0.28 ? '120,70,255' : Math.random() < 0.5 ? '30,210,200' : Math.random() < 0.72 ? '255,120,40' : '255,80,200';
      dust.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.5 + Math.random() * 1.9, a: 0.04 + Math.random() * 0.13,
        vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, c,
      });
    }
    blobs = [
      { img: blobImgs[0], x: 0.18, y: 0.26, r: 0.5, ax: 0.05, ay: 0.031, ph: 0.4, alpha: 0.75 },
      { img: blobImgs[1], x: 0.78, y: 0.2, r: 0.46, ax: 0.038, ay: 0.046, ph: 2.1, alpha: 0.68 },
      { img: blobImgs[2], x: 0.56, y: 0.62, r: 0.52, ax: 0.045, ay: 0.027, ph: 4.3, alpha: 0.56 },
      { img: blobImgs[3], x: 0.28, y: 0.76, r: 0.42, ax: 0.034, ay: 0.041, ph: 1.2, alpha: 0.6 },
      { img: blobImgs[4], x: 0.9, y: 0.7, r: 0.38, ax: 0.05, ay: 0.035, ph: 3.4, alpha: 0.5 },
      { img: blobImgs[5], x: 0.08, y: 0.5, r: 0.4, ax: 0.028, ay: 0.05, ph: 5.2, alpha: 0.55 },
    ];
  }

  function frame(t) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const now = t || performance.now();
    const dt = Math.min((now - lastT) / 1000 || 0.016, 0.05);
    lastT = now;
    const time = now / 1000;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
    bg.addColorStop(0, '#1a0b45');
    bg.addColorStop(0.5, '#0a0824');
    bg.addColorStop(1, '#04030f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const bx = (b.x + Math.sin(time * b.ax + b.ph) * 0.04) * W;
      const by = (b.y + Math.cos(time * b.ay + b.ph) * 0.035) * H;
      const r = b.r * Math.max(W, H);
      ctx.globalAlpha = b.alpha * (0.72 + 0.28 * Math.sin(time * 0.25 + b.ph));
      ctx.drawImage(b.img, bx - r, by - r, r * 2, r * 2);
    }

    for (const d of dust) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < -6) d.x = W + 6; if (d.x > W + 6) d.x = -6;
      if (d.y < -6) d.y = H + 6; if (d.y > H + 6) d.y = -6;
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(${d.c},${d.a})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
    }

    ctx.globalAlpha = 1;
    for (const s of stars) {
      s.y += s.sp * dt * 7;
      if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; }
      const a = (0.32 + 0.68 * (0.5 + 0.5 * Math.sin(time * s.tw + s.ph))) * (0.4 + s.layer * 0.26);
      ctx.fillStyle = `rgba(${s.hue},${a.toFixed(3)})`;
      if (s.r < 1.15) ctx.fillRect(s.x, s.y, s.r * 2, s.r * 2);
      else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
    }

    nextShoot -= dt;
    if (nextShoot <= 0 && !shooting) {
      shooting = { x: W * (0.15 + Math.random() * 0.7), y: Math.random() * H * 0.45, vx: -(180 + Math.random() * 170), vy: 90 + Math.random() * 80, life: 1.1, max: 1.1 };
      nextShoot = 4 + Math.random() * 6;
    }
    if (shooting) {
      shooting.x += shooting.vx * dt; shooting.y += shooting.vy * dt; shooting.life -= dt;
      const a = Math.max(0, shooting.life / shooting.max);
      ctx.strokeStyle = `rgba(205,240,255,${(a * 0.85).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(shooting.x, shooting.y);
      ctx.lineTo(shooting.x - shooting.vx * 0.16, shooting.y - shooting.vy * 0.16);
      ctx.stroke();
      if (shooting.life <= 0) shooting = null;
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life -= dt;
      for (const p of b.parts) {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.986; p.vy = p.vy * 0.986 + 14 * dt;
        if (p.life > 0) {
          const a = Math.max(0, p.life / p.max);
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.9), 0, 6.283); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (b.life <= 0) bursts.splice(i, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  return {
    resize,
    start() {
      if (running) return;
      resize();
      running = true;
      lastT = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    burst(x, y, colors) {
      const parts = [];
      for (let i = 0; i < 64; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 40 + Math.random() * 220;
        const max = 0.7 + Math.random() * 0.9;
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: max, max, size: 1.2 + Math.random() * 2.6,
          color: colors[i % colors.length],
        });
      }
      bursts.push({ life: 1.7, parts });
    },
  };
}

function svgEl(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node;
}

export function initGalaxyMap({ onLaunch }) {
  const root = document.querySelector('#game-root');
  const mapEl = document.querySelector('#galaxy-map');
  const svg = document.querySelector('#constellation-svg');
  const canvas = document.querySelector('#galaxy-canvas');
  const progressEl = document.querySelector('#map-progress-count');
  const tagEl = document.querySelector('#map-level-tag');
  const nameEl = document.querySelector('#map-level-name');
  const motifEl = document.querySelector('#map-level-motif');
  const descEl = document.querySelector('#map-level-desc');
  const statusEl = document.querySelector('#map-status');
  const launchBtn = document.querySelector('#map-launch');
  const resultEl = document.querySelector('#map-result');
  const resultTitle = document.querySelector('#map-result-title');
  const resultScore = document.querySelector('#map-result-score');
  const warpCanvas = document.querySelector('#warp-canvas');

  const galaxy = createGalaxy(canvas);
  const cleared = loadCleared();
  let selected = 0;
  let open = false;
  let built = false;
  let warping = false;
  let glitchTimer = 0;

  const groups = new Map();

  function refreshUnlocked() {
    const next = computeUnlocked(cleared);
    UNLOCKED.clear();
    for (const id of next) UNLOCKED.add(id);
  }
  refreshUnlocked();

  function routeD() {
    let d = `M ${LEVELS[0].cx} ${LEVELS[0].cy}`;
    for (let i = 1; i < LEVELS.length; i++) {
      const a = LEVELS[i - 1], b = LEVELS[i];
      d += ` Q ${(a.cx + b.cx) / 2} ${(a.cy + b.cy) / 2 + 46} ${b.cx} ${b.cy}`;
    }
    return d;
  }

  function build() {
    if (built) return;
    built = true;
    svg.innerHTML = '';

    // Per-level neon gradients used by illuminated constellation lines + route segments.
    const defs = svgEl('defs', {}, svg);
    for (const lvl of LEVELS) {
      const grad = svgEl('linearGradient', { id: `lg-${lvl.id}`, x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, defs);
      lvl.colors.forEach((c, i) => {
        const offset = lvl.colors.length > 1 ? (i / (lvl.colors.length - 1)) * 100 : 0;
        svgEl('stop', { offset: `${offset}%`, 'stop-color': c }, grad);
      });
    }

    // Base dashed route + per-gap lit overlay segments.
    const routeG = svgEl('g', { class: 'route-layer' }, svg);
    for (let i = 1; i < LEVELS.length; i++) {
      const a = LEVELS[i - 1], b = LEVELS[i];
      const d = `M ${a.cx} ${a.cy} Q ${(a.cx + b.cx) / 2} ${(a.cy + b.cy) / 2 + 46} ${b.cx} ${b.cy}`;
      svgEl('path', { class: 'route-line', d }, routeG).setAttribute('fill', 'none');
      const lit = svgEl('path', { class: 'route-seg', d, stroke: `url(#lg-${b.id})`, 'data-seg': b.id }, routeG);
      lit.setAttribute('fill', 'none');
      lit.style.setProperty('--accent', b.accent);
    }

    for (const lvl of LEVELS) {
      const unlocked = UNLOCKED.has(lvl.id);
      const g = svgEl('g', {
        class: `constellation ${unlocked ? 'unlocked' : 'locked'}`,
        transform: `translate(${lvl.cx} ${lvl.cy})`,
        'data-level': lvl.id,
      }, svg);
      g.style.setProperty('--accent', lvl.accent);
      g.setAttribute('role', 'button');
      g.setAttribute('tabindex', '0');
      g.setAttribute('aria-label', `${lvl.tag} ${lvl.name}${unlocked ? '' : ' — sealed, clear previous sector'}`);
      g.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
      const pts = lvl.points.map(([x, y]) => [x * lvl.scale, y * lvl.scale]);
      const ys = pts.map((p) => p[1]);
      const topY = Math.min(...ys);
      const botY = Math.max(...ys);
      const inner = svgEl('g', { class: 'c-inner' }, g);

      svgEl('circle', { class: 'c-aura', r: (lvl.scale * 2.0).toFixed(1), cx: 0, cy: 0 }, inner);
      svgEl('circle', { class: 'c-hit', r: lvl.scale * 2.35, cx: 0, cy: 0, fill: 'rgba(0,0,0,0)' }, inner);
      svgEl('circle', { class: 'c-ring', r: lvl.scale * 2.0, cx: 0, cy: 0 }, inner);

      const linesG = svgEl('g', { class: 'c-lines' }, inner);
      const energyG = svgEl('g', { class: 'c-energies' }, inner);
      lvl.lines.forEach(([a, b], idx) => {
        const d = `M ${pts[a][0].toFixed(2)} ${pts[a][1].toFixed(2)} L ${pts[b][0].toFixed(2)} ${pts[b][1].toFixed(2)}`;
        svgEl('path', { class: 'c-line', d, stroke: lvl.accent }, linesG);
        const energy = svgEl('path', { class: 'c-energy', d, stroke: lvl.colors[lvl.colors.length - 1] || lvl.accent }, energyG);
        energy.style.animationDelay = `${(idx * 0.18).toFixed(2)}s`;
      });

      const starsG = svgEl('g', { class: 'c-stars' }, inner);
      pts.forEach(([x, y], i) => {
        const color = lvl.colors[i % lvl.colors.length];
        svgEl('circle', { class: 'c-halo', cx: x.toFixed(2), cy: y.toFixed(2), r: 13, fill: color }, starsG);
        const star = svgEl('circle', { class: 'c-star', cx: x.toFixed(2), cy: y.toFixed(2), r: 4.6, fill: color }, starsG);
        star.style.animationDelay = `${((i * 0.23) % 2.4).toFixed(2)}s`;
      });

      svgEl('text', { class: 'c-tag', x: 0, y: (topY - 20).toFixed(2), 'text-anchor': 'middle' }, g).textContent = lvl.tag;
      svgEl('text', { class: 'c-lock', x: 0, y: (topY - 38).toFixed(2), 'text-anchor': 'middle' }, g).textContent = '⌁ SEALED';
      svgEl('text', { class: 'c-name', x: 0, y: (botY + 36).toFixed(2), 'text-anchor': 'middle' }, g).textContent = lvl.name;

      g.addEventListener('click', () => onLevelClick(lvl.id));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLevelClick(lvl.id); }
      });
      groups.set(lvl.id, g);
    }

    for (const id of cleared) applyCleared(id, false);
    updateProgress();
  }

  function onLevelClick(id) {
    if (!UNLOCKED.has(id)) {
      select(id);
      glitchPanel();
      statusBanner('SEALED — CLEAR PREVIOUS SECTOR');
      return;
    }
    if (selected === id && !warping) { launchSelected(); return; } // second click launches
    select(id);
  }

  function glitchPanel() {
    const panel = document.querySelector('.map-panel');
    if (!panel) return;
    panel.classList.remove('glitch');
    void panel.offsetWidth;
    panel.classList.add('glitch');
    clearTimeout(glitchTimer);
    glitchTimer = setTimeout(() => panel.classList.remove('glitch'), 1050);
  }

  function launchSelected() {
    if (warping) return;
    if (!UNLOCKED.has(selected)) {
      glitchPanel();
      statusBanner('SEALED — CLEAR PREVIOUS SECTOR');
      return;
    }
    const levelId = selected;
    // The arena uses 1–5; the map keeps its 0-indexed constellation IDs internally.
    runWarp(() => onLaunch?.(levelId + 1));
  }

  function runWarp(onMid) {
    if (warping) return;
    warping = true;
    const c = warpCanvas;
    if (!c) { onMid?.(); warping = false; return; }
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const W = Math.max(1, window.innerWidth), H = Math.max(1, window.innerHeight);
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    c.style.width = `${W}px`; c.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.classList.remove('is-hidden');
    c.classList.add('warp-active');
    c.style.opacity = '1';
    mapEl.classList.add('is-launching');

    const cx = W / 2, cy = H / 2;
    const maxR = Math.hypot(W, H) * 0.62;
    const colors = ['255,255,255', '120,240,255', '180,140,255', '255,120,220'];
    const stars = Array.from({ length: 210 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 3 + Math.random() * maxR * 0.1,
      sp: 0.5 + Math.random() * 1.6,
      c: colors[(Math.random() * colors.length) | 0],
      w: 0.8 + Math.random() * 1.6,
    }));
    const start = performance.now();
    const DUR = 800;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onMid?.();
      c.classList.remove('warp-active');
      c.style.opacity = '0';
      mapEl.classList.remove('is-launching');
      setTimeout(() => {
        c.classList.add('is-hidden');
        c.style.opacity = '';
        warping = false;
      }, 430);
    };
    // Safety net: launch even if requestAnimationFrame is throttled (background tabs).
    const fallback = setTimeout(finish, DUR + 140);

    function frame(t) {
      const k = Math.min(1, (t - start) / DUR);
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      bg.addColorStop(0, 'rgba(28,44,110,0.62)');
      bg.addColorStop(0.55, 'rgba(12,10,40,0.82)');
      bg.addColorStop(1, 'rgba(5,4,15,0.96)');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const boost = 0.4 + k * k * 8.0;
      for (const s of stars) {
        const prev = s.r;
        s.r += s.sp * boost * (maxR / 60) * 0.7;
        if (s.r > maxR) s.r = 4 + Math.random() * 8;
        const ca = Math.cos(s.a), sa = Math.sin(s.a);
        const alpha = Math.min(1, 0.14 + k * 0.92);
        ctx.strokeStyle = `rgba(${s.c},${alpha.toFixed(3)})`;
        ctx.lineWidth = s.w * (0.6 + k * 1.9);
        ctx.beginPath();
        ctx.moveTo(cx + ca * prev, cy + sa * prev);
        ctx.lineTo(cx + ca * s.r, cy + sa * s.r);
        ctx.stroke();
      }
      if (k > 0.72) {
        const f = (k - 0.72) / 0.28;
        ctx.fillStyle = `rgba(255,255,255,${(f * f * 0.85).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(cx, cy, maxR * f * 0.5, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (k < 1) {
        requestAnimationFrame(frame);
      } else {
        clearTimeout(fallback);
        finish();
      }
    }
    requestAnimationFrame(frame);
  }

  function applyCleared(id, animate) {
    const g = groups.get(id);
    if (!g) return;
    g.classList.add('cleared');
    const paths = g.querySelectorAll('.c-line');
    paths.forEach((p, i) => {
      p.style.stroke = `url(#lg-${id})`; // pulsing neon gradient
      const len = p.getTotalLength ? p.getTotalLength() : 200;
      p.style.strokeDasharray = `${len}`;
      if (animate) {
        p.style.transition = 'none';
        p.style.strokeDashoffset = `${len}`;
        void p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset 1.15s cubic-bezier(.2,.8,.2,1) ${(i * 0.055).toFixed(2)}s`;
        p.style.strokeDashoffset = '0';
      } else {
        p.style.strokeDashoffset = '0';
      }
    });
    g.querySelectorAll('.c-star, .c-halo').forEach((s, i) => {
      s.style.transition = animate ? `opacity .5s ease ${(0.35 + i * 0.03).toFixed(2)}s` : 'none';
    });
    const seg = svg.querySelector(`.route-seg[data-seg="${id}"]`);
    if (seg) seg.classList.add('lit');
  }

  function updateProgress() {
    if (progressEl) progressEl.textContent = String(cleared.size);
  }

  function applyLockedStates() {
    for (const lvl of LEVELS) {
      const g = groups.get(lvl.id);
      if (!g) continue;
      const unlocked = UNLOCKED.has(lvl.id);
      g.classList.toggle('unlocked', unlocked);
      g.classList.toggle('locked', !unlocked);
      g.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
      g.setAttribute('aria-label', `${lvl.tag} ${lvl.name}${unlocked ? '' : ' — sealed, clear previous sector'}`);
    }
  }

  function select(id) {
    selected = id;
    for (const [gid, g] of groups) g.classList.toggle('selected', gid === id);
    const lvl = LEVELS[id];
    if (!lvl) return;
    mapEl.style.setProperty('--accent', lvl.accent);
    tagEl.textContent = lvl.tag;
    nameEl.textContent = lvl.name;
    motifEl.textContent = lvl.motif;
    descEl.textContent = lvl.desc;
    const isCleared = cleared.has(id);
    const unlocked = UNLOCKED.has(id);
    if (unlocked) {
      statusEl.textContent = isCleared ? 'CONSTELLATION RESTORED · REPLAY AVAILABLE' : 'SIGNAL ACQUIRED · READY TO LAUNCH';
      statusEl.classList.remove('sealed');
      launchBtn.disabled = false;
      launchBtn.classList.remove('sealed');
      launchBtn.innerHTML = isCleared ? 'REPLAY LEVEL <span>↗</span>' : 'LAUNCH LEVEL <span>↗</span>';
    } else {
      statusEl.textContent = 'SEALED — CLEAR PREVIOUS SECTOR';
      statusEl.classList.add('sealed');
      launchBtn.disabled = true;
      launchBtn.classList.add('sealed');
      launchBtn.innerHTML = 'SECTOR SEALED <span>✦</span>';
    }
  }

  function burstAt(id) {
    const lvl = LEVELS[id];
    if (!lvl) return;
    const rect = svg.getBoundingClientRect();
    const s = Math.min(rect.width / VIEW_W, rect.height / VIEW_H);
    const ox = rect.left + (rect.width - VIEW_W * s) / 2;
    const oy = rect.top + (rect.height - VIEW_H * s) / 2;
    galaxy.burst(ox + lvl.cx * s, oy + lvl.cy * s, lvl.colors);
  }

  function showResult(first, score, id) {
    if (!resultEl) return;
    const lvl = LEVELS[id];
    resultTitle.textContent = first ? 'SECTOR SECURED' : 'SECTOR RESTABILIZED';
    resultScore.textContent = `${lvl?.tag || 'LEVEL'} · ${score} POINTS`;
    resultEl.classList.remove('is-hidden', 'play');
    void resultEl.offsetWidth;
    resultEl.classList.add('play');
  }

  function statusBanner(text) {
    // small non-blocking hint on the map (e.g. tapping a sealed level)
    const hint = document.querySelector('#map-hint');
    if (!hint) return;
    hint.textContent = text;
    hint.classList.remove('is-hidden', 'flash');
    void hint.offsetWidth;
    hint.classList.add('flash');
  }

  function show(opts = {}) {
    refreshUnlocked();
    if (typeof opts.selectLevel === 'number' && UNLOCKED.has(opts.selectLevel)) selected = opts.selectLevel;
    build();
    applyLockedStates();
    open = true;
    root.classList.add('map-open');
    mapEl.classList.remove('is-hidden');
    galaxy.start();
    resultEl?.classList.add('is-hidden');

    if (typeof opts.victoryLevel === 'number') {
      const id = opts.victoryLevel;
      const wasCleared = cleared.has(id);
      cleared.add(id);
      saveCleared(cleared);
      refreshUnlocked();
      applyLockedStates();
      applyCleared(id, !wasCleared);
      updateProgress();
      const nextId = id + 1 < LEVELS.length && UNLOCKED.has(id + 1) ? id + 1 : id;
      select(nextId);
      showResult(!wasCleared, opts.score ?? 0, id);
      burstAt(id);
      statusBanner(!wasCleared
        ? (nextId !== id ? 'NEW CONSTELLATION UNSEALED · NEXT SECTOR READY' : 'FINAL SECTOR SECURED · ALL CONSTELLATIONS RESTORED')
        : 'SECTOR RESTABILIZED · NEXT CONSTELLATION ALREADY OPEN');
    } else {
      if (!UNLOCKED.has(selected)) selected = 0;
      select(selected);
      const hint = document.querySelector('#map-hint');
      if (hint) hint.textContent = 'CLICK A CONSTELLATION TO SELECT';
    }
  }

  function hide() {
    open = false;
    galaxy.stop();
    mapEl.classList.add('is-hidden');
    mapEl.classList.remove('is-launching');
    root.classList.remove('map-open');
  }

  launchBtn?.addEventListener('click', launchSelected);
  window.addEventListener('resize', () => { if (open) galaxy.resize(); });

  return {
    show,
    hide,
    isOpen: () => open,
    launch: launchSelected,
    markCleared: (id) => { cleared.add(id); saveCleared(cleared); refreshUnlocked(); build(); applyLockedStates(); applyCleared(id, true); updateProgress(); },
    getCleared: () => [...cleared],
    getUnlocked: () => [...UNLOCKED],
  };
}
