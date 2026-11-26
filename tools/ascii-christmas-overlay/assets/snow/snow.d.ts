// snow.js 타입. 기본값은 src/model.js의 DEFAULTS.
export interface SnowOptions {
  /** 눈송이 수. 기본 250 */
  count?: number;
  /** 낙하·흔들림 속도 배수. 기본 1 */
  speed?: number;
  /** 가로 흐름. 음수는 왼쪽. 기본 0.15 */
  wind?: number;
  /** 지름 CSS px. [최소, 최대] 또는 최대 하나(최소 = 최대/3). 기본 [2, 6] */
  size?: number | [number, number];
  /** CSS 색. 기본 '#ffffff' */
  color?: string;
  /** 0..1. 기본 0.9 */
  opacity?: number;
  /** 가까운 눈송이를 크고 흐릿하게(보케) 0..1. 0이면 모두 또렷. 기본 0.5 */
  bokeh?: number;
  /** 캔버스 z-index. 기본 9999 */
  zIndex?: number;
  /** 'auto'는 WebGPU(vgpu)를 쓰고 안 되면 Canvas 2D. 기본 'auto' */
  renderer?: 'auto' | 'webgpu' | 'canvas';
  /** 기기의 움직임 줄이기 설정이면 멈춘 한 장면만 그린다. 기본 true */
  respectReducedMotion?: boolean;
  /** 캔버스를 붙일 요소(마운트 때만 읽음). 기본 document.body. 캔버스는 position: fixed로 화면 전체를 덮는다 */
  container?: HTMLElement;
}

export interface Snow {
  /** 실제 쓰는 렌더러 이름으로 끝난다. 그리지 못하면 null */
  readonly ready: Promise<'webgpu' | 'canvas' | null>;
  readonly renderer: 'webgpu' | 'canvas' | null;
  /** WebGPU를 쓰지 않은 이유(대체했을 때) */
  readonly fallbackReason: string;
  readonly canvas: HTMLCanvasElement | null;
  /** 바뀐 값만 넘겨도 된다. undefined는 바꾸지 않는다. renderer를 바꾸면 새로 시작한다 */
  update(options: Partial<SnowOptions>): void;
  destroy(): void;
}

export const DEFAULTS: Readonly<Required<Omit<SnowOptions, 'container' | 'size'>> & { size: [number, number] }>;
export function createSnow(options?: SnowOptions): Snow;

export interface TreeOptions {
  /** 잎 부분 높이(글자 줄 수) 6..60. 기본 24 */
  rows?: number;
  /** 층 수 1..6. 기본 4 */
  tiers?: number;
  /** 글자 크기 px. 화면보다 크면 맞게 줄인다. 기본 13 */
  fontSize?: number;
  /** 회전 속도(라디안/초). 0이면 멈춘 입체. 기본 0.25 */
  rotate?: number;
  /** 입체 음영 글자(어두움→밝음). 기본 '.,:;~=+*' */
  ramp?: string;
  /** 빛 받는 쪽 잎 색 */
  leafColor?: string;
  /** 그늘 쪽 잎 색 */
  leafShade?: string;
  /** 전구 수. 0..1 사이 값은 비율(×200)로 본다. 기본 40 */
  lights?: number;
  /** 전구 반짝임 글자(어두움→밝음). 기본 '.oO@' */
  lightFrames?: string;
  lightColors?: string[];
  /** 나선 장식 줄. 기본 true */
  garland?: boolean;
  garlandColor?: string;
  /** 가지 끝에 쌓인 눈. 기본 true */
  snowCaps?: boolean;
  /** 바닥 안개 0..2. 0이면 없음. 기본 0.6 */
  mist?: number;
  /** 트리 뒤·꼭대기 별의 은은한 빛무리 0..2. 기본 0.6 */
  halo?: number;
  /** 은은한 번짐 층 0..2. 0이면 없음. 기본 0.7 */
  bloom?: number;
  /** 잎 위 반짝 빛 양 0..3. 기본 1 */
  sparkle?: number;
  star?: boolean;
  starColor?: string;
  trunkColor?: string;
  /** 선물 상자. 기본 true */
  presents?: boolean;
  presentColors?: string[];
  ribbonColor?: string;
  /** 눈 둔덕. 기본 true */
  ground?: boolean;
  groundColor?: string;
  /** 반짝임 속도 배수. 기본 0.8 */
  speed?: number;
  /** 빛 번짐 세기 0..3 (true=1, false=0). 기본 1.3 */
  glow?: number | boolean;
  align?: 'left' | 'center' | 'right';
  offset?: number;
  bottom?: number;
  opacity?: number;
  /** 기본 9998 */
  zIndex?: number;
  seed?: number;
  respectReducedMotion?: boolean;
  container?: HTMLElement;
}

