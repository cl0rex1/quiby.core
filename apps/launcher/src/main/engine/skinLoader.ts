import fs from 'fs';
import path from 'path';

/** Give every client the same public skin source, so players see each other's skins. */
export function prepareSkinLoader(gameDir: string, serverBaseUrl: string): void {
  const modsDir = path.join(gameDir, 'mods');
  const installed = fs.existsSync(modsDir) && fs.readdirSync(modsDir).some(name => /^CustomSkinLoader_Universal-15\.0\.1\.jar$/i.test(name));
  if (!installed) throw new Error('Мод скинов CustomSkinLoader не установлен. Обновите сборку и запустите игру снова.');

  const directory = path.join(gameDir, 'CustomSkinLoader');
  fs.mkdirSync(directory, { recursive: true });
  const origin = serverBaseUrl.replace(/\/$/, '');
  const config = {
    loadlist: [
      { name: 'Quiby', type: 'Legacy', checkPNG: true, skin: `${origin}/api/skins/{USERNAME}.png`, model: 'auto' },
      { name: 'Mojang', type: 'MojangAPI' },
    ],
    enableTransparentSkin: true,
    enableCape: true,
    forceLoadAllTextures: true,
    cacheExpiry: 30,
  };
  fs.writeFileSync(path.join(directory, 'CustomSkinLoader.json'), JSON.stringify(config, null, 2));
}
