// 선물을 실은 썰매를 순록이 끌고 하늘을 가로지르는 ASCII 산타(Canvas 2D). 직접 그린 ASCII다.
// 정해진 간격마다 날아가고, fly()로 바로 날릴 수 있다. 썰매 뒤로 반짝이 가루가 떨어진다.
import { defined, reducedMotionQuery, twinkle } from './util.js';
import { glyph, stamp, overlayCanvas, fitCanvas, frameLoop2d, cellSize, dprOf, glowAmount, bloomLayer } from './glyphs.js';

export const SANTA_DEFAULTS = Object.freeze({
  every: 14,              // 비행 간격(초). 0이면 fly()로만 난다
  startDelay: 1.5,        // 처음 비행까지(초)
  duration: 12,           // 화면을 가로지르는 시간(초)
  direction: 'alternate', // 'ltr' | 'rtl' | 'alternate'
  path: 'random',         // 깊이 변화: 'swoop'(멀리→가까이→멀리) | 'approach'(멀리→가까이) | 'recede'(가까이→멀리) | 'flat' | 'random'
  scale: [0.45, 1],       // 크기 배수 [가장 멀 때, 가장 가까울 때]
  altitude: [0.08, 0.3],  // 높이(화면 높이 비율) [가장 멀 때, 가장 가까울 때]
  fontSize: 12,           // 가장 가까울 때 글자 크기 px
  reindeer: 2,            // 순록 수 0..4 (맨 앞은 빨간 코)
  trail: true,            // 반짝이 가루
  dropOnClick: true,      // 산타를 누르면 선물이 떨어진다
  glow: 1.2,              // 빛 번짐 세기 0..3
  bloom: 0.8,             // 은은한 번짐 층 0..2. 0이면 없음
  bob: 1,                 // 위아래 흔들림 세기
  suitColor: '#ff6b7a',
  sleighColor: '#e05a6a',
  goldColor: '#ffe3a3',
  reindeerColor: '#d9a57a',
  noseColor: '#ff4d5e',
  presentColors: ['#a0c4ff', '#caffbf', '#ffadad', '#ffd6a5'],
  opacity: 0.95,
  zIndex: 9997,
  respectReducedMotion: true,
});

