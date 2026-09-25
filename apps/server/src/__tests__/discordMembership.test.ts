import assert from 'node:assert/strict';

async function run() {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'test-secret-for-discord-membership-check';
  process.env.ADMIN_API_KEY = 'test-admin-key-for-discord-membership';
  process.env.DISCORD_BOT_TOKEN = '';
  process.env.DISCORD_GUILD_ID = '';

  const { checkGuildMembership } = await import('../services/discord');
  assert.deepEqual(await checkGuildMembership('123'), { isMember: false, roles: [] });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
