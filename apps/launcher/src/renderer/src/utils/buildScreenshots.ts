import type { BuildId } from './buildProfiles';
import visualPreview from '../assets/auth/launcher-shaders.png';
import standardPreview from '../assets/auth/launcher-home.png';
import draftPreview from '../assets/auth/launcher-mods.png';

const images = import.meta.glob('../assets/builds/**/*.{png,jpg,jpeg,webp}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;
const previews = { visual: visualPreview, standard: standardPreview, draft: draftPreview };
export const buildScreenshots = (id: BuildId) => Object.entries(images)
  .filter(([path]) => path.includes('/' + id + '/'))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);
export const buildBanner = (id: BuildId) => buildScreenshots(id)[0] || previews[id];
