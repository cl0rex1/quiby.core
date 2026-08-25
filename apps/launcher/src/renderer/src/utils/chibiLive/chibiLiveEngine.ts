import {
  ChibiLiveConfig,
  BakedFrame,
  LivePartDef,
  LiveGroupDef,
  CameraDef,
} from './types';
import {
  ML_SPRITE,
  ML_LAYOUT_W,
  ML_BOXES,
  ML_SLIM_NARROW,
  ML_SLIM_SHIFT,
  ML_SIDE_SHADE,
  ML_FAR_SHADE,
  ML_AO_SHADE,
  ML_EDGE_V,
  ML_EDGE_S,
  ML_EDGE_S_ADD,
  ML_ANIM_ROOM,
  ML_PARTS,
  ML_GROUPS,
  ML_CAMERAS,
  ML_LR_SWAP,
  ML_TABLES,
  CHIBI_VIEWS,
  CHIBI_ANIMS,
  ML_BUST_CUT,
  mlRects,
} from './constants';

export function detectSkinBodyType(skinCanvas: HTMLCanvasElement): 'alex' | 'steve' {
  const ctx = skinCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 'alex';
  const s = Math.max(1, Math.round(skinCanvas.width / 64));
  const imgData = ctx.getImageData(54 * s, 20 * s, s, 12 * s);
  let hasAlpha = false;
  for (let i = 3; i < imgData.data.length; i += 4) {
    if (imgData.data[i] !== 0) {
      hasAlpha = true;
      break;
    }
  }
  return hasAlpha ? 'steve' : 'alex';
}

export function createDefaultChibiConfig(): ChibiLiveConfig {
  return {
    version: 3,
    tool: 'minecraft-chibi-skin-maker',
    model: {
      bodyType: 'alex',
      resolved: 'alex',
    },
    style: 'live',
    detail: 'blocky',
    skin: null,
    view: '34-right',
    bust: null,
    upsideDown: false,
    facing: 'right',
    pose: 'none',
    anim: 'idle',
    chibi: {
      headOverlay: 'on',
      bodyOverlay: 'on',
      shading: 'on',
      shadingStrength: 53,
      layerShadow: false,
    },
    material: 'soft',
    background: {
      color: '#4a4a4a',
      transparent: true,
      vignette: false,
      shape: 'none',
      aspect: '1:1',
      image: null,
      charZoom: 1,
      charX: 0,
      charY: 0,
      fillFrame: false,
    },
    outline: {
      width: 1,
      sharp: false,
      color: '#000000',
      auto: true,
      perPart: true,
    },
    farLegShade: true,
    texture: {
      pixelated: true,
      barebones: false,
      barebonesThreshold: 30,
      halfHeightUVs: false,
    },
    export: {
      size: 4,
      gifSpeed: 0.75,
      animFormat: 'gif',
    },
    visibility: {},
  };
}

export function symNearest(src: number, dest: number): number[] {
  const m = new Array(dest);
  for (let i = 0; i < (dest >> 1); i++) {
    const tx = Math.min(src - 1, Math.floor(((i + 0.5) * src) / dest));
    m[i] = tx;
    m[dest - 1 - i] = src - 1 - tx;
  }
  if (dest & 1) {
    const mid = dest >> 1;
    m[mid] = Math.min(src - 1, Math.floor(((mid + 0.5) * src) / dest));
  }
  return m;
}

export function nearestMap(src: number, dest: number): number[] {
  const m = new Array(dest);
  for (let i = 0; i < dest; i++) {
    m[i] = Math.min(src - 1, Math.floor(((i + 0.5) * src) / dest));
  }
  return m;
}

