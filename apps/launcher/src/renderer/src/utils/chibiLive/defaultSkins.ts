// Procedural high-fidelity Minecraft default skin textures (Alex and Steve) for standalone testing and rendering.

export function createAlexSkinCanvas(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Head (Base: 0,0 32x16)
  ctx.fillStyle = '#e5a180'; // Skin tone
  ctx.fillRect(0, 0, 32, 16);

  // Hair (Orange/Ginger)
  ctx.fillStyle = '#b25424';
  ctx.fillRect(8, 0, 8, 8); // Head top
  ctx.fillRect(0, 8, 32, 4); // Hair band around head
  ctx.fillRect(8, 8, 8, 3); // Hair front top

  // Eyes (Green)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(9, 12, 2, 2);
  ctx.fillRect(13, 12, 2, 2);
  ctx.fillStyle = '#2e8540';
  ctx.fillRect(10, 12, 1, 2);
  ctx.fillRect(14, 12, 1, 2);

  // Mouth
  ctx.fillStyle = '#bc7359';
  ctx.fillRect(11, 14, 2, 1);

  // Torso (Green tunic / shirt: 16,16 24x16)
  ctx.fillStyle = '#5c8451';
  ctx.fillRect(16, 16, 24, 16);
  // Belt
  ctx.fillStyle = '#47321e';
  ctx.fillRect(20, 28, 8, 2);

  // Right Arm (Slim 3px wide or 4px layout: 40,16 16x16)
  ctx.fillStyle = '#5c8451'; // Sleeve
  ctx.fillRect(40, 16, 16, 4);
  ctx.fillStyle = '#e5a180'; // Arm skin
  ctx.fillRect(40, 20, 16, 12);

  // Left Arm (32,48 16x16)
  ctx.fillStyle = '#5c8451'; // Sleeve
  ctx.fillRect(32, 48, 16, 4);
  ctx.fillStyle = '#e5a180'; // Arm skin
  ctx.fillRect(32, 52, 16, 12);

  // Right Leg (Brown pants / boots: 0,16 16x16)
  ctx.fillStyle = '#513d29'; // Pants
  ctx.fillRect(0, 16, 16, 10);
  ctx.fillStyle = '#423223'; // Boots
  ctx.fillRect(0, 26, 16, 6);

  // Left Leg (16,48 16x16)
  ctx.fillStyle = '#513d29'; // Pants
  ctx.fillRect(16, 48, 16, 10);
  ctx.fillStyle = '#423223'; // Boots
  ctx.fillRect(16, 58, 16, 6);

  // Hat Layer (Hair volume: 32,0 32x16)
  ctx.fillStyle = '#b25424';
  ctx.fillRect(32, 0, 32, 6);
  ctx.fillRect(40, 8, 8, 4); // Bangs

  return cv;
}

export function createSteveSkinCanvas(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Head (Base: 0,0 32x16)
  ctx.fillStyle = '#c68a62'; // Skin tone
  ctx.fillRect(0, 0, 32, 16);

  // Hair (Dark Brown)
  ctx.fillStyle = '#3a2417';
  ctx.fillRect(8, 0, 8, 8); // Head top
  ctx.fillRect(0, 8, 32, 4); // Hair band around head
  ctx.fillRect(8, 8, 8, 2); // Hair front top

  // Eyes (Blue/Purple)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(9, 12, 2, 2);
  ctx.fillRect(13, 12, 2, 2);
  ctx.fillStyle = '#2b3386';
  ctx.fillRect(10, 12, 1, 2);
  ctx.fillRect(14, 12, 1, 2);

  // Nose & Beard
  ctx.fillStyle = '#53321f';
  ctx.fillRect(10, 14, 4, 1);

  // Torso (Cyan/Teal shirt: 16,16 24x16)
  ctx.fillStyle = '#00a9af';
  ctx.fillRect(16, 16, 24, 16);

  // Right Arm (40,16 16x16)
  ctx.fillStyle = '#00a9af'; // Sleeve
  ctx.fillRect(40, 16, 16, 4);
  ctx.fillStyle = '#c68a62'; // Arm skin
  ctx.fillRect(40, 20, 16, 12);

  // Left Arm (32,48 16x16)
  ctx.fillStyle = '#00a9af'; // Sleeve
  ctx.fillRect(32, 48, 16, 4);
  ctx.fillStyle = '#c68a62'; // Arm skin
  ctx.fillRect(32, 52, 16, 12);

  // Right Leg (Dark Blue pants / boots: 0,16 16x16)
  ctx.fillStyle = '#2e3a7a'; // Jeans
  ctx.fillRect(0, 16, 16, 10);
  ctx.fillStyle = '#4c4c4c'; // Shoes
  ctx.fillRect(0, 26, 16, 6);

  // Left Leg (16,48 16x16)
  ctx.fillStyle = '#2e3a7a'; // Jeans
  ctx.fillRect(16, 48, 16, 10);
  ctx.fillStyle = '#4c4c4c'; // Shoes
  ctx.fillRect(16, 58, 16, 6);

  return cv;
}
