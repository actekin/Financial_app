# Deploying FinFlow

FinFlow is a single Next.js server with a file-based SQLite database (`data/financial.db`). To share it live with your household you need a host that gives you **one always-on container with a persistent disk**. Serverless platforms (Vercel, Netlify) won't work as-is because the database is a local file.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `APP_PASSWORD` | Yes (for any shared deployment) | Shared household password. When set, every page and API requires sign-in. |
| `HOUSEHOLD_MEMBERS` | No | Comma-separated names shown as buttons on the login screen, e.g. `Arda,Meriç`. |
| `AUTH_SECRET` | No | Extra secret for signing session cookies; set it to invalidate old sessions without changing the password. |
| `ANTHROPIC_API_KEY` | For the Advisor | Powers the natural-language financial advisor. Get one at [console.anthropic.com](https://console.anthropic.com). |
| `ADVISOR_MODEL` | No | Override the advisor model (default `claude-opus-4-8`). |

## Option 1 — Fly.io (recommended, ~free for this size)

```bash
# From the repo root
fly launch --no-deploy --name your-finflow   # accepts the Dockerfile
fly volumes create finflow_data --size 1
```

Add to the generated `fly.toml`:

```toml
[mounts]
  source = "finflow_data"
  destination = "/app/data"

[env]
  PORT = "3000"

[[services]]
  internal_port = 3000
```

Then:

```bash
fly secrets set APP_PASSWORD='your-shared-password' \
                HOUSEHOLD_MEMBERS='Arda,Meriç' \
                ANTHROPIC_API_KEY='sk-ant-...'
fly deploy
```

Your app is live at `https://your-finflow.fly.dev` — both of you can log in from any device.

## Option 2 — Railway / Render

Both detect the root `Dockerfile` automatically.

1. Create a new service from your GitHub repo.
2. Attach a **persistent volume** mounted at `/app/data` (Railway: "Volumes"; Render: "Disks", 1 GB is plenty).
3. Set the environment variables above.
4. Deploy. Use the generated HTTPS URL.

## Option 3 — Home server / NAS (Docker Compose)

```bash
cp app/.env.example .env   # edit values
docker compose up -d --build
```

The app listens on port 3000. To reach it away from home, put it behind Tailscale (easiest, private) or a reverse proxy with HTTPS (Caddy/Traefik + a domain).

## Backups

Everything lives in one file. Copy it periodically:

```bash
# Docker
docker cp <container>:/app/data/financial.db ./backup-$(date +%F).db
# Fly.io
fly ssh sftp get /app/data/financial.db backup-$(date +%F).db
```

## Notes on multi-user access

- Both partners share one password (`APP_PASSWORD`) and pick their name at login — the session lasts 30 days per device.
- Sessions are HMAC-signed cookies; no user data is stored server-side beyond the finance database itself.
- Always serve over HTTPS in production (all three options above give you HTTPS out of the box; the session cookie is marked `secure` in production).