export function mlEdgeColor(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  if (!d) {
    const v = Math.round(mx * ML_EDGE_V);
    return [v, v, v];
  }
  let h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  const s = Math.min(1, (d / mx) * ML_EDGE_S + ML_EDGE_S_ADD);
  const v = (mx / 255) * ML_EDGE_V;
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c;
  const t =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [
    Math.round((t[0] + m) * 255),
    Math.round((t[1] + m) * 255),
    Math.round((t[2] + m) * 255),
  ];
}

export const mlSwapSide = (k: string): string => {
  for (const a of Object.keys(ML_LR_SWAP)) {
    if (k && k.startsWith(a)) return ML_LR_SWAP[a] + k.slice(a.length);
  }
  return k;
};

export function mlCameraTable(
  parts: Record<string, LivePartDef>,
  groups: LiveGroupDef[],
  camKey: string
): { parts: Record<string, LivePartDef>; groups: LiveGroupDef[] } {
  const cam = ML_CAMERAS[camKey] || ML_CAMERAS['front-right'];
  if (!cam.mirror && !cam.faces && !cam.swapLimb && !cam.dropSide) return { parts, groups };
  const out: Record<string, LivePartDef> = {};
  for (const [k, p] of Object.entries(parts)) {
    if (cam.dropSide && !p.keepSide && (p.face === 'right' || p.face === 'left')) continue;
    const q: LivePartDef = { ...p };
    if (cam.swapLimb) {
      q.box = ML_LR_SWAP[q.box] || q.box;
      if (q.group) q.group = mlSwapSide(q.group);
    }
    if (cam.evenLit && q.shade === ML_FAR_SHADE && !q.keepShade) q.shade = undefined;
    if (cam.underLit) q.shade = q.shade ? undefined : ML_FAR_SHADE;
    if (cam.nudge && cam.nudge[q.box] && !q.placed) {
      q.dest = [q.dest[0] + cam.nudge[q.box], q.dest[1], q.dest[2], q.dest[3]];
    }
    if (cam.dropSide && q.flat) {
      q.dest = [q.dest[0] + q.flat, q.dest[1], q.dest[2], q.dest[3]];
    }
    if (cam.xjoint && cam.xjoint[q.box] && !q.placed) {
      q.xjoint = (q.xjoint || 0) + cam.xjoint[q.box];
    }
    const doMirror = q.pin ? camKey.endsWith('-left') : cam.mirror;
    if (doMirror) {
      const d = q.dest;
      q.dest = [ML_LAYOUT_W - d[0] - d[2], d[1], d[2], d[3]];
      if (q.xjoint) q.xjoint = -q.xjoint;
      if (q.sub) {
        const B = ML_BOXES[q.box];
        if (B) {
          q.sub = [B.w - q.sub[0] - q.sub[2], q.sub[1], q.sub[2], q.sub[3]];
        }
      }
      if (q.rot) {
        q.rot = q.rot === 90 ? 270 : q.rot === 270 ? 90 : q.rot;
        q.mirrorX = !q.mirrorX;
      }
    }
    if (cam.faces && cam.faces[q.face]) {
      q.face = cam.faces[q.face] as any;
    }
    out[cam.swapLimb ? mlSwapSide(k) : k] = mlRects(q);
  }

  const gs = groups.map((g) => ({
    key: cam.swapLimb ? mlSwapSide(g.key) : g.key,
    parts: g.parts.map((k) => (cam.swapLimb ? mlSwapSide(k) : k)),
    joint: g.joint,
    overHead: g.overHead,
    armsBehind: g.armsBehind,
  }));

  if (cam.armsLevel) {
    const hi = gs.findIndex((g) => g.key === 'head');
    const arms = gs.filter(
      (g) => (g.key === 'lArm' || g.key === 'rArm') && !g.overHead && !g.armsBehind
    );
    if (hi >= 0 && arms.length) {
      const rest = gs.filter((g) => !arms.includes(g));
      const at = rest.findIndex((g) => g.key === 'head');
      gs.length = 0;
      gs.push(...rest.slice(0, at), ...arms, ...rest.slice(at));
    }
  }

  if (cam.flipDepth) gs.reverse();
  if (cam.armUnderHead) {
    const near = (camKey.endsWith('-left') ? 'l' : 'r') + 'Arm';
    const ai = gs.findIndex((g) => g.key === near),
      hi = gs.findIndex((g) => g.key === 'head');
    if (ai > hi && hi >= 0 && !gs[ai].overHead) {
      gs.splice(hi, 0, gs.splice(ai, 1)[0]);
    }
  }
  return { parts: out, groups: gs };
}

