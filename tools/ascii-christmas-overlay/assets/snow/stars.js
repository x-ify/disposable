// 화면 위쪽의 3D 느낌 ASCII 별(Canvas 2D)과 누른 자리에서 떨어지는 별똥별.
// 별마다 깊이(z)가 있어 가까울수록 크고 밝고 빛살이 생기며, 흐르는 속도·마우스 시차가 커져 입체로 보인다.
// 색은 노랑~하양 사이에서 별마다 다르다. 빛 번짐은 미리 그린 글자 그림으로 찍는다.
import { hash01, defined, same, reducedMotionQuery, twinkle } from './util.js';
import { glyph, stamp, overlayCanvas, fitCanvas, frameLoop2d, dprOf, gradientAt, glowAmount, cellSize, bloomLayer } from './glyphs.js';

export const STARS_DEFAULTS = Object.freeze({
  count: 90,              // 별 수
  area: 0.65,             // 화면 위에서부터 별이 놓이는 높이 비율 0..1
  frames: '.+*',          // 먼 별의 반짝임 글자(어두움→밝음)
  color: ['#ffd23f', '#ffe680', '#fff3c4', '#ffffff'], // 노랑→하양. 별마다 이 사이의 한 색
  size: [9, 22],          // 글자 크기 px [먼 별, 가까운 별]
  depth: 1,               // 깊이감(흐름·마우스 시차) 0..3. 0이면 평면
  drift: 1,               // 저절로 흐르는 속도 배수
  glow: 1.6,              // 빛 번짐 세기 0..3 (true/false도 받음)
  bloom: 0.8,             // 은은한 번짐 층 0..2. 0이면 없음
  speed: 0.8,             // 반짝임 속도 배수
  opacity: 1,
  zIndex: 9996,
  seed: 7,
  shootOnClick: true,     // 누른 자리에서 별똥별
  shootingColor: '#fff3d1',
  shootingSize: 12,       // 별똥별 글자 크기 px
  shootingOpacity: 0.7,   // 별똥별 진하기 0..1
  shootingSpeed: 1,
  shootingLength: 10,     // 꼬리 글자 수
  autoShoot: 0,           // 저절로 떨어지는 간격(초). 0이면 끔
  respectReducedMotion: true,
});

const LAYOUT = ['count', 'area', 'size', 'seed', 'color'];
const SWAP = { '/': '\\', '\\': '/' };

export function normalizeStars(o) {
  const r = { ...STARS_DEFAULTS, ...defined(o) };
  r.count = Math.min(1500, Math.max(0, Math.floor(Number(r.count) || 0)));
  r.area = Math.min(1, Math.max(0.05, Number(r.area) || 0.65));
  r.frames = String(r.frames || STARS_DEFAULTS.frames);
  r.color = [].concat(r.color).filter(Boolean);
  if (!r.color.length) r.color = [...STARS_DEFAULTS.color];
  const sz = Array.isArray(r.size) ? r.size : [Math.max(5, Number(r.size) * 0.45), Number(r.size)];
  r.size = [Math.max(5, Number(sz[0]) || 9), Math.max(5, Number(sz[1]) || 22)].sort((a, b) => a - b);
  for (const k of ['depth', 'drift', 'speed', 'shootingSpeed']) r[k] = Math.max(0, Number(r[k]) || 0);
  r.depth = Math.min(3, r.depth);
  r.glow = glowAmount(r.glow, 1.6);
  r.bloom = Math.min(2, Math.max(0, Number(r.bloom) || 0));
  r.shootingSize = Math.max(6, Math.min(40, Number(r.shootingSize) || 12));
  r.shootingOpacity = Math.min(1, Math.max(0, Number.isFinite(+r.shootingOpacity) ? +r.shootingOpacity : 0.7));
  r.shootingLength = Math.max(2, Math.min(40, Math.round(Number(r.shootingLength) || 10)));
  r.autoShoot = Math.max(0, Number(r.autoShoot) || 0);
  r.opacity = Math.min(1, Math.max(0, Number(r.opacity)));
  return r;
}

