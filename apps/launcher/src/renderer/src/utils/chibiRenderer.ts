// Minecraft Chibi Skin & Cape Canvas Renderer
// Renders Minecraft skins (64x64) in cute Chibi proportions with idle animation & cape

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
  { id: 'steve', name: 'Steve (Классика)', primaryColor: '#2b78a0', skinTone: '#c68c6d', hairColor: '#4a3222' },
  { id: 'alex', name: 'Alex (Классика)', primaryColor: '#588b48', skinTone: '#e0a986', hairColor: '#cf5b2c' },
  { id: 'ari', name: 'Ari (Season 6)', primaryColor: '#8b5cf6', skinTone: '#9a6141', hairColor: '#1c1c1e' },
  { id: 'makena', name: 'Makena', primaryColor: '#e11d48', skinTone: '#4a2c1d', hairColor: '#18181b' },
  { id: 'noor', name: 'Noor', primaryColor: '#0ea5e9', skinTone: '#804e33', hairColor: '#27272a' },
];

export function renderChibiCharacter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  customSkinImg: HTMLImageElement | null,
  activeDefaultSkinIdx: number,
  selectedCape: CapePreset
): void {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2 + 10;

  // Breathing / Floating bobbing offset
  const bobY = Math.sin(time * 2.2) * 5;
  const armSwing = Math.sin(time * 1.5) * 0.08;
  const capeWave = Math.sin(time * 3) * 6;

  // 1. Dynamic Drop Shadow
  const shadowScale = 1 - Math.abs(bobY) * 0.03;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 125, 65 * shadowScale, 18 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();
  ctx.restore();

  // 2. Render Cape (Behind Character)
  if (selectedCape.id !== 'none') {
    ctx.save();
    ctx.translate(cx, cy - 20 + bobY);
    
    // Cape Body
    const capeGradient = ctx.createLinearGradient(-35, 0, 35, 120);
    capeGradient.addColorStop(0, selectedCape.gradient[0]);
    capeGradient.addColorStop(1, selectedCape.gradient[1]);

    ctx.beginPath();
    ctx.moveTo(-32, 0);
    ctx.lineTo(32, 0);
    ctx.quadraticCurveTo(38 + capeWave * 0.5, 60, 35 + capeWave, 115);
    ctx.lineTo(-35 + capeWave, 115);
    ctx.quadraticCurveTo(-38 + capeWave * 0.5, 60, -32, 0);
    ctx.closePath();

    ctx.fillStyle = capeGradient;
    ctx.shadowColor = selectedCape.gradient[0];
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    // Cape Emblem / Logo
    ctx.fillStyle = '#ffffff';
    if (selectedCape.emblem === 'quiby') {
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Q', capeWave * 0.5, 55);
    } else if (selectedCape.emblem === 'crown') {
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', capeWave * 0.5, 55);
    } else if (selectedCape.emblem === 'wings') {
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', capeWave * 0.5, 55);
    }

    ctx.restore();
  }

  // 3. Render Character
  ctx.save();
  ctx.translate(cx, cy + bobY);

  if (customSkinImg && customSkinImg.complete && customSkinImg.naturalWidth > 0) {
    renderSkinTextureChibi(ctx, customSkinImg, armSwing);
  } else {
    renderProceduralChibi(ctx, DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length], armSwing);
  }

  ctx.restore();
}

// Renders Minecraft 64x64 Skin texture in cute Chibi proportions
function renderSkinTextureChibi(ctx: CanvasRenderingContext2D, img: HTMLImageElement, armSwing: number): void {
  ctx.imageSmoothingEnabled = false; // Crisp pixel art

  // Head Dimensions (Enlarged Chibi scale: 100x100)
  const headW = 100;
  const headH = 100;
  const headX = -headW / 2;
  const headY = -95;

  // Body Dimensions (Compact: 52x55)
  const bodyW = 52;
  const bodyH = 54;
  const bodyX = -bodyW / 2;
  const bodyY = 5;

  // Limbs Dimensions
  const armW = 22;
  const armH = 48;
  const legW = 24;
  const legH = 50;

  // A. Left Leg (UV: 20, 52, 4, 12)
  ctx.drawImage(img, 20, 52, 4, 12, 2, bodyY + bodyH - 6, legW, legH);
  ctx.drawImage(img, 4, 52, 4, 12, 2, bodyY + bodyH - 6, legW, legH); // overlay

  // B. Right Leg (UV: 4, 20, 4, 12)
  ctx.drawImage(img, 4, 20, 4, 12, -legW - 2, bodyY + bodyH - 6, legW, legH);
  ctx.drawImage(img, 4, 36, 4, 12, -legW - 2, bodyY + bodyH - 6, legW, legH); // overlay

  // C. Torso (UV: 20, 20, 8, 12)
  ctx.drawImage(img, 20, 20, 8, 12, bodyX, bodyY, bodyW, bodyH);
  ctx.drawImage(img, 20, 36, 8, 12, bodyX, bodyY, bodyW, bodyH); // jacket overlay

  // D. Left Arm (UV: 36, 52, 4, 12)
  ctx.save();
  ctx.translate(bodyX + bodyW + 2, bodyY + 6);
  ctx.rotate(-armSwing);
  ctx.drawImage(img, 36, 52, 4, 12, 0, 0, armW, armH);
  ctx.drawImage(img, 52, 52, 4, 12, 0, 0, armW, armH);
  ctx.restore();

  // E. Right Arm (UV: 44, 20, 4, 12)
  ctx.save();
  ctx.translate(bodyX - armW - 2, bodyY + 6);
  ctx.rotate(armSwing);
  ctx.drawImage(img, 44, 20, 4, 12, 0, 0, armW, armH);
  ctx.drawImage(img, 44, 36, 4, 12, 0, 0, armW, armH);
  ctx.restore();

  // F. Head (UV: 8, 8, 8, 8) with slight 3D rounding
  ctx.drawImage(img, 8, 8, 8, 8, headX, headY, headW, headH);
  // Hat overlay (UV: 40, 8, 8, 8) with 1.1x scale
  ctx.drawImage(img, 40, 8, 8, 8, headX - 4, headY - 4, headW + 8, headH + 8);
}

