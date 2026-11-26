// React 래퍼. 그리기는 snow.js·tree.js·stars.js·santa.js가 맡고, 여기서는 마운트·갱신·정리만 한다.
// 사용: <AsciiStars /> <AsciiSanta ref={santa} /> <AsciiTree rows={24} /> <Snow count={300} />
// 화면 전체에 겹치며 이 자리에는 아무것도 그리지 않는다. santa.current.fly(), stars.current.shoot(x, y)
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createSnow, DEFAULTS } from './snow.js';
import { createTree, TREE_DEFAULTS } from './tree.js';
import { createStars, STARS_DEFAULTS } from './stars.js';
import { createSanta, SANTA_DEFAULTS } from './santa.js';
import { defined } from './util.js';

// props에서 빠진 값은 기본값으로 돌아가게 매번 전체 옵션을 넘긴다(update는 넘긴 값만 바꾸므로).
function useOverlay(create, defaults, props, onCreate) {
  const ref = useRef(null);
  // 개발 모드(strict mode)는 두 번 마운트한다. 정리에서 destroy해야 요소·타이머·이벤트·GPU 장치가 남지 않는다.
  useEffect(() => {
    const o = create(props);
    ref.current = o;
    onCreate?.(o, () => ref.current === o);
    return () => { o.destroy(); if (ref.current === o) ref.current = null; };
    // container는 마운트 때만 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { ref.current?.update({ ...defaults, ...defined(props) }); });
  return ref;
}

export function Snow(props) {
  useOverlay(createSnow, DEFAULTS, props, (snow, alive) => {
    props.onReady && snow.ready.then((name) => name && alive() && props.onReady(name, snow.fallbackReason));
  });
  return null;
}

export function AsciiTree(props) {
  useOverlay(createTree, TREE_DEFAULTS, props);
  return null;
}

export const AsciiStars = forwardRef(function AsciiStars(props, ref) {
  const inst = useOverlay(createStars, STARS_DEFAULTS, props);
  useImperativeHandle(ref, () => ({ shoot: (x, y) => inst.current?.shoot(x, y), get shootingCount() { return inst.current?.shootingCount ?? 0; } }), [inst]);
  return null;
});

export const AsciiSanta = forwardRef(function AsciiSanta(props, ref) {
  const inst = useOverlay(createSanta, SANTA_DEFAULTS, props);
  useImperativeHandle(ref, () => ({
    fly: (dir, path) => inst.current?.fly(dir, path),
    drop: () => !!inst.current?.drop(),
    get flying() { return !!inst.current?.flying; },
    get bounds() { return inst.current?.bounds ?? null; },
    get presentCount() { return inst.current?.presentCount ?? 0; },
  }), [inst]);
  return null;
});

export default Snow;
