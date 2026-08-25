import {
  LiveBoxDef,
  LivePartDef,
  LiveGroupDef,
  CameraDef,
  AnimationDef,
} from './types';

export const ML_SPRITE = { w: 36, h: 42 };
export const ML_LAYOUT_W = 35;

export const ML_BOXES: Record<string, LiveBoxDef> = {
  head: { base: [0, 0], over: null, w: 8, h: 8, d: 8 },
  hat: { base: [32, 0], over: null, w: 8, h: 8, d: 8 },
  body: { base: [16, 16], over: [16, 32], w: 8, h: 12, d: 4 },
  rArm: { base: [40, 16], over: [40, 32], w: 4, h: 12, d: 4 },
  lArm: { base: [32, 48], over: [48, 48], w: 4, h: 12, d: 4 },
  rLeg: { base: [0, 16], over: [0, 32], w: 4, h: 12, d: 4 },
  lLeg: { base: [16, 48], over: [0, 48], w: 4, h: 12, d: 4 },
};

export function mlFace(
  boxKey: string,
  face: 'top' | 'bottom' | 'right' | 'front' | 'left' | 'back',
  layer: 'base' | 'over'
): [number, number, number, number] | null {
  const B = ML_BOXES[boxKey];
  if (!B) return null;
  const o = layer === 'over' ? B.over : B.base;
  if (!o) return null;
  const [u, v] = o;
  const { w, h, d } = B;
  switch (face) {
    case 'top':
      return [u + d, v, w, d];
    case 'bottom':
      return [u + d + w, v, w, d];
    case 'right':
      return [u, v + d, d, h];
    case 'front':
      return [u + d, v + d, w, h];
    case 'left':
      return [u + d + w, v + d, d, h];
    case 'back':
      return [u + d + w + d, v + d, w, h];
    default:
      return null;
  }
}

export const ML_SLIM_NARROW = new Set(['front', 'back', 'top', 'bottom']);
export const ML_SLIM_SHIFT = new Set(['bottom', 'left', 'back']);

export const ML_SIDE_SHADE = 0.67;
export const ML_FAR_SHADE = 0.808;
export const ML_AO_SHADE = 0.82;

export const ML_EDGE_V = 0.46;
export const ML_EDGE_S = 1.45;
export const ML_EDGE_S_ADD = 0.28;
export const ML_ANIM_ROOM = 4;

export const ML_PARTS_RAW: Record<string, LivePartDef> = {
  lLegSide: { box: 'lLeg', face: 'right', dest: [17, 33, 4, 6], block: [2, 2], ymap: [2, 6, 10], side: true, shade: ML_FAR_SHADE },
  lLegFront: { box: 'lLeg', face: 'front', dest: [21, 33, 6, 6], block: [2, 2], ymap: [2, 6, 10], shade: ML_FAR_SHADE },
  rLegSide: { box: 'rLeg', face: 'right', dest: [9, 33, 4, 6], block: [2, 2], ymap: [2, 6, 10], side: true },
  rLegFront: { box: 'rLeg', face: 'front', dest: [13, 33, 6, 6], block: [2, 2], ymap: [2, 6, 10] },
  lArmSide: { box: 'lArm', face: 'right', dest: [22, 25, 4, 6], block: [2, 2], side: true, shade: ML_FAR_SHADE },
  lArmFront: { box: 'lArm', face: 'front', dest: [26, 25, 6, 6], block: [2, 2], shade: ML_FAR_SHADE },
  bodySide: { box: 'body', face: 'right', dest: [9, 26, 4, 6], block: [2, 2], ymap: [2, 6, 10], side: true },
  bodyFront: { box: 'body', face: 'front', dest: [13, 26, 14, 6], block: [2, 2], ymap: [2, 6, 10] },
  headSide: { box: 'head', face: 'right', dest: [1, 1, 9, 24], block: [3, 3], side: true },
  headFront: { box: 'head', face: 'front', dest: [10, 1, 24, 24], block: [3, 3] },
  hatSide: { box: 'hat', face: 'right', dest: [0, 0, 9, 26], hat: true, side: true },
  hatFront: { box: 'hat', face: 'front', dest: [9, 0, 26, 26], hat: true },
  rArmSide: { box: 'rArm', face: 'right', dest: [3, 25, 4, 6], block: [2, 2], side: true },
  rArmFront: { box: 'rArm', face: 'front', dest: [7, 25, 6, 6], block: [2, 2], arm: true },
  bodyBent: { box: 'body', face: 'front', dest: [13, 28, 14, 4], block: [2, 2], group: 'body', shade: 0.92 },
  headTiltTop: { box: 'head', face: 'top', dest: [10, 1, 24, 9], block: [3, 3], group: 'head', side: true },
  headTiltFront: { box: 'head', face: 'front', dest: [10, 10, 24, 15], block: [3, 3], group: 'head', shade: 0.93 },
  hatTiltTop: { box: 'hat', face: 'top', dest: [9, 0, 26, 10], hat: true, group: 'head', side: true },
  hatTiltFront: { box: 'hat', face: 'front', dest: [9, 10, 26, 16], hat: true, group: 'head', shade: 0.93 },
  rArmPalm: { box: 'rArm', face: 'bottom', dest: [7, 33, 6, 4], block: [2, 2], group: 'rArm' },
  lArmPalm: { box: 'lArm', face: 'bottom', dest: [26, 33, 6, 4], block: [2, 2], group: 'lArm', shade: ML_FAR_SHADE },
  rLegSole: { box: 'rLeg', face: 'bottom', sub: [0, 0, 3, 3], dest: [13, 39, 6, 6], block: [2, 2], group: 'rLeg' },
  rLegTop: { box: 'rLeg', face: 'top', dest: [13, 33, 6, 6], block: [2, 2], group: 'rLeg' },
  lLegSole: { box: 'lLeg', face: 'bottom', sub: [1, 0, 3, 3], dest: [21, 39, 6, 6], block: [2, 2], group: 'lLeg', shade: ML_FAR_SHADE },
};

