// 화면 전체에 눈을 뿌린다. WebGPU가 되면 vgpu로, 안 되면 Canvas 2D로 그린다.
// 사용: const snow = createSnow({ count: 300 }); snow.update({ wind: -0.3 }); snow.destroy();
import { DEFAULTS, FALL_PER_SEC, SWAY_PX, normalize, parseColor } from './model.js';
import { defined } from './util.js';
import { createCanvasRenderer } from './canvas.js';

export { DEFAULTS };
export { createTree, TREE_DEFAULTS } from './tree.js';
export { createStars, STARS_DEFAULTS } from './stars.js';
export { createSanta, SANTA_DEFAULTS } from './santa.js';

export function createSnow(options = {}) {
  if (typeof document === 'undefined') throw new Error('createSnow는 브라우저에서만 실행한다');
  const container = options.container || document.body;
  let opts = normalize(options);
  let color = parseColor(opts.color);
  let canvas = null, renderer = null, fallbackReason = '';
  let destroyed = false, raf = 0, last = 0, generation = 0;
  const acc = { fall: 0, drift: 0, time: 0 };
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const isStatic = () => opts.respectReducedMotion && !!reduced?.matches;

  let resolveReady;
  const ready = new Promise((r) => { resolveReady = r; });

  // 렌더러마다 새 캔버스를 쓴다. 캔버스는 처음 얻은 컨텍스트 종류(webgpu/2d)에 묶이기 때문이다.
  function makeCanvas() {
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.dataset.snow = '';
    Object.assign(c.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      display: 'block', pointerEvents: 'none', zIndex: String(opts.zIndex),
    });
    container.appendChild(c);
    return c;
  }

  function uniforms() {
    return { color, opacity: opts.opacity, size: opts.size, fall: acc.fall, drift: acc.drift, time: acc.time, sway: SWAY_PX, bokeh: opts.bokeh };
  }

  function renderOnce() {
    if (!renderer) return;
    try { renderer.render(uniforms(), opts.count); }
    catch (e) { fail(e); }
  }

  function tick(now) {
    raf = 0;
    if (destroyed || !renderer) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0; // 탭 복귀 때 튀지 않게 0.1초로 자른다
    last = now;
    acc.fall += dt * opts.speed * FALL_PER_SEC;
    acc.drift += dt * opts.speed * opts.wind * FALL_PER_SEC;
    acc.time += dt * opts.speed;
    renderOnce(); // 실패하면 fail()이 Canvas 2D로 바꾸며 새 루프를 예약한다
    if (!isStatic() && !raf) raf = requestAnimationFrame(tick); // 루프가 둘이 되지 않게
  }

  function loop() {
    if (raf || destroyed) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  }

  function stopRenderer() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    renderer?.dispose();
    canvas?.remove();
    renderer = canvas = null;
  }

  function use(r, c, gen) {
    if (destroyed || gen !== generation) { r.dispose(); c.remove(); return; }
    renderer = r; canvas = c;
    c.dataset.snowRenderer = r.name;
    resolveReady(r.name);
    loop();
  }

  // WebGPU가 실행 중 실패하면 Canvas 2D로 바꾼다. Canvas 2D가 실패하면 멈춘다(장식이라 페이지는 그대로 둔다).
  function fail(e) {
    if (destroyed) return;
    if (renderer?.name !== 'webgpu') {
      console.error('[snow]', e);
      if (renderer) stopRenderer();
      return;
    }
    fallbackReason = String(e?.message || e);
    stopRenderer();
    const c = makeCanvas();
    use(createCanvasRenderer(c), c, generation);
  }

  async function start() {
    const gen = ++generation;
    stopRenderer();
    if (opts.renderer !== 'canvas') {
      if (globalThis.navigator?.gpu) {
        const c = makeCanvas();
        try {
          const { createWebGPURenderer } = await import('./webgpu.js');
          const r = await createWebGPURenderer(c, (err) => { if (gen === generation) fail(err); });
          return use(r, c, gen);
        } catch (e) {
          c.remove();
          fallbackReason = String(e?.message || e);
        }
      } else {
        fallbackReason = '이 브라우저에 WebGPU(navigator.gpu)가 없음';
      }
      if (opts.renderer === 'webgpu') { resolveReady(null); return; } // 강제 지정이면 대체하지 않는다
    }
    if (destroyed || gen !== generation) return;
    const c = makeCanvas();
    try { use(createCanvasRenderer(c), c, gen); }
    catch (e) { c.remove(); fallbackReason += ' / ' + (e?.message || e); resolveReady(null); }
  }

  const onMotionChange = () => { if (isStatic()) { if (raf) cancelAnimationFrame(raf); raf = 0; renderOnce(); } else loop(); };
  const onResize = () => { if (isStatic()) requestAnimationFrame(renderOnce); };
  reduced?.addEventListener?.('change', onMotionChange);
  globalThis.addEventListener?.('resize', onResize);

  start();

  return {
    ready, // 실제 쓰는 렌더러 이름('webgpu' | 'canvas')으로 끝난다. 실패하면 null
    get renderer() { return renderer?.name ?? null; },
    get fallbackReason() { return fallbackReason; },
    get canvas() { return canvas; },
    update(next = {}) {
      if (destroyed) return;
      const prev = opts;
      opts = normalize({ ...prev, ...defined(next) }); // undefined는 바꾸지 않음
      if (opts.color !== prev.color) color = parseColor(opts.color);
      if (canvas && opts.zIndex !== prev.zIndex) canvas.style.zIndex = String(opts.zIndex);
      if (opts.renderer !== prev.renderer) { start(); return; }
      if (opts.respectReducedMotion !== prev.respectReducedMotion) onMotionChange();
      else if (isStatic()) renderOnce();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation++;
      stopRenderer();
      reduced?.removeEventListener?.('change', onMotionChange);
      globalThis.removeEventListener?.('resize', onResize);
      resolveReady(null);
    },
  };
}
