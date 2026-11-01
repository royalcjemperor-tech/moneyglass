# Moneyglass — private personal finance tracker

Moneyglass is a self-hosted personal expense tracker built around the full-screen bokeh canvas supplied with the project. It includes account creation and login, encrypted transaction storage, bank-statement import, visual spending analytics, monthly budgets, CSV/JSON exports and a private spending assistant.

The default deployment has **no paid API dependency**. A small built-in insights engine answers common questions using the signed-in user's transactions. Optionally, the app can connect to an Ollama model that you run on hardware you control.

## What is included

- Public welcome page with the original moving bokeh background.
- Signup, login, persistent server-side sessions and logout.
- Dashboard KPIs for income, expenses, net cash flow and savings rate.
- SVG cash-flow and category charts, plus recent transactions and budget progress.
- CSV, XLSX and text-based PDF statement import with a review step and duplicate detection.
- Add, edit, delete, search and filter transactions.
- Monthly category budgets.
- Private assistant for spending, income, categories, largest expenses, averages and likely subscriptions.
- Profile and password management, JSON backup, CSV export and account deletion.
- Responsive desktop, tablet and mobile layouts.
- Docker Compose deployment and an optional Cloudflare Tunnel container.

The app does not include fake transaction history or fabricated dashboard metrics. An empty account shows useful empty states until real transactions are added.

## 1. Generate private application secrets

Install Node.js 20.12 or newer on the machine where you are preparing the project. From the project folder run:

```bash
node scripts/generate-secrets.js
```

This creates a private `.env` file containing fresh session, lookup and encryption secrets. The script refuses to overwrite an existing `.env`. If you only have Docker installed, you can run the same generator inside a temporary Node container instead:

```bash
docker run --rm -v "$PWD:/workspace" -w /workspace node:22-bookworm-slim node scripts/generate-secrets.js
```

**Never publish `.env`, send it in a chat, or commit it to Git.** The `DATA_ENCRYPTION_KEY` is required to decrypt existing financial records. Back it up separately and securely. Losing it means the encrypted transaction/profile data cannot be recovered.

## 2. Start locally with Docker

Docker Engine and the Docker Compose plugin are required.

```bash
docker compose up -d --build
```

Open `http://localhost:3000`. Create the first user through the public signup page. The SQLite database is kept in the named Docker volume `moneyglass_data`; it survives container rebuilds and restarts.

Useful commands:

```bash
docker compose logs -f app
docker compose ps
docker compose restart app
docker compose down
```

`docker compose down` does **not** delete the named data volume. To deliberately remove the volume and its data, use `docker compose down -v` only after exporting/backup and confirming that permanent deletion is intended.

## 3. Make it publicly reachable with Cloudflare Tunnel

The tunnel container is optional. Your Cloudflare account must already have a Tunnel created and a public hostname configured.

1. In Cloudflare Zero Trust, create a remotely-managed Cloudflare Tunnel and choose the Docker connector instructions.
2. Copy the tunnel token from Cloudflare. A Cloudflare API token is not interchangeable with a Tunnel token.
3. Open `.env` and set `CLOUDFLARE_TUNNEL_TOKEN` to the tunnel token. Do not put the token in source code.
4. In the tunnel's public-hostname settings, route your hostname to the service `http://app:3000`. The Cloudflare connector and the app share the Compose network, so `app` is the internal service name.
5. Start the app and tunnel:

```bash
docker compose --profile public up -d --build
```

6. Open the HTTPS hostname configured in Cloudflare. The app automatically uses secure cookies when the incoming request is HTTPS and the proxy headers are trusted.
7. After creating your own account, set `ALLOW_SIGNUP=false` in `.env` and apply the setting if you do not want other people to create accounts on your installation:

```bash
docker compose up -d --force-recreate app
```

To run the app without the public tunnel, use the command in step 2. The app's host port is bound to `127.0.0.1`, not exposed directly to the public network.

### Zero-cost expectations

The application, SQLite, Docker and the built-in insights engine do not require a paid subscription or API key. Cloudflare Tunnel can be used on Cloudflare's free offering. “Zero cost” cannot be guaranteed for your entire setup: you still need an always-on host, electricity, an internet connection and (for a custom hostname) a domain. Cloudflare plan features and limits can also change. This project does not create a free domain or provide free server hardware.

