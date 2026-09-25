import { useEffect, useRef } from 'react';
import { useMotion } from '../components/MotionProvider';

// Event-driven: no animation loop while the pointer is still.
export function usePointerDepth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const frame = useRef(0);
  const { active } = useMotion();
  const reset = () => {
    cancelAnimationFrame(frame.current);
    ref.current?.style.setProperty('--depth-x', '0deg');
    ref.current?.style.setProperty('--depth-y', '0deg');
  };
  useEffect(() => {
    if (!active) reset();
    return () => cancelAnimationFrame(frame.current);
  }, [active]);
  return {
    ref,
    onPointerMove: (event: React.PointerEvent<T>) => {
      if (!active || event.pointerType !== 'mouse') return;
      const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((event.clientX - left) / width) * 2 - 1));
      const y = Math.max(-1, Math.min(1, ((event.clientY - top) / height) * 2 - 1));
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        ref.current?.style.setProperty('--depth-x', `${x * 3}deg`);
        ref.current?.style.setProperty('--depth-y', `${-y * 3}deg`);
      });
    },
    onPointerLeave: reset,
  };
}
