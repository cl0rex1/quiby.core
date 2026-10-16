import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';

type View = { zoom: number; x: number; y: number };
const fitted: View = { zoom: 1, x: 0, y: 0 };

export function PhotoViewport({ src, name, previousImage, onTransitionEnd, onZoomChange }: {
  src: string; name: string; previousImage: string | null;
  onTransitionEnd: () => void; onZoomChange: (zoomed: boolean) => void;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>(fitted);
  const current = useRef(view);
  const drag = useRef<{ id: number; x: number; y: number; view: View } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fit = natural.width && natural.height
    ? Math.min(1, Math.max(1, bounds.width - 24) / natural.width, Math.max(1, bounds.height - 24) / natural.height) : 1;
  const width = natural.width * fit, height = natural.height * fit;
  const maxZoom = Math.max(8, 1 / fit);

  const update = (next: View) => {
    const zoom = Math.min(maxZoom, Math.max(1, next.zoom));
    const maxX = Math.max(0, (width * zoom - bounds.width) / 2);
    const maxY = Math.max(0, (height * zoom - bounds.height) / 2);
    current.current = { zoom, x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
    setView(current.current);
  };
  const zoomTo = (zoom: number, point = { x: 0, y: 0 }) => {
    const previous = current.current;
    const next = Math.min(maxZoom, Math.max(1, zoom));
    const ratio = next / previous.zoom;
    update({ zoom: next, x: point.x - (point.x - previous.x) * ratio, y: point.y - (point.y - previous.y) * ratio });
  };
  const zoomAt = (zoom: number, clientX: number, clientY: number) => {
    const rect = canvas.current!.getBoundingClientRect();
    zoomTo(zoom, { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 });
  };
  // Native wheel listener is non-passive so zoom never scrolls the dialog.
  const wheel = useRef((event: WheelEvent) => {});
  wheel.current = event => {
    event.preventDefault();
    zoomAt(current.current.zoom * Math.exp(-event.deltaY * (event.deltaMode === 1 ? .04 : .002)), event.clientX, event.clientY);
  };
  useLayoutEffect(() => {
    const element = canvas.current!;
    const observer = new ResizeObserver(([entry]) => setBounds({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    const onWheel = (event: WheelEvent) => wheel.current(event);
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => { observer.disconnect(); element.removeEventListener('wheel', onWheel); };
  }, []);
  useEffect(() => { update(current.current); }, [bounds.width, bounds.height, natural.width, natural.height]);
  useEffect(() => { onZoomChange(view.zoom > 1); }, [view.zoom, onZoomChange]);

  return <div className="photo-viewer-image">
    <div ref={canvas} className={`photo-canvas ${view.zoom > 1 ? 'is-zoomed' : ''} ${dragging ? 'is-dragging' : ''}`}
      tabIndex={0} role="region" aria-label="Изображение: колесо для масштаба, перетаскивание для перемещения"
      onDoubleClick={event => zoomAt(current.current.zoom > 1 ? 1 : Math.max(2, 1 / fit), event.clientX, event.clientY)}
      onKeyDown={event => {
        if (['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          zoomTo(event.key === '0' ? 1 : current.current.zoom * (event.key === '-' ? 1 / 1.25 : 1.25));
        }
      }}
      onPointerDown={event => {
        if (event.button !== 0 || current.current.zoom <= 1) return;
        event.preventDefault(); event.currentTarget.focus();
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, view: current.current };
        event.currentTarget.setPointerCapture(event.pointerId); setDragging(true);
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (start?.id === event.pointerId) update({ zoom: start.view.zoom, x: start.view.x + event.clientX - start.x, y: start.view.y + event.clientY - start.y });
      }}
      onPointerUp={event => {
        if (drag.current?.id !== event.pointerId) return;
        drag.current = null; setDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => { drag.current = null; setDragging(false); }}>
      {previousImage && view.zoom === 1 && <img className="photo-viewer-previous" src={previousImage} alt="" onAnimationEnd={onTransitionEnd}/>}
      <div className="photo-image-transform" style={{ width, height, marginLeft: -width / 2, marginTop: -height / 2,
        transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})` }}>
        <img className="photo-viewer-current" src={src} alt={name} draggable={false}
          onLoad={event => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}/>
      </div>
    </div>
    <div className="photo-zoom-controls" role="group" aria-label="Масштаб фото">
      <button type="button" aria-label="Уменьшить" title="Уменьшить (−)" disabled={view.zoom <= 1} onClick={() => zoomTo(current.current.zoom / 1.25)}><Minus size={16}/></button>
      <button type="button" className="photo-zoom-value" aria-label="Масштаб изображения" title="Исходный размер" onClick={() => zoomTo(1 / fit)}>{Math.round(view.zoom * fit * 100)}%</button>
      <button type="button" aria-label="Увеличить" title="Увеличить (+)" disabled={view.zoom >= maxZoom} onClick={() => zoomTo(current.current.zoom * 1.25)}><Plus size={16}/></button>
      <span/>
      <button type="button" aria-label="Вписать в окно" title="Вписать в окно (0)" onClick={() => update(fitted)}><Maximize2 size={16}/></button>
    </div>
  </div>;
}
