import { quickScanForCheatSignatures, scanFileForMalware, CHEAT_KEYWORDS } from '../modVerifier';

async function runTests() {
  console.log('🧪 Starting Client Cheat Scanner & Safety Verification Test Suite...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  };

  try {
    // 1. Check cheat signature detections
    const xrayScan = quickScanForCheatSignatures('xray-neoforge-1.21.1.jar', 'X-Ray Ultimate');
    assert(xrayScan.isCheat === true, 'xray filename is detected as cheat');
    assert(xrayScan.signature === 'xray' || xrayScan.signature === 'x-ray', 'xray signature correctly identified');

    const baritoneScan = quickScanForCheatSignatures('baritone-api-1.21.1.jar', 'Baritone Bot');
    assert(baritoneScan.isCheat === true, 'baritone bot is detected as cheat');
    assert(baritoneScan.signature === 'baritone', 'baritone signature correctly identified');

    const meteorScan = quickScanForCheatSignatures('MeteorClient-1.21.1.jar', 'Meteor Client');
    assert(meteorScan.isCheat === true, 'meteor client is detected as cheat');

    const wurstScan = quickScanForCheatSignatures('wurst-v7.jar', 'Wurst Hacked Client');
    assert(wurstScan.isCheat === true, 'wurst is detected as cheat');

    const autoClickerScan = quickScanForCheatSignatures('autoclicker-mod.jar', 'Fast Auto Clicker');
    assert(autoClickerScan.isCheat === true, 'autoclicker is detected as cheat');

    const espScan = quickScanForCheatSignatures('player-esp-1.21.1.jar', 'Chest ESP Finder');
    assert(espScan.isCheat === true, 'esp is detected as cheat');

    // 2. Safe mods
    const sodiumScan = quickScanForCheatSignatures('sodium-neoforge-1.21.1.jar', 'Sodium');
    assert(sodiumScan.isCheat === false, 'Sodium is not flagged as cheat');

    const jeiScan = quickScanForCheatSignatures('jei-1.21.1-15.0.0.jar', 'Just Enough Items');
    assert(jeiScan.isCheat === false, 'JEI is not flagged as cheat');

    // 3. Test malware and trojan scanner
    const fracScan = await scanFileForMalware(null, 'fractureiser-stage0.jar', 'Fractureiser Mod');
    assert(fracScan.isSafe === false, 'Fractureiser is detected as malware');

    const stealerScan = await scanFileForMalware(null, 'discord-token-grabber.jar', 'Free Token Stealer');
    assert(stealerScan.isSafe === false, 'Token grabber is detected as malware');

    const cleanScan = await scanFileForMalware(null, 'voicechat-neoforge-1.21.1.jar', 'Simple Voice Chat');
    assert(cleanScan.isSafe === true, 'Simple Voice Chat passes malware scan');

    const integrationScan = await scanFileForMalware(null, 'integration-tools.jar', 'Integration Tools');
    assert(integrationScan.isSafe === true, 'Integration is not blocked by a short substring');
  } catch (err) {
    console.error('Test error:', err);
    failed++;
  }

  console.log('\n========================================');
  console.log(`📊 Mod Verifier Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
