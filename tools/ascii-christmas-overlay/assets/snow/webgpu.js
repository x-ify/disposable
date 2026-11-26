// 스킬 판은 WebGPU 경로를 넣지 않는다(설치할 패키지·빌드 설정이 필요 없게). snow.js가 이 오류를 받아 Canvas 2D로 같은 눈을 그린다.
export async function createWebGPURenderer() { throw new Error('snow-overlay 스킬 판은 Canvas 2D만 씀'); }
