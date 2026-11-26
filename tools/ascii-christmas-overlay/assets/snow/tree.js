// 화면 하단의 3D ASCII 크리스마스트리(Canvas 2D).
// 층진 원뿔을 3D 점으로 만들고 빛 방향에 따른 밝기를 글자 진하기(ramp)와 색으로 표현한다.
// 나선 장식 줄·전구는 트리와 함께 돌며, 뒤로 가면 가려진다(깊이 비교). 꼭대기 별·선물 상자·눈 둔덕을 더한다.
import { hash01, defined, same, reducedMotionQuery, twinkle } from './util.js';
import { glyph, stamp, overlayCanvas, fitCanvas, frameLoop2d, cellSize, dprOf, mixHex, glowAmount, bloomLayer, halo } from './glyphs.js';

export const TREE_DEFAULTS = Object.freeze({
  rows: 24,               // 잎 부분 높이(글자 줄 수) 6..60
  tiers: 4,               // 층 수 1..6
  fontSize: 13,           // 글자 크기 px. 화면보다 크면 맞게 줄인다
  rotate: 0.25,           // 회전 속도(라디안/초). 0이면 멈춘 입체
  ramp: '.,:;~=+*',       // 입체 음영 글자(어두움→밝음)
  leafColor: '#a3e9c0',   // 빛 받는 쪽 잎 색(부드러운 민트)
  leafShade: '#15392c',   // 그늘 쪽 잎 색
  lights: 60,             // 전구 수(0..1 사이 값은 v2처럼 비율로 본다)
  lightFrames: '.oO@',    // 전구 반짝임 글자(어두움→밝음)
  lightColors: ['#ffd6a5', '#ffadad', '#fff1b0', '#caffbf', '#a0c4ff', '#ffc6ff'],
  garland: true,          // 나선 장식 줄
  garlandColor: '#ffe8a3',
  snowCaps: true,         // 가지 끝에 쌓인 눈
  sparkle: 1,             // 잎 위 반짝 빛 양 0..3
  star: true,             // 꼭대기 별
  starColor: '#fff2c2',
  trunkColor: '#c08a5b',
  presents: true,         // 선물 상자
  presentColors: ['#ff8fab', '#9bb1ff', '#c3a6ff'],
  ribbonColor: '#ffe3a3',
  ground: true,           // 눈 둔덕
  groundColor: '#eef4ff',
  mist: 0.6,              // 바닥 안개 0..2. 0이면 없음
  halo: 0.6,              // 트리 뒤·꼭대기 별의 은은한 빛무리 0..2
  bloom: 0.7,             // 은은한 번짐 층 0..2. 0이면 없음
  speed: 0.8,             // 반짝임 속도 배수
  glow: 1.3,              // 빛 번짐 세기 0..3 (true/false도 받음)
  align: 'center',        // 'left' | 'center' | 'right'
  offset: 0,              // 정렬 위치에서 가로 이동 px
  bottom: 0,              // 화면 아래에서 띄울 거리 px
  opacity: 1,
  zIndex: 9998,
  seed: 1,
  respectReducedMotion: true,
});

// 바뀌면 모양(점·전구 배치·캔버스 크기)을 다시 만드는 옵션
const LAYOUT = ['rows', 'tiers', 'fontSize', 'lights', 'garland', 'star', 'presents', 'ground', 'seed', 'snowCaps'];
const FPS = 30;
const RMAX = 0.42;          // 맨 아래 층 반지름(잎 높이 = 1)
const TRUNK_H = 0.13, TRUNK_R = 0.06;
const L = (() => { const v = [-0.55, 0.45, 0.7], n = Math.hypot(...v); return v.map((x) => x / n); })();
const STAR = [
  ['     ', '  |  ', '--*--', '  |  ', '     '],
  ['     ', ' \\|/ ', ' -*- ', ' /|\\ ', '     '],
  ['\\   /', ' \\ / ', '  *  ', ' / \\ ', '/   \\'],
  ['  |  ', '\\ | /', '--*--', '/ | \\', '  |  '],
  ['     ', '  .  ', ' .*. ', "  '  ", '     '],
];
// 선물 상자: [글자, 칠 종류] T 윗면 F 앞면 S 옆면 R 리본
const BOX = [
  ['   _________ ', '   TTTTTTTTT '],
  ['  /   ||   /|', '  T   RR   TS'],
  [' /____||__/ |', ' TTTTTRRTTT S'],
  [' |    ||  | |', ' F    RR  F S'],
  [' |____||__|/ ', ' FFFFFRRFFFS '],
];

