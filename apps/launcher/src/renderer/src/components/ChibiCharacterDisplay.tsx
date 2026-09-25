import { useMotion } from './MotionProvider';
import React, { useEffect, useRef, useState } from 'react';
import { CapePreset, DEFAULT_SKINS } from '../utils/chibiRenderer';
import {
  ChibiLiveConfig,
  BakedFrame,
  createDefaultChibiConfig,
  bakeChibiLiveAnimation,
  detectSkinBodyType,
  loadSkinCanvasAsync,
} from '../utils/chibiLive';

interface ChibiCharacterDisplayProps {
  customSkinImg: HTMLImageElement | null;
  activeDefaultSkinIdx: number;
  selectedCape: CapePreset;
  animation?: 'idle' | 'walk' | 'run' | 'wave' | 'bounce';
  size?: number;
  showShadow?: boolean;
}

export const ChibiCharacterDisplay: React.FC<ChibiCharacterDisplayProps> = ({
  customSkinImg,
  activeDefaultSkinIdx,
  selectedCape,
  animation = 'idle',
  size = 320,
  showShadow = true,
}) => {
  const { active: motionActive } = useMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<BakedFrame[]>([]);
  const frameIdxRef = useRef(0);
  const animationTimerRef = useRef<number>(0);

  const activeDefaultSkin = DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length];
  const isDefaultSteve = activeDefaultSkin?.id === 'steve';

  // 1. Re-bake Live Chibi animation when skin or animation changes
  useEffect(() => {
    let cancelled = false;

    loadSkinCanvasAsync(customSkinImg, isDefaultSteve ? 'steve' : 'alex').then((skinCanvas) => {
      if (cancelled) return;

      const bodyType = customSkinImg
        ? detectSkinBodyType(skinCanvas)
        : isDefaultSteve
          ? 'steve'
          : 'alex';

      const config: ChibiLiveConfig = {
        ...createDefaultChibiConfig(),
        model: {
          bodyType,
          resolved: bodyType,
        },
        style: 'live',
        detail: 'blocky',
        view: '34-right',
        facing: 'right',
        anim: animation,
        chibi: {
          headOverlay: 'on',
          bodyOverlay: 'on',
          shading: 'on',
          shadingStrength: 53,
          layerShadow: false,
        },
        outline: {
          width: 1,
          sharp: false,
          color: '#000000',
          auto: true,
          perPart: true,
        },
        farLegShade: true,
        export: {
          size: 4,
          gifSpeed: 0.75,
          animFormat: 'gif',
        },
      };

      const baked = bakeChibiLiveAnimation(skinCanvas, config, animation);
      setFrames(baked);
    });

    return () => {
      cancelled = true;
    };
  }, [customSkinImg, isDefaultSteve, animation]);

  // 2. Animation loop & Cape compositing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameIdxRef.current = 0;

    const renderScene = (curFrame: BakedFrame) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 10;

      // Dynamic Drop Shadow on the ground
      if (showShadow !== false) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy + 96, 68, 16, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();
        ctx.restore();
      }

      // Render Cape (Behind Character)
      if (selectedCape && selectedCape.id !== 'none') {
        ctx.save();
        ctx.translate(cx - 10, cy - 8);

        const capeGradient = ctx.createLinearGradient(-30, 0, 30, 105);
        capeGradient.addColorStop(0, selectedCape.gradient[0]);
        capeGradient.addColorStop(1, selectedCape.gradient[1]);

        ctx.beginPath();
        ctx.moveTo(-24, 0);
        ctx.lineTo(24, 0);
        ctx.quadraticCurveTo(30, 50, 26, 100);
        ctx.lineTo(-26, 100);
        ctx.quadraticCurveTo(-30, 50, -24, 0);
        ctx.closePath();

        ctx.fillStyle = capeGradient;
        ctx.shadowColor = selectedCape.gradient[0];
        ctx.shadowBlur = 18;
        ctx.fill();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.stroke();

        // Cape Emblem
        ctx.fillStyle = '#ffffff';
        if (selectedCape.emblem === 'quiby') {
          ctx.font = 'bold 20px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Q', 0, 48);
        } else if (selectedCape.emblem === 'crown') {
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👑', 0, 48);
        } else if (selectedCape.emblem === 'wings') {
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡', 0, 48);
        } else if (selectedCape.emblem === 'nebula') {
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✦', 0, 48);
        }

        ctx.restore();
      }

      // Draw Pixel-Art Chibi Live Sprite
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // Optimal integer scale for 340x340 viewport
      const scale = 5.6;
      const dw = Math.round(curFrame.width * scale);
      const dh = Math.round(curFrame.height * scale);
      const dx = Math.round(cx - dw / 2);
      const dy = Math.round(cy - dh / 2 - 8);

      ctx.drawImage(curFrame.canvas, dx, dy, dw, dh);
      ctx.restore();
    };

    renderScene(frames[0]);

    if (frames.length <= 1 || !motionActive) return;

    const gifSpeed = 0.75;

    const tick = () => {
      frameIdxRef.current = (frameIdxRef.current + 1) % frames.length;
      const frame = frames[frameIdxRef.current];
      renderScene(frame);
      animationTimerRef.current = window.setTimeout(tick, (frame.delay || 500) / gifSpeed);
    };
    animationTimerRef.current = window.setTimeout(tick, (frames[0].delay || 500) / gifSpeed);

    return () => {
      if (animationTimerRef.current) {
        window.clearTimeout(animationTimerRef.current);
      }
    };
  }, [frames, selectedCape, showShadow, motionActive]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={340}
        height={340}
        className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] drop-shadow-2xl select-none pointer-events-none [image-rendering:pixelated]"
      />
    </div>
  );
};
