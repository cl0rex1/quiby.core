import { useEffect, useRef, useState } from 'react';

/** Only external file drags trigger import; nested elements don't flicker the overlay. */
export function useFileDrop(onDrop: (files: FileList) => void, enabled = true) {
  const [dragging, setDragging] = useState(false);
  const callback = useRef(onDrop);
  callback.current = onDrop;
  useEffect(() => {
    setDragging(false);
    if (!enabled) return;
    let depth = 0;
    const modalOpen = () => Boolean(document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]'));
    const enter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      if (modalOpen()) { event.preventDefault(); return; }
      event.preventDefault(); depth++; setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault(); event.dataTransfer.dropEffect = modalOpen() ? 'none' : 'copy';
    };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const drop = (event: DragEvent) => {
      depth = 0; setDragging(false);
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault(); if (!modalOpen()) callback.current(event.dataTransfer.files);
    };
    const reset = () => { depth = 0; setDragging(false); };
    window.addEventListener('dragenter', enter); window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave); window.addEventListener('drop', drop); window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('dragenter', enter); window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop); window.removeEventListener('blur', reset);
    };
  }, [enabled]);
  return dragging;
}