const int = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(+v) ? +v : d)));

export function normalizeTree(o) {
  const r = { ...TREE_DEFAULTS, ...defined(o) };
  r.rows = int(r.rows, 6, 60, 24);
  r.tiers = int(r.tiers, 1, 6, 4);
  r.fontSize = Math.max(5, Math.min(48, Number(r.fontSize) || 13));
  r.rotate = Number(r.rotate) || 0;
  r.ramp = String(r.ramp || TREE_DEFAULTS.ramp);
  const n = Number(r.lights) || 0;
  r.lights = n > 0 && n < 1 ? Math.round(n * 200) : int(n, 0, 400, 60);
  r.lightFrames = String(r.lightFrames || TREE_DEFAULTS.lightFrames);
  r.lightColors = [].concat(r.lightColors).filter(Boolean);
  if (!r.lightColors.length) r.lightColors = [...TREE_DEFAULTS.lightColors];
  r.presentColors = [].concat(r.presentColors).filter(Boolean);
  if (!r.presentColors.length) r.presentColors = [...TREE_DEFAULTS.presentColors];
  r.garland = !!r.garland;
  r.sparkle = Math.min(3, Math.max(0, Number(r.sparkle) || 0));
  r.speed = Math.max(0, Number(r.speed) || 0);
  r.glow = glowAmount(r.glow, 1.3);
  for (const k of ['mist', 'halo', 'bloom']) r[k] = Math.min(2, Math.max(0, Number(r[k]) || 0));
  r.snowCaps = !!r.snowCaps;
  r.opacity = Math.min(1, Math.max(0, Number(r.opacity)));
  if (!['left', 'center', 'right'].includes(r.align)) r.align = 'center';
  return r;
}

function tierList(T) {
  const h = 0.92 / (T * 0.55 + 0.45);
  return Array.from({ length: T }, (_, k) => {
    const yt = 1 - k * 0.55 * h, yb = yt - h;
    const rb = RMAX * (0.5 + 0.5 * (k + 1) / T);
    const rt = k === 0 ? 0 : rb * 0.22;
    return { k, yt, yb, h, rb, rt, slope: (rb - rt) / h };
  });
}

// 표면 점 미리 만들기. 회전은 매 프레임 각도 덧셈으로 한다.
function buildSamples(o, S, cw) {
  const tiers = tierList(o.tiers), pts = [];
  for (const t of tiers) {
    const ny = Math.ceil(t.h * o.rows * 2.2);
    for (let i = 0; i <= ny; i++) {
      const u = i / ny, y = t.yt - u * t.h, r0 = t.rt + (t.rb - t.rt) * u;
      const nphi = Math.max(8, Math.ceil((2 * Math.PI * r0 * S) / cw * 1.4));
      for (let j = 0; j < nphi; j++) {
        const phi = (j / nphi) * Math.PI * 2;
        // 층 아래 가장자리는 가지 끝처럼 물결치고, 표면은 잎 결로 약간 울퉁불퉁하다
        const edge = Math.max(0, (u - 0.72) / 0.28);
        const jag = 1 + 0.12 * edge * edge + 0.09 * Math.sin(phi * 9 + t.k * 2) * edge + 0.04 * (hash01(o.seed + t.k, i * 977 + j) - 0.5);
        const ao = (t.k > 0 && u < 0.3 ? 0.45 + 1.8 * u : 1) * (u > 0.95 ? 0.6 : 1); // 위층 그늘·층 밑단 그늘
        const cap = o.snowCaps && u > 0.82 && u < 0.94 && hash01(o.seed + 99, t.k * 100003 + i * 977 + j) < 0.22 + 0.2 * Math.sin(phi * 5 + t.k) ? 1 : 0;
        pts.push(y, r0 * jag, Math.cos(phi), Math.sin(phi), t.slope, ao, u, cap);
      }
    }
  }
  return { tiers, pts: new Float32Array(pts) };
}