// 오른쪽으로 나는 모양. [글자, 색] 색: r 옷 w 흰색 s 피부 k 눈 g 금색 d 썰매 b 순록 a 뿔 n 코 1..4 선물
// 모자(r)·털 테두리(w)·얼굴(s)·수염(w)·팔과 고삐(r,g)·몸과 금단추(r,g)·썰매 테(g)·썰매(d)·썰매 날(g)
const SLEIGH = [
  ['          .-""-.*       ', '          rrrrrrw       '],
  ['         {======}       ', '         wwwwwwww       '],
  ['  _[@]_   (o v o)       ', '  g111g   skkkkks       '],
  [' [%%][#]  {\\~~/}\\~~~~~~', ' 2222333  wwwwwwwrgggggg'],
  ['[####][@] ( .o. )       ', '44444411 rrrgrrr       '],
  ['\\=====================/ ', 'gggggggggggggggggggggggg '],
  [' \\___________________/  ', ' ddddddddddddddddddddd  '],
  ['  `~~~~~~~~~~~~~~~~~~~\'  ', '  ggggggggggggggggggggg  '],
];
const REIN_ROW = 3;                 // 고삐가 지나가는 줄
const DEER = [
  ['    Y  ', '    a  '],
  ["'___/o>@", 'bbbbbkbn'],
  [' (____) ', ' bbbbbb '],
];
const DEER_TOP = REIN_ROW - 2;      // 순록 몸통 줄이 고삐 줄과 맞게
const LEGS = [' /\\  /\\ ', ' |\\  |\\ '];
const MIRROR = { '/': '\\', '\\': '/', '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '`': "'", "'": '`' };

const PATHS = ['swoop', 'approach', 'recede', 'flat'];
const pair = (v, d) => { const a = Array.isArray(v) ? v : [v, v]; return [0, 1].map((i) => (Number.isFinite(+a[i]) ? +a[i] : d[i])); };

export function normalizeSanta(o) {
  const r = { ...SANTA_DEFAULTS, ...defined(o) };
  r.every = Math.max(0, Number(r.every) || 0);
  r.startDelay = Number.isFinite(+r.startDelay) ? Math.max(0, +r.startDelay) : 1.5;
  r.duration = Math.max(1, Number(r.duration) || 12);
  if (!['ltr', 'rtl', 'alternate'].includes(r.direction)) r.direction = 'alternate';
  if (![...PATHS, 'random'].includes(r.path)) r.path = 'random';
  r.scale = pair(r.scale, [0.45, 1]).map((x) => Math.min(3, Math.max(0.1, x)));
  r.altitude = pair(r.altitude, [0.08, 0.3]).map((x) => Math.min(0.9, Math.max(0, x)));
  r.fontSize = Math.max(6, Math.min(40, Number(r.fontSize) || 12));
  r.reindeer = Math.max(0, Math.min(4, Math.round(Number(r.reindeer) || 0)));
  r.glow = glowAmount(r.glow, 1.2);
  r.bloom = Math.min(2, Math.max(0, Number(r.bloom) || 0));
  r.bob = Math.max(0, Number(r.bob) || 0);
  r.presentColors = [].concat(r.presentColors).filter(Boolean);
  if (!r.presentColors.length) r.presentColors = [...SANTA_DEFAULTS.presentColors];
  r.opacity = Math.min(1, Math.max(0, Number(r.opacity)));
  return r;
}

// 썰매 + 고삐 + 순록을 한 칸 격자로 합친다. legFrame 0/1
export function santaArt(o, legFrame = 0, rtl = false) {
  const rows = Array.from({ length: SLEIGH.length }, () => []);
  const put = (x, y, ch, c) => { while (rows[y].length < x) rows[y].push([' ', ' ']); rows[y][x] = [ch, c]; };
  SLEIGH.forEach(([a, c], y) => [...a].forEach((ch, x) => put(x, y, ch, c[x] || ' ')));
  let x0 = Math.max(...SLEIGH.map(([a]) => a.trimEnd().length));
  const bodyStart = DEER[2][0].search(/\S/);
  if (o.reindeer > 0) for (let x = SLEIGH[REIN_ROW][0].trimEnd().length; x < x0 + bodyStart; x++) put(x, REIN_ROW, '~', 'g');
  for (let i = 0; i < o.reindeer; i++) {
    if (i > 0) { for (let k = -1; k < 2; k++) put(x0 + k, REIN_ROW, '~', 'g'); x0 += 2; }
    const lead = i === o.reindeer - 1;
    DEER.forEach(([a, c], y) => [...a].forEach((ch, x) => { if (ch !== ' ') put(x0 + x, DEER_TOP + y, ch, c[x] === 'n' && !lead ? 'b' : c[x] || ' '); }));
    [...LEGS[(legFrame + i) % 2]].forEach((ch, x) => { if (ch !== ' ') put(x0 + x, DEER_TOP + DEER.length, ch, 'b'); });
    x0 += DEER[1][0].length;
  }
  const width = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => {
    const full = [...r, ...Array.from({ length: width - r.length }, () => [' ', ' '])];
    return rtl ? full.reverse().map(([ch, c]) => [MIRROR[ch] || ch, c]) : full;
  });
}

// 깊이 0(멀리)..1(가까이). 경로마다 비행 진행 p(0..1)에 따른 깊이
const ease = (x) => x * x * (3 - 2 * x);
function depthAt(path, p) {
  if (path === 'approach') return ease(p);
  if (path === 'recede') return ease(1 - p);
  if (path === 'swoop') return Math.sin(Math.PI * p);
  return 1;
}
// 떨어지는 선물(작은 ASCII 상자). [글자, 색] g 금색 리본, b 상자
const GIFT = [[' \\ / ', ' g g '], ['[=+=]', 'bbgbb'], ['[_|_]', 'bbgbb']];

