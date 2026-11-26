// ASCII 캔버스 공통: 고정폭 글자 크기, 빛 번짐(glow)이 들어간 글자 그림 캐시, 프레임 루프, 색 섞기.
// 빛 번짐(shadowBlur)은 매 프레임 그리면 비싸서, (글자·색·번짐·크기)마다 한 번만 그려 두고 drawImage로 찍는다.
import { MONO } from './util.js';

export function hexToRgb(c) {
  const h = String(c).replace('#', '');
  const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.padEnd(6, '0');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0);
}
export const rgbToHex = (r) => '#' + r.map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('');
export const mixHex = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((x, i) => x + (B[i] - x) * t)); };
// 여러 색 사이의 t(0..1) 지점
export function gradientAt(stops, t) {
  if (stops.length === 1) return stops[0];
  const x = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1), i = Math.floor(x);
  return mixHex(stops[i], stops[i + 1], x - i);
}
// glow: true→1, false→0, 숫자는 그대로(0..3)
export const glowAmount = (g, d = 1) => (g === true ? d : g === false ? 0 : Math.min(3, Math.max(0, Number.isFinite(+g) ? +g : d)));

export const dprOf = () => Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));

// 글자 한 칸의 크기(CSS px). 고정폭 글꼴의 실제 폭을 잰다.
const metricsCache = new Map();
export function cellSize(fontSize) {
  if (!metricsCache.has(fontSize)) {
    const c = document.createElement('canvas').getContext('2d');
    c.font = `${fontSize}px ${MONO}`;
    metricsCache.set(fontSize, { w: c.measureText('MMMMMMMMMM').width / 10, h: Math.round(fontSize * 1.12 * 100) / 100 });
  }
  return metricsCache.get(fontSize);
}

// 빛 번짐 반경은 이 단계 중 하나만 쓴다(최대 30px). 반경이 연속으로 바뀌면 그림이 끝없이 새로 생겨
// 휴대폰 캔버스 메모리를 넘긴다(v3: 약 1,100장·194MB). 반짝임은 반경 대신 투명도로 표현한다.
const GLOW_STEPS = [0, 3, 6, 10, 15, 22, 30];
export const glowStep = (px) => GLOW_STEPS.reduce((best, g) => (Math.abs(g - px) < Math.abs(best - px) ? g : best), 0);

// 글자 그림 캐시(최근 사용 순, 최대 MAX장). 같은 캐시를 여러 컴포넌트가 함께 쓴다.
const sprites = new Map();
const MAX = 600;
export const spriteCount = () => sprites.size;
export function glyph(ch, color, fontSize, glowPx, dpr, bold = false) {
  glowPx = glowStep(glowPx);
  const key = `${ch}|${color}|${fontSize}|${glowPx}|${dpr}|${bold}`;
  let s = sprites.get(key);
  if (s) { sprites.delete(key); sprites.set(key, s); return s; }
  while (sprites.size >= MAX) sprites.delete(sprites.keys().next().value);
  const { w, h } = cellSize(fontSize);
  const pad = Math.ceil(glowPx * 2);
  const c = document.createElement('canvas');
  c.width = Math.ceil((w + pad * 2) * dpr);
  c.height = Math.ceil((h + pad * 2) * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.font = `${bold ? '700 ' : ''}${fontSize}px ${MONO}`;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillStyle = color;
  if (glowPx > 0) {
    g.shadowColor = color;
    g.shadowBlur = glowPx * dpr; // shadowBlur는 변환 배율을 따르지 않아 dpr을 곱한다
    g.fillText(ch, pad + w / 2, pad + h / 2);
    g.shadowBlur = glowPx * 0.45 * dpr; // 두 번 그려 중심을 더 밝게
  }
  g.fillText(ch, pad + w / 2, pad + h / 2);
  s = { canvas: c, pad, w, h, cw: w + pad * 2, ch: h + pad * 2 };
  sprites.set(key, s);
  return s;
}

// 칸 (x, y)의 왼쪽 위를 기준으로 글자를 찍는다(CSS px).
export function stamp(ctx, sp, x, y, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(sp.canvas, x - sp.pad, y - sp.pad, sp.cw, sp.ch);
}

// 겹치는 캔버스 하나. fixed 위치·클릭 통과·aria-hidden.
export function overlayCanvas(zIndex, container) {
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position: 'fixed', pointerEvents: 'none', display: 'block', zIndex: String(zIndex), margin: '0', padding: '0', border: '0', background: 'transparent' });
  (container || document.body).appendChild(c);
  return c;
}

