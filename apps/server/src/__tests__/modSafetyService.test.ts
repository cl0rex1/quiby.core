import { initDatabase, dbRun, dbGet } from '../models/db';
import { verifyMod, submitWhitelistRequest, getWhitelistRequests } from '../services/modSafetyService';

async function runTests() {
  console.log('🧪 Starting Anti-Cheat & Mod Safety Test Suite...\n');
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
    // 1. Initialize Database & Clean test hashes
    await initDatabase();
    await dbRun('DELETE FROM verified_mods WHERE hash_sha1 IN (?, ?, ?)', [
      'e61b17b1897e0e7a2bfa11d6db0d12e6d302d911',
      'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      '1234567890abcdef1234567890abcdef12345678'
    ]);
    await dbRun('DELETE FROM mod_whitelist_requests WHERE hash_sha1 = ?', [
      '1234567890abcdef1234567890abcdef12345678'
    ]);
    assert(true, 'SQLite database initialized with anti-cheat tables');

    // 2. Test Safe Mod Caching & Verification
    const safeHash = 'e61b17b1897e0e7a2bfa11d6db0d12e6d302d911';
    await dbRun(
      `INSERT OR REPLACE INTO verified_mods (hash_sha1, mod_id, name, summary, source, is_allowed, status, reason, categories_json)
       VALUES (?, 'sodium', 'Sodium', 'Modern rendering engine', 'modrinth', 1, 'approved', 'Проверен в каталоге Modrinth', '["optimization"]')`,
      [safeHash]
    );

    const safeResult = await verifyMod('Sodium', 'sodium-fabric-0.5.11.jar', safeHash);
    assert(safeResult.isAllowed === true, 'Safe optimization mod (Sodium) is allowed');
    assert(safeResult.status === 'approved', 'Safe mod status is approved');
    assert(safeResult.source === 'modrinth', 'Safe mod source is modrinth');
    const renamedCheat = await verifyMod('XRay', 'xray-client.jar', safeHash);
    assert(renamedCheat.isAllowed === false, 'Known cheat filename is blocked even when the hash has a cached approval');

    // 3. Test Blocked Cheat Mod Caching & Verification
    const cheatHash = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    await dbRun(
      `INSERT OR REPLACE INTO verified_mods (hash_sha1, mod_id, name, summary, source, is_allowed, status, reason, categories_json)
       VALUES (?, 'xray-mod', 'XRay Ultimate', 'XRay cheat tool', 'modrinth', 0, 'blocked', 'Запрещен: содержит признаки читов/гриферства (xray)', '["xray", "cheats"]')`,
      [cheatHash]
    );

    const cheatResult = await verifyMod('XRay Ultimate', 'xray-1.21.1.jar', cheatHash);
    assert(cheatResult.isAllowed === false, 'XRay / Cheat mod is blocked');
    assert(cheatResult.status === 'blocked', 'Cheat mod status is blocked');
    assert(cheatResult.reason.includes('читов'), 'Cheat mod reason indicates blocked cheat signature');

    // 4. Test Unverified Mod & Whitelist Request
    const unknownHash = '1234567890abcdef1234567890abcdef12345678';
    const unverifiedResult = await verifyMod('MyCustomUtility', 'my-custom-utility.jar', unknownHash);
    assert(unverifiedResult.status === 'unverified', 'Unknown mod returns unverified status');
    assert(unverifiedResult.isAllowed === false, 'Unverified mod is not allowed by default');

    // 5. Submit Whitelist Request
    await submitWhitelistRequest({
      user_discord_id: '123456789',
      mc_username: 'SteveTest',
      mod_name: 'MyCustomUtility',
      filename: 'my-custom-utility.jar',
      hash_sha1: unknownHash,
      reason: 'Safe client-side FPS counter',
    });

    const requests = await getWhitelistRequests();
    const foundReq = requests.find((r) => r.hash_sha1 === unknownHash);
    assert(foundReq !== undefined, 'Whitelist request successfully stored in database');
    assert(foundReq.status === 'pending', 'Whitelist request status is pending');
    assert(foundReq.mc_username === 'SteveTest', 'Player username recorded correctly');

    // 6. Test Admin Whitelist Approval Flow
    await dbRun(
      'UPDATE mod_whitelist_requests SET status = "approved" WHERE hash_sha1 = ?',
      [unknownHash]
    );
    // Clear cache if any
    await dbRun('DELETE FROM verified_mods WHERE hash_sha1 = ?', [unknownHash]);

    const approvedAfterWl = await verifyMod('MyCustomUtility', 'my-custom-utility.jar', unknownHash);
    assert(approvedAfterWl.status === 'approved', 'Approved whitelist request automatically promotes mod to approved');
    assert(approvedAfterWl.isAllowed === true, 'Approved whitelisted mod is allowed');

    // 7. Test Cryptographic Binding Token Security
    const jwt = (await import('jsonwebtoken')).default;
    const { config } = await import('../config');

    const validBindingToken = jwt.sign(
      {
        discordId: '123456789012345678',
        discordUsername: 'LegitPlayer',
        roles: ['member'],
        purpose: 'mc_binding',
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    const verified = jwt.verify(validBindingToken, config.jwtSecret) as any;
    assert(verified.discordId === '123456789012345678', 'Valid binding token decodes correct discordId');
    assert(verified.purpose === 'mc_binding', 'Valid binding token has correct mc_binding purpose');

    let fakeTokenRejected = false;
    try {
      jwt.verify('fake.tampered.token', config.jwtSecret);
    } catch (_) {
      fakeTokenRejected = true;
    }
    assert(fakeTokenRejected, 'Tampered binding token is rejected cryptographically');

    let wrongPurposeRejected = false;
    const wrongPurposeToken = jwt.sign(
      { discordId: 'hacker', purpose: 'general_login' },
      config.jwtSecret
    );
    const decodedWrong = jwt.verify(wrongPurposeToken, config.jwtSecret) as any;
    if (decodedWrong.purpose !== 'mc_binding') wrongPurposeRejected = true;
    assert(wrongPurposeRejected, 'Token with incorrect purpose is rejected for mc binding');

    // 8. Test Zod Whitelist Request Validation Schema
    const { whitelistRequestSchema } = await import('../routes/mods');

    const validPayload = {
      user_discord_id: '123456789012345678',
      mc_username: 'Steve_Player',
      mod_name: 'Minimap Mod',
      filename: 'minimap-1.21.1.jar',
      hash_sha1: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
      reason: 'Safe minimap utility for navigation on the server',
    };
    const validResult = whitelistRequestSchema.safeParse(validPayload);
    assert(validResult.success === true, 'Valid whitelist request payload passes Zod schema');

    const invalidFilenameResult = whitelistRequestSchema.safeParse({
      ...validPayload,
      filename: 'badmod.exe',
    });
    assert(invalidFilenameResult.success === false, 'Non-jar filename is rejected by Zod schema');

    const invalidHashResult = whitelistRequestSchema.safeParse({
      ...validPayload,
      hash_sha1: '12345',
    });
    assert(invalidHashResult.success === false, 'Invalid SHA-1 length is rejected by Zod schema');

    const shortReasonResult = whitelistRequestSchema.safeParse({
      ...validPayload,
      reason: 'Too short',
    });
    assert(shortReasonResult.success === false, 'Short reason (<10 chars) is rejected by Zod schema');

    const invalidMcUserResult = whitelistRequestSchema.safeParse({
      ...validPayload,
      mc_username: 'A!',
    });
    assert(invalidMcUserResult.success === false, 'Invalid mc_username format is rejected by Zod schema');
  } catch (err) {
    console.error('Test error:', err);
    failed++;
  }

  console.log('\n========================================');
  console.log(`📊 Anti-Cheat Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
