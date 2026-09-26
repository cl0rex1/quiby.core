import AdmZip from 'adm-zip';
import * as toml from 'smol-toml';

export interface ModMetadata {
  modId: string;
  modName: string;
  modVersion: string;
  loader: 'neoforge' | 'forge' | 'fabric' | 'unknown';
  description?: string;
  projectUrl?: string;
  iconData?: Buffer;
  iconExtension?: string;
}

export function extractModMetadata(jarPath: string): ModMetadata {
  try {
    const zip = new AdmZip(jarPath);
    const details = (mod: any) => {
      const iconName = typeof mod.logoFile === 'string' ? mod.logoFile : typeof mod.icon === 'string' ? mod.icon : mod.icon?.['128'];
      const entry = iconName ? zip.getEntry(iconName) : null;
      const iconExtension = typeof iconName === 'string' ? iconName.match(/\.(png|jpg|jpeg)$/i)?.[0].toLowerCase() : undefined;
      const rawUrl = mod.displayURL || mod.contact?.homepage || mod.contact?.sources;
      return {
        description: typeof mod.description === 'string' ? mod.description.trim() : undefined,
        projectUrl: typeof rawUrl === 'string' && /^https?:\/\//i.test(rawUrl) ? rawUrl : undefined,
        ...(entry && entry.header.size <= 1024 * 1024 && iconExtension ? { iconData: zip.readFile(entry) || undefined, iconExtension } : {}),
      };
    };
    const manifestEntry = zip.getEntry('META-INF/MANIFEST.MF');
    const jarVersion = manifestEntry ? zip.readAsText(manifestEntry).match(/^Implementation-Version:\s*(.+)$/m)?.[1].trim() : undefined;

    // 1. Check for NeoForge: META-INF/neoforge.mods.toml
    const neoforgeEntry = zip.getEntry('META-INF/neoforge.mods.toml');
    if (neoforgeEntry) {
      const text = zip.readAsText(neoforgeEntry);
      const parsed: any = toml.parse(text);
      const mod = parsed.mods?.[0] || {};
      return {
        modId: mod.modId || mod.id || 'unknown',
        modName: mod.displayName || mod.name || mod.modId || 'NeoForge Mod',
        modVersion: mod.version === '${file.jarVersion}' ? jarVersion || 'unknown' : mod.version || 'unknown',
        ...details(mod),
        loader: 'neoforge',
      };
    }

    // 2. Check for Forge: META-INF/mods.toml
    const forgeEntry = zip.getEntry('META-INF/mods.toml');
    if (forgeEntry) {
      const text = zip.readAsText(forgeEntry);
      const parsed: any = toml.parse(text);
      const mod = parsed.mods?.[0] || {};
      return {
        modId: mod.modId || mod.id || 'unknown',
        modName: mod.displayName || mod.name || mod.modId || 'Forge Mod',
        modVersion: mod.version === '${file.jarVersion}' ? jarVersion || 'unknown' : mod.version || 'unknown',
        ...details(mod),
        loader: 'forge',
      };
    }

    // 3. Check for Fabric: fabric.mod.json
    const fabricEntry = zip.getEntry('fabric.mod.json');
    if (fabricEntry) {
      const text = zip.readAsText(fabricEntry);
      const parsed: any = JSON.parse(text);
      return {
        modId: parsed.id || 'unknown',
        modName: parsed.name || parsed.id || 'Fabric Mod',
        modVersion: parsed.version || 'unknown',
        ...details(parsed),
        loader: 'fabric',
      };
    }
  } catch (_) {
    // If jar reading fails or is obfuscated, fallback to filename parsing
  }

  return {
    modId: 'unknown',
    modName: 'Mod',
    modVersion: '1.0.0',
    loader: 'unknown',
  };
}
