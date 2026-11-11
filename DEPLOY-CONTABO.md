# Deploy Kiungo on a Contabo VPS

This repository is configured for the current architecture:
- Next.js frontend built as a static export in `linkhub/out`.
- Express API running as a systemd service on `127.0.0.1:8000`.
- Supabase Postgres/Auth remains managed by Supabase.
- Nginx serves the static frontend and proxies `api.kiungo.link` to Express.

The Nginx example uses the domain shown in the current UI (`kiungo.link`). Replace it everywhere if your actual registered domain is different.

## Before starting

1. Point DNS A records for `kiungo.link`, `www.kiungo.link`, and `api.kiungo.link` to your Contabo VPS IPv4 address. Add AAAA records only if IPv6 is configured on the VPS.
2. Use a supported Ubuntu LTS image (Ubuntu 22.04 or 24.04).
3. Connect over SSH as a sudo-capable user. Never paste SSH private keys or server passwords into chat.
4. Confirm the Supabase migration `atomic_counters_and_safe_link_updates` and `repair_analytics_event_tracking` are applied to the intended project.

## 1. Install runtime packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl ca-certificates ufw certbot python3-certbot-nginx
```

Install Node.js 22 LTS using the official NodeSource instructions, then verify:

```bash
node --version
npm --version
```

## 2. Create the service account and checkout

```bash
sudo adduser --system --group --home /opt/kiungo kiungo
sudo mkdir -p /opt/kiungo
sudo chown kiungo:kiungo /opt/kiungo
sudo -u kiungo git clone https://github.com/certifiedjoe/linkhub-.git /opt/kiungo/app
cd /opt/kiungo/app
sudo -u kiungo git fetch origin
sudo -u kiungo git checkout rebuild/architecture-foundation
```

Keep the API and frontend directories in this checkout. Review and merge the pull request to `main` before treating this as a stable production release.

## 3. Configure the API secrets

Create the server-only environment file:

```bash
sudo mkdir -p /etc/kiungo
sudo nano /etc/kiungo/kiungo-api.env
sudo chmod 600 /etc/kiungo/kiungo-api.env
sudo chown root:root /etc/kiungo/kiungo-api.env
```

Use these values, replacing the placeholders:

```dotenv
NODE_ENV=production
PORT=8000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
CORS_ORIGIN=https://kiungo.link,https://www.kiungo.link
```

Do not add the service-role key to any `NEXT_PUBLIC_*` variable or commit it to Git.

## 4. Install API dependencies and enable systemd

```bash
cd /opt/kiungo/app/kiungo-api
sudo -u kiungo npm ci --omit=dev
sudo cp /opt/kiungo/app/deploy/contabo/kiungo-api.service /etc/systemd/system/kiungo-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now kiungo-api
sudo systemctl status kiungo-api --no-pager
curl http://127.0.0.1:8000/api/health
```

The API must report `ok: true` and `authEnabled: true`. If `authEnabled` is false, stop: production auth is not configured correctly.

## 5. Build the static frontend

Create `linkhub/.env.production.local` on the server (do not commit it):

```dotenv
NEXT_PUBLIC_KIUNGO_API_URL=https://api.kiungo.link
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

Then build:

```bash
cd /opt/kiungo/app/linkhub
sudo -u kiungo npm ci
sudo -u kiungo npm run build
sudo mkdir -p /var/www/kiungo
sudo rsync -a --delete /opt/kiungo/app/linkhub/out/ /var/www/kiungo/
sudo chown -R www-data:www-data /var/www/kiungo
```

Only the public/anon key belongs in the frontend. Never use the Supabase service-role key here.

## 6. Configure Nginx and HTTPS

```bash
sudo cp /opt/kiungo/app/deploy/contabo/nginx-kiungo.conf.example /etc/nginx/sites-available/kiungo
sudo ln -sfn /etc/nginx/sites-available/kiungo /etc/nginx/sites-enabled/kiungo
sudo nginx -t
sudo systemctl reload nginx
```

After all three DNS records resolve to this VPS:

```bash
sudo certbot --nginx -d kiungo.link -d www.kiungo.link -d api.kiungo.link
sudo certbot renew --dry-run
```

## 7. Firewall and smoke tests

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Do not expose port 8000 publicly; Nginx proxies to it over localhost.

Verify:
- `https://kiungo.link` loads the frontend.
- `https://api.kiungo.link/api/health` returns `ok: true` and `authEnabled: true`.
- Sign-up and sign-in work.
- A signed-in user can create and edit a profile.
- Editing links preserves their IDs and click counts.
- Public profile views and link clicks increment their counters and create analytics events.
- A user cannot edit another user's profile.

## Rollback

To roll back the API service, check out the previous known-good commit and restart `kiungo-api`. To roll back the frontend, restore the previous static export directory. Do not reverse database migrations blindly; the analytics migration is additive and should remain in place while application versions are rolled back.

## Current limitations

This is a deployment runbook, not proof that the VPS has been configured. The exact VPS IP, domain DNS, operating system, Supabase credentials, and SSH access must be verified on the server before production launch. The current CI build and Supabase migration checks do not replace end-to-end testing on the VPS.