export function partNames(key: string): [string | null, string | null] {
  if (key.startsWith('hat')) return ['Hat Layer', null];
  if (key.startsWith('head')) return ['Head', null];
  if (key.startsWith('jacket')) return ['Body Layer', null];
  if (key.startsWith('body')) return ['Body', 'Body Layer'];
  if (key.startsWith('rSlv')) return ['Right Arm Layer', null];
  if (key.startsWith('lSlv')) return ['Left Arm Layer', null];
  if (key.startsWith('rArm')) return ['Right Arm', 'Right Arm Layer'];
  if (key.startsWith('lArm')) return ['Left Arm', 'Left Arm Layer'];
  if (key.startsWith('rPant')) return ['Right Leg Layer', null];
  if (key.startsWith('lPant')) return ['Left Leg Layer', null];
  if (key.startsWith('rLeg')) return ['Right Leg', 'Right Leg Layer'];
  if (key.startsWith('lLeg')) return ['Left Leg', 'Left Leg Layer'];
  return [null, null];
}

export function shadeMul(base: number, shading: 'on' | 'off', strength: number): number {
  if (shading === 'off') return 1;
  const s = Number.isFinite(strength) ? strength : 50;
  if (s <= 0) return 1;
  if (s <= 50) return 1 - (1 - base) * (s / 50);
  if (s >= 100) return 0;
  return base * (1 - (s - 50) / 50);
}

export function sampleBlit(
  sctx: CanvasRenderingContext2D,
  p: LivePartDef,
  hd: number,
  slim: boolean,
  baseVis: boolean,
  overVis: boolean,
  dw: number,
  dh: number,
  blocky: boolean,
  halfHeightUVs: boolean
): ImageData {
  const s = ((slim && p.slimBase) || p.base || p.src || [0, 0, 4, 12]).slice();
  if (p.arm && slim) s[2] = 3;
  if (p.slimShiftX && slim) s[0] -= 1;
  if (halfHeightUVs && s[3] === 12) s[3] = 8;
  const srcW = s[2] * hd,
    srcH = s[3] * hd;
  const sd = baseVis
    ? sctx.getImageData(s[0] * hd, s[1] * hd, srcW, srcH)
    : new ImageData(srcW, srcH);

  if (overVis && p.over) {
    const ov = ((slim && p.slimOver) || p.over).slice();
    if (p.arm && slim) ov[2] = 3;
    if (p.slimShiftX && slim) ov[0] -= 1;
    if (halfHeightUVs && ov[3] === 12) ov[3] = 8;
    const od = sctx.getImageData(ov[0] * hd, ov[1] * hd, srcW, srcH);
    for (let i = 0; i < sd.data.length; i += 4) {
      if (od.data[i + 3] >= 128) {
        sd.data[i] = od.data[i];
        sd.data[i + 1] = od.data[i + 1];
        sd.data[i + 2] = od.data[i + 2];
        sd.data[i + 3] = Math.max(sd.data[i + 3], od.data[i + 3]);
      }
    }
  }

  const out = new ImageData(dw, dh);
  const bx = blocky && p.block ? p.block[0] : 1;
  const by = blocky && p.block ? p.block[1] : 1;
  const cw = Math.max(1, Math.round(dw / bx));
  const ch = Math.max(1, Math.round(dh / by));

  const rot = p.rot || 0,
    turned = rot === 90 || rot === 270;
  const uw = turned ? ch : cw,
    uh = turned ? cw : ch;
  const xc = symNearest(srcW, uw);
  const yc =
    p.ymap && p.ymap.length === uh
      ? p.ymap.map((t) => Math.min(srcH - 1, Math.round((t * srcH) / 12)))
      : nearestMap(srcH, uh);

  for (let dy = 0; dy < dh; dy++) {
    const cy = Math.min(ch - 1, (dy / by) | 0);
    for (let dx = 0; dx < dw; dx++) {
      const cx = Math.min(cw - 1, (dx / bx) | 0);
      let ux: number, uy: number;
      if (rot === 180) {
        ux = cw - 1 - cx;
        uy = ch - 1 - cy;
      } else if (rot === 90) {
        ux = cy;
        uy = uh - 1 - cx;
      } else if (rot === 270) {
        ux = uw - 1 - cy;
        uy = cx;
      } else {
        ux = cx;
        uy = cy;
      }
      if (p.mirrorX) ux = uw - 1 - ux;
      const si = (yc[uy] * srcW + xc[ux]) * 4,
        oi = (dy * dw + dx) * 4;
      out.data[oi] = sd.data[si];
      out.data[oi + 1] = sd.data[si + 1];
      out.data[oi + 2] = sd.data[si + 2];
      out.data[oi + 3] = sd.data[si + 3];
    }
  }
  return out;
}

