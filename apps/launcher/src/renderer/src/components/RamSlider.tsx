import React, { useRef, useState } from 'react';
import { HardDrive } from 'lucide-react';

interface RamSliderProps {
  ramMb: number;
  totalSystemRamGb: number;
  onChange: (ramMb: number) => void;
}

export const RamSlider: React.FC<RamSliderProps> = ({ ramMb, totalSystemRamGb, onChange }) => {
  const [dragging, setDragging] = useState(false);
  const [draftMb, setDraftMb] = useState(ramMb);
  const draftRef = useRef(ramMb);
  const interacting = useRef(false);
  const minGb = 4;
  const maxGb = Math.max(minGb, Math.min(16, totalSystemRamGb - 2));
  const currentMb = dragging ? draftMb : ramMb;
  const currentGb = currentMb / 1024;
  const displayGb = Math.min(Math.max(currentGb, minGb), maxGb);
  const progress = maxGb === minGb ? 0 : ((displayGb - minGb) / (maxGb - minGb)) * 100;
  const selectedGb = Math.round(currentGb);

  const start = () => {
    if (interacting.current) return;
    interacting.current = true;
    draftRef.current = ramMb;
    setDraftMb(ramMb);
    setDragging(true);
  };

  const commit = () => {
    if (!interacting.current) return;
    interacting.current = false;
    setDragging(false);
    const snappedMb = Math.min(maxGb, Math.max(minGb, Math.round(draftRef.current / 1024))) * 1024;
    if (snappedMb !== ramMb) onChange(snappedMb);
  };

  return (
    <section className="surface-panel ram-panel p-6" aria-label="Оперативная память">
      <div className="ram-panel-heading">
        <div>
          <span className="ram-panel-label"><HardDrive size={17} /> Оперативная память</span>
          <p>Для Minecraft. Остальная память останется системе.</p>
        </div>
        <strong>{selectedGb} ГБ</strong>
      </div>
      <div className={`ram-slider ${dragging ? 'is-dragging' : ''}`} style={{ '--ram-progress': `${progress}%` } as React.CSSProperties}>
        <span className="ram-slider-track" aria-hidden="true"><span className="ram-slider-fill" /><span className="ram-slider-thumb" /></span>
        <input
          type="range"
          min={minGb * 1024}
          max={maxGb * 1024}
          step="any"
          value={displayGb * 1024}
          onChange={(event) => {
            const nextMb = Number(event.target.value);
            if (interacting.current) {
              draftRef.current = nextMb;
              setDraftMb(nextMb);
            } else {
              onChange(Math.round(nextMb / 1024) * 1024);
            }
          }}
          onPointerDown={(event) => {
            start();
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={commit}
          onPointerCancel={commit}
          onKeyDown={(event) => {
            const current = Math.round(ramMb / 1024);
            const next = event.key === 'Home' ? minGb
              : event.key === 'End' ? maxGb
              : ['ArrowRight', 'ArrowUp', 'PageUp'].includes(event.key) ? current + 1
              : ['ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key) ? current - 1
              : null;
            if (next === null) return;
            event.preventDefault();
            onChange(Math.min(maxGb, Math.max(minGb, next)) * 1024);
          }}
          onBlur={commit}
          aria-label="Выделить оперативную память игре"
          aria-valuetext={`${selectedGb} гигабайт`}
        />
      </div>
      <div className="ram-panel-scale"><span>{minGb} ГБ</span><span>В системе {totalSystemRamGb} ГБ</span><span>{maxGb} ГБ</span></div>
      {currentGb > maxGb && <p className="ram-panel-warning">Выделено больше доступного. Уменьшите значение перед запуском.</p>}
    </section>
  );
};
