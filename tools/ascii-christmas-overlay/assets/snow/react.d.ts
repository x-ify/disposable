import type { Ref } from 'react';
import type { SnowOptions, TreeOptions, StarsOptions, SantaOptions } from './snow.js';
export interface SnowProps extends SnowOptions {
  /** 렌더러가 정해지면 부른다. why는 WebGPU를 쓰지 않은 이유 */
  onReady?: (renderer: 'webgpu' | 'canvas', why: string) => void;
}
/** 화면 전체에 눈을 겹친다. 이 자리에는 아무것도 그리지 않는다(null). 빠진 props는 기본값 */
export function Snow(props: SnowProps): null;
/** 화면 하단 3D ASCII 트리. 돌며 전구·장식 줄·꼭대기 별이 반짝인다 */
export function AsciiTree(props: TreeOptions): null;
/** 화면 위쪽 3D 느낌 ASCII 별. 누른 자리에서 별똥별 */
export function AsciiStars(props: StarsOptions & { ref?: Ref<{ shoot(x: number, y: number): void; readonly shootingCount: number }> }): null;
/** 선물을 실은 썰매를 타고 하늘을 가로지르는 ASCII 산타 */
export function AsciiSanta(props: SantaOptions & { ref?: Ref<Pick<import('./snow.js').SantaOverlay, 'fly' | 'drop' | 'flying' | 'bounds' | 'presentCount'>> }): null;
export default Snow;