export function applyMaterialTone(
  c: CanvasRenderingContext2D,
  cv: HTMLCanvasElement,
  material: string
): void {
  const M: Record<string, { sat: number; con: number; bri: number; top?: number; rim?: number }> = {
    glossy: { sat: 1.18, con: 1.06, bri: 3, top: 1.22 },
    clay: { sat: 0.76, con: 0.93, bri: 6 },
    plastic: { sat: 1.1, con: 1.14, bri: 0 },
    matte: { sat: 0.88, con: 0.91, bri: 2 },
    metallic: { sat: 0.34, con: 1.22, bri: 0 },
    embossed: { sat: 0.96, con: 1.05, bri: 0, rim: 0.74 },
  };
  const tone = M[material];
  if (!tone) return;
  const id = c.getImageData(0, 0, cv.width, cv.height),
    D = id.data,
    W = cv.width,
    H = cv.height;
  const alphaAt = (x: number, y: number) =>
    x < 0 || y < 0 || x >= W || y >= H ? 0 : D[(y * W + x) * 4 + 3];
  for (let i = 0; i < D.length; i += 4) {
    if (D[i + 3] === 0) continue;
    let r = D[i],
      g = D[i + 1],
      b = D[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * tone.sat;
    g = l + (g - l) * tone.sat;
    b = l + (b - l) * tone.sat;
    D[i] = (r - 128) * tone.con + 128 + tone.bri;
    D[i + 1] = (g - 128) * tone.con + 128 + tone.bri;
    D[i + 2] = (b - 128) * tone.con + 128 + tone.bri;
  }
  if (tone.top || tone.rim) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (D[i + 3] === 0) continue;
        if (tone.top && !alphaAt(x, y - 1)) {
          D[i] *= tone.top;
          D[i + 1] *= tone.top;
          D[i + 2] *= tone.top;
        } else if (
          tone.rim &&
          (!alphaAt(x - 1, y) || !alphaAt(x + 1, y) || !alphaAt(x, y - 1) || !alphaAt(x, y + 1))
        ) {
          D[i] *= tone.rim;
          D[i + 1] *= tone.rim;
          D[i + 2] *= tone.rim;
        }
      }
    }
  }
  c.putImageData(id, 0, 0);
}

export interface ComposeAnimOverrides {
  animParts?: Record<string, [number, number, number?]>;
  animUnder?: string[];
  animOver?: string[];
  animNoCrop?: boolean;
}