export interface StarsOptions {
  /** 별 수. 기본 90 */
  count?: number;
  /** 화면 위에서부터 별이 놓이는 높이 비율 0..1. 기본 0.65 */
  area?: number;
  /** 먼 별의 반짝임 글자(어두움→밝음). 기본 '.+*' */
  frames?: string;
  /** 노랑→하양 같은 색 단계. 별마다 이 사이의 한 색 */
  color?: string | string[];
  /** 글자 크기 px [먼 별, 가까운 별]. 기본 [9, 22] */
  size?: number | [number, number];
  /** 깊이감(흐름·마우스 시차) 0..3. 0이면 평면. 기본 1 */
  depth?: number;
  /** 저절로 흐르는 속도 배수. 기본 1 */
  drift?: number;
  /** 빛 번짐 세기 0..3 (true/false도 받음). 기본 1.6 */
  glow?: number | boolean;
  /** 은은한 번짐 층 0..2. 0이면 없음. 기본 0.8 */
  bloom?: number;
  /** 반짝임 속도 배수. 기본 0.8 */
  speed?: number;
  opacity?: number;
  /** 기본 9996 */
  zIndex?: number;
  seed?: number;
  /** 누른 자리에서 별똥별. 기본 true */
  shootOnClick?: boolean;
  shootingColor?: string;
  /** 별똥별 글자 크기 px. 기본 12 */
  shootingSize?: number;
  /** 별똥별 진하기 0..1. 기본 0.7 */
  shootingOpacity?: number;
  shootingSpeed?: number;
  /** 꼬리 글자 수. 기본 10 */
  shootingLength?: number;
  /** 저절로 떨어지는 간격(초). 0이면 끔 */
  autoShoot?: number;
  respectReducedMotion?: boolean;
  container?: HTMLElement;
}

export interface SantaOptions {
  /** 비행 간격(초). 0이면 fly()로만. 기본 14 */
  every?: number;
  /** 처음 비행까지(초). 기본 1.5 */
  startDelay?: number;
  /** 화면을 가로지르는 시간(초). 기본 12 */
  duration?: number;
  direction?: 'ltr' | 'rtl' | 'alternate';
  /** 깊이 변화: swoop(멀리→가까이→멀리)·approach(멀리→가까이)·recede(가까이→멀리)·flat·random. 기본 'random' */
  path?: 'swoop' | 'approach' | 'recede' | 'flat' | 'random';
  /** 크기 배수 [가장 멀 때, 가장 가까울 때]. 기본 [0.45, 1] */
  scale?: number | [number, number];
  /** 높이(화면 높이 비율) [가장 멀 때, 가장 가까울 때]. 기본 [0.08, 0.3] */
  altitude?: number | [number, number];
  /** 가장 가까울 때 글자 크기 px. 좁은 화면에서는 줄인다. 기본 12 */
  fontSize?: number;
  /** 순록 수 0..4(맨 앞은 빨간 코). 기본 2 */
  reindeer?: number;
  /** 반짝이 가루. 기본 true */
  trail?: boolean;
  /** 산타를 누르면 선물이 떨어진다(그 누름은 별똥별을 만들지 않음). 기본 true */
  dropOnClick?: boolean;
  glow?: number | boolean;
  /** 은은한 번짐 층 0..2. 0이면 없음. 기본 0.8 */
  bloom?: number;
  /** 위아래 흔들림 세기. 기본 1 */
  bob?: number;
  suitColor?: string;
  sleighColor?: string;
  goldColor?: string;
  reindeerColor?: string;
  noseColor?: string;
  /** 썰매 위·떨어지는 선물 색 */
  presentColors?: string[];
  opacity?: number;
  /** 기본 9997 */
  zIndex?: number;
  respectReducedMotion?: boolean;
  container?: HTMLElement;
}

export interface AsciiOverlay<O> {
  readonly element: HTMLCanvasElement;
  /** 바뀐 값만 넘겨도 된다. undefined는 바꾸지 않는다 */
  update(options: Partial<O>): void;
  destroy(): void;
}
export interface StarsOverlay extends AsciiOverlay<StarsOptions> {
  /** 화면 CSS px 위치에 별똥별 하나 */
  shoot(x: number, y: number): void;
  /** 지금 떨어지고 있는 별똥별 수 */
  readonly shootingCount: number;
}
export interface SantaOverlay extends AsciiOverlay<SantaOptions> {
  /** 바로 한 번 날린다. path로 이번 비행의 깊이 변화를 정할 수 있다 */
  fly(direction?: 'ltr' | 'rtl', path?: 'swoop' | 'approach' | 'recede' | 'flat'): void;
  /** 날고 있으면 썰매에서 선물 하나를 떨어뜨린다. 떨어뜨렸으면 true */
  drop(): boolean;
  readonly flying: boolean;
  /** 지금 산타가 그려진 자리(CSS px). 날고 있지 않으면 null */
  readonly bounds: { x: number; y: number; w: number; h: number; scale: number } | null;
  /** 떨어지고 있는 선물 수 */
  readonly presentCount: number;
}

export const TREE_DEFAULTS: Readonly<Required<Omit<TreeOptions, 'container'>>>;
export const STARS_DEFAULTS: Readonly<Required<Omit<StarsOptions, 'container'>>>;
export const SANTA_DEFAULTS: Readonly<Required<Omit<SantaOptions, 'container'>>>;
export function createTree(options?: TreeOptions): AsciiOverlay<TreeOptions>;
export function createStars(options?: StarsOptions): StarsOverlay;
export function createSanta(options?: SantaOptions): SantaOverlay;
