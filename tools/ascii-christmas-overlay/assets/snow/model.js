// 눈송이 한 개의 위치·지름·투명도 계산. snow.wgsl의 vs_main과 같은 식이다. 한쪽을 고치면 다른 쪽도 고친다.
// 상태 없이 (번호, 누적값)만으로 정해지므로 두 렌더러가 같은 눈을 그린다.

import { pcg, defined } from './util.js';

export const DEFAULTS = Object.freeze({
  count: 250,          // 눈송이 수
  speed: 1,            // 낙하·흔들림 속도 배수
  wind: 0.15,          // 가로 흐름. 음수는 왼쪽
  size: [2, 6],        // 지름 [최소, 최대] CSS px
  color: '#ffffff',
  opacity: 0.9,
  bokeh: 0.5,          // 가까운 눈송이를 크고 흐릿하게(보케) 0..1. 0이면 모두 또렷
  zIndex: 9999,
  renderer: 'auto',    // 'auto' | 'webgpu' | 'canvas'
  respectReducedMotion: true, // 움직임 줄이기 설정이면 멈춘 한 장면만 그린다
});

export const FALL_PER_SEC = 0.12; // 화면 높이/초(가장 가까운 눈 기준)
export const SWAY_PX = 10;        // 좌우 흔들림 폭 px

const rand = (i, k) => pcg((i * 4 + k) >>> 0) / 4294967296;

// 번호별 고정 난수 [x0, y0, z(깊이), w(흔들림)]
export function seeds(n, prev) {
  if (prev && prev.length >= n * 4) return prev;
  const s = new Float64Array(n * 4);
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) s[i * 4 + k] = rand(i, k);
  return s;
}

const fract = (x) => x - Math.floor(x);
const mix = (a, b, t) => a + (b - a) * t;

// u: { viewport:[W,H], size:[min,max], fall, drift, time, sway, opacity, bokeh }
// out에 x, y(px, 왼쪽 위 원점), d(지름 px), a(투명도), s(흐림 0..1)를 쓴다.
export function flake(s, i, u, out) {
  const x0 = s[i * 4], y0 = s[i * 4 + 1], z = s[i * 4 + 2], w = s[i * 4 + 3];
  const [W, H] = u.viewport;
  const k = 0.35 + 0.65 * z;                  // 먼 눈은 느리게
  const bokeh = u.bokeh || 0;
  const t = Math.min(1, Math.max(0, (z - 0.6) / 0.4));
  const soft = bokeh * t * t * (3 - 2 * t);   // 가까울수록 크고 흐릿하게(smoothstep)
  const d = mix(u.size[0], u.size[1], z * z) * (1 + 1.5 * soft); // 대부분은 작게
  const grow = 1 + 1.5 * bokeh;
  const my = (u.size[1] * grow) / H, mx = (u.size[1] * grow) / W; // 화면 밖에서 들어오고 나가는 여백
  const y = fract(y0 + u.fall * k) * (1 + 2 * my) - my;
  const swayPx = u.sway * (0.4 + 0.6 * z) * Math.sin(u.time * (0.6 + 0.9 * w) + w * 6.2831853);
  const x = fract(x0 + u.drift * k + swayPx / W) * (1 + 2 * mx) - mx;
  out.x = x * W; out.y = y * H; out.d = d; out.a = u.opacity * (0.45 + 0.55 * z) * (1 - 0.45 * soft); out.s = soft;
  return out;
}

// 'size'는 숫자 하나(최대 지름)나 [최소, 최대]를 받는다.
export function normalize(o) {
  const r = { ...DEFAULTS, ...defined(o) };
  r.count = Math.max(0, Math.floor(Number(r.count) || 0));
  r.speed = Number(r.speed) || 0;
  r.wind = Number(r.wind) || 0;
  const sz = Array.isArray(r.size) ? r.size : [Math.max(1, Number(r.size) / 3), Number(r.size)];
  r.size = [Math.max(0.5, Number(sz[0]) || 1), Math.max(0.5, Number(sz[1]) || 1)];
  if (r.size[0] > r.size[1]) r.size = [r.size[1], r.size[0]];
  r.opacity = Math.min(1, Math.max(0, Number(r.opacity)));
  r.bokeh = Math.min(1, Math.max(0, Number(r.bokeh) || 0));
  if (!['auto', 'webgpu', 'canvas'].includes(r.renderer)) r.renderer = 'auto';
  return r;
}

// CSS 색 → [r, g, b] 0..1. 브라우저가 해석하므로 이름·hex·rgb() 모두 받는다.
let probe;
export function parseColor(css) {
  probe ??= document.createElement('canvas').getContext('2d');
  probe.fillStyle = '#ffffff';
  probe.fillStyle = css;
  const v = probe.fillStyle; // '#rrggbb' 또는 'rgba(r, g, b, a)'
  if (v[0] === '#') return [1, 3, 5].map((j) => parseInt(v.slice(j, j + 2), 16) / 255);
  const m = v.match(/[\d.]+/g) || ['255', '255', '255'];
  return m.slice(0, 3).map((n) => Number(n) / 255);
}
