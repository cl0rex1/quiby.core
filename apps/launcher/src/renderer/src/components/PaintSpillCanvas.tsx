import React, { useEffect, useRef } from 'react';

interface PaintSpillCanvasProps {
  onComplete?: () => void;
}

export const PaintSpillCanvas: React.FC<PaintSpillCanvasProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 540; // 540ms total organic flow

    // 32 high-resolution spline points for fluid curves
    const pointCount = 32;

    // Asymmetric timing weights for the 4 corners:
    // Corner 0 (Top-Right): 1.30x (fills first)
    // Corner 1 (Bottom-Left): 1.15x (fills second)
    // Corner 2 (Bottom-Right): 0.95x (fills third)
    // Corner 3 (Top-Left): 0.80x (fills last)
    const cornerWeights = [1.32, 0.95, 1.16, 0.82];

    const seeds = Array.from({ length: pointCount }, (_, i) => ({
      noise: Math.sin(i * 1.7) * 0.18 + Math.cos(i * 2.3) * 0.12,
    }));

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out Quartic curve
      const globalEase = 1 - Math.pow(1 - progress, 3.2);

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Max radius to ensure complete 100% coverage
      const maxRadius = Math.sqrt(w * w + h * h) * 0.9;

      if (globalEase > 0) {
        ctx.save();
        ctx.beginPath();

        const points: { x: number; y: number }[] = [];

        for (let i = 0; i < pointCount; i++) {
          const angle = (i / pointCount) * Math.PI * 2;
          const seed = seeds[i];

          // Determine corner sector (0: TR, 1: BR, 2: BL, 3: TL)
          // Map angle [0, 2PI] smoothly to the 4 corners
          const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
          const quadrantFloat = (normalizedAngle / (Math.PI * 0.5));
          const qIdx1 = Math.floor(quadrantFloat) % 4;
          const qIdx2 = (qIdx1 + 1) % 4;
          const blend = quadrantFloat - Math.floor(quadrantFloat);

          // Smooth interpolation between corner speeds
          const smoothCornerWeight = cornerWeights[qIdx1] * (1 - blend) + cornerWeights[qIdx2] * blend;

          // Compute individual corner progress (staggered timing across the 4 corners)
          const cornerProgress = Math.min(Math.max(globalEase * smoothCornerWeight, 0), 1.4);

          // Organic fluid wave ripples
          const waveRipple =
            Math.sin(angle * 4 + globalEase * 5) * 0.14 +
            Math.cos(angle * 2 - globalEase * 3) * 0.1 +
            seed.noise;

          const r = cornerProgress * maxRadius * (1 + (1 - progress * 0.7) * waveRipple);

          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          points.push({ x: px, y: py });
        }

        // Draw ultra-smooth fluid spline through all points
        ctx.moveTo((points[0].x + points[pointCount - 1].x) / 2, (points[0].y + points[pointCount - 1].y) / 2);

        for (let i = 0; i < pointCount; i++) {
          const p1 = points[i];
          const p2 = points[(i + 1) % pointCount];
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        }

        ctx.closePath();

        // Glossy vibrant emerald liquid gradient
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(globalEase * maxRadius, 20));
        gradient.addColorStop(0, '#4ade80');
        gradient.addColorStop(0.5, '#34d399');
        gradient.addColorStop(1, '#10b981');

        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(52, 211, 153, 0.85)';
        ctx.shadowBlur = 18;
        ctx.fill();

        ctx.restore();
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        // Solid full fill at the end
        ctx.fillStyle = '#34d399';
        ctx.fillRect(0, 0, w, h);
        onComplete?.();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);
  }, [onComplete]);

  return (
    <canvas
      ref={canvasRef}
      width={440}
      height={110}
      className="w-full h-full absolute inset-0 pointer-events-none z-10 rounded-full"
    />
  );
};
