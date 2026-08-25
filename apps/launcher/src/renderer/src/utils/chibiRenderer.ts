// Minecraft Chibi Skin & Cape Canvas Renderer
import chibiSteveGif from '../assets/chibi_steve.gif';
import chibiAlexGif from '../assets/chibi_alex.gif';

export interface CapePreset {
  id: string;
  name: string;
  gradient: [string, string];
  emblem?: 'quiby' | 'wings' | 'nebula' | 'crown' | 'none';
}

export const CAPE_PRESETS: CapePreset[] = [
  { id: 'none', name: 'Без плаща', gradient: ['#1e2230', '#11141c'], emblem: 'none' },
  { id: 'quiby-s6', name: 'quiby. Season 6', gradient: ['#8b5cf6', '#4f46e5'], emblem: 'quiby' },
  { id: 'nebula', name: 'Violet Nebula', gradient: ['#a855f7', '#ec4899'], emblem: 'nebula' },
  { id: 'aeronautics', name: 'Aeronautics Wings', gradient: ['#6366f1', '#06b6d4'], emblem: 'wings' },
  { id: 'founder', name: 'Founder Crown', gradient: ['#f59e0b', '#d97706'], emblem: 'crown' },
];

export const DEFAULT_SKINS = [
  { id: 'steve', name: 'Steve', gifSrc: chibiSteveGif },
  { id: 'alex', name: 'Alex', gifSrc: chibiAlexGif },
];

export function renderCustomSkinCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  customSkinImg: HTMLImageElement,
  selectedCape: CapePreset
): void {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2 + 10;

  // 1. Dynamic Drop Shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 120, 60, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();
  ctx.restore();

  // 2. Render Cape (Behind Character)
  if (selectedCape.id !== 'none') {
    ctx.save();
    ctx.translate(cx, cy - 25);

    const capeGradient = ctx.createLinearGradient(-35, 0, 35, 120);
    capeGradient.addColorStop(0, selectedCape.gradient[0]);
    capeGradient.addColorStop(1, selectedCape.gradient[1]);

    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(30, 0);
    ctx.quadraticCurveTo(36, 60, 34, 115);
    ctx.lineTo(-34, 115);
    ctx.quadraticCurveTo(-36, 60, -30, 0);
    ctx.closePath();

    ctx.fillStyle = capeGradient;
    ctx.shadowColor = selectedCape.gradient[0];
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();

    // Emblem
    ctx.fillStyle = '#ffffff';
    if (selectedCape.emblem === 'quiby') {
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Q', 0, 55);
    } else if (selectedCape.emblem === 'crown') {
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', 0, 55);
    } else if (selectedCape.emblem === 'wings') {
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', 0, 55);
    }

    ctx.restore();
  }

  // 3. Render Custom Skin (Authentic Chibi Proportions)
  ctx.save();
  ctx.translate(cx, cy);

  ctx.imageSmoothingEnabled = false; // Crisp pixel art

  // Chibi Head (Enlarged blocky proportions: 96x96)
  const headW = 96;
  const headH = 96;
  const headX = -headW / 2;
  const headY = -92;

  // Body Dimensions (Compact: 50x52)
  const bodyW = 50;
  const bodyH = 52;
  const bodyX = -bodyW / 2;
  const bodyY = 4;

  const armW = 20;
  const armH = 46;
  const legW = 22;
  const legH = 46;

  // Legs
  ctx.drawImage(customSkinImg, 20, 52, 4, 12, 2, bodyY + bodyH - 6, legW, legH);
  ctx.drawImage(customSkinImg, 4, 52, 4, 12, 2, bodyY + bodyH - 6, legW, legH);

  ctx.drawImage(customSkinImg, 4, 20, 4, 12, -legW - 2, bodyY + bodyH - 6, legW, legH);
  ctx.drawImage(customSkinImg, 4, 36, 4, 12, -legW - 2, bodyY + bodyH - 6, legW, legH);

  // Torso
  ctx.drawImage(customSkinImg, 20, 20, 8, 12, bodyX, bodyY, bodyW, bodyH);
  ctx.drawImage(customSkinImg, 20, 36, 8, 12, bodyX, bodyY, bodyW, bodyH);

  // Arms
  ctx.drawImage(customSkinImg, 36, 52, 4, 12, bodyX + bodyW + 2, bodyY + 4, armW, armH);
  ctx.drawImage(customSkinImg, 52, 52, 4, 12, bodyX + bodyW + 2, bodyY + 4, armW, armH);

  ctx.drawImage(customSkinImg, 44, 20, 4, 12, bodyX - armW - 2, bodyY + 4, armW, armH);
  ctx.drawImage(customSkinImg, 44, 36, 4, 12, bodyX - armW - 2, bodyY + 4, armW, armH);

  // Head & Hat Overlay
  ctx.drawImage(customSkinImg, 8, 8, 8, 8, headX, headY, headW, headH);
  ctx.drawImage(customSkinImg, 40, 8, 8, 8, headX - 4, headY - 4, headW + 8, headH + 8);

  ctx.restore();
}
