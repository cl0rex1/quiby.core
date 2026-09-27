import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import os from 'os';
import { installJava21, managedJavaPath, type JavaProgress } from './managedJava';

export interface JavaInstallation {
  path: string;
  version: number;
  versionString: string;
  isCompatible: boolean; // Minecraft 1.21.1 / NeoForge requires Java 21
  isBundled?: boolean;
}

export async function detectInstalledJava(runtimeRoot?: string): Promise<JavaInstallation[]> {
  const installations: JavaInstallation[] = [];
  const candidatePaths: string[] = runtimeRoot ? [managedJavaPath(runtimeRoot)] : [];

  const platform = os.platform();

  // 1. Check PATH java
  try {
    const whichCmd = platform === 'win32' ? 'where java' : 'which java';
    const output = execSync(whichCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (output) {
      output.split('\n').forEach(p => candidatePaths.push(p.trim()));
    }
  } catch (_) {}

  // 2. Platform-specific paths
  if (platform === 'darwin') {
    const jvmDir = '/Library/Java/JavaVirtualMachines';
    if (fs.existsSync(jvmDir)) {
      const dirs = fs.readdirSync(jvmDir);
      for (const d of dirs) {
        const bin = path.join(jvmDir, d, 'Contents/Home/bin/java');
        if (fs.existsSync(bin)) candidatePaths.push(bin);
      }
    }
    // Also check brew / sdkman / asdf / user paths
    const userJvm = path.join(os.homedir(), 'Library/Java/JavaVirtualMachines');
    if (fs.existsSync(userJvm)) {
      const dirs = fs.readdirSync(userJvm);
      for (const d of dirs) {
        const bin = path.join(userJvm, d, 'Contents/Home/bin/java');
        if (fs.existsSync(bin)) candidatePaths.push(bin);
      }
    }
  } else if (platform === 'win32') {
    const progFiles = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)'], process.env['LOCALAPPDATA']];
    for (const pf of progFiles) {
      if (!pf) continue;
      const roots = [path.join(pf, 'Java'), path.join(pf, 'Eclipse Adoptium'), path.join(pf, 'BellSoft'), path.join(pf, 'Zulu'), path.join(process.env.APPDATA || '', 'ModrinthApp', 'meta', 'java_versions')];
      for (const root of roots) {
        if (fs.existsSync(root)) {
          const subdirs = fs.readdirSync(root);
          for (const s of subdirs) {
            const bin2 = path.join(root, s, 'bin', 'java.exe');
            if (fs.existsSync(bin2)) candidatePaths.push(bin2);
          }
        }
      }
    }
  } else {
    // Linux
    const jvmRoots = ['/usr/lib/jvm', '/usr/java', path.join(os.homedir(), '.sdkman/candidates/java')];
    for (const root of jvmRoots) {
      if (fs.existsSync(root)) {
        const subdirs = fs.readdirSync(root);
        for (const s of subdirs) {
          const bin = path.join(root, s, 'bin', 'java');
          if (fs.existsSync(bin)) candidatePaths.push(bin);
        }
      }
    }
  }

  // Deduplicate
  const uniquePaths = Array.from(new Set(candidatePaths));

  for (const javaBin of uniquePaths) {
    try {
      const versionInfo = getJavaVersion(javaBin);
      if (versionInfo) {
        installations.push({
          path: javaBin,
          version: versionInfo.major,
          versionString: versionInfo.full,
          isCompatible: versionInfo.major === 21 && versionInfo.is64Bit,
          isBundled: runtimeRoot ? javaBin === managedJavaPath(runtimeRoot) : false,
        });
      }
    } catch (_) {}
  }

  return installations;
}

export function getJavaVersion(javaBin: string): { major: number; full: string; is64Bit: boolean } | null {
  try {
    const result = spawnSync(javaBin.replace(/javaw\.exe$/i, 'java.exe'), ['-XshowSettings:properties', '-version'], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    if (result.error || result.status !== 0) return null;
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    const match = output.match(/(?:java|openjdk) version "([^"]+)"/) || output.match(/version "([^"]+)"/);
    if (match) {
      const full = match[1];
      let major = 0;
      if (full.startsWith('1.')) {
        major = parseInt(full.split('.')[1], 10);
      } else {
        major = parseInt(full.split('.')[0], 10);
      }
      return { major, full, is64Bit: /sun\.arch\.data\.model\s*=\s*64|64-Bit/i.test(output) };
    }
  } catch (_) {}
  return null;
}

export function getRecommendedJava(installations: JavaInstallation[]): JavaInstallation | null {
  // Stay on the runtime supported by this Minecraft version.
  const compatible = installations.filter(i => i.isCompatible).sort((a, b) => b.version - a.version);
  return compatible[0] || null;
}

export async function resolveJava21(selectedPath: string, runtimeRoot: string, progress?: JavaProgress): Promise<string> {
  const consolePath = (selectedPath || 'java').replace(/javaw\.exe$/i, 'java.exe');
  const selected = getJavaVersion(consolePath);
  if (selected?.major === 21 && selected.is64Bit) return consolePath;
  const managed = managedJavaPath(runtimeRoot);
  const bundled = getJavaVersion(managed);
  if (bundled?.major === 21 && bundled.is64Bit) return managed;
  const installed = getRecommendedJava(await detectInstalledJava());
  if (installed) return installed.path;
  return installJava21(runtimeRoot, progress);
}
