import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { buildManifestFromDir } from './manifest';
import { uploadModpack } from './uploader';
import { formatBytes } from './hasher';
import { ModpackManifest } from '@quiby/shared';

const program = new Command();

program
  .name('quiby-pack')
  .description('quiby. Season 6 Modpack Builder & Version Distribution CLI (Minecraft 1.21.1 NeoForge)')
  .version('1.0.0');

// 1. INIT Command
program
  .command('init')
  .description('Initialize a new modpack workspace structure for Minecraft 1.21.1 NeoForge')
  .argument('[dir]', 'Target directory', './modpack')
  .action((dir) => {
    const targetDir = path.resolve(dir);
    console.log(chalk.cyan.bold(`\n📦 Initializing quiby Modpack Workspace in: ${targetDir}\n`));

    const folders = [
      'mods',
      'config',
      'defaultconfigs',
      'kubejs',
      'resourcepacks',
      'shaderpacks',
    ];

    for (const folder of folders) {
      const p = path.join(targetDir, folder);
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
        console.log(chalk.green(`  ✔ Created folder: `) + chalk.white(folder));
      }
    }

    const defaultPackJson = {
      id: 'quiby-s6-aeronautics',
      name: 'quiby. Season 6: Aeronautics',
      version: '6.0.0',
      gameVersion: '1.21.1',
      loaderType: 'neoforge',
      loaderVersion: '21.1.65',
      recommendedRamMb: 8192,
      minRamMb: 4096,
      serverAddress: 'play.quiby.fun:25565',
      changelog: '🚀 Initial release of Season 6 with Create Aeronautics & NeoForge 1.21.1',
    };

    const packFile = path.join(targetDir, 'pack.json');
    if (!fs.existsSync(packFile)) {
      fs.writeFileSync(packFile, JSON.stringify(defaultPackJson, null, 2));
      console.log(chalk.green(`  ✔ Created configuration: `) + chalk.white('pack.json'));
    }

    const readmeFile = path.join(targetDir, 'README.md');
    if (!fs.existsSync(readmeFile)) {
      fs.writeFileSync(
        readmeFile,
        `# quiby. Season 6 Modpack Workspace\n\nPlace your Minecraft 1.21.1 NeoForge mods in \`mods/\`, configs in \`config/\`, and run \`npx quiby-pack publish\` to distribute to all players via launcher.\n`
      );
    }

    console.log(chalk.green.bold('\n✨ Modpack workspace initialized successfully!'));
    console.log(chalk.gray(`Next steps: Add .jar mods to "${dir}/mods" and run "quiby-pack build ${dir}"\n`));
  });

// 2. SCAN Command
program
  .command('scan')
  .description('Scan modpack directory and list all mods, configs, and sizes')
  .argument('[dir]', 'Modpack directory', './modpack')
  .action(async (dir) => {
    const spinner = ora('Scanning modpack directory...').start();
    try {
      const manifest = await buildManifestFromDir(dir);
      spinner.succeed(`Scanned ${manifest.files.length} files (${formatBytes(manifest.totalSize)})`);

      console.log(chalk.cyan.bold(`\n📋 Modpack: ${manifest.name} (v${manifest.version})`));
      console.log(chalk.gray(`  Game Version: ${manifest.gameVersion} | Loader: ${manifest.loader.type} ${manifest.loader.version}\n`));

      const mods = manifest.files.filter(f => f.path.startsWith('mods/'));
      console.log(chalk.yellow.bold(`🎮 Discovered Mods (${mods.length}):`));
      for (const m of mods) {
        const modTitle = m.modName && m.modName !== 'NeoForge Mod' ? `${m.modName} (${m.modVersion})` : path.basename(m.path);
        console.log(`  • ${chalk.white.bold(modTitle)} - ${chalk.gray(formatBytes(m.size))}`);
      }

      const configs = manifest.files.filter(f => !f.path.startsWith('mods/'));
      console.log(chalk.blue.bold(`\n⚙️ Configs & Assets (${configs.length}):`));
      for (const c of configs.slice(0, 10)) {
        console.log(`  • ${chalk.gray(c.path)} (${formatBytes(c.size)})`);
      }
      if (configs.length > 10) {
        console.log(chalk.gray(`  ... and ${configs.length - 10} more files`));
      }
      console.log('');
    } catch (err: any) {
      spinner.fail(`Scan error: ${err.message}`);
    }
  });

