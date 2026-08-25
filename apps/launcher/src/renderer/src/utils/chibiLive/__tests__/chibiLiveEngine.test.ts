// Standalone headless test suite for Minecraft Chibi Live rendering engine.

// 1. Lightweight Canvas & ImageData Polyfill for Headless Node.js Environment
class MockImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
}

class MockCanvasRenderingContext2D {
  canvas: MockCanvas;
  imageSmoothingEnabled = false;
  fillStyle = '#000000';
  globalCompositeOperation = 'source-over';

  constructor(canvas: MockCanvas) {
    this.canvas = canvas;
  }

  createImageData(w: number, h: number): MockImageData {
    return new MockImageData(w, h);
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    const d = this.canvas._data;
    const cw = this.canvas.width;
    for (let py = Math.max(0, y); py < Math.min(this.canvas.height, y + h); py++) {
      for (let px = Math.max(0, x); px < Math.min(cw, x + w); px++) {
        const i = (py * cw + px) * 4;
        d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
      }
    }
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    const d = this.canvas._data;
    const cw = this.canvas.width;
    let r = 0, g = 0, b = 0, a = 255;
    if (this.fillStyle.startsWith('#')) {
      const hex = this.fillStyle.slice(1);
      if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    } else if (this.fillStyle.startsWith('rgba')) {
      const match = this.fillStyle.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
      if (match) {
        r = parseInt(match[1], 10);
        g = parseInt(match[2], 10);
        b = parseInt(match[3], 10);
        a = Math.round(parseFloat(match[4]) * 255);
      }
    }

    for (let py = Math.max(0, y); py < Math.min(this.canvas.height, y + h); py++) {
      for (let px = Math.max(0, x); px < Math.min(cw, x + w); px++) {
        const i = (py * cw + px) * 4;
        if (this.globalCompositeOperation === 'source-atop') {
          if (d[i + 3] > 0) {
            d[i] = Math.round((d[i] * (255 - a) + r * a) / 255);
            d[i + 1] = Math.round((d[i + 1] * (255 - a) + g * a) / 255);
            d[i + 2] = Math.round((d[i + 2] * (255 - a) + b * a) / 255);
          }
        } else {
          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = b;
          d[i + 3] = a;
        }
      }
    }
  }

  getImageData(sx: number, sy: number, sw: number, sh: number): MockImageData {
    const imgData = new MockImageData(sw, sh);
    const d = this.canvas._data;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    for (let py = 0; py < sh; py++) {
      const cy = sy + py;
      if (cy < 0 || cy >= ch) continue;
      for (let px = 0; px < sw; px++) {
        const cx = sx + px;
        if (cx < 0 || cx >= cw) continue;
        const si = (cy * cw + cx) * 4;
        const di = (py * sw + px) * 4;
        imgData.data[di] = d[si];
        imgData.data[di + 1] = d[si + 1];
        imgData.data[di + 2] = d[si + 2];
        imgData.data[di + 3] = d[si + 3];
      }
    }
    return imgData;
  }

  putImageData(imgData: MockImageData, dx: number, dy: number): void {
    const d = this.canvas._data;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    for (let py = 0; py < imgData.height; py++) {
      const cy = dy + py;
      if (cy < 0 || cy >= ch) continue;
      for (let px = 0; px < imgData.width; px++) {
        const cx = dx + px;
        if (cx < 0 || cx >= cw) continue;
        const si = (py * imgData.width + px) * 4;
        const di = (cy * cw + cx) * 4;
        d[di] = imgData.data[si];
        d[di + 1] = imgData.data[si + 1];
        d[di + 2] = imgData.data[si + 2];
        d[di + 3] = imgData.data[si + 3];
      }
    }
  }