## 4. Optional local language model (Ollama)

The built-in assistant works without Ollama. To use a locally hosted language model instead:

1. Install Ollama on the host and download a model, for example `ollama pull llama3.2:3b`.
2. In `.env`, set:

```env
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2:3b
```

3. Restart the app:

```bash
docker compose up -d
```

The app sends a compact aggregate summary (totals, categories, top merchants and transaction count) plus your question to the configured Ollama endpoint. It does not send the full bank statement. Use only an Ollama server you control or trust. The model needs memory and disk space on your own machine; Ollama is optional and may be unsuitable for small hosts.

## 5. Local development without Docker

Node.js 20.12 or newer is required. Native `better-sqlite3` may need platform build tools.

```bash
# Run this only if .env does not exist yet.
node scripts/generate-secrets.js
# Ensure DATA_DIR=./data in .env for local mode.
npm install
npm start
```

Open `http://localhost:3000`.

## Bank-statement formats

- **CSV:** The parser looks for date, narration/description, and amount or debit/credit columns.
- **XLSX:** The first worksheet is read; row 1 must contain column headers.
- **PDF:** Only text-based PDFs with a recognisable one-transaction-per-line format are parsed. The PDF parser is heuristic. Scanned/image-only statements are not supported.

CSV/XLSX are recommended because bank statement formats vary. Always check the preview before confirming an import. The importer reads files in memory; it does not save the uploaded file as a permanent asset. It accepts files up to 12 MB and processes up to 5,000 rows per import.

## Storage and security model

| Data | How it is stored |
|---|---|
| Email | AES-256-GCM encrypted; a keyed HMAC digest is used for account lookup |
| Name/profile | AES-256-GCM encrypted JSON |
| Transactions | AES-256-GCM encrypted JSON payloads; a keyed HMAC fingerprint supports duplicate checks |
| Budgets/settings | AES-256-GCM encrypted JSON payloads |
| Password | Salted scrypt hash (64-byte derived key; N=32768, r=8, p=1) — never plaintext |
| Session | Random cookie token; only its HMAC-SHA-256 digest is stored server-side |
| Database | SQLite with foreign keys, WAL journaling and a persistent Docker volume |

### Important limitations

This is **application-level field encryption**, not SQLCipher or whole-file SQLite encryption. SQLite still contains operational metadata such as user IDs, timestamps, password hashes/salts and session digests. The app creates its database directory with restrictive permissions where the host filesystem supports POSIX modes. Anyone who compromises the running server and obtains both the database and `.env` encryption key can access decrypted financial records. Keep the host patched, restrict access to `.env`, secure Cloudflare and Docker administration, and encrypt host backups.

The app's authentication is server-backed, not localStorage-only. It is suitable as a self-hosted single-instance application, but public exposure still requires responsible server operation, TLS, patching, backups, monitoring and access controls. There is no email-based password reset because no email delivery service is configured. If a user forgets their password, the app cannot send a recovery email.

## Backups and restore

The easiest portable backup is **Settings & data → JSON backup**. That export contains readable personal financial data, so store it securely.

For a full SQLite-volume backup, stop the app first so the database is quiescent, then archive the volume (example for Linux/macOS):

```bash
mkdir -p backups
docker compose stop app
docker run --rm \
  -v moneyglass_data:/data:ro \
  -v "$PWD/backups:/backup" \
  alpine sh -c 'tar czf /backup/moneyglass-data.tgz -C /data .'
docker compose start app
```

Back up `.env` separately, encrypted and stored in a different secure location. A database backup without the matching encryption key is not sufficient to restore encrypted records. Test restore procedures before relying on backups.

## Tests and checks

Run the built-in security and statement-parsing unit tests:

```bash
npm test
```

JavaScript syntax checks can be run with:

```bash
find server public/js scripts tests -name '*.js' -print0 | xargs -0 -n1 node --check
```

The project has been statically checked in the authoring environment. Docker is not installed there and package registry access was unavailable, so the Docker image, dependency installation and live browser flow could not be executed in that environment. Run the setup commands above on your Docker host and verify the first account, statement preview and backup flow before sharing the public URL.