export function mlRects(p: LivePartDef): LivePartDef {
  const B = ML_BOXES[p.box];
  if (!B) return p;
  const cut = (r: [number, number, number, number] | null): [number, number, number, number] | undefined => {
    if (!r) return undefined;
    return p.sub ? [r[0] + p.sub[0], r[1] + p.sub[1], p.sub[2], p.sub[3]] : r;
  };
  const base = cut(mlFace(p.box, p.face, 'base'));
  if (B.over) {
    p.base = base;
    p.over = cut(mlFace(p.box, p.face, 'over'));
    delete p.src;
  } else {
    p.src = base;
    delete p.base;
    delete p.over;
  }
  const isArm = p.box === 'rArm' || p.box === 'lArm';
  p.arm = isArm && ML_SLIM_NARROW.has(p.face);
  p.slimShiftX = isArm && ML_SLIM_SHIFT.has(p.face);
  return p;
}

export const ML_PARTS: Record<string, LivePartDef> = {};
for (const [k, v] of Object.entries(ML_PARTS_RAW)) {
  ML_PARTS[k] = mlRects({ ...v });
}

export const ML_GROUPS: LiveGroupDef[] = [
  { key: 'lArm', parts: ['lArmSide', 'lArmFront'], joint: 1 },
  { key: 'lLeg', parts: ['lLegSide', 'lLegFront'], joint: 2 },
  { key: 'rLeg', parts: ['rLegSide', 'rLegFront'], joint: 2 },
  { key: 'body', parts: ['bodySide', 'bodyFront'], joint: 1 },
  { key: 'head', parts: ['headSide', 'headFront', 'hatSide', 'hatFront'], joint: 0 },
  { key: 'rArm', parts: ['rArmSide', 'rArmFront'], joint: 1 },
];

export const ML_CAMERAS: Record<string, CameraDef> = {
  'front-right': { faces: null, mirror: false, swapLimb: false },
  'front-left': { faces: { right: 'left', left: 'right' }, mirror: true, swapLimb: true },
  'back34-right': { faces: { front: 'back', back: 'front' }, mirror: true, swapLimb: false, armUnderHead: true },
  'back34-left': { faces: { front: 'back', back: 'front', right: 'left', left: 'right' }, mirror: false, swapLimb: true, armUnderHead: true },
  'front-flat': { faces: null, mirror: false, swapLimb: false, dropSide: true, evenLit: true, armsLevel: true, nudge: { lArm: 2, rArm: -1, head: -2, hat: -2 }, xjoint: { lArm: 1, rArm: -1 } },
  'back-flat': { faces: { front: 'back', back: 'front' }, mirror: true, swapLimb: false, dropSide: true, armUnderHead: true, evenLit: true, armsLevel: true, nudge: { lArm: 2, rArm: -1, head: -2, hat: -2 }, xjoint: { lArm: 1, rArm: -1 } },
  'side-right': { faces: null, mirror: false, swapLimb: false, table: 'profile' },
  'side-left': { faces: { right: 'left', left: 'right' }, mirror: true, swapLimb: true, table: 'profile' },
  'top': { faces: null, mirror: false, swapLimb: false, table: 'plan', noAo: true },
  'bottom': { faces: { top: 'bottom', bottom: 'top', front: 'back', back: 'front', right: 'left', left: 'right' }, mirror: true, swapLimb: true, table: 'plan', flipDepth: true, noAo: true, underLit: true },
};

