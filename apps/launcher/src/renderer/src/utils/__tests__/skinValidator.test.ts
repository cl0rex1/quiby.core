// Standalone test suite for Minecraft Skin Validator

// 1. Mock DOM Canvas & Context
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

  constructor(canvas: MockCanvas) {
    this.canvas = canvas;
  }

  createImageData(w: number, h: number): MockImageData {
    return new MockImageData(w, h);
  }

  getImageData(sx: number, sy: number, sw: number, sh: number): MockImageData {
    const out = new MockImageData(sw, sh);
    const d = this.canvas._data;
    const cw = this.canvas.width;
    for (let py = 0; py < sh; py++) {
      const cy = sy + py;
      if (cy < 0 || cy >= this.canvas.height) continue;
      for (let px = 0; px < sw; px++) {
        const cx = sx + px;
        if (cx < 0 || cx >= cw) continue;
        const si = (cy * cw + cx) * 4;
        const di = (py * sw + px) * 4;
        out.data[di] = d[si];
        out.data[di + 1] = d[si + 1];
        out.data[di + 2] = d[si + 2];
        out.data[di + 3] = d[si + 3];
      }
    }
    return out;
  }

  putImageData(imgData: MockImageData, dx: number, dy: number): void {
    const d = this.canvas._data;
    const cw = this.canvas.width;
    for (let py = 0; py < imgData.height; py++) {
      const cy = dy + py;
      if (cy < 0 || cy >= this.canvas.height) continue;
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

  drawImage(src: MockCanvas, ...args: number[]): void {
    // simplified draw
    const d = this.canvas._data;
    const s = src._data;
    const len = Math.min(d.length, s.length);
    for (let i = 0; i < len; i++) {
      d[i] = s[i];
    }
  }

  save() {}
  restore() {}
  translate() {}
  scale() {}
}

class MockCanvas {
  width: number;
  height: number;
  _data: Uint8ClampedArray;
  _ctx: MockCanvasRenderingContext2D | null = null;

  constructor(w: number = 0, h: number = 0) {
    this.width = w;
    this.height = h;
    this._data = new Uint8ClampedArray(w * h * 4);
  }

  getContext(): MockCanvasRenderingContext2D {
    if (!this._ctx || this._data.length !== this.width * this.height * 4) {
      this._data = new Uint8ClampedArray(this.width * this.height * 4);
      this._ctx = new MockCanvasRenderingContext2D(this);
    }
    return this._ctx;
  }
}

(global as any).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') return new MockCanvas(0, 0);
    return {};
  },
};
(global as any).ImageData = MockImageData;

import { validateSkinCanvas, validateSkinFile } from '../skinValidator';
import { createAlexSkinCanvas, createSteveSkinCanvas } from '../chibiLive/defaultSkins';

function runSkinValidatorTests() {
  console.log('🧪 Starting Minecraft Skin Validator Test Suite...\n');
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

  // Test 1: Valid Alex Official Skin
  const alexCanvas = createAlexSkinCanvas() as any;
  const alexValidation = validateSkinCanvas(alexCanvas);
  assert(alexValidation.valid === true, 'Alex official skin is validated as valid');
  assert(alexValidation.bodyType === 'alex', 'Alex skin is correctly detected as Alex (3px slim)');
  assert(alexValidation.width === 64 && alexValidation.height === 64, 'Alex dimensions are 64x64');

  // Test 2: Valid Steve Official Skin
  const steveCanvas = createSteveSkinCanvas() as any;
  const steveValidation = validateSkinCanvas(steveCanvas);
  assert(steveValidation.valid === true, 'Steve official skin is validated as valid');
  assert(steveValidation.bodyType === 'steve', 'Steve skin is correctly detected as Steve (4px classic)');

  // Test 3: Invalid Resolution (e.g. 1920x1080 Wallpaper or 500x500 image)
  const photoCanvas = new MockCanvas(1920, 1080) as any;
  const photoValidation = validateSkinCanvas(photoCanvas);
  assert(photoValidation.valid === false, '1920x1080 wallpaper is rejected');
  assert(Boolean(photoValidation.error?.includes('1920x1080')), 'Error message contains actual invalid dimensions');

  // Test 4: Solid Photo with no transparency (64x64 solid square)
  const solidCanvas = new MockCanvas(64, 64) as any;
  const solidData = solidCanvas.getContext().canvas._data;
  for (let i = 0; i < solidData.length; i += 4) {
    solidData[i] = 120;
    solidData[i + 1] = 150;
    solidData[i + 2] = 200;
    solidData[i + 3] = 255; // 100% opaque, no Minecraft unwrap transparency
  }
  const solidValidation = validateSkinCanvas(solidCanvas);
  assert(solidValidation.valid === false, '64x64 solid photo without transparency is rejected');

  // Test 5: File extension validation
  const fakeJpgFile = { name: 'my_skin.jpg', type: 'image/jpeg', size: 5000 } as any;
  validateSkinFile(fakeJpgFile).then((res) => {
    assert(res.valid === false, '.jpg file is rejected by validateSkinFile');
    assert(Boolean(res.error?.includes('PNG')), 'Error message specifies PNG requirement');

    console.log(`\n========================================`);
    console.log(`📊 Validator Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  });
}

runSkinValidatorTests();