export function composeLiveSprite(
  skinCanvas: HTMLCanvasElement,
  config: ChibiLiveConfig,
  overrides?: ComposeAnimOverrides
): { canvas: HTMLCanvasElement; shift: number } {
  const hd = Math.max(1, Math.round((skinCanvas.width || 64) / 64));
  const detail = hd > 1 ? 'fine' : config.detail;
  const K = detail === 'fine' ? hd : 1;
  const PROUD = K;
  const animNoCrop = overrides?.animNoCrop || false;
  const OFF = PROUD + K + (animNoCrop ? ML_ANIM_ROOM * K : 0);

  const back = config.view.includes('back');
  const camKey =
    config.view === 'top' || config.view === 'bottom'
      ? config.view
      : config.view.startsWith('side')
        ? config.facing === 'left'
          ? 'side-left'
          : 'side-right'
        : config.view.startsWith('front')
          ? 'front-flat'
          : config.view.startsWith('back') && !config.view.includes('34')
            ? 'back-flat'
            : (back ? 'back34-' : 'front-') + (config.facing === 'left' ? 'left' : 'right');

  const cam = mlCameraTable(ML_PARTS, ML_GROUPS, camKey);
  const parts = cam.parts;
  let groups = cam.groups;

  if (
    !(ML_CAMERAS[camKey] || {}).table &&
    ((overrides?.animUnder && overrides.animUnder.length) ||
      (overrides?.animOver && overrides.animOver.length))
  ) {
    const swap = (ML_CAMERAS[camKey] || {}).swapLimb;
    const name = (k: string) => (swap ? mlSwapSide(k) : k);
    const under = new Set((overrides?.animUnder || []).map(name));
    const over = new Set((overrides?.animOver || []).map(name));
    const moved = groups.filter((g) => under.has(g.key) || over.has(g.key));
    const rest = groups.filter((g) => !moved.includes(g));
    const at = rest.findIndex((g) => g.key === 'head');
    if (moved.length && at >= 0) {
      const bodyAt = groups.findIndex((g) => g.key === 'body');
      const overs = moved
        .filter((g) => over.has(g.key))
        .map((g) => ({ ...g, clipBody: bodyAt >= 0 && groups.indexOf(g) < bodyAt }));
      groups = [
        ...rest.slice(0, at),
        ...moved.filter((g) => under.has(g.key)),
        rest[at],
        ...overs,
        ...rest.slice(at + 1),
      ];
    }
  }

  const wantBodyMask = groups.some((g) => g.clipBody);
  let bodyMask: Uint8Array | null = null;
  const pd = [0, 0, 0, 0];
  const padL = pd[0] * K,
    padR = pd[1] * K,
    padT = pd[2] * K,
    padB = pd[3] * K;

  const INK = config.outline.perPart ? Math.max(0, Math.min(10, config.outline.width | 0)) * K : 0;
  const flatInk = config.outline.auto
    ? null
    : (() => {
        const h = String(config.outline.color || '#000000').replace('#', '');
        const n =
          parseInt(
            h.length === 3 ? h.replace(/./g, (ch) => ch + ch) : h.padEnd(6, '0'),
            16
          ) || 0;
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number];
      })();

  const dOf = (p: LivePartDef, aox: number, aoy: number, jslide: number) => [
    p.dest[0] * K + OFF + padL + (INK - K) * (p.xjoint || 0) + aox,
    p.dest[1] * K + OFF + padT + jslide + aoy,
    p.dest[2] * K,
    p.dest[3] * K,
  ];

  const slim = config.model.bodyType === 'alex' || config.model.resolved === 'alex';
  const cv = document.createElement('canvas');
  cv.width = ML_SPRITE.w * K + OFF * 2 + padL + padR;
  cv.height = ML_SPRITE.h * K + OFF * 2 + padT + padB;
  const c = cv.getContext('2d', { willReadFrequently: true })!;
  c.imageSmoothingEnabled = false;

  const sctx = skinCanvas.getContext('2d', { willReadFrequently: true })!;
  const isVis = (n: string | null) => n == null || config.visibility[n] !== false;
  const unlit = config.material === 'flat';
  const aoOn =
    config.chibi.shading !== 'off' &&
    config.chibi.shadingStrength > 0 &&
    !unlit &&
    !(ML_CAMERAS[camKey] || {}).noAo;
  const aoMul = shadeMul(ML_AO_SHADE, config.chibi.shading, config.chibi.shadingStrength);
  const isPlan = (ML_CAMERAS[camKey] || {}).table === 'plan';

  const bust = config.bust;
  const baseCut = (bust && ML_BUST_CUT[bust]) || 0;
  const cut = baseCut ? baseCut * K + OFF + padT : 0;
  const headOnly = bust === 'head';

  for (const group of groups) {
    if (headOnly && group.key !== 'head') continue;
    const jslide = (INK - K) * (group.joint || 0);
    const ao = overrides?.animParts && overrides.animParts[group.key];
    const aox = ao ? ao[0] * K : 0;
    const aoy = ao ? ao[1] * K : 0;
    const aShade =
      ao && ao[2] && !unlit
        ? shadeMul(ao[2], config.chibi.shading, config.chibi.shadingStrength)
        : 1;

    const live: Array<{
      key: string;
      p: LivePartDef;
      baseVis: boolean;
      overVis: boolean;
    }> = [];

    for (const key of group.parts) {
      const p = parts[key];
      if (!p) continue;
      if (group.clipBody && (p.face === 'right' || p.face === 'left')) continue;
      if (p.hat && config.chibi.headOverlay === 'off') continue;
      if (p.clothing && config.chibi.bodyOverlay === 'off') continue;
      const [baseName, overName] = partNames(key);
      const baseVis = isVis(baseName);
      const overVis = !!(p.base && p.over) && isVis(overName) && config.chibi.bodyOverlay !== 'off';
      if (p.base && p.over ? !baseVis && !overVis : !baseVis) continue;
      live.push({ key, p, baseVis, overVis });
    }
    if (!live.length) continue;

    let gx0 = Infinity,
      gy0 = Infinity,
      gx1 = -Infinity,
      gy1 = -Infinity;
    for (const { p } of live) {
      const d = dOf(p, aox, aoy, jslide);
      if (d[0] < gx0) gx0 = d[0];
      if (d[1] < gy0) gy0 = d[1];
      if (d[0] + d[2] > gx1) gx1 = d[0] + d[2];
      if (d[1] + d[3] > gy1) gy1 = d[1] + d[3];
    }

    const pad = Math.max(K, INK);
    const gw = gx1 - gx0 + 2 * pad,
      gh = gy1 - gy0 + 2 * pad;
    const gcv = document.createElement('canvas');
    gcv.width = gw;
    gcv.height = gh;
    const gc = gcv.getContext('2d', { willReadFrequently: true })!;
    gc.imageSmoothingEnabled = false;

    for (const { p, baseVis, overVis } of live) {
      const d = dOf(p, aox, aoy, jslide);
      let shade = aShade;
      if (!unlit) {
        if (p.side)
          shade *= shadeMul(ML_SIDE_SHADE, config.chibi.shading, config.chibi.shadingStrength);
        const farLegDim =
          p.shade === ML_FAR_SHADE && (p.box === 'lLeg' || p.box === 'rLeg') && !isPlan;
        if (p.shade && !(farLegDim && !config.farLegShade)) {
          shade *= shadeMul(p.shade, config.chibi.shading, config.chibi.shadingStrength);
        }
      }
      const out = sampleBlit(
        sctx,
        p,
        hd,
        slim,
        baseVis,
        overVis,
        d[2],
        d[3],
        config.detail === 'blocky',
        config.texture.halfHeightUVs
      );
      if (shade < 1) {
        for (let i = 0; i < out.data.length; i += 4) {
          out.data[i] *= shade;
          out.data[i + 1] *= shade;
          out.data[i + 2] *= shade;
        }
      }
      const t = document.createElement('canvas');
      t.width = d[2];
      t.height = d[3];
      t.getContext('2d')!.putImageData(out, 0, 0);
      gc.drawImage(t, d[0] - gx0 + pad, d[1] - gy0 + pad);
    }

    const gd = gc.getImageData(0, 0, gw, gh),
      G = gd.data;
    const ink = new ImageData(gw, gh),
      IK = ink.data;
    if (INK > 0) {
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const i = (y * gw + x) * 4;
          if (G[i + 3] >= 128) continue;
          let si = -1;
          for (let r = 1; r <= INK && si < 0; r++) {
            const ring = [
              [-r, 0],
              [r, 0],
              [0, -r],
              [0, r],
            ];
            for (let d = 1; d <= r; d++) {
              ring.push(
                [-r, -d],
                [-r, d],
                [r, -d],
                [r, d],
                [-d, -r],
                [d, -r],
                [-d, r],
                [d, r]
              );
            }
            for (const [dx, dy] of ring) {
              const nx = x + dx,
                ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
              const j = (ny * gw + nx) * 4;
              if (G[j + 3] >= 128) {
                si = j;
                break;
              }
            }
          }
          if (si < 0) continue;
          const e = flatInk || mlEdgeColor(G[si], G[si + 1], G[si + 2]);
          IK[i] = e[0];
          IK[i + 1] = e[1];
          IK[i + 2] = e[2];
          IK[i + 3] = 255;
        }
      }
    }
    const icv = document.createElement('canvas');
    icv.width = gw;
    icv.height = gh;
    const ic = icv.getContext('2d')!;
    ic.imageSmoothingEnabled = false;
    ic.putImageData(ink, 0, 0);
    ic.drawImage(gcv, 0, 0);

    if (group.clipBody && bodyMask) {
      const gi = ic.getImageData(0, 0, gw, gh),
        GD = gi.data;
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const ax = x + gx0 - pad,
            ay = y + gy0 - pad;
          if (ax < 0 || ay < 0 || ax >= cv.width || ay >= cv.height) continue;
          if (bodyMask[ay * cv.width + ax]) GD[(y * gw + x) * 4 + 3] = 0;
        }
      }
      ic.putImageData(gi, 0, 0);
    }

    c.drawImage(icv, gx0 - pad, gy0 - pad);

    if (wantBodyMask && group.key === 'body') {
      bodyMask = bodyMask || new Uint8Array(cv.width * cv.height);
      const gi = ic.getImageData(0, 0, gw, gh).data;
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          if (gi[(y * gw + x) * 4 + 3] < 128) continue;
          const ax = x + gx0 - pad,
            ay = y + gy0 - pad;
          if (ax >= 0 && ay >= 0 && ax < cv.width && ay < cv.height) {
            bodyMask[ay * cv.width + ax] = 1;
          }
        }
      }
    }

    if (aoOn && (group.key === 'head' || group.key === 'body')) {
      const gi = ic.getImageData(0, 0, gw, gh).data;
      const bottom = new Int16Array(cv.width).fill(-1);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          if (gi[(y * gw + x) * 4 + 3] < 128) continue;
          const ax = x + gx0 - pad,
            ay = y + gy0 - pad;
          if (ax >= 0 && ax < cv.width && ay > bottom[ax]) bottom[ax] = ay;
        }
      }
      const AO = c.getImageData(0, 0, cv.width, cv.height),
        DA = AO.data;
      for (let x = 0; x < cv.width; x++) {
        const bx = bottom[x];
        if (bx < 0) continue;
        for (let y = bx + 1; y <= bx + K && y < cv.height; y++) {
          const i = (y * cv.width + x) * 4;
          if (DA[i + 3] === 0) continue;
          DA[i] *= aoMul;
          DA[i + 1] *= aoMul;
          DA[i + 2] *= aoMul;
        }
      }
      c.putImageData(AO, 0, 0);
    }
  }

  if (cut > 0 && cv.height > cut) {
    c.clearRect(0, cut, cv.width, cv.height - cut);
  }

  applyMaterialTone(c, cv, config.material);

  if (animNoCrop) {
    return { canvas: cv, shift: padL };
  }

  // Tighten crop
  const id = c.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width,
    y0 = cv.height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (id[(y * cv.width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { canvas: cv, shift: padL };

  const cr = document.createElement('canvas');
  cr.width = x1 - x0 + 1;
  cr.height = y1 - y0 + 1;
  const crc = cr.getContext('2d')!;
  crc.imageSmoothingEnabled = false;
  crc.drawImage(cv, x0, y0, cr.width, cr.height, 0, 0, cr.width, cr.height);

  return { canvas: cr, shift: padL };
}

export function bakeChibiLiveAnimation(
  skinCanvas: HTMLCanvasElement,
  config: ChibiLiveConfig,
  animName: string = 'idle'
): BakedFrame[] {
  const animDef = CHIBI_ANIMS[animName] || CHIBI_ANIMS.idle;
  const raw: Array<{
    cv: HTMLCanvasElement;
    shift: number;
    dx: number;
    dy: number;
    delay: number;
  }> = [];

  for (const f of animDef.frames) {
    const liveParts = f.liveParts || (f.livePose ? undefined : f.parts);
    const overrides: ComposeAnimOverrides = {
      animParts: liveParts,
      animUnder: f.under,
      animOver: f.over,
      animNoCrop: true,
    };

    const res = composeLiveSprite(skinCanvas, config, overrides);
    const delay = f.liveD !== undefined ? f.liveD : f.d;
    raw.push({
      cv: res.canvas,
      shift: res.shift,
      dx: f.dx || 0,
      dy: f.dy || 0,
      delay,
    });
  }

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const xOf = (r: (typeof raw)[0]) => -r.shift + r.dx;

  for (const r of raw) {
    minX = Math.min(minX, xOf(r));
    maxX = Math.max(maxX, xOf(r) + r.cv.width);
    minY = Math.min(minY, r.dy);
    maxY = Math.max(maxY, r.dy + r.cv.height);
  }

  minX = Math.floor(minX);
  minY = Math.floor(minY);
  const W = Math.ceil(maxX) - minX,
    H = Math.ceil(maxY) - minY;

  const boxed = raw.map((r) => {
    const b = document.createElement('canvas');
    b.width = W;
    b.height = H;
    const bc = b.getContext('2d')!;
    bc.imageSmoothingEnabled = false;
    bc.drawImage(r.cv, Math.round(xOf(r) - minX), Math.round(r.dy - minY));
    return { cv: b, delay: r.delay };
  });

  let x0 = W,
    y0 = H,
    x1 = -1,
    y1 = -1;
  for (const fr of boxed) {
    const d = fr.cv.getContext('2d')!.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 0) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
    }
  }

  if (x1 < 0) {
    return boxed.map((b) => ({
      canvas: b.cv,
      delay: b.delay,
      width: b.cv.width,
      height: b.cv.height,
    }));
  }

  const finalW = x1 - x0 + 1;
  const finalH = y1 - y0 + 1;

  return boxed.map((fr) => {
    const t = document.createElement('canvas');
    t.width = finalW;
    t.height = finalH;
    const tc = t.getContext('2d')!;
    tc.imageSmoothingEnabled = false;
    tc.drawImage(fr.cv, x0, y0, finalW, finalH, 0, 0, finalW, finalH);
    return {
      canvas: t,
      delay: fr.delay,
      width: finalW,
      height: finalH,
    };
  });
}