  drawImage(
    src: MockCanvas,
    sxOrDx: number,
    syOrDy: number,
    swOrDw?: number,
    shOrDh?: number,
    dx?: number,
    dy?: number,
    dw?: number,
    dh?: number
  ): void {
    if (dx !== undefined && dy !== undefined && dw !== undefined && dh !== undefined) {
      // 9-args slice draw
      const sx = sxOrDx, sy = syOrDy, sw = swOrDw!, sh = shOrDh!;
      const sData = src._data;
      const tData = this.canvas._data;
      for (let y = 0; y < dh; y++) {
        const targetY = dy + y;
        if (targetY < 0 || targetY >= this.canvas.height) continue;
        const srcY = Math.min(src.height - 1, Math.floor(sy + (y * sh) / dh));
        for (let x = 0; x < dw; x++) {
          const targetX = dx + x;
          if (targetX < 0 || targetX >= this.canvas.width) continue;
          const srcX = Math.min(src.width - 1, Math.floor(sx + (x * sw) / dw));
          const si = (srcY * src.width + srcX) * 4;
          const di = (targetY * this.canvas.width + targetX) * 4;
          const srcAlpha = sData[si + 3];
          if (srcAlpha === 0) continue;
          if (srcAlpha >= 255) {
            tData[di] = sData[si];
            tData[di + 1] = sData[si + 1];
            tData[di + 2] = sData[si + 2];
            tData[di + 3] = sData[si + 3];
          } else {
            const a = srcAlpha / 255;
            tData[di] = Math.round(tData[di] * (1 - a) + sData[si] * a);
            tData[di + 1] = Math.round(tData[di + 1] * (1 - a) + sData[si + 1] * a);
            tData[di + 2] = Math.round(tData[di + 2] * (1 - a) + sData[si + 2] * a);
            tData[di + 3] = Math.max(tData[di + 3], srcAlpha);
          }
        }
      }
    } else {
      // 3-args draw
      const targetDx = sxOrDx;
      const targetDy = syOrDy;
      const sData = src._data;
      const tData = this.canvas._data;
      for (let y = 0; y < src.height; y++) {
        const ty = targetDy + y;
        if (ty < 0 || ty >= this.canvas.height) continue;
        for (let x = 0; x < src.width; x++) {
          const tx = targetDx + x;
          if (tx < 0 || tx >= this.canvas.width) continue;
          const si = (y * src.width + x) * 4;
          const di = (ty * this.canvas.width + tx) * 4;
          const srcAlpha = sData[si + 3];
          if (srcAlpha === 0) continue;
          if (srcAlpha >= 255) {
            tData[di] = sData[si];
            tData[di + 1] = sData[si + 1];
            tData[di + 2] = sData[si + 2];
            tData[di + 3] = sData[si + 3];
          } else {
            const a = srcAlpha / 255;
            tData[di] = Math.round(tData[di] * (1 - a) + sData[si] * a);
            tData[di + 1] = Math.round(tData[di + 1] * (1 - a) + sData[si + 1] * a);
            tData[di + 2] = Math.round(tData[di + 2] * (1 - a) + sData[si + 2] * a);
            tData[di + 3] = Math.max(tData[di + 3], srcAlpha);
          }
        }
      }
    }
  }
}

class MockCanvas {
  width: number = 0;
  height: number = 0;
  _data: Uint8ClampedArray = new Uint8ClampedArray(0);
  _ctx: MockCanvasRenderingContext2D | null = null;

  constructor(w: number = 0, h: number = 0) {
    this.width = w;
    this.height = h;
    this._data = new Uint8ClampedArray(w * h * 4);
  }

  getContext(type: string): MockCanvasRenderingContext2D {
    if (!this._ctx || this._data.length !== this.width * this.height * 4) {
      if (this._data.length !== this.width * this.height * 4) {
        this._data = new Uint8ClampedArray(this.width * this.height * 4);
      }
      this._ctx = new MockCanvasRenderingContext2D(this);
    }
    return this._ctx;
  }
}

// Inject globals for Node test environment
(global as any).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') return new MockCanvas(0, 0);
    return {};
  },
};
(global as any).ImageData = MockImageData;

import { ChibiLiveConfig } from '../types';
import {
  createDefaultChibiConfig,
  composeLiveSprite,
  bakeChibiLiveAnimation,
  mlEdgeColor,
  symNearest,
  nearestMap,
  shadeMul,
} from '../chibiLiveEngine';
import { createAlexSkinCanvas, createSteveSkinCanvas } from '../defaultSkins';
import { ML_SPRITE, ML_SIDE_SHADE, ML_FAR_SHADE, ML_AO_SHADE } from '../constants';

