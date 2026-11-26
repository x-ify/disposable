// 세 컴포넌트(눈·트리·별)가 함께 쓰는 도구.

// PCG 해시. u32 곱셈의 넘침을 Math.imul로 맞춰 WGSL(snow.wgsl)과 같은 값을 낸다.
export function pcg(v) {
  const s = (Math.imul(v, 747796405) + 2891336453) >>> 0;
  const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) >>> 0, 277803737) >>> 0;
  return ((w >>> 22) ^ w) >>> 0;
}

// seed와 번호로 정해지는 0..1 난수
export const hash01 = (seed, i) => pcg((pcg(seed >>> 0) ^ (i >>> 0)) >>> 0) / 4294967296;

// undefined는 '지정 안 함'으로 본다. <Snow count={maybe} />가 기본값을 지우지 않게 한다.
export function defined(o = {}) {
  const r = {};
  for (const k in o) if (o[k] !== undefined) r[k] = o[k];
  return r;
}

// 값 비교(배열·객체 포함). React가 렌더마다 새 배열을 넘겨도 같은 값이면 다시 만들지 않는다.
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const reducedMotionQuery = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

// ASCII가 줄 맞춤을 유지하도록 글꼴·줄 간격을 직접 정한다. 페이지의 pre·div 스타일을 물려받지 않게 한다.
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "Courier New", monospace';

export function overlayBase(el, zIndex) {
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed', pointerEvents: 'none', userSelect: 'none', zIndex: String(zIndex),
    margin: '0', padding: '0', border: '0', background: 'transparent', boxSizing: 'content-box',
    fontFamily: MONO, fontWeight: '400', fontStyle: 'normal', letterSpacing: '0', wordSpacing: '0',
    fontVariantLigatures: 'none', fontKerning: 'none', textTransform: 'none', textShadow: 'none',
    whiteSpace: 'pre', textAlign: 'left',
  });
  return el;
}

// 반짝임: 대부분 어둡다가 잠깐 밝아진다(pow). 0..1
export function twinkle(t, freq, phase, sharp = 2.5) {
  return Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * (t * freq + phase)), sharp);
}

// 밝기 → 글자 단계. frames는 어두움→밝음 순서의 글자열(예: '.+*')
export const frameOf = (frames, b) => frames[Math.min(frames.length - 1, Math.floor(b * frames.length))];

// 일정 간격으로 부르는 시계. 움직임 줄이기면 한 번만 그린다.
export function ticker(draw, fps, isStatic) {
  let id = 0, t0 = performance.now(), stopped = false;
  const tick = () => draw((performance.now() - t0) / 1000);
  const start = () => { stop(); if (stopped) return; tick(); if (!isStatic()) id = setInterval(tick, 1000 / fps); };
  const stop = () => { if (id) clearInterval(id); id = 0; };
  start();
  return { restart: start, redraw: tick, dispose() { stopped = true; stop(); }, get running() { return !!id; } };
}
