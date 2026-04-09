# VPS Deployment Guide

This guide shows the exact steps to take the backend from a GitHub clone to a live production service on an Ubuntu VPS.

## Assumptions

- Ubuntu 24.04 or similar
- You have SSH access as `root` or a sudo user
- The repo is cloned at `~/Board2Hack`
- Backend is in `~/Board2Hack/backend`
- You want PostgreSQL, Redis, Nginx, and Certbot on the same VPS
- The app listens on `127.0.0.1:3000` and Nginx exposes it publicly

## 1. Install Server Packages

Run these once on a fresh VPS:

```bash
sudo apt update
sudo apt install -y git curl nginx postgresql postgresql-contrib redis-server

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. Clone the Repository

```bash
cd ~
git clone https://github.com/iSHOURIYA/Board2Hack.git
cd Board2Hack/backend
```

If the repo already exists, pull the latest changes instead:

```bash
cd ~/Board2Hack/backend
git pull
```

## 3. Install Node Dependencies

```bash
npm ci
```

If you are on a brand-new machine and need the lockfile dependencies installed exactly, always prefer `npm ci` over `npm install`.

## 4. Create the Production Environment File

Copy the template and edit it:

```bash
cp .env.example .env
nano .env
```

Use values like these:

```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL=postgresql://tikiuser:tikipass@127.0.0.1:5432/tikitopple
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1h
LOG_LEVEL=info
```

Important notes:

- `HOST` should stay `127.0.0.1` so the app is not directly exposed.
- `JWT_SECRET` must be long and random.
- `DATABASE_URL` must match the database user and password you create in Postgres.

## 5. Create PostgreSQL User and Database

Open the PostgreSQL shell:

```bash
sudo -u postgres psql
```

Inside `psql`, run:

```sql
CREATE USER tikiuser WITH PASSWORD 'tikipass';
CREATE DATABASE tikitopple OWNER tikiuser;
GRANT ALL PRIVILEGES ON DATABASE tikitopple TO tikiuser;
\q
```

If the user or database already exists, use the appropriate `ALTER` or drop/recreate commands carefully.

## 6. Generate Prisma Client and Apply Migrations

From `~/Board2Hack/backend`:

```bash
npm run prisma:generate
npx prisma migrate deploy
```

If you are developing locally on the VPS and need a new migration, use:

```bash
npx prisma migrate dev
```

For production, prefer `migrate deploy`.

## 7. Build and Test the App

```bash
npm run build
npm run test
```

The app should only be deployed after both commands succeed.

## 8. Run a Local Smoke Test

Before putting the app behind systemd and Nginx, start it manually once if needed:

```bash
npm run start
```

Check the health endpoint in another shell:

```bash
curl http://127.0.0.1:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "db": true,
  "redis": true
}
```

If this fails, fix the app before continuing.

## 9. Create the systemd Service

Create the service file:

```bash
sudo tee /etc/systemd/system/tiki-topple-backend.service > /dev/null <<'EOF'
[Unit]
Description=Tiki Topple Backend
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/Board2Hack/backend
EnvironmentFile=/root/Board2Hack/backend/.env
ExecStart=/usr/bin/node /root/Board2Hack/backend/dist/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Then enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tiki-topple-backend
sudo systemctl start tiki-topple-backend
sudo systemctl status tiki-topple-backend --no-pager
```

### Useful systemd commands

```bash
sudo systemctl restart tiki-topple-backend
sudo systemctl stop tiki-topple-backend
sudo journalctl -u tiki-topple-backend -f
```

## 10. Configure Nginx Reverse Proxy

Create the Nginx site file and replace the domain with your real one:

```bash
sudo tee /etc/nginx/sites-available/tiki-topple-backend > /dev/null <<'EOF'
server {
    listen 80;
    server_name theaarif.tech www.theaarif.tech;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Enable the site and reload Nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/tiki-topple-backend /etc/nginx/sites-enabled/tiki-topple-backend
sudo nginx -t
sudo systemctl reload nginx
```

### Useful Nginx commands

```bash
sudo systemctl restart nginx
sudo journalctl -u nginx -f
sudo nginx -T
```

## 11. Issue HTTPS Certificate

Install Certbot if needed:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Then request the certificate:

```bash
sudo certbot --nginx -d theaarif.tech -d www.theaarif.tech
```

If Certbot fails with a 403 or unauthorized challenge:

- Confirm the domain A record points to this VPS
- Confirm port 80 is open in your firewall and provider firewall
- Confirm Nginx is serving the correct server_name
- Confirm no other site block is intercepting the domain

You can inspect the current Nginx config with:

```bash
sudo nginx -T
```

## 12. Verify the Deployment

Run these checks after Nginx and systemd are active:

```bash
curl http://127.0.0.1:3000/health
curl http://theaarif.tech/health
```

If HTTPS is working:

```bash
curl https://theaarif.tech/health
```

Also verify the service and logs:

```bash
sudo systemctl status tiki-topple-backend --no-pager
sudo journalctl -u tiki-topple-backend -n 100 --no-pager
```

## 13. Restart Workflow After New Code

When you push new changes to GitHub and want the VPS to update:

```bash
cd ~/Board2Hack/backend
git pull
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build
sudo systemctl restart tiki-topple-backend
sudo systemctl status tiki-topple-backend --no-pager
```

## 14. Common Problems

### App does not start

Check the logs:

```bash
sudo journalctl -u tiki-topple-backend -n 100 --no-pager
```

Common causes:

- Bad `.env` value
- Database credentials do not match the Postgres user
- Redis is not running
- Build output is missing because `npm run build` was not run

### Health endpoint fails

Make sure:

- Postgres is running
- Redis is running
- `DATABASE_URL` is correct
- `REDIS_URL` is correct
- The app has been restarted after changing `.env`

### Nginx returns 502

Usually means the Node service is down or listening on the wrong host/port.

Check:

```bash
sudo systemctl status tiki-topple-backend --no-pager
sudo ss -ltnp | grep 3000
```

### Certbot challenge fails

Usually caused by one of these:

- DNS still pointing somewhere else
- Port 80 blocked
- Wrong `server_name`
- Another Nginx site is taking precedence

## 15. Production Safety Notes

- Do not expose the backend directly to the internet on port 3000.
- Keep the app bound to `127.0.0.1`.
- Always run through Nginx.
- Use a strong database password.
- Use a strong JWT secret.
- Back up your Postgres database regularly.
- Keep the VPS updated.

## 16. Optional Backup Commands

Database backup:

```bash
pg_dump -U tikiuser -h 127.0.0.1 tikitopple > tikitopple-backup.sql
```

Restore backup:

```bash
psql -U tikiuser -h 127.0.0.1 tikitopple < tikitopple-backup.sql
```

## 17. Summary Checklist

- [ ] Packages installed
- [ ] Repo cloned or pulled
- [ ] `.env` created
- [ ] Postgres user and database created
- [ ] Prisma client generated
- [ ] Migrations applied
- [ ] Build succeeded
- [ ] Tests passed
- [ ] systemd service created and running
- [ ] Nginx proxy configured
- [ ] HTTPS certificate issued
- [ ] `/health` returns `db: true` and `redis: true`
