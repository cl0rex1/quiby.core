export interface ChibiModelConfig {
  bodyType: 'auto' | 'steve' | 'alex';
  resolved?: 'steve' | 'alex';
}

export interface ChibiRenderingSettings {
  headOverlay: 'on' | 'off';
  bodyOverlay: 'on' | 'off';
  shading: 'on' | 'off';
  shadingStrength: number;
  layerShadow: boolean;
}

export interface ChibiBackgroundConfig {
  color: string;
  transparent: boolean;
  vignette: boolean;
  shape: 'none' | 'square' | 'circle';
  aspect: string;
  image?: string | null;
  charZoom: number;
  charX: number;
  charY: number;
  fillFrame: boolean;
}

export interface ChibiOutlineConfig {
  width: number;
  sharp: boolean;
  color: string;
  auto: boolean;
  perPart: boolean;
}

export interface ChibiTextureConfig {
  pixelated: boolean;
  barebones: boolean;
  barebonesThreshold: number;
  halfHeightUVs: boolean;
}

export interface ChibiExportConfig {
  size: number;
  gifSpeed: number;
  animFormat: 'gif' | 'apng' | 'webm' | 'png';
}

export interface ChibiLiveConfig {
  version: number;
  tool: string;
  model: ChibiModelConfig;
  style: 'live' | 'classic';
  detail: 'blocky' | 'fine';
  skin: {
    name?: string | null;
    width?: number | null;
    height?: number | null;
    dataUri?: string | null;
  } | null;
  view: string;
  bust: 'torso' | 'portrait' | 'head' | null;
  upsideDown: boolean;
  facing: 'left' | 'right';
  pose: string;
  anim: string;
  chibi: ChibiRenderingSettings;
  material: 'soft' | 'glossy' | 'clay' | 'plastic' | 'matte' | 'metallic' | 'embossed' | 'flat';
  background: ChibiBackgroundConfig;
  outline: ChibiOutlineConfig;
  farLegShade: boolean;
  texture: ChibiTextureConfig;
  export: ChibiExportConfig;
  visibility: Record<string, boolean>;
}

export interface BakedFrame {
  canvas: HTMLCanvasElement;
  delay: number;
  width: number;
  height: number;
}

export interface LiveBoxDef {
  base: [number, number];
  over: [number, number] | null;
  w: number;
  h: number;
  d: number;
}

export interface LivePartDef {
  box: string;
  face: 'top' | 'bottom' | 'right' | 'front' | 'left' | 'back';
  dest: [number, number, number, number];
  block?: [number, number];
  ymap?: number[];
  side?: boolean;
  shade?: number;
  hat?: boolean;
  clothing?: boolean;
  group?: string;
  sub?: [number, number, number, number];
  src?: [number, number, number, number];
  base?: [number, number, number, number];
  over?: [number, number, number, number];
  slimBase?: [number, number, number, number];
  slimOver?: [number, number, number, number];
  arm?: boolean;
  slimShiftX?: boolean;
  keepSide?: boolean;
  keepShade?: boolean;
  placed?: boolean;
  flat?: number;
  xjoint?: number;
  pin?: boolean;
  rot?: number;
  mirrorX?: boolean;
  mirrorMap?: boolean;
  aoTop?: number;
}

export interface LiveGroupDef {
  key: string;
  parts: string[];
  joint: number;
  overHead?: boolean;
  armsBehind?: boolean;
  clipBody?: boolean;
}

export interface CameraDef {
  faces: Record<string, string> | null;
  mirror: boolean;
  swapLimb: boolean;
  armUnderHead?: boolean;
  dropSide?: boolean;
  evenLit?: boolean;
  armsLevel?: boolean;
  nudge?: Record<string, number>;
  xjoint?: Record<string, number>;
  table?: 'profile' | 'plan';
  noAo?: boolean;
  flipDepth?: boolean;
  underLit?: boolean;
}

export interface AnimFrameDef {
  d: number;
  liveD?: number;
  dy?: number;
  vertDy?: number;
  dx?: number;
  ax?: number;
  liveAx?: number;
  parts?: Record<string, [number, number, number?]>;
  liveParts?: Record<string, [number, number, number?]>;
  vertParts?: Record<string, [number, number, number?]>;
  backParts?: Record<string, [number, number, number?]>;
  under?: string[];
  over?: string[];
  pose?: string;
  livePose?: string;
  view?: string;
  headSwap?: any;
}

export interface AnimationDef {
  label: string;
  frames: AnimFrameDef[];
  padX?: number;
  padY?: number;
  shadeRow?: boolean;
  anchor?: 'center';
}