// 캔버스를 CSS 크기에 맞춘다. 바뀌었으면 true
export function fitCanvas(c, w, h, dpr) {
  const bw = Math.max(1, Math.round(w * dpr)), bh = Math.max(1, Math.round(h * dpr));
  c.style.width = `${w}px`; c.style.height = `${h}px`;
  if (c.width === bw && c.height === bh) return false;
  c.width = bw; c.height = bh;
  return true;
}

// rAF 루프(fps 상한). 움직임 줄이기면 한 번만 그린다. draw(t초, dt초)
// fps는 숫자나 함수(지금 필요한 fps를 돌려줌). 예: 별똥별이 있을 때만 60.
export function frameLoop2d(draw, fps, isStatic) {
  let raf = 0, last = 0, t = 0, prevNow = 0, stopped = false;
  const stepOf = () => 1000 / (typeof fps === 'function' ? fps() : fps);
  const tick = (now) => {
    raf = 0;
    if (stopped) return;
    if (!prevNow) prevNow = now;
    if (now - last >= stepOf() - 1) {
      const dt = Math.min(0.1, (now - prevNow) / 1000);
      prevNow = now; last = now; t += dt;
      draw(t, dt);
    }
    if (!isStatic()) raf = requestAnimationFrame(tick);
  };
  const start = () => { if (raf) cancelAnimationFrame(raf); raf = 0; prevNow = 0; if (stopped) return; if (isStatic()) draw(t, 0); else raf = requestAnimationFrame(tick); };
  start();
  return {
    restart: start,
    redraw: () => { if (!stopped) draw(t, 0); },
    wake: () => { if (!raf && !stopped && !isStatic()) { prevNow = 0; raf = requestAnimationFrame(tick); } },
    dispose() { stopped = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
    get running() { return !!raf; },
  };
}

// 은은한 번짐(bloom) 층: 본 캔버스를 작게 줄였다가(1/3 → 1/9) 같은 크기로 늘려 '밝게 더하기(screen)'로 겹친다.
// CSS·캔버스 흐림 필터를 쓰지 않아, 휴대폰 GPU에 화면 전체 흐림 비용을 주지 않는다(늘릴 때의 부드러운 보간만 쓴다).
// strength 0이면 숨긴다. 본 캔버스 위치(style)를 따라간다.
export function bloomLayer(main, container) {
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  c.dataset.bloom = '';
  Object.assign(c.style, { position: 'fixed', pointerEvents: 'none', display: 'none', mixBlendMode: 'screen', margin: '0', padding: '0', border: '0', background: 'transparent' });
  main.after ? main.after(c) : (container || document.body).appendChild(c);
  const mid = document.createElement('canvas');
  const cx = c.getContext('2d'), mx = mid.getContext('2d');
  const KEYS = ['left', 'top', 'right', 'bottom', 'transform', 'width', 'height', 'zIndex'];
  return {
    canvas: c,
    draw(strength) {
      if (!(strength > 0) || !main.width) { c.style.display = 'none'; return; }
      for (const k of KEYS) if (c.style[k] !== main.style[k]) c.style[k] = main.style[k];
      c.style.display = 'block';
      c.style.opacity = String(Math.min(1, 0.5 * strength));
      const cw = parseFloat(main.style.width) || main.clientWidth || 1, ch = parseFloat(main.style.height) || main.clientHeight || 1;
      const w1 = Math.max(1, Math.ceil(cw / 3)), h1 = Math.max(1, Math.ceil(ch / 3));
      const w2 = Math.max(1, Math.ceil(cw / 9)), h2 = Math.max(1, Math.ceil(ch / 9));
      if (mid.width !== w1 || mid.height !== h1) { mid.width = w1; mid.height = h1; }
      if (c.width !== w2 || c.height !== h2) { c.width = w2; c.height = h2; }
      mx.clearRect(0, 0, w1, h1); mx.imageSmoothingQuality = 'high'; mx.drawImage(main, 0, 0, w1, h1);
      cx.clearRect(0, 0, w2, h2); cx.imageSmoothingQuality = 'high'; cx.drawImage(mid, 0, 0, w2, h2);
      cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.6; cx.drawImage(mid, 0, 0, w2, h2); // 가운데를 조금 더 밝게
      cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
    },
    remove() { c.remove(); mid.width = mid.height = 0; },
  };
}

// 부드러운 원형 빛무리(아련한 배경 빛). x, y, r은 CSS px
export function halo(ctx, x, y, r, color, alpha) {
  if (!(alpha > 0) || !(r > 0)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  const [R, G, B] = hexToRgb(color);
  g.addColorStop(0, `rgba(${R},${G},${B},${alpha})`);
  g.addColorStop(0.45, `rgba(${R},${G},${B},${alpha * 0.35})`);
  g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
