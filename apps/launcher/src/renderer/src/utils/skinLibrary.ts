// Skin Library & Chibi Preview Management

import { bakeChibiLiveAnimation, createDefaultChibiConfig, detectSkinBodyType } from './chibiLive';

export interface SavedSkinItem {
  id: string;
  name: string;
  caption?: string;
  dataUri: string;
  chibiPreviewUri: string;
  bodyType: 'alex' | 'steve';
  createdAt: number;
}

const STORAGE_KEY = 'quiby_skin_library';

/** Captions are presentation only; filenames remain stable for skin synchronization. */
export function getSkinDisplayName(library: SavedSkinItem[], sourceName: string | null, dataUri?: string): string | null {
  const item = (dataUri ? library.find(skin => skin.dataUri === dataUri) : undefined)
    || library.find(skin => skin.name === sourceName);
  return item?.caption || sourceName;
}

/**
 * Loads all saved skins from LocalStorage.
 */
export function getSavedSkinLibrary(): SavedSkinItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Renders a crisp standardized 96x96 Chibi PNG data URI from a skin canvas.
 */
export function createChibiPreviewUri(skinCanvas: HTMLCanvasElement): string {
  const config = {
    ...createDefaultChibiConfig(),
    model: { bodyType: 'steve' as const, resolved: 'steve' as const },
    anim: 'idle',
  };
  const frames = bakeChibiLiveAnimation(skinCanvas, config, 'idle');
  const curFrame = frames[0];

  const thumbCv = document.createElement('canvas');
  thumbCv.width = 96;
  thumbCv.height = 96;
  const tCtx = thumbCv.getContext('2d')!;
  tCtx.imageSmoothingEnabled = false;

  const scale = 2.0;
  const dw = Math.round(curFrame.width * scale);
  const dh = Math.round(curFrame.height * scale);
  const dx = Math.round((96 - dw) / 2);
  const dy = Math.round((96 - dh) / 2 + 1);

  tCtx.drawImage(curFrame.canvas, dx, dy, dw, dh);
  return thumbCv.toDataURL('image/png');
}

/**
 * Saves a new skin into the library with an authentic, standardized Live Chibi preview.
 */
export function addSkinToLibrary(
  name: string,
  skinCanvas: HTMLCanvasElement
): SavedSkinItem {
  const library = getSavedSkinLibrary();
  const dataUri = skinCanvas.toDataURL('image/png');
  const bodyType = detectSkinBodyType(skinCanvas);
  const chibiPreviewUri = createChibiPreviewUri(skinCanvas);

  // Check if identical skin dataUri already exists
  const existingIdx = library.findIndex((s) => s.dataUri === dataUri);
  const item: SavedSkinItem = {
    id: existingIdx >= 0 ? library[existingIdx].id : `skin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    caption: existingIdx >= 0 ? library[existingIdx].caption : undefined,
    dataUri,
    chibiPreviewUri,
    bodyType,
    createdAt: Date.now(),
  };

  let updated: SavedSkinItem[];
  if (existingIdx >= 0) {
    updated = [item, ...library.filter((_, i) => i !== existingIdx)];
  } else {
    updated = [item, ...library];
  }

  // Limit to maximum 6 skins in player collection (3x2 grid)
  if (updated.length > 6) {
    updated = updated.slice(0, 6);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save skin to localStorage', e);
  }

  return item;
}

/**
 * Removes a skin from the library by ID.
 */
export function removeSkinFromLibrary(id: string): SavedSkinItem[] {
  const library = getSavedSkinLibrary();
  const updated = library.filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update skin library in localStorage', e);
  }
  return updated;
}

function cleanSkinCaption(caption: string): string {
  const clean = Array.from(caption.trim().replace(/\s+/g, ' ')).slice(0, 24).join('');
  if (!clean) throw new Error('Введите название скина');
  return clean;
}

export function getDefaultSkinCaption(name: string): string {
  try { const value = JSON.parse(localStorage.getItem('quiby_default_skin_captions') || '{}')[name]; return typeof value === 'string' && value.trim() ? cleanSkinCaption(value) : name; }
  catch { return name; }
}

export function renameDefaultSkin(name: string, caption: string): void {
  if (!['Steve', 'Alex'].includes(name)) throw new Error('Неизвестный базовый скин');
  const clean = cleanSkinCaption(caption);
  let saved: Record<string, string> = {};
  try { saved = JSON.parse(localStorage.getItem('quiby_default_skin_captions') || '{}'); } catch { /* Replace corrupt captions only. */ }
  localStorage.setItem('quiby_default_skin_captions', JSON.stringify({ ...saved, [name]: clean }));
}

export function renameSavedSkin(id: string, caption: string): SavedSkinItem[] {
  const clean = cleanSkinCaption(caption);
  const updated = getSavedSkinLibrary().map(item => item.id === id ? { ...item, caption: clean } : item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