export function createStars(options = {}) {
  if (typeof document === 'undefined') throw new Error('createStars는 브라우저에서만 실행한다');
  let opts = normalizeStars(options);
  const canvas = overlayCanvas(opts.zIndex, options.container);
  canvas.dataset.asciiStars = '';
  Object.assign(canvas.style, { left: '0', top: '0' });
  const ctx = canvas.getContext('2d');
  const bloom = bloomLayer(canvas, options.container);
  const reduced = reducedMotionQuery();
  const isStatic = () => opts.respectReducedMotion && !!reduced?.matches;
  let stars = [], layoutKey = null, destroyed = false, meteors = [], debris = [], now = 0, nextAuto = 0;
  const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

  function build() {
    stars = [];
    for (let i = 0; i < opts.count; i++) {
      const h = (k) => hash01(opts.seed * 7919 + k, i);
      const z = h(3) ** 1.6; // 먼 별이 더 많다
      const fs = Math.round(opts.size[0] + (opts.size[1] - opts.size[0]) * Math.round(z * z * 3) / 3); // 4단계
      stars.push({ x: h(1), y: h(2) * opts.area, z, fs, color: gradientAt(opts.color, Math.round(h(5) * 7) / 7), freq: 0.15 + 0.55 * h(4), phase: h(6), big: z > 0.78 });
    }
    layoutKey = LAYOUT.map((k) => opts[k]);
    canvas.style.zIndex = String(opts.zIndex);
    canvas.style.opacity = String(opts.opacity);
  }

  // 누른 자리에서 아래쪽 대각선으로 떨어지는 별똥별
  function shoot(x, y) {
    if (destroyed || isStatic()) return;
    const W = globalThis.innerWidth || 1;
    const dir = x > W * 0.7 ? -1 : x < W * 0.3 ? 1 : (Math.random() < 0.5 ? -1 : 1);
    const ang = (25 + Math.random() * 25) * (Math.PI / 180);
    const v = 520 * Math.max(0.1, opts.shootingSpeed);
    meteors.push({ x0: x, y0: y, vx: Math.cos(ang) * v * dir, vy: Math.sin(ang) * v, born: now, life: 1.2 });
    clock.wake();
  }

  function draw(t, dt) {
    now = t;
    const dpr = dprOf(), W = globalThis.innerWidth || 1, H = globalThis.innerHeight || 1;
    fitCanvas(canvas, W, H, dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 3);
    ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 3);
    const tt = t * opts.speed, glow = opts.glow;
    const px = (ptr.x - 0.5) * opts.depth, py = (ptr.y - 0.5) * opts.depth;

    for (const S of stars) {
      // 가까운 별일수록 빨리 흐르고 마우스에 크게 움직인다(시차)
      let x = (S.x + t * 0.004 * opts.drift * opts.depth * (0.2 + S.z)) % 1;
      const X = x * (W + 40) - 20 - px * 46 * S.z, Y = S.y * H - py * 28 * S.z;
      const b = twinkle(tt, S.freq, S.phase, S.big ? 1.6 : 2.6);
      const a = (0.3 + 0.7 * b) * (0.45 + 0.55 * S.z);
      const cell = cellSize(S.fs);
      const gp = glow * S.fs * 0.7 * (0.5 + S.z); // 별마다 고정(반짝임은 투명도로)
      if (S.big) {
        // 가까운 별: 가운데 * 와 빛살. 밝을수록 빛살이 길어진다
        stamp(ctx, glyph('*', '#ffffff', S.fs, gp * 1.4, dpr, true), X - cell.w / 2, Y - cell.h / 2, Math.min(1, a + 0.2));
        const rays = b > 0.75 ? 2 : b > 0.4 ? 1 : 0;
        for (let k = 1; k <= rays; k++) {
          const ra = a * (k === 1 ? 0.9 : 0.55);
          stamp(ctx, glyph('-', S.color, S.fs, gp, dpr), X - cell.w / 2 - k * cell.w, Y - cell.h / 2, ra);
          stamp(ctx, glyph('-', S.color, S.fs, gp, dpr), X - cell.w / 2 + k * cell.w, Y - cell.h / 2, ra);
          stamp(ctx, glyph('|', S.color, S.fs, gp, dpr), X - cell.w / 2, Y - cell.h / 2 - k * cell.h * 0.8, ra);
          stamp(ctx, glyph('|', S.color, S.fs, gp, dpr), X - cell.w / 2, Y - cell.h / 2 + k * cell.h * 0.8, ra);
        }
      } else {
        const fr = opts.frames;
        stamp(ctx, glyph(fr[Math.min(fr.length - 1, Math.floor(b * fr.length))], S.color, S.fs, gp, dpr), X - cell.w / 2, Y - cell.h / 2, a);
      }
    }

    // 별똥별: 머리 * , 지나온 길에 \ 또는 / 꼬리, 부스러기 반짝임
    if (opts.autoShoot > 0 && !isStatic()) {
      if (!nextAuto) nextAuto = t + opts.autoShoot * (0.5 + Math.random());
      if (t >= nextAuto) { nextAuto = t + opts.autoShoot * (0.6 + Math.random() * 0.8); shoot(W * (0.15 + Math.random() * 0.7), H * opts.area * (0.05 + Math.random() * 0.5)); }
    }
    const fs = Math.round(opts.shootingSize), mc = cellSize(fs), op = opts.shootingOpacity;
    meteors = meteors.filter((m) => t - m.born < m.life);
    for (const m of meteors) {
      const age = t - m.born, fade = Math.min(1, (m.life - age) / 0.45) * Math.min(1, age / 0.08);
      const hx = m.x0 + m.vx * age, hy = m.y0 + m.vy * age;
      const v = Math.hypot(m.vx, m.vy), ux = m.vx / v, uy = m.vy / v;
      const tailCh = SWAP[ux > 0 ? '/' : '\\']; // 오른쪽 아래로 가면 \ 꼬리
      const travelled = v * age, gap = mc.w * 1.05;
      for (let k = opts.shootingLength; k >= 1; k--) {
        if (k * gap > travelled) continue;
        const f = 1 - k / (opts.shootingLength + 1);
        const ch = k > opts.shootingLength * 0.6 ? '.' : tailCh;
        const step = Math.round((1 - f) * 4) / 4; // 색 5단계
        stamp(ctx, glyph(ch, gradientAt([opts.shootingColor, '#ffcf70'], step), fs - 1, glow * fs * 0.4, dpr), hx - ux * k * gap - mc.w / 2, hy - uy * k * gap - mc.h / 2, f * f * fade * op * 0.8);
      }
      stamp(ctx, glyph('*', opts.shootingColor, fs, glow * fs * 0.9, dpr), hx - mc.w / 2, hy - mc.h / 2, fade * op);
      if (age < 0.3) stamp(ctx, glyph('+', opts.shootingColor, fs, glow * fs * 0.9, dpr), m.x0 - mc.w / 2, m.y0 - mc.h / 2, (1 - age / 0.3) * op * 0.6);
      if (Math.random() < 0.35) debris.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 40 - ux * 30, vy: (Math.random() - 0.2) * 35, born: t });
    }
    debris = debris.filter((d) => t - d.born < 0.8);
    for (const d of debris) {
      const age = t - d.born;
      stamp(ctx, glyph('.', opts.shootingColor, fs - 2, glow * fs * 0.4, dpr), d.x + d.vx * age - mc.w / 2, d.y + d.vy * age + 30 * age * age - mc.h / 2, (1 - age / 0.8) * op * 0.6);
    }
    ctx.globalAlpha = 1;
    bloom.draw(opts.bloom);
  }

  build();
  const clock = frameLoop2d(draw, () => (meteors.length || debris.length ? 60 : 30), isStatic);

  // 누름 한 번 = 별똥별 하나. 손가락으로 스크롤하면 pointercancel이라 생기지 않는다.
  const downs = new Map();
  const onDown = (e) => { if (e.button === 0 && e.isPrimary) downs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() }); };
  const onUp = (e) => {
    const d = downs.get(e.pointerId);
    downs.delete(e.pointerId);
    if (!d || !opts.shootOnClick) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12 || performance.now() - d.t > 900) return;
    const x = e.clientX, y = e.clientY;
    // 산타를 눌러 선물이 떨어진 누름(__asciiConsumed)은 건너뛴다. 리스너 순서와 무관하게 이벤트가 끝난 뒤 확인한다.
    setTimeout(() => { if (!e.__asciiConsumed) shoot(x, y); }, 0);
  };
  const onCancel = (e) => downs.delete(e.pointerId);
  const onMove = (e) => { ptr.tx = e.clientX / (globalThis.innerWidth || 1); ptr.ty = e.clientY / (globalThis.innerHeight || 1); };
  const onMotion = () => clock.restart();
  const onResize = () => clock.redraw();
  const L = [['pointerdown', onDown], ['pointerup', onUp], ['pointercancel', onCancel], ['pointermove', onMove], ['resize', onResize]];
  for (const [n, f] of L) globalThis.addEventListener?.(n, f, { passive: true });
  reduced?.addEventListener?.('change', onMotion);

  return {
    element: canvas,
    /** 원하는 자리(화면 CSS px)에 별똥별 하나 */
    shoot,
    /** 지금 떨어지고 있는 별똥별 수 */
    get shootingCount() { return meteors.length; },
    update(next = {}) {
      if (destroyed) return;
      const prev = opts;
      opts = normalizeStars({ ...prev, ...defined(next) });
      if (!same(LAYOUT.map((k) => opts[k]), layoutKey)) build();
      canvas.style.zIndex = String(opts.zIndex);
      canvas.style.opacity = String(opts.opacity);
      if (opts.autoShoot !== prev.autoShoot) nextAuto = 0;
      if (opts.respectReducedMotion !== prev.respectReducedMotion) clock.restart();
      else clock.redraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clock.dispose();
      for (const [n, f] of L) globalThis.removeEventListener?.(n, f, { passive: true });
      reduced?.removeEventListener?.('change', onMotion);
      bloom.remove();
      canvas.remove();
    },
  };
}
