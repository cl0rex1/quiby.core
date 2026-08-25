import React, { useEffect, useRef } from 'react';
import { DEFAULT_SKINS, CapePreset, renderCustomSkinCanvas } from '../utils/chibiRenderer';

interface ChibiCharacterDisplayProps {
  customSkinImg: HTMLImageElement | null;
  activeDefaultSkinIdx: number;
  selectedCape: CapePreset;
  size?: number;
}

export const ChibiCharacterDisplay: React.FC<ChibiCharacterDisplayProps> = ({
  customSkinImg,
  activeDefaultSkinIdx,
  selectedCape,
  size = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeSkin = DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length];

  useEffect(() => {
    if (customSkinImg && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        renderCustomSkinCanvas(ctx, canvas.width, canvas.height, customSkinImg, selectedCape);
      }
    }
  }, [customSkinImg, selectedCape]);

  if (customSkinImg) {
    return (
      <canvas
        ref={canvasRef}
        width={340}
        height={340}
        className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] drop-shadow-2xl"
      />
    );
  }

  // Native Animated Chibi GIF (Steve / Alex)
  return (
    <div className="relative flex flex-col items-center justify-center">
      <img
        src={activeSkin.gifSrc}
        alt={activeSkin.name}
        className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] object-contain [image-rendering:pixelated] drop-shadow-2xl pointer-events-none select-none"
      />

      {/* Dynamic Ground Shadow */}
      <div className="w-36 h-4 bg-black/40 rounded-full blur-sm -mt-3"></div>
    </div>
  );
};
