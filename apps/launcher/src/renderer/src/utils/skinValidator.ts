// Minecraft Skin Validator & Anatomy Analyzer
// Validates file format, resolutions, UV unwrap anatomy, and transparency rules.

export interface SkinValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
  bodyType?: 'alex' | 'steve';
  isLegacy?: boolean;
  convertedImg?: HTMLImageElement;
}

const VALID_RESOLUTIONS = new Set([
  '64x64',
  '64x32',
  '128x128',
  '128x64',
  '256x256',
  '256x128',
  '512x512',
  '512x256',
  '1024x1024',
]);

/**
 * Converts a legacy 64x32 skin to a modern 64x64 skin canvas.
 */
export function convertLegacySkinTo64x64(legacyCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = legacyCanvas.width;
  const h = w; // modern height equals width
  const scale = w / 64;

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 1. Draw top half (0..32) as is
  ctx.drawImage(legacyCanvas, 0, 0);

  // 2. Mirror Right Leg (0, 16, 16, 16) to Left Leg (16, 48, 16, 16)
  const copyMirrored = (
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number
  ) => {
    ctx.save();
    ctx.translate((dx + sw) * scale, dy * scale);
    ctx.scale(-1, 1);
    ctx.drawImage(
      legacyCanvas,
      sx * scale,
      sy * scale,
      sw * scale,
      sh * scale,
      0,
      0,
      sw * scale,
      sh * scale
    );
    ctx.restore();
  };

  // Leg faces: top/bottom (4x4), outside/front/inside/back (4x12)
  // Outside face: [0, 20, 4, 12] -> [24, 52, 4, 12]
  copyMirrored(0, 20, 4, 12, 24, 52);
  // Front face: [4, 20, 4, 12] -> [20, 52, 4, 12]
  copyMirrored(4, 20, 4, 12, 20, 52);
  // Inside face: [8, 20, 4, 12] -> [16, 52, 4, 12]
  copyMirrored(8, 20, 4, 12, 16, 52);
  // Back face: [12, 20, 4, 12] -> [28, 52, 4, 12]
  copyMirrored(12, 20, 4, 12, 28, 52);
  // Top: [4, 16, 4, 4] -> [20, 48, 4, 4]
  copyMirrored(4, 16, 4, 4, 20, 48);
  // Bottom: [8, 16, 4, 4] -> [24, 48, 4, 4]
  copyMirrored(8, 16, 4, 4, 24, 48);

  // 3. Mirror Right Arm (40, 16, 16, 16) to Left Arm (32, 48, 16, 16)
  // Outside face: [40, 20, 4, 12] -> [40, 52, 4, 12]
  copyMirrored(40, 20, 4, 12, 40, 52);
  // Front face: [44, 20, 4, 12] -> [36, 52, 4, 12]
  copyMirrored(44, 20, 4, 12, 36, 52);
  // Inside face: [48, 20, 4, 12] -> [32, 52, 4, 12]
  copyMirrored(48, 20, 4, 12, 32, 52);
  // Back face: [52, 20, 4, 12] -> [44, 52, 4, 12]
  copyMirrored(52, 20, 4, 12, 44, 52);
  // Top: [44, 16, 4, 4] -> [36, 48, 4, 4]
  copyMirrored(44, 16, 4, 4, 36, 48);
  // Bottom: [48, 16, 4, 4] -> [40, 48, 4, 4]
  copyMirrored(48, 16, 4, 4, 40, 48);

  return cv;
}

/**
 * Validates whether an Image / Canvas contains an authentic Minecraft skin.
 */
