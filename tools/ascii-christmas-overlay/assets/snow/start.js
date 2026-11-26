// 일반 HTML 사이트용: </body> 앞에 <script type="module" src="snow/start.js"></script> 한 줄이면 눈·트리·별·산타가 켜진다.
// 일부만: src="snow/start.js?stars=0&santa=0" (0이면 끔). 끄기: window.snowOverlay.stop()
import { createSnow, createTree, createStars, createSanta } from './snow.js';

const q = new URL(import.meta.url).searchParams;
const on = (k) => q.get(k) !== '0';
let live = [];
function stop() { for (const o of live) o.destroy(); live = []; }
function start() {
  stop();
  if (on('stars')) live.push(createStars());
  if (on('santa')) live.push(createSanta());
  if (on('tree')) live.push(createTree());
  if (on('snow')) live.push(createSnow());
}
window.snowOverlay = { start, stop };
start();
