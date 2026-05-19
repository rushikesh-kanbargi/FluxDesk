# Deployment Guide

## Option 1 — Docker Compose (Recommended for VPS / Self-hosted)

### Requirements
- VPS with Docker + Docker Compose installed (e.g. DigitalOcean $6/mo Droplet, Hetzner CX11)
- Domain name (optional but recommended)

### Steps

```bash
# 1. Clone / upload project to your server
scp -r fluxdesk/ user@your-server:~/

# 2. Edit environment variables
cd ~/fluxdesk
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local   # Set JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL

# 3. Build and start
docker-compose up --build -d

# 4. Run database migrations
docker-compose exec frontend npx prisma migrate deploy
```

Your app will be at http://your-server-ip:3000

### Nginx reverse proxy (for custom domain + HTTPS)

```nginx
# /etc/nginx/sites-available/fluxdesk
server {
    server_name yourdomain.com;
    location / { proxy_pass http://localhost:3000; proxy_set_header Host $host; }
}
```

```bash
certbot --nginx -d yourdomain.com
```

---

## Option 2 — Railway (Easiest, ~$5/mo)

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **PostgreSQL** plugin to your project
4. Create one service: `frontend`
5. Set environment variables in Railway dashboard:
   - `DATABASE_URL` (auto from Railway Postgres), `JWT_SECRET`, `JWT_REFRESH_SECRET`
6. Deploy — Railway auto-detects the Dockerfile

---

## Option 3 — Render

### Web Service (frontend + API)
- Root directory: `frontend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: Node 22
- Add env vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`

### Database
- Add a **Render PostgreSQL** database and copy the connection string to `DATABASE_URL`

---

## Production Checklist

- [ ] Change `JWT_SECRET` to a random 64-char string: `openssl rand -hex 32`
- [ ] Change `JWT_REFRESH_SECRET` to a different random string
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS / SSL (Nginx + certbot or Railway/Render auto-HTTPS)
- [ ] Run `prisma migrate deploy` after first deploy
- [ ] Set up database backups (pg_dump cron or Railway/Render managed backups)
