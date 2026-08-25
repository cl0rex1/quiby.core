import React, { useEffect, useRef, useState } from 'react';
import {
  ChibiLiveConfig,
  BakedFrame,
} from './types';
import {
  createDefaultChibiConfig,
  bakeChibiLiveAnimation,
  composeLiveSprite,
} from './chibiLiveEngine';
import { createAlexSkinCanvas, createSteveSkinCanvas } from './defaultSkins';

interface ChibiLiveCanvasProps {
  config?: Partial<ChibiLiveConfig>;
  customSkinImg?: HTMLImageElement | HTMLCanvasElement | null;
  size?: number;
  className?: string;
}

export const ChibiLiveCanvas: React.FC<ChibiLiveCanvasProps> = ({
  config: userConfig,
  customSkinImg,
  size = 280,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<BakedFrame[]>([]);
  const frameIdxRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animRafRef = useRef<number>(0);

  const fullConfig: ChibiLiveConfig = {
    ...createDefaultChibiConfig(),
    ...userConfig,
  };

  useEffect(() => {
    // 1. Resolve source skin canvas
    let skinCanvas: HTMLCanvasElement;
    if (customSkinImg) {
      if (customSkinImg instanceof HTMLCanvasElement) {
        skinCanvas = customSkinImg;
      } else {
        const cv = document.createElement('canvas');
        cv.width = customSkinImg.naturalWidth || customSkinImg.width || 64;
        cv.height = customSkinImg.naturalHeight || customSkinImg.height || 64;
        const ctx = cv.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(customSkinImg, 0, 0);
        skinCanvas = cv;
      }
    } else {
      skinCanvas =
        fullConfig.model.bodyType === 'steve'
          ? createSteveSkinCanvas()
          : createAlexSkinCanvas();
    }

    // 2. Bake animation frames or single sprite
    if (fullConfig.anim !== 'none') {
      const baked = bakeChibiLiveAnimation(skinCanvas, fullConfig, fullConfig.anim);
      setFrames(baked);
    } else {
      const single = composeLiveSprite(skinCanvas, fullConfig);
      setFrames([
        {
          canvas: single.canvas,
          delay: 1000,
          width: single.canvas.width,
          height: single.canvas.height,
        },
      ]);
    }
  }, [
    customSkinImg,
    fullConfig.model.bodyType,
    fullConfig.anim,
    fullConfig.view,
    fullConfig.facing,
    fullConfig.chibi.shadingStrength,
    fullConfig.outline.width,
    fullConfig.outline.auto,
    fullConfig.outline.perPart,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameIdxRef.current = 0;
    lastTimeRef.current = 0;

    const renderFrame = (curFrame: BakedFrame) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      // Integer scaling to fit container size with pixel crispness
      const scale = Math.max(
        1,
        Math.floor(
          Math.min(canvas.width / curFrame.width, canvas.height / curFrame.height) * 0.9
        )
      );
      const dw = curFrame.width * scale;
      const dh = curFrame.height * scale;
      const dx = Math.round((canvas.width - dw) / 2);
      const dy = Math.round((canvas.height - dh) / 2);

      ctx.drawImage(curFrame.canvas, dx, dy, dw, dh);
    };

    renderFrame(frames[0]);

    if (frames.length <= 1) return;

    const speed = fullConfig.export?.gifSpeed || 0.75;

    const tick = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const cur = frames[frameIdxRef.current % frames.length];
      const targetDelay = (cur.delay || 500) / speed;

      if (time - lastTimeRef.current >= targetDelay) {
        lastTimeRef.current = time;
        frameIdxRef.current = (frameIdxRef.current + 1) % frames.length;
        renderFrame(frames[frameIdxRef.current]);
      }

      animRafRef.current = requestAnimationFrame(tick);
    };

    animRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRafRef.current) {
        cancelAnimationFrame(animRafRef.current);
      }
    };
  }, [frames, fullConfig.export?.gifSpeed]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="[image-rendering:pixelated] drop-shadow-2xl select-none pointer-events-none"
      />
    </div>
  );
};