// 3. BUILD Command
program
  .command('build')
  .description('Build manifest.json for local testing or manual distribution')
  .argument('[dir]', 'Modpack directory', './modpack')
  .option('-r, --release-version <version>', 'Set release version')
  .option('--ver <version>', 'Set release version')
  .option('-c, --changelog <changelog>', 'Changelog message')
  .option('-o, --output <file>', 'Output manifest path', 'manifest.json')
  .action(async (dir, opts) => {
    const spinner = ora('Building modpack manifest...').start();
    try {
      const version = opts.releaseVersion || opts.ver;
      const manifest = await buildManifestFromDir(dir, {
        version,
        changelog: opts.changelog,
      });

      const outFile = path.resolve(dir, opts.output);
      fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));

      spinner.succeed(`Manifest built: ${outFile}`);
      console.log(chalk.green(`\n✔ Version: ${manifest.version}`));
      console.log(chalk.green(`✔ Total Files: ${manifest.files.length}`));
      console.log(chalk.green(`✔ Total Size: ${formatBytes(manifest.totalSize)}\n`));
    } catch (err: any) {
      spinner.fail(`Build failed: ${err.message}`);
    }
  });

// 4. PUBLISH Command
program
  .command('publish')
  .description('Build and upload modpack files & manifest directly to quiby-server')
  .argument('[dir]', 'Modpack directory', './modpack')
  .option('-s, --server <url>', 'quiby-server URL', 'http://localhost:3001')
  .option('-k, --key <key>', 'Admin API key', 'quiby-admin-secret-key-s6')
  .option('-r, --release-version <version>', 'Set release version (e.g. 6.1.0)')
  .option('--ver <version>', 'Set release version')
  .option('-c, --changelog <changelog>', 'Changelog description')
  .action(async (dir, opts) => {
    console.log(chalk.magenta.bold(`\n🚀 Publishing quiby Modpack to ${opts.server}\n`));
    const spinner = ora('Generating hashes and manifest...').start();

    try {
      const version = opts.releaseVersion || opts.ver;
      const manifest = await buildManifestFromDir(dir, {
        version,
        changelog: opts.changelog,
        serverBaseUrl: opts.server,
      });
      spinner.succeed(`Manifest ready (${manifest.files.length} files, ${formatBytes(manifest.totalSize)})`);

      const uploadSpinner = ora('Uploading files to quiby distribution server...').start();
      await uploadModpack(
        dir,
        manifest,
        opts.server,
        opts.key,
        (cur, total, f) => {
          uploadSpinner.text = `[${cur}/${total}] Uploading: ${f}`;
        }
      );

      uploadSpinner.succeed(chalk.green.bold(`✨ Successfully published version ${manifest.version} to quiby-server!`));
      console.log(chalk.gray(`Players will automatically receive this update when opening the launcher.\n`));
    } catch (err: any) {
      spinner.fail(`Publish failed: ${err.message}`);
      console.error(err);
    }
  });

// 5. DIFF Command
program
  .command('diff')
  .description('Compare current workspace with active server version')
  .argument('[dir]', 'Modpack directory', './modpack')
  .option('-s, --server <url>', 'quiby-server URL', 'http://localhost:3001')
  .action(async (dir, opts) => {
    const spinner = ora('Fetching active version from server...').start();
    try {
      const localManifest = await buildManifestFromDir(dir);
      const res = await fetch(`${opts.server}/api/modpack/latest`);
      if (!res.ok) {
        spinner.fail(`Could not retrieve remote manifest from ${opts.server}`);
        return;
      }
      const remoteManifest = (await res.json()) as ModpackManifest;
      spinner.succeed(`Comparing local workspace with remote v${remoteManifest.version}`);

      const remoteFileMap = new Map(remoteManifest.files.map(f => [f.path, f]));
      const localFileMap = new Map(localManifest.files.map(f => [f.path, f]));

      const added: string[] = [];
      const changed: string[] = [];
      const removed: string[] = [];

      for (const [p, localFile] of localFileMap.entries()) {
        const remote = remoteFileMap.get(p);
        if (!remote) {
          added.push(p);
        } else if (remote.sha256 !== localFile.sha256) {
          changed.push(p);
        }
      }

      for (const [p] of remoteFileMap.entries()) {
        if (!localFileMap.has(p)) {
          removed.push(p);
        }
      }

      console.log(chalk.cyan.bold('\n🔍 Differential Summary:'));
      if (added.length === 0 && changed.length === 0 && removed.length === 0) {
        console.log(chalk.green('  ✔ Local workspace is identical to the active server version.'));
      } else {
        if (added.length > 0) {
          console.log(chalk.green.bold(`\n  + Added (${added.length}):`));
          added.forEach(f => console.log(chalk.green(`    + ${f}`)));
        }
        if (changed.length > 0) {
          console.log(chalk.yellow.bold(`\n  ~ Modified (${changed.length}):`));
          changed.forEach(f => console.log(chalk.yellow(`    ~ ${f}`)));
        }
        if (removed.length > 0) {
          console.log(chalk.red.bold(`\n  - Removed (${removed.length}):`));
          removed.forEach(f => console.log(chalk.red(`    - ${f}`)));
        }
      }
      console.log('');
    } catch (err: any) {
      spinner.fail(`Diff error: ${err.message}`);
    }
  });

program.parse(process.argv);
