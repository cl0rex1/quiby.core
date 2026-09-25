import React from 'react';
import { HardDrive } from 'lucide-react';

interface RamSliderProps {
  ramMb: number;
  totalSystemRamGb: number;
  onChange: (ramMb: number) => void;
}

export const RamSlider: React.FC<RamSliderProps> = ({ ramMb, totalSystemRamGb, onChange }) => {
  const minGb = 4;
  const maxGb = Math.max(minGb, Math.min(16, totalSystemRamGb - 2));
  const currentGb = Math.round(ramMb / 1024);
  const displayGb = Math.min(Math.max(currentGb, minGb), maxGb);

  return (
    <section className="surface-panel ram-panel p-6" aria-label="Оперативная память">
      <div className="ram-panel-heading">
        <div>
          <span className="ram-panel-label"><HardDrive size={17} /> Оперативная память</span>
          <p>Для Minecraft. Остальная память останется системе.</p>
        </div>
        <strong>{currentGb} ГБ</strong>
      </div>
      <input
        type="range"
        min={minGb}
        max={maxGb}
        step={1}
        value={displayGb}
        onChange={(event) => onChange(Number(event.target.value) * 1024)}
        aria-label="Выделить оперативную память игре"
        aria-valuetext={`${displayGb} гигабайт`}
      />
      <div className="ram-panel-scale"><span>{minGb} ГБ</span><span>В системе {totalSystemRamGb} ГБ</span><span>{maxGb} ГБ</span></div>
      {currentGb > maxGb && <p className="ram-panel-warning">Выделено больше доступного. Уменьшите значение перед запуском.</p>}
    </section>
  );
};
