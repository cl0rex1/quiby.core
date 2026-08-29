import assert from 'assert';

console.log('🧪 Starting Content Features & Fast-Connect Test Suite...\n');

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Playtime Formatter Test
function formatPlaytime(seconds: number): string {
  if (seconds < 60) return '< 1 мин';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = (seconds / 3600).toFixed(1);
  return `${hours} ч`;
}

test('Playtime formatter handles sub-minute times', () => {
  assert.strictEqual(formatPlaytime(45), '< 1 мин');
});

test('Playtime formatter handles minute ranges', () => {
  assert.strictEqual(formatPlaytime(300), '5 мин');
  assert.strictEqual(formatPlaytime(3540), '59 мин');
});

test('Playtime formatter handles hours accurately', () => {
  assert.strictEqual(formatPlaytime(3600), '1.0 ч');
  assert.strictEqual(formatPlaytime(7200), '2.0 ч');
  assert.strictEqual(formatPlaytime(14400 + 1800), '4.5 ч');
});

// 2. Fast-Connect Args Builder Test
function buildFastConnectArgs(serverIp: string, autoConnect: boolean): string[] {
  const args: string[] = [];
  if (autoConnect && serverIp) {
    args.push('--quickPlayMultiplayer', serverIp);
  }
  return args;
}

test('Fast-Connect args are appended when enabled', () => {
  const args = buildFastConnectArgs('play.quiby.fun:25565', true);
  assert.deepStrictEqual(args, ['--quickPlayMultiplayer', 'play.quiby.fun:25565']);
});

test('Fast-Connect args are omitted when disabled', () => {
  const args = buildFastConnectArgs('play.quiby.fun:25565', false);
  assert.deepStrictEqual(args, []);
});

// 3. Graphics Preset Config Test
interface PresetConfig {
  ramMb: number;
  graphicsPreset: string;
  modpackProfile: string;
}

function resolvePreset(preset: 'potato' | 'optimal' | 'ultra'): PresetConfig {
  if (preset === 'potato') {
    return { ramMb: 4096, graphicsPreset: 'potato', modpackProfile: 'clean' };
  }
  if (preset === 'ultra') {
    return { ramMb: 12288, graphicsPreset: 'ultra', modpackProfile: 'full' };
  }
  return { ramMb: 8192, graphicsPreset: 'optimal', modpackProfile: 'optimal' };
}

test('Potato preset sets 4GB and clean modpack', () => {
  const cfg = resolvePreset('potato');
  assert.strictEqual(cfg.ramMb, 4096);
  assert.strictEqual(cfg.modpackProfile, 'clean');
});

test('Optimal preset sets 8GB and optimal modpack', () => {
  const cfg = resolvePreset('optimal');
  assert.strictEqual(cfg.ramMb, 8192);
  assert.strictEqual(cfg.modpackProfile, 'optimal');
});

test('Ultra preset sets 12GB+ and full modpack', () => {
  const cfg = resolvePreset('ultra');
  assert.strictEqual(cfg.ramMb, 12288);
  assert.strictEqual(cfg.modpackProfile, 'full');
});

console.log('\n========================================');
console.log(`📊 Content Features Test Summary: ${passed} Passed, 0 Failed`);
console.log('========================================\n');
