// Skin Library & Chibi Preview Management

import { bakeChibiLiveAnimation, createDefaultChibiConfig, detectSkinBodyType } from './chibiLive';

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
 * Saves a new skin into the library with an authentic, standardized Live Chibi preview.
 */
export function addSkinToLibrary(
  name: string,
  skinCanvas: HTMLCanvasElement
): SavedSkinItem {
  const library = getSavedSkinLibrary();
  const dataUri = skinCanvas.toDataURL('image/png');
  const bodyType = detectSkinBodyType(skinCanvas);

  // Generate Live Chibi thumbnail preview (Always using classic Steve proportions for uniform chibi size)
  const config = {
    ...createDefaultChibiConfig(),
    model: { bodyType: 'steve' as const, resolved: 'steve' as const },
    anim: 'idle',
  };
  const frames = bakeChibiLiveAnimation(skinCanvas, config, 'idle');
  const curFrame = frames[0];

  // Scale up sprite crisply to thumbnail canvas (96x96)
  const thumbCv = document.createElement('canvas');
  thumbCv.width = 96;
  thumbCv.height = 96;
  const tCtx = thumbCv.getContext('2d')!;
  tCtx.imageSmoothingEnabled = false;

  // Fixed uniform scale for consistent size across all skins
  const scale = 2.0;
  const dw = Math.round(curFrame.width * scale);
  const dh = Math.round(curFrame.height * scale);
  const dx = Math.round((96 - dw) / 2);
  const dy = Math.round((96 - dh) / 2 + 1);

  tCtx.drawImage(curFrame.canvas, dx, dy, dw, dh);
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

  // Limit to maximum 5 skins in player collection
  if (updated.length > 5) {
    updated = updated.slice(0, 5);
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