// Procedural high-aesthetic Chibi character for default skin presets
function renderProceduralChibi(ctx: CanvasRenderingContext2D, preset: typeof DEFAULT_SKINS[0], armSwing: number): void {
  // Head (Enlarged Chibi)
  const headW = 96;
  const headH = 92;
  const headX = -headW / 2;
  const headY = -90;

  // Body
  const bodyW = 50;
  const bodyH = 52;
  const bodyX = -bodyW / 2;
  const bodyY = 4;

  const armW = 20;
  const armH = 46;
  const legW = 22;
  const legH = 48;

  // Legs
  ctx.fillStyle = '#1e293b'; // pants
  ctx.beginPath();
  ctx.roundRect(-legW - 2, bodyY + bodyH - 6, legW, legH, 6);
  ctx.roundRect(2, bodyY + bodyH - 6, legW, legH, 6);
  ctx.fill();

  // Shoes
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-legW - 2, bodyY + bodyH + legH - 14, legW, 14, [0, 0, 6, 6]);
  ctx.roundRect(2, bodyY + bodyH + legH - 14, legW, 14, [0, 0, 6, 6]);
  ctx.fill();

  // Torso / Shirt
  ctx.fillStyle = preset.primaryColor;
  ctx.beginPath();
  ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 10);
  ctx.fill();

  // Shirt Collar Accent
  ctx.fillStyle = preset.skinTone;
  ctx.beginPath();
  ctx.moveTo(bodyX + bodyW / 2 - 8, bodyY);
  ctx.lineTo(bodyX + bodyW / 2, bodyY + 12);
  ctx.lineTo(bodyX + bodyW / 2 + 8, bodyY);
  ctx.closePath();
  ctx.fill();

  // Right Arm
  ctx.save();
  ctx.translate(bodyX - armW, bodyY + 4);
  ctx.rotate(armSwing);
  ctx.fillStyle = preset.primaryColor;
  ctx.beginPath();
  ctx.roundRect(0, 0, armW, 20, 6);
  ctx.fill();
  ctx.fillStyle = preset.skinTone;
  ctx.beginPath();
  ctx.roundRect(0, 18, armW, armH - 18, [0, 0, 6, 6]);
  ctx.fill();
  ctx.restore();

  // Left Arm
  ctx.save();
  ctx.translate(bodyX + bodyW, bodyY + 4);
  ctx.rotate(-armSwing);
  ctx.fillStyle = preset.primaryColor;
  ctx.beginPath();
  ctx.roundRect(0, 0, armW, 20, 6);
  ctx.fill();
  ctx.fillStyle = preset.skinTone;
  ctx.beginPath();
  ctx.roundRect(0, 18, armW, armH - 18, [0, 0, 6, 6]);
  ctx.fill();
  ctx.restore();

  // Head Box
  ctx.fillStyle = preset.skinTone;
  ctx.beginPath();
  ctx.roundRect(headX, headY, headW, headH, 20);
  ctx.fill();

  // Hair
  ctx.fillStyle = preset.hairColor;
  ctx.beginPath();
  ctx.roundRect(headX, headY, headW, 36, [20, 20, 4, 4]);
  ctx.fill();

  // Cute Chibi Eyes
  const eyeY = headY + 50;
  // Left eye
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(headX + 22, eyeY, 12, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(headX + 26, eyeY + 4, 3, 0, Math.PI * 2);
  ctx.fill();

  // Right eye
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(headX + headW - 34, eyeY, 12, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(headX + headW - 30, eyeY + 4, 3, 0, Math.PI * 2);
  ctx.fill();

  // Cute Blush Cheeks
  ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
  ctx.beginPath();
  ctx.ellipse(headX + 16, eyeY + 16, 8, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(headX + headW - 16, eyeY + 16, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}
