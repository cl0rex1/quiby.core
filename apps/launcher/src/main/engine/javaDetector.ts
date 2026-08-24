import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import os from 'os';

export interface JavaInstallation {
  path: string;
  version: number;
  versionString: string;
  isCompatible: boolean; // >= 21
  isBundled?: boolean;
}

export async function detectInstalledJava(): Promise<JavaInstallation[]> {
  const installations: JavaInstallation[] = [];
  const candidatePaths: string[] = [];

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
      const roots = [path.join(pf, 'Java'), path.join(pf, 'Eclipse Adoptium'), path.join(pf, 'BellSoft'), path.join(pf, 'Zulu')];
      for (const root of roots) {
        if (fs.existsSync(root)) {
          const subdirs = fs.readdirSync(root);
          for (const s of subdirs) {
            const bin = path.join(root, s, 'bin', 'javaw.exe');
            if (fs.existsSync(bin)) candidatePaths.push(bin);
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
          isCompatible: versionInfo.major >= 21,
        });
      }
    } catch (_) {}
  }

  return installations;
}

export function getJavaVersion(javaBin: string): { major: number; full: string } | null {
  try {
    const output = execSync(`"${javaBin}" -version 2>&1`, { encoding: 'utf8' });
    const match = output.match(/(?:java|openjdk) version "([^"]+)"/) || output.match(/version "([^"]+)"/);
    if (match) {
      const full = match[1];
      let major = 0;
      if (full.startsWith('1.')) {
        major = parseInt(full.split('.')[1], 10);
      } else {
        major = parseInt(full.split('.')[0], 10);
      }
      return { major, full };
    }
  } catch (_) {}
  return null;
}

export function getRecommendedJava(installations: JavaInstallation[]): JavaInstallation | null {
  // Find highest compatible (>= 21)
  const compatible = installations.filter(i => i.isCompatible).sort((a, b) => b.version - a.version);
  return compatible[0] || null;
}