export const ML_LR_SWAP: Record<string, string> = {
  rArm: 'lArm',
  lArm: 'rArm',
  rLeg: 'lLeg',
  lLeg: 'rLeg',
};

export const ML_PROFILE_PARTS_RAW: Record<string, LivePartDef> = {
  lLegProf: { box: 'lLeg', face: 'right', dest: [10, 33, 6, 6], block: [2, 2], ymap: [2, 6, 10], shade: ML_FAR_SHADE },
  rLegProf: { box: 'rLeg', face: 'right', dest: [10, 33, 6, 6], block: [2, 2], ymap: [2, 6, 10] },
  lArmProf: { box: 'lArm', face: 'right', dest: [10, 26, 6, 6], block: [2, 2], shade: ML_FAR_SHADE },
  bodyProf: { box: 'body', face: 'right', dest: [10, 26, 6, 6], block: [2, 2], ymap: [2, 6, 10] },
  rArmProf: { box: 'rArm', face: 'right', dest: [10, 26, 6, 6], block: [2, 2] },
  headProf: { box: 'head', face: 'right', dest: [1, 1, 24, 24], block: [3, 3] },
  hatProf: { box: 'hat', face: 'right', dest: [0, 0, 26, 26], hat: true },
};

export const ML_PROFILE_PARTS: Record<string, LivePartDef> = {};
for (const [k, v] of Object.entries(ML_PROFILE_PARTS_RAW)) {
  ML_PROFILE_PARTS[k] = mlRects({ ...v });
}

export const ML_PROFILE_GROUPS: LiveGroupDef[] = [
  { key: 'lLeg', parts: ['lLegProf'], joint: 2 },
  { key: 'rLeg', parts: ['rLegProf'], joint: 2 },
  { key: 'lArm', parts: ['lArmProf'], joint: 1 },
  { key: 'body', parts: ['bodyProf'], joint: 1 },
  { key: 'rArm', parts: ['rArmProf'], joint: 1 },
  { key: 'head', parts: ['headProf', 'hatProf'], joint: 0 },
];

export const ML_PLAN_PARTS_RAW: Record<string, LivePartDef> = {
  bodyPlan: { box: 'body', face: 'top', dest: [13, 17, 14, 6], block: [2, 2], shade: ML_FAR_SHADE },
  rArmPlan: { box: 'rArm', face: 'top', dest: [6, 17, 6, 6], block: [2, 2], shade: ML_FAR_SHADE, xjoint: -1 },
  lArmPlan: { box: 'lArm', face: 'top', dest: [28, 17, 6, 6], block: [2, 2], shade: ML_FAR_SHADE, xjoint: 1 },
  rLegPlan: { box: 'rLeg', face: 'top', dest: [13, 17, 6, 6], block: [2, 2], shade: ML_FAR_SHADE },
  lLegPlan: { box: 'lLeg', face: 'top', dest: [21, 17, 6, 6], block: [2, 2], shade: ML_FAR_SHADE },
  headPlan: { box: 'head', face: 'top', dest: [8, 8, 24, 24], block: [3, 3] },
  hatPlan: { box: 'hat', face: 'top', dest: [7, 7, 26, 26], hat: true },
};

export const ML_PLAN_PARTS: Record<string, LivePartDef> = {};
for (const [k, v] of Object.entries(ML_PLAN_PARTS_RAW)) {
  ML_PLAN_PARTS[k] = mlRects({ ...v });
}

export const ML_PLAN_GROUPS: LiveGroupDef[] = [
  { key: 'lLeg', parts: ['lLegPlan'], joint: 0 },
  { key: 'rLeg', parts: ['rLegPlan'], joint: 0 },
  { key: 'body', parts: ['bodyPlan'], joint: 0 },
  { key: 'lArm', parts: ['lArmPlan'], joint: 0 },
  { key: 'rArm', parts: ['rArmPlan'], joint: 0 },
  { key: 'head', parts: ['headPlan', 'hatPlan'], joint: 0 },
];