export function createTree(options = {}) {
  if (typeof document === 'undefined') throw new Error('createTree는 브라우저에서만 실행한다');
  let opts = normalizeTree(options);
  const canvas = overlayCanvas(opts.zIndex, options.container);
  canvas.dataset.asciiTree = '';
  const ctx = canvas.getContext('2d');
  const bloom = bloomLayer(canvas, options.container);
  const reduced = reducedMotionQuery();
  const isStatic = () => opts.respectReducedMotion && !!reduced?.matches;
  let G = null, layoutKey = null, destroyed = false, theta = 0.6, glints = [];

  // 모양과 캔버스 크기. 화면보다 크면 글자 크기를 줄인다.
  function build() {
    const vw = globalThis.innerWidth || 1200, vh = globalThis.innerHeight || 900;
    let fs = opts.fontSize, cell, S, W, H, cols, rows, starRows, base;
    for (let tries = 0; tries < 6; tries++) {
      cell = cellSize(fs);
      S = opts.rows * cell.h;               // 잎 높이 1 = S px
      starRows = opts.star ? 7 : 1; // 별 5줄 + 빛무리가 잘리지 않게 위 여백 2줄
      const trunkRows = Math.ceil((TRUNK_H * S) / cell.h) + (opts.ground ? 2 : 0);
      cols = Math.ceil((2 * RMAX * S * 1.12) / cell.w) + 6;
      rows = starRows + opts.rows + trunkRows + 1;
      W = cols * cell.w; H = rows * cell.h;
      const k = Math.min(1, (vw * 0.96) / W, (vh * 0.62) / H); // 화면 폭 96%, 높이 62% 안
      if (k >= 0.999) break;
      fs = Math.max(5, Math.floor(fs * k * 10) / 10);
    }
    base = (starRows + opts.rows) * cell.h; // 잎 밑면 y(px)
    const { tiers, pts } = buildSamples(opts, S, cell.w);
    const bulbs = [];
    for (let i = 0; i < opts.lights; i++) {
      const h = (k) => hash01(opts.seed * 31 + k, i);
      const t = tiers[Math.min(tiers.length - 1, Math.floor(h(1) * tiers.length))];
      const u = 0.12 + 0.86 * h(2), y = t.yt - u * t.h, r = (t.rt + (t.rb - t.rt) * u) * 1.07, phi = h(3) * Math.PI * 2;
      bulbs.push({ y, r, c: Math.cos(phi), s: Math.sin(phi), freq: 0.4 + 0.9 * h(4), phase: h(5), ci: Math.floor(h(6) * 997) });
    }
    G = { fs, cell, S, W, H, cols, rows, base, tiers, pts, bulbs, z: new Float32Array(cols * rows), kind: new Uint8Array(cols * rows), lum: new Float32Array(cols * rows) };
    layoutKey = LAYOUT.map((k) => opts[k]);
    place();
  }

  function place() {
    const s = canvas.style;
    fitCanvas(canvas, G.W, G.H, dprOf());
    s.zIndex = String(opts.zIndex);
    s.opacity = String(opts.opacity);
    s.bottom = `calc(${Number(opts.bottom) || 0}px + env(safe-area-inset-bottom, 0px))`;
    s.top = 'auto';
    const off = Number(opts.offset) || 0;
    s.left = s.right = 'auto'; s.transform = 'none';
    if (opts.align === 'left') s.left = `${off}px`;
    else if (opts.align === 'right') s.right = `${-off}px`;
    else { s.left = '50%'; s.transform = `translateX(calc(-50% + ${off}px))`; }
  }

  // 3D 점 → 칸. 깊이 비교로 앞쪽만 남긴다. kind 1 잎 2 장식 줄 3 줄기
  function splat(x, y, z, lum, kind, bias = 0) {
    const { cell, S, W, base, cols, rows } = G;
    const col = Math.floor((W / 2 + x * S) / cell.w), row = Math.floor((base - y * S) / cell.h);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return -1;
    const i = row * cols + col;
    if (z + bias <= G.z[i]) return -1;
    G.z[i] = z + bias; G.kind[i] = kind; G.lum[i] = lum;
    return i;
  }

  function draw(t) {
    if (!G) return;
    const dpr = dprOf();
    if (fitCanvas(canvas, G.W, G.H, dpr)) {} // DPR가 바뀌면 다시 맞춘다
    const { cell, cols, rows, pts, S } = G;
    if (!isStatic()) theta = 0.6 + t * opts.rotate;
    const ct = Math.cos(theta), st = Math.sin(theta);
    G.z.fill(-1e9); G.kind.fill(0);
    const glowPx = opts.glow * G.fs * 0.75;

    // 잎
    for (let p = 0; p < pts.length; p += 8) {
      const y = pts[p], r = pts[p + 1], c0 = pts[p + 2], s0 = pts[p + 3], k = pts[p + 4], ao = pts[p + 5], cap = pts[p + 7];
      const c = c0 * ct - s0 * st, s = s0 * ct + c0 * st;
      const nl = 1 / Math.hypot(1, k);
      const nx = c * nl, ny = k * nl, nz = s * nl;
      const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const rim = Math.pow(1 - Math.abs(nz), 4) * 0.25;
      splat(r * c, y, r * s, Math.min(1, (0.18 + 0.78 * diff + rim) * ao), cap ? 5 : 1);
    }
    // 줄기
    for (let i = 0; i <= 12; i++) for (let j = 0; j < 24; j++) {
      const y = -TRUNK_H * (i / 12), phi = (j / 24) * Math.PI * 2 + theta;
      const c = Math.cos(phi), s = Math.sin(phi);
      splat(TRUNK_R * c, y, TRUNK_R * s, 0.15 + 0.8 * Math.max(0, c * L[0] + s * L[2]), 3);
    }
    // 나선 장식 줄
    if (opts.garland) for (const tr of G.tiers) {
      const n = Math.ceil(tr.h * opts.rows * 6);
      for (let i = 0; i < n; i++) {
        const u = 0.15 + 0.7 * (i / n), y = tr.yt - u * tr.h, r = (tr.rt + (tr.rb - tr.rt) * u) * 1.05;
        const phi = u * Math.PI * 2 * 0.9 + tr.k * 2.3 + theta;
        const c = Math.cos(phi), s = Math.sin(phi);
        if (s < -0.15) continue; // 뒤쪽은 가려진다
        splat(r * c, y, r * s, 0.3 + 0.7 * Math.max(0, c * L[0] + s * L[2] + 0.35), i % 3 === 0 ? 4 : 2, 0.03);
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, G.W, G.H);
    const starY = (opts.star ? 4.5 : 0) * cell.h;
    if (opts.halo > 0) {
      halo(ctx, G.W / 2, G.base - S * 0.45, Math.min(G.W / 2, S * 0.6) * 0.98, '#ffe2b8', 0.13 * opts.halo);
      if (opts.star) halo(ctx, G.W / 2, starY, cell.h * 4.2, opts.starColor, 0.32 * opts.halo);
    }
    const ramp = opts.ramp, rl = ramp.length - 1;
    const foliageCells = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const i = row * cols + col, kind = G.kind[i];
      if (!kind) continue;
      const lv = Math.round(G.lum[i] * 9) / 9;
      const x = col * cell.w, y = row * cell.h;
      if (kind === 1) {
        stamp(ctx, glyph(ramp[Math.round(lv * rl)], mixHex(opts.leafShade, opts.leafColor, lv), G.fs, 0, dpr), x, y);
        if (lv > 0.35) foliageCells.push(i);
      } else if (kind === 2) {
        stamp(ctx, glyph('~', mixHex('#7a5a12', opts.garlandColor, lv), G.fs, lv > 0.6 ? glowPx * 0.5 : 0, dpr, true), x, y);
      } else if (kind === 5) {
        stamp(ctx, glyph(lv > 0.6 ? '*' : lv > 0.35 ? '.' : ',', mixHex('#5d7396', '#e6eeff', lv * 0.85), G.fs, 0, dpr), x, y, 0.85);
      } else if (kind === 4) {
        stamp(ctx, glyph('o', mixHex('#5c0b16', '#ff5d73', lv), G.fs, lv > 0.6 ? glowPx * 0.5 : 0, dpr, true), x, y);
      } else {
        stamp(ctx, glyph(lv > 0.6 ? '#' : lv > 0.3 ? '|' : ':', mixHex('#2b1608', opts.trunkColor, lv), G.fs, 0, dpr), x, y);
      }
    }

    // 잎 위 반짝 빛
    const tt = t * opts.speed;
    if (opts.sparkle > 0 && foliageCells.length) {
      glints = glints.filter((g) => tt - g.t0 < 0.45);
      const want = Math.round(4 * opts.sparkle);
      while (glints.length < want) glints.push({ i: foliageCells[Math.floor(Math.random() * foliageCells.length)], t0: tt - Math.random() * 0.3 });
      for (const g of glints) {
        const a = Math.sin(((tt - g.t0) / 0.45) * Math.PI);
        stamp(ctx, glyph('+', '#ffffff', G.fs, glowPx, dpr), (g.i % cols) * cell.w, Math.floor(g.i / cols) * cell.h, Math.max(0, a));
      }
    }

    // 전구(앞쪽에 보일 때만)
    for (const b of G.bulbs) {
      const c = b.c * ct - b.s * st, s = b.s * ct + b.c * st;
      const x = b.r * c, z = b.r * s;
      const col = Math.floor((G.W / 2 + x * S) / cell.w), row = Math.floor((G.base - b.y * S) / cell.h);
      if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
      if (z < G.z[row * cols + col] - 0.035) continue; // 잎 뒤
      const br = twinkle(tt, b.freq, b.phase, 1);
      const color = opts.lightColors[(b.ci + Math.floor(tt * b.freq + b.phase)) % opts.lightColors.length];
      const facing = 0.45 + 0.55 * Math.max(0, s);
      const fr = opts.lightFrames, bfs = Math.round(G.fs * 1.3), bc = cellSize(bfs);
      stamp(ctx, glyph(fr[Math.min(fr.length - 1, Math.floor(br * fr.length))], color, bfs, glowPx * 1.9, dpr, true), col * cell.w - (bc.w - cell.w) / 2, row * cell.h - (bc.h - cell.h) / 2, facing * (0.5 + 0.5 * br));
    }

    // 꼭대기 별
    if (opts.star) {
      const f = STAR[Math.floor(tt * 1.6) % STAR.length];
      const b = 0.6 + 0.4 * twinkle(tt, 0.8, 0, 1);
      const c0 = Math.floor(G.W / 2 / cell.w) - 2;
      f.forEach((line, r) => [...line].forEach((ch, k) => {
        if (ch === ' ') return;
        const center = ch === '*';
        stamp(ctx, glyph(ch, center ? '#fffbe6' : opts.starColor, G.fs, glowPx * (center ? 2.4 : 1.2), dpr, true), (c0 + k) * cell.w, (r + 2) * cell.h, center ? 0.75 + 0.25 * b : b);
      }));
    }

    // 눈 둔덕
    const gy = Math.floor((G.base + TRUNK_H * S) / cell.h);
    if (opts.ground) {
      const half = Math.floor((RMAX * S * 1.05) / cell.w);
      const cc = Math.floor(G.W / 2 / cell.w);
      for (let r = 0; r < 2; r++) {
        const w = r === 0 ? Math.floor(half * 0.75) : half;
        for (let k = -w; k <= w; k++) {
          const edge = Math.abs(k) / w;
          const ch = r === 0 ? (edge > 0.85 ? '.' : edge > 0.5 ? ':' : '~') : (edge > 0.9 ? "'" : edge > 0.6 ? '-' : '=');
          stamp(ctx, glyph(ch, mixHex('#7d93b8', opts.groundColor, 1 - edge * 0.6), G.fs, 0, dpr), (cc + k) * cell.w, (gy + r) * cell.h);
        }
      }
    }

    // 선물 상자(트리 앞)
    if (opts.presents) {
      const cc = Math.floor(G.W / 2 / cell.w);
      const tw = Math.ceil((TRUNK_R * S) / cell.w) + 1; // 줄기 반폭(칸)
      const boxes = [[BOX, -BOX[0][0].length - tw + 1, 0], [BOX, tw - 1, 1]];
      for (const [art, dx, ci] of boxes) {
        const body = opts.presentColors[(ci + opts.seed) % opts.presentColors.length];
        const top = gy + (opts.ground ? 1 : 0) - art.length + 1;
        art.forEach(([line, kinds], r) => [...line].forEach((ch, k) => {
          if (ch === ' ') return;
          const kk = kinds[k];
          const color = kk === 'R' ? opts.ribbonColor : kk === 'T' ? mixHex(body, '#ffffff', 0.35) : kk === 'S' ? mixHex(body, '#000000', 0.45) : body;
          stamp(ctx, glyph(ch, color, G.fs, kk === 'R' ? glowPx * 0.5 : 0, dpr, true), (cc + dx + k) * cell.w, (top + r) * cell.h);
        }));
      }
    }
    // 바닥 안개: 옅은 ~ 와 - 가 천천히 흘러간다
    if (opts.mist > 0) {
      const cols = G.cols, cc = cols / 2;
      for (let r = -1; r <= 1; r++) for (let k = 0; k < cols; k++) {
        const edge = 1 - Math.min(1, Math.abs(k - cc) / cc);
        const w = 0.5 + 0.5 * Math.sin(k * 0.33 + tt * 0.5 + r * 1.7) * Math.sin(k * 0.11 - tt * 0.27 + r);
        const a = opts.mist * 0.32 * w * edge * (r === 0 ? 1 : 0.6);
        if (a < 0.04) continue;
        stamp(ctx, glyph(w > 0.6 ? '~' : '-', '#e3ecff', G.fs, glowPx * 0.5, dpr), k * cell.w, (gy + r + (opts.ground ? 1 : 0)) * cell.h, Math.min(0.5, a));
      }
    }
    ctx.globalAlpha = 1;
    bloom.draw(opts.bloom);
  }

  build();
  const clock = frameLoop2d(draw, FPS, isStatic);
  let lastW = globalThis.innerWidth;
  const onResize = () => { if (globalThis.innerWidth === lastW) return; lastW = globalThis.innerWidth; build(); clock.redraw(); };
  const onMotion = () => clock.restart();
  globalThis.addEventListener?.('resize', onResize);
  reduced?.addEventListener?.('change', onMotion);
  document.fonts?.ready?.then(() => { if (!destroyed) { build(); clock.redraw(); } });

  return {
    element: canvas,
    update(next = {}) {
      if (destroyed) return;
      const prev = opts;
      opts = normalizeTree({ ...prev, ...defined(next) });
      if (!same(LAYOUT.map((k) => opts[k]), layoutKey)) build(); else place();
      if (opts.respectReducedMotion !== prev.respectReducedMotion) clock.restart();
      else clock.redraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clock.dispose();
      globalThis.removeEventListener?.('resize', onResize);
      reduced?.removeEventListener?.('change', onMotion);
      bloom.remove();
      canvas.remove();
    },
  };
}
