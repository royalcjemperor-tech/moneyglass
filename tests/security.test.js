const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
process.env.LOOKUP_SECRET = crypto.randomBytes(48).toString('base64');
process.env.SESSION_SECRET = crypto.randomBytes(48).toString('base64');
const { seal, unseal, lookupDigest, hashPassword, verifyPassword } = require('../server/security');

test('AES-256-GCM payloads round-trip and use a fresh nonce', () => {
  const sample = { amount: -145.5, description: 'Groceries', category: 'Food & dining' };
  const first = seal(sample);
  const second = seal(sample);
  assert.deepEqual(unseal(first), sample);
  assert.notEqual(first, second);
});

test('tampered encrypted payloads are rejected', () => {
  const cipher = seal({ private: 'value' });
  const parts = cipher.split('.');
  parts[3] = `${parts[3].slice(0, -2)}AA`;
  assert.throws(() => unseal(parts.join('.')));
});

test('email lookup digests are stable and case-insensitive', () => {
  assert.equal(lookupDigest('User@Example.com'), lookupDigest(' user@example.com '));
  assert.notEqual(lookupDigest('user@example.com'), lookupDigest('other@example.com'));
});

test('passwords are salted and can be verified without storing plaintext', async () => {
  const credentials = await hashPassword('SafePassphrase123');
  assert.notEqual(credentials.hash, 'SafePassphrase123');
  assert.equal(await verifyPassword('SafePassphrase123', credentials.salt, credentials.hash), true);
  assert.equal(await verifyPassword('WrongPassphrase123', credentials.salt, credentials.hash), false);
});