export const ML_TABLES: Record<string, { parts: Record<string, LivePartDef>; groups: LiveGroupDef[]; suffix: string }> = {
  profile: { parts: ML_PROFILE_PARTS, groups: ML_PROFILE_GROUPS, suffix: '@side' },
  plan: { parts: ML_PLAN_PARTS, groups: ML_PLAN_GROUPS, suffix: '@plan' },
};

export const CHIBI_VIEWS: Record<string, { side?: boolean; flat?: boolean; facing?: 'left' | 'right'; vs?: 'front' | 'back'; vert?: string; portrait?: boolean }> = {
  '34-right': { side: false, flat: false, facing: 'right', vs: 'front' },
  '34-left': { side: false, flat: false, facing: 'left', vs: 'front' },
  'front': { side: false, flat: true, vs: 'front' },
  'back': { side: false, flat: true, vs: 'back' },
  'side-right': { side: true, facing: 'right' },
  'side-left': { side: true, facing: 'left' },
  'back34-right': { side: false, flat: false, facing: 'right', vs: 'back' },
  'back34-left': { side: false, flat: false, facing: 'left', vs: 'back' },
  'top': { vert: 'top' },
  'bottom': { vert: 'bottom' },
};

export const CHIBI_TURN_VIEWS = ['front', '34-right', 'side-right', 'back34-right', 'back', 'back34-left', 'side-left', '34-left'];

export const ML_TURN_AX: Record<string, number> = {
  'front': 25.5,
  '34-right': 23.5,
  'side-right': 18.5,
  'back34-right': 23.5,
  'back': 21.5,
  'back34-left': 23.5,
  'side-left': 28.5,
  '34-left': 23.5,
};

export const CHIBI_ANIM_GROUPS: Record<string, string[]> = {
  head: ['head', 'hat'],
  body: ['body', 'jacket'],
  rArm: ['rArm', 'rSlv'],
  lArm: ['lArm', 'lSlv'],
  rLeg: ['rLeg', 'rPant'],
  lLeg: ['lLeg', 'lPant'],
  stabArm: ['lArmStab', 'rArmStab'],
  waveArm: ['lArmWave', 'rArmWave'],
};

export const CHIBI_ANIMS: Record<string, AnimationDef> = {
  idle: {
    label: 'Idle',
    frames: [
      { d: 500 },
      { parts: { head: [0, 1], body: [0, 1], lArm: [0, 1], rArm: [0, 1] }, d: 500 },
    ],
  },
  walk: {
    label: 'Walk',
    frames: [
      { parts: { rLeg: [0, -2, 0.72], lArm: [0, -1] }, under: ['rArm'], over: ['lArm'], d: 180 },
      { parts: { head: [0, 1], body: [0, 1], lArm: [0, 1], rArm: [0, 1] }, under: ['rArm'], over: ['lArm'], d: 180 },
      { parts: { lLeg: [0, -2, 0.72], rArm: [0, -1] }, over: ['rArm'], d: 180 },
      { parts: { head: [0, 1], body: [0, 1], lArm: [0, 1], rArm: [0, 1] }, over: ['rArm'], d: 180 },
    ],
  },
  run: {
    label: 'Run',
    frames: [
      { parts: { rLeg: [0, -3, 0.7], lArm: [0, -2] }, under: ['rArm'], over: ['lArm'], dy: -1, d: 110 },
      { under: ['rArm'], over: ['lArm'], d: 110 },
      { parts: { lLeg: [0, -3, 0.7], rArm: [0, -2] }, over: ['rArm'], dy: -1, d: 110 },
      { over: ['rArm'], d: 110 },
    ],
  },
  wave: {
    label: 'Wave',
    frames: [
      { pose: 'waving', d: 240 },
      { pose: 'waving', parts: { waveArm: [0, 1] }, d: 240 },
    ],
  },
  bounce: {
    label: 'Bounce',
    frames: [
      { under: ['rArm'], d: 260 },
      { pose: 'crouch', under: ['rArm'], d: 260 },
    ],
  },
};

export const ML_BUST_CUT: Record<string, number> = {
  torso: 33,
  portrait: 30,
  head: 27,
};
