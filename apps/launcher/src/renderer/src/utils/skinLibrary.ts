// Skin Library & Chibi Preview Management

import { composeLiveSprite, createDefaultChibiConfig, detectSkinBodyType } from './chibiLive';

export interface SavedSkinItem {
  id: string;
  name: string;
  dataUri: string;
  chibiPreviewUri: string;
  bodyType: 'alex' | 'steve';
  createdAt: number;
}

const STORAGE_KEY = 'quiby_skin_library';

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
 * Saves a new skin into the library with an authentic Live Chibi preview.
 */
export function addSkinToLibrary(
  name: string,
  skinCanvas: HTMLCanvasElement
): SavedSkinItem {
  const library = getSavedSkinLibrary();
  const dataUri = skinCanvas.toDataURL('image/png');
  const bodyType = detectSkinBodyType(skinCanvas);

  // Generate Live Chibi thumbnail preview
  const config = {
    ...createDefaultChibiConfig(),
    model: { bodyType, resolved: bodyType },
    anim: 'none',
  };
  const liveSprite = composeLiveSprite(skinCanvas, config);

  // Scale up sprite crisply to thumbnail canvas (e.g. 96x96)
  const thumbCv = document.createElement('canvas');
  thumbCv.width = 96;
  thumbCv.height = 96;
  const tCtx = thumbCv.getContext('2d')!;
  tCtx.imageSmoothingEnabled = false;

  const scale = Math.max(1, Math.floor(Math.min(96 / liveSprite.canvas.width, 96 / liveSprite.canvas.height) * 0.85));
  const dw = liveSprite.canvas.width * scale;
  const dh = liveSprite.canvas.height * scale;
  const dx = Math.round((96 - dw) / 2);
  const dy = Math.round((96 - dh) / 2);

  tCtx.drawImage(liveSprite.canvas, dx, dy, dw, dh);
  const chibiPreviewUri = thumbCv.toDataURL('image/png');

  // Check if identical skin dataUri already exists
  const existingIdx = library.findIndex((s) => s.dataUri === dataUri);
  const item: SavedSkinItem = {
    id: existingIdx >= 0 ? library[existingIdx].id : `skin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
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

  // Keep up to 20 skins in collection
  if (updated.length > 20) {
    updated = updated.slice(0, 20);
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
