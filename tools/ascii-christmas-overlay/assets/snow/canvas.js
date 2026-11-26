// Canvas 2D 렌더러. WebGPU가 없는 기기(휴대폰 등)에서도 같은 눈을 그린다.
import { seeds, flake } from './model.js';

const SPRITE = 64;

// snow.wgsl fs_main과 같은 가장자리: 1 - smoothstep(mix(0.55, 0, soft), 1, r). soft는 5단계 그림으로 나눈다.
const SOFT_LEVELS = 4;
function makeSprite(rgb, soft) {
  const e0 = 0.55 * (1 - soft);
  const c = document.createElement('canvas');
  c.width = c.height = SPRITE;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(SPRITE, SPRITE);
  const [r, g, b] = rgb.map((v) => Math.round(v * 255));
  for (let y = 0; y < SPRITE; y++) {
    for (let x = 0; x < SPRITE; x++) {
      const dx = ((x + 0.5) / SPRITE) * 2 - 1, dy = ((y + 0.5) / SPRITE) * 2 - 1;
      const t = Math.min(1, Math.max(0, (Math.hypot(dx, dy) - e0) / (1 - e0)));
      const a = 1 - t * t * (3 - 2 * t);
      const p = (y * SPRITE + x) * 4;
      img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function createCanvasRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D를 만들 수 없음');
  let s = null, sprites = [], spriteKey = '';
  const f = {};
  return {
    name: 'canvas',
    render(u, count) {
      const dpr = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
      const W = canvas.clientWidth || 1, H = canvas.clientHeight || 1;
      const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      const key = u.color.join(',');
      if (key !== spriteKey) { sprites = Array.from({ length: SOFT_LEVELS + 1 }, (_, i) => makeSprite(u.color, i / SOFT_LEVELS)); spriteKey = key; }
      s = seeds(count, s);
      const uu = { ...u, viewport: [W, H] };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < count; i++) {
        flake(s, i, uu, f);
        ctx.globalAlpha = f.a;
        ctx.drawImage(sprites[Math.round(f.s * SOFT_LEVELS)], f.x - f.d / 2, f.y - f.d / 2, f.d, f.d);
      }
      ctx.globalAlpha = 1;
    },
    dispose() { canvas.width = canvas.height = 0; },
  };
}
