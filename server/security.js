const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

const KEY = Buffer.from(process.env.DATA_ENCRYPTION_KEY || '', 'base64');
const LOOKUP_SECRET = process.env.LOOKUP_SECRET || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
if (KEY.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key. Run: npm run secrets');
if (LOOKUP_SECRET.length < 32) throw new Error('LOOKUP_SECRET must be at least 32 characters. Run: npm run secrets');
if (SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters. Run: npm run secrets');

function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

function unseal(payload) {
  if (typeof payload !== 'string') throw new Error('Invalid encrypted payload');
  const [version, ivPart, tagPart, dataPart] = payload.split('.');
  if (version !== 'v1' || !ivPart || !tagPart || !dataPart) throw new Error('Unsupported encrypted payload');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final()
  ]).toString('utf8');
  return JSON.parse(decrypted);
}

function lookupDigest(value) {
  return crypto.createHmac('sha256', LOOKUP_SECRET).update(String(value).trim().toLowerCase()).digest('hex');
}

function hashSession(token) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt, hash: derived.toString('hex') };
}

async function verifyPassword(password, salt, expectedHex) {
  const derived = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(derived, expected);
}

module.exports = { seal, unseal, lookupDigest, hashSession, hashPassword, verifyPassword };