export function createSanta(options = {}) {
  if (typeof document === 'undefined') throw new Error('createSanta는 브라우저에서만 실행한다');
  let opts = normalizeSanta(options);
  const canvas = overlayCanvas(opts.zIndex, options.container);
  canvas.dataset.asciiSanta = '';
  Object.assign(canvas.style, { left: '0', top: '0' });
  const ctx = canvas.getContext('2d');
  const bloom = bloomLayer(canvas, options.container);
  const reduced = reducedMotionQuery();
  const isStatic = () => opts.respectReducedMotion && !!reduced?.matches;
  let destroyed = false, flight = null, glitter = [], gifts = [], timer = 0, flights = 0, clock = null, now = 0, bounds = null, sheet = null;

  const color = (k) => ({ r: opts.suitColor, w: '#ffffff', s: '#ffd6b0', k: '#ffffff', g: opts.goldColor, d: opts.sleighColor, b: opts.reindeerColor, a: '#e9c46a', n: opts.noseColor }[k]
    || (/[1-4]/.test(k) ? opts.presentColors[(+k - 1) % opts.presentColors.length] : '#ffffff'));

  // 산타 한 장을 가장 가까울 때 크기로 미리 그려 두고, 날 때는 크기만 바꿔 찍는다.
  // (크기마다 글자 그림을 새로 만들면 캐시가 끝없이 늘어난다.) 다리 2 × 방향 2 × 코 2 = 최대 8장.
  function sprite(leg, rtl, noseOn, dpr) {
    const key = [opts.fontSize, opts.glow, opts.reindeer, opts.suitColor, opts.sleighColor, opts.goldColor, opts.reindeerColor, opts.noseColor, opts.presentColors.join(), dpr].join('|');
    if (!sheet || sheet.key !== key) { sheet?.imgs.forEach((im) => { im.canvas.width = im.canvas.height = 0; }); sheet = { key, imgs: new Map() }; }
    const k = `${leg}${rtl ? 1 : 0}${noseOn ? 1 : 0}`;
    if (sheet.imgs.has(k)) return sheet.imgs.get(k);
    const art = santaArt(opts, leg, rtl), fs = opts.fontSize, cell = cellSize(fs), gp = opts.glow * fs * 0.6;
    const pad = Math.ceil(gp * 2 * 2) + 2;
    const artW = art[0].length * cell.w, artH = art.length * cell.h;
    const c = document.createElement('canvas');
    c.width = Math.ceil((artW + pad * 2) * dpr); c.height = Math.ceil((artH + pad * 2) * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    art.forEach((row, r) => row.forEach(([ch, kk], col) => {
      if (ch === ' ') return;
      const nose = kk === 'n';
      const glowPx = nose ? gp * 2 : kk === 'g' || kk === 'w' ? gp * 0.55 : /[1-4]/.test(kk) ? gp * 0.45 : gp * 0.25;
      stamp(g, glyph(ch, color(kk), fs, glowPx, dpr, kk !== 'k'), pad + col * cell.w, pad + r * cell.h, nose && !noseOn ? 0.45 : 1);
    }));
    const im = { canvas: c, pad, artW, artH, cell, rows: art.length };
    sheet.imgs.set(k, im);
    return im;
  }

  function schedule(sec) {
    clearTimeout(timer);
    if (destroyed || isStatic() || !(sec >= 0)) return;
    timer = setTimeout(() => fly(), sec * 1000);
  }

  // 바로 한 번 날린다. dir: 'ltr' | 'rtl', path: 깊이 경로(없으면 설정)
  function fly(dir, path) {
    if (destroyed || isStatic()) return;
    const rtl = dir ? dir === 'rtl' : opts.direction === 'rtl' || (opts.direction === 'alternate' && flights % 2 === 1);
    const pth = PATHS.includes(path) ? path : opts.path === 'random' ? ['swoop', 'swoop', 'approach', 'recede'][Math.floor(Math.random() * 4)] : opts.path;
    flights++;
    flight = { rtl, path: pth, born: now, jitter: (Math.random() - 0.5) * 0.06 };
    clock.wake();
    if (opts.every > 0) schedule(opts.duration + opts.every);
  }

  // 썰매에서 선물 하나를 떨어뜨린다
  function drop() {
    if (destroyed || isStatic() || !flight || !bounds) return false;
    const b = bounds;
    const gx = b.rtl ? b.x + b.w - (b.cellW * 9) : b.x + b.cellW * 4;
    gifts.push({ x: gx, y: b.y + b.cellH * 4, vx: b.vx * 0.35 + (Math.random() - 0.5) * 30, vy: -50 * b.s, s: b.s, born: now, c: opts.presentColors[Math.floor(Math.random() * opts.presentColors.length)], landed: 0 });
    clock.wake();
    return true;
  }

  function draw(t, dt) {
    now = t;
    const dpr = dprOf(), W = globalThis.innerWidth || 1, H = globalThis.innerHeight || 1;
    fitCanvas(canvas, W, H, dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    canvas.style.opacity = String(opts.opacity);
    ctx.imageSmoothingQuality = 'high';
    const base = sprite(0, false, true, dpr);
    const fit = Math.min(1, (W * 0.55) / base.artW); // 좁은 화면에서는 가장 가까울 때도 폭 55% 안
    const [a0, a1] = opts.altitude, [s0, s1] = opts.scale;

    if (isStatic()) {
      const im = base, s = s1 * fit;
      ctx.globalAlpha = 1;
      ctx.drawImage(im.canvas, W * 0.05 - im.pad * s, H * a1 - im.pad * s, (im.artW + im.pad * 2) * s, (im.artH + im.pad * 2) * s);
      bounds = null;
      bloom.draw(opts.bloom);
      return;
    }
    bounds = null;
    if (flight) {
      const p = (t - flight.born) / opts.duration;
      if (p >= 1) flight = null;
      else {
        const d = depthAt(flight.path, p), s = (s0 + (s1 - s0) * d) * fit;
        const im = sprite(Math.floor(t * 6) % 2, flight.rtl, twinkle(t, 1.2, 0, 1) > 0.45, dpr);
        const w = im.artW * s, h = im.artH * s, span = W + w + 40;
        const x = flight.rtl ? W + 20 - p * span : -w - 20 + p * span;
        const y = H * (a0 + (a1 - a0) * d + flight.jitter) - Math.sin(p * Math.PI) * H * 0.03 + Math.sin(t * 4.2) * im.cell.h * 0.35 * opts.bob * s;
        const fade = Math.min(1, p / 0.08, (1 - p) / 0.08);
        ctx.globalAlpha = opts.opacity * (0.55 + 0.45 * d) * fade; // 멀수록 흐릿하게
        ctx.drawImage(im.canvas, x - im.pad * s, y - im.pad * s, (im.artW + im.pad * 2) * s, (im.artH + im.pad * 2) * s);
        bounds = { x, y, w, h, s, rtl: flight.rtl, cellW: im.cell.w * s, cellH: im.cell.h * s, vx: (flight.rtl ? -1 : 1) * span / opts.duration };
        if (opts.trail && Math.random() < 0.8) {
          const rx = flight.rtl ? x + w - im.cell.w * 2 * s : x + im.cell.w * s;
          glitter.push({ x: rx, y: y + im.cell.h * (im.rows - 1.5) * s, vx: (flight.rtl ? 1 : -1) * (20 + Math.random() * 40) * s, born: t, s, ch: '*+.'[Math.floor(Math.random() * 3)], c: Math.random() < 0.6 ? opts.goldColor : '#ffffff' });
        }
      }
    }
    glitter = glitter.filter((g) => t - g.born < 1.4);
    for (const g of glitter) {
      const age = t - g.born, fs = Math.max(6, Math.round(opts.fontSize * g.s));
      stamp(ctx, glyph(g.ch, g.c, fs, opts.glow * fs * 0.5, dpr), g.x + g.vx * age, g.y + (35 * age + 18 * age * age) * g.s, (1 - age / 1.4) * 0.8);
    }
    // 떨어지는 선물: 중력으로 떨어져 바닥에 닿으면 반짝이며 사라진다
    const ground = H - 6;
    gifts = gifts.filter((g) => !g.landed || t - g.landed < 0.9);
    for (const g of gifts) {
      const fs = Math.max(6, Math.round(opts.fontSize * g.s * 1.1)), cell = cellSize(fs), gh = cell.h * GIFT.length;
      if (!g.landed) {
        g.vy += 650 * dt; g.vx *= 1 - Math.min(1, dt * 0.6);
        g.x += g.vx * dt + Math.sin((t - g.born) * 5) * 12 * dt; g.y += g.vy * dt;
        if (g.y + gh >= ground) { g.y = ground - gh; g.landed = t; }
      }
      const la = g.landed ? 1 - (t - g.landed) / 0.9 : 1;
      GIFT.forEach(([line, kinds], r) => [...line].forEach((ch, k) => {
        if (ch === ' ') return;
        const cc = kinds[k] === 'g' ? opts.goldColor : g.c;
        stamp(ctx, glyph(ch, cc, fs, opts.glow * fs * (kinds[k] === 'g' ? 0.5 : 0.3), dpr, true), g.x + k * cell.w, g.y + r * cell.h, la);
      }));
      if (g.landed) for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI - Math.PI, rr = (t - g.landed) * 60;
        stamp(ctx, glyph('*', opts.goldColor, fs, opts.glow * fs * 0.5, dpr), g.x + cell.w * 2 + Math.cos(ang) * rr, g.y + Math.sin(ang) * rr * 0.6, la * 0.8);
      }
    }
    ctx.globalAlpha = 1;
    bloom.draw(opts.bloom);
  }

  clock = frameLoop2d(draw, 60, () => isStatic() || (!flight && !glitter.length && !gifts.length));
  if (!isStatic()) schedule(opts.startDelay);

  // 산타(둘레 24px 여유)를 한 번 누르면 선물. 이 누름은 별똥별을 만들지 않게 표시한다(__asciiConsumed).
  const downs = new Map();
  const onDown = (e) => { if (e.button === 0 && e.isPrimary) downs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() }); };
  const onUp = (e) => {
    const d = downs.get(e.pointerId);
    downs.delete(e.pointerId);
    if (!d || !opts.dropOnClick || !bounds) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12 || performance.now() - d.t > 900) return;
    const b = bounds, m = 24;
    if (e.clientX < b.x - m || e.clientX > b.x + b.w + m || e.clientY < b.y - m || e.clientY > b.y + b.h + m) return;
    if (drop()) e.__asciiConsumed = true;
  };
  const onCancel = (e) => downs.delete(e.pointerId);
  const onMotion = () => { clock.restart(); if (isStatic()) clearTimeout(timer); else schedule(opts.startDelay); };
  const onResize = () => clock.redraw();
  const L = [['pointerdown', onDown], ['pointerup', onUp], ['pointercancel', onCancel], ['resize', onResize]];
  for (const [n, f] of L) globalThis.addEventListener?.(n, f, { passive: true });
  reduced?.addEventListener?.('change', onMotion);

  return {
    element: canvas,
    fly,
    drop,
    get flying() { return !!flight; },
    /** 지금 산타가 그려진 자리(CSS px). 날고 있지 않으면 null */
    get bounds() { return bounds && { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h, scale: bounds.s }; },
    /** 떨어지고 있는 선물 수 */
    get presentCount() { return gifts.length; },
    update(next = {}) {
      if (destroyed) return;
      const prev = opts;
      opts = normalizeSanta({ ...prev, ...defined(next) });
      canvas.style.zIndex = String(opts.zIndex);
      canvas.style.opacity = String(opts.opacity);
      // 간격이 바뀌면 예약을 다시 잡는다. 비행 중이면 남은 시간 뒤로(0이면 예약 취소). 이전 예약이 지금 비행을 덮어쓰지 않게 한다.
      if (opts.every !== prev.every) {
        const left = flight ? Math.max(0, (1 - (now - flight.born) / opts.duration) * opts.duration) : 0;
        schedule(opts.every > 0 ? left + opts.every : -1);
      }
      if (opts.respectReducedMotion !== prev.respectReducedMotion) onMotion();
      else clock.redraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(timer);
      clock.dispose();
      for (const [n, f] of L) globalThis.removeEventListener?.(n, f, { passive: true });
      reduced?.removeEventListener?.('change', onMotion);
      sheet?.imgs.forEach((im) => { im.canvas.width = im.canvas.height = 0; });
      bloom.remove();
      canvas.remove();
    },
  };
}
