import { useRef } from 'react';
import { useMotion } from '../components/MotionProvider';

// Animate only visible, successfully removed files. No per-frame React state or layout animation.
export function useFileRemoval() {
  const container = useRef<HTMLDivElement>(null);
  const { reduced } = useMotion();
  const animateRemoval = async (ids: string[]) => {
    if (reduced || document.hidden || !container.current || !ids.length) return;
    const bounds = container.current.getBoundingClientRect();
    const removed = new Set(ids);
    const animations = Array.from(container.current.querySelectorAll<HTMLElement>('[data-file-id]'))
      .filter(element => {
        if (!removed.has(element.dataset.fileId!)) return false;
        const rect = element.getBoundingClientRect();
        return rect.bottom > bounds.top && rect.top < bounds.bottom;
      }).map(element => element.animate([
        { opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.97)' },
      ], { duration: 160, easing: 'ease-out', fill: 'forwards' }));
    await Promise.allSettled(animations.map(animation => animation.finished));
  };
  return { container, animateRemoval };
}
