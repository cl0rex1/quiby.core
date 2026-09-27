import type { BuildId } from './buildProfiles';
import draft from '../assets/scenes/draft1.webp';
import standard from '../assets/scenes/standard1.webp';
import visual from '../assets/scenes/visual1.webp';
import village from '../assets/scenes/2026-09-27_21.43.51.webp';
import ship from '../assets/scenes/2026-09-27_21.50.32.webp';
import coast from '../assets/scenes/2026-09-27_21.47.33.webp';
import mountainShip from '../assets/scenes/2026-09-27_21.50.41.webp';
import airship from '../assets/scenes/2026-09-27_21.38.48.webp';
import mountain from '../assets/scenes/2026-09-27_21.38.37.webp';
import explosion from '../assets/scenes/2026-09-27_21.45.41_2.webp';
import cottage from '../assets/scenes/2026-09-27_21.45.38.webp';
import draftVideo from '../assets/builds/videos/draft.mp4';
import standardVideo from '../assets/builds/videos/standard.mp4';
import visualVideo from '../assets/builds/videos/visual.mp4';

const screenshots: Record<BuildId, string[]> = {
  draft: [draft, cottage, mountain],
  standard: [standard, village, coast],
  visual: [visual, ship, mountainShip, airship, explosion],
};
const videos: Record<BuildId, string> = { draft: draftVideo, standard: standardVideo, visual: visualVideo };

export const buildScreenshots = (id: BuildId) => screenshots[id];
export const buildBanner = (id: BuildId) => screenshots[id][0];
export const buildVideo = (id: BuildId) => videos[id];
export const authScenes = [visual, ship, mountain, village, airship, standard, explosion, coast, draft, cottage, mountainShip];