export function validateSkinCanvas(canvas: HTMLCanvasElement): SkinValidationResult {
  const w = canvas.width;
  const h = canvas.height;
  const resKey = `${w}x${h}`;

  // 1. Dimension Check
  if (!VALID_RESOLUTIONS.has(resKey)) {
    return {
      valid: false,
      error: `Недопустимое разрешение изображения: ${w}x${h}. Minecraft-скины должны иметь размер 64x64 (или 64x32 для классических скинов).`,
      width: w,
      height: h,
    };
  }

  const isLegacy = h === w / 2;
  const s = Math.max(1, Math.round(w / 64));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { valid: false, error: 'Не удалось прочитать пиксели изображения.' };
  }

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const totalPixels = w * h;

  // 2. Transparency Ratio Check
  // Standard Minecraft skins have large transparent areas between unwrapped body parts (typically > 20%).
  // A standard photo, wallpaper, or screenshot has 0% or < 5% transparency.
  let transparentCount = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) {
      transparentCount++;
    }
  }

  const transparencyPercent = (transparentCount / totalPixels) * 100;
  if (transparencyPercent < 10) {
    return {
      valid: false,
      error: 'Файл не является скином Minecraft. В изображении отсутствует развертка тела и прозрачные служебные области (слишком сплошной рисунок).',
      width: w,
      height: h,
    };
  }

  // 3. Minecraft Skin Anatomy & Key Regions Check
  // In the standard Minecraft UV unwrap:
  // - Top-left unused corner of head [0, 0, 8, 8] MUST be transparent
  // - Top-right unused corner of head [24, 0, 8, 8] MUST be transparent
  // - Face area [8, 8, 8, 8] MUST be populated (mostly non-transparent)
  const getAlpha = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return 0;
    return data[(py * w + px) * 4 + 3];
  };

  // Check top-left unused box (0..7, 0..7 in 64x64 grid)
  let unusedCornerOpaqueCount = 0;
  const cornerSize = 6 * s;
  for (let y = 1 * s; y < cornerSize; y++) {
    for (let x = 1 * s; x < cornerSize; x++) {
      if (getAlpha(x, y) > 50) unusedCornerOpaqueCount++;
    }
  }

  const cornerPixelTotal = (cornerSize - 1 * s) * (cornerSize - 1 * s);
  if (unusedCornerOpaqueCount > cornerPixelTotal * 0.4) {
    return {
      valid: false,
      error: 'Структура текстуры не соответствует развертке скина Minecraft (угол головы заполнен непрозрачными пикселями).',
      width: w,
      height: h,
    };
  }

  // Check face area [8..15, 8..15 in 64x64 grid] - must have solid pixels
  let faceOpaqueCount = 0;
  const faceStartX = 8 * s;
  const faceStartY = 8 * s;
  const faceSize = 8 * s;
  for (let y = faceStartY; y < faceStartY + faceSize; y++) {
    for (let x = faceStartX; x < faceStartX + faceSize; x++) {
      if (getAlpha(x, y) > 128) faceOpaqueCount++;
    }
  }

  if (faceOpaqueCount < (faceSize * faceSize) * 0.4) {
    return {
      valid: false,
      error: 'Область лица персонажа пуста или прозрачна.',
      width: w,
      height: h,
    };
  }

  // 4. Model Body Type Detection (Alex vs Steve)
  // Check the transparent strip of Alex 3px slim arm: pixel (54*s..55*s, 20*s..31*s)
  let hasRightArmStrip = false;
  for (let y = 20 * s; y < 32 * s; y++) {
    for (let x = 54 * s; x < 56 * s; x++) {
      if (getAlpha(x, y) > 50) {
        hasRightArmStrip = true;
        break;
      }
    }
    if (hasRightArmStrip) break;
  }
  const bodyType: 'alex' | 'steve' = hasRightArmStrip ? 'steve' : 'alex';

  // 5. Handle Legacy 64x32 Conversion
  let workingCanvas = canvas;
  if (isLegacy) {
    workingCanvas = convertLegacySkinTo64x64(canvas);
  }

  return {
    valid: true,
    width: workingCanvas.width,
    height: workingCanvas.height,
    bodyType,
    isLegacy,
  };
}

/**
 * Validates an uploaded File object.
 */
export async function validateSkinFile(file: File): Promise<SkinValidationResult> {
  // 1. File Type Check
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.png') || (file.type && file.type !== 'image/png')) {
    return {
      valid: false,
      error: 'Неверный формат файла. Minecraft-скин должен быть файлом в формате PNG (.png).',
    };
  }

  // 2. File Size Sanity Check (Max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Файл слишком большой для скина Minecraft (максимум 2 МБ).',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ valid: false, error: 'Ошибка чтения файла.' });
    };
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        resolve({ valid: false, error: 'Не удалось декодировать изображение PNG.' });
      };
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth || img.width;
        cv.height = img.naturalHeight || img.height;
        const ctx = cv.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);

        const result = validateSkinCanvas(cv);
        if (!result.valid) {
          return resolve(result);
        }

        if (result.isLegacy) {
          const modernCv = convertLegacySkinTo64x64(cv);
          const modernImg = new Image();
          modernImg.onload = () => {
            resolve({
              ...result,
              convertedImg: modernImg,
            });
          };
          modernImg.src = modernCv.toDataURL('image/png');
        } else {
          resolve({
            ...result,
            convertedImg: img,
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
