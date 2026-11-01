const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  console.error('.env already exists. Refusing to overwrite your existing secrets.');
  process.exit(1);
}
const b64 = (bytes) => crypto.randomBytes(bytes).toString('base64');
const content = [
  'NODE_ENV=production',
  'PORT=3000',
  'DATA_DIR=./data',
  `SESSION_SECRET=${b64(48)}`,
  `DATA_ENCRYPTION_KEY=${crypto.randomBytes(32).toString('base64')}`,
  `LOOKUP_SECRET=${b64(48)}`,
  'SESSION_TTL_DAYS=7',
  'ALLOW_SIGNUP=true',
  'TRUST_PROXY=1',
  'COOKIE_SECURE=auto',
  'OLLAMA_URL=',
  'OLLAMA_MODEL=llama3.2:3b',
  'CLOUDFLARE_TUNNEL_TOKEN='
].join('\n') + '\n';
fs.writeFileSync(envPath, content, { mode: 0o600, flag: 'wx' });
console.log('Created .env with fresh application secrets. Keep this file private and back it up securely.');