// 3. Test Runner
function runTests() {
  console.log('🧪 Starting Minecraft Chibi Live Style Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  // Test 1: Config Defaults & Integrity
  const config = createDefaultChibiConfig();
  assert(config.style === 'live', 'Config style is "live"');
  assert(config.detail === 'blocky', 'Config detail is "blocky"');
  assert(config.model.bodyType === 'alex', 'Config bodyType is "alex"');
  assert(config.view === '34-right', 'Config view is "34-right"');
  assert(config.facing === 'right', 'Config facing is "right"');
  assert(config.outline.perPart === true, 'Config outline perPart is true');
  assert(config.outline.auto === true, 'Config outline auto color is true');
  assert(config.chibi.shadingStrength === 53, 'Config shading strength is 53');

  // Test 2: Nearest neighbor mapping functions
  const symMap = symNearest(4, 6);
  assert(symMap.length === 6, 'symNearest maps 4 -> 6');
  assert(symMap[0] === 0 && symMap[5] === 3, 'symNearest is mirror symmetric');

  const nearMap = nearestMap(12, 6);
  assert(nearMap.length === 6, 'nearestMap maps 12 -> 6');

  // Test 3: Edge color calculation in HSV with saturation floor
  const darkSkinEdge = mlEdgeColor(229, 161, 128); // #e5a180 (Alex skin)
  assert(
    darkSkinEdge[0] < 229 && darkSkinEdge[1] < 161 && darkSkinEdge[2] < 128,
    'mlEdgeColor crushes luminance for outline'
  );
  assert(darkSkinEdge[0] > 0, 'mlEdgeColor preserves hue and warm tone');

  const greyEdge = mlEdgeColor(128, 128, 128);
  assert(greyEdge[0] === greyEdge[1] && greyEdge[1] === greyEdge[2], 'mlEdgeColor treats neutral grey correctly');

  // Test 4: Shading multiplier calibration
  const baseSideShade = shadeMul(ML_SIDE_SHADE, 'on', 50);
  assert(Math.abs(baseSideShade - ML_SIDE_SHADE) < 0.001, 'shadeMul at 50% matches calibrated ML_SIDE_SHADE (0.67)');

  const sideShade53 = shadeMul(ML_SIDE_SHADE, 'on', 53);
  assert(sideShade53 < baseSideShade, 'shadeMul at 53% is slightly darker than 50%');

  const unlitShade = shadeMul(ML_SIDE_SHADE, 'off', 53);
  assert(unlitShade === 1, 'shadeMul with shading off returns 1.0 (unlit)');

  // Test 5: Procedural Alex and Steve Skin Generation
  const alexSkin = createAlexSkinCanvas() as any;
  assert(alexSkin.width === 64 && alexSkin.height === 64, 'Alex skin canvas generated at 64x64');

  const steveSkin = createSteveSkinCanvas() as any;
  assert(steveSkin.width === 64 && steveSkin.height === 64, 'Steve skin canvas generated at 64x64');

  // Test 6: Live Sprite Composition (Alex, 3/4-right, Blocky, 53% shade)
  const singleFrame = composeLiveSprite(alexSkin, config);
  assert(singleFrame.canvas.width > 0 && singleFrame.canvas.height > 0, 'Single live sprite renders with valid dimensions');
  assert(
    singleFrame.canvas.width >= 30 && singleFrame.canvas.height >= 35,
    `Live sprite bounding box is within expected range (${singleFrame.canvas.width}x${singleFrame.canvas.height})`
  );

  // Test 7: Idle Animation Baking
  const bakedFrames = bakeChibiLiveAnimation(alexSkin, config, 'idle');
  assert(bakedFrames.length === 2, 'Idle animation produces exactly 2 frames');
  assert(bakedFrames[0].delay === 500 && bakedFrames[1].delay === 500, 'Idle animation frame delays are 500ms');
  assert(
    bakedFrames[0].width === bakedFrames[1].width && bakedFrames[0].height === bakedFrames[1].height,
    'Idle animation frames share identical union box dimensions'
  );

  // Test 8: Steve Model Composition
  const steveConfig: ChibiLiveConfig = {
    ...config,
    model: { bodyType: 'steve', resolved: 'steve' },
  };
  const steveFrame = composeLiveSprite(steveSkin, steveConfig);
  assert(steveFrame.canvas.width > 0 && steveFrame.canvas.height > 0, 'Steve model live sprite renders cleanly');

  // Test 9: Walk Animation
  const walkFrames = bakeChibiLiveAnimation(alexSkin, config, 'walk');
  assert(walkFrames.length === 4, 'Walk animation produces 4 frames');

  console.log(`\n========================================`);
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
