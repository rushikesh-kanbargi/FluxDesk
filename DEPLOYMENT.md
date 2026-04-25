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
cp backend/.env.example backend/.env
nano backend/.env   # Set JWT_SECRET, JWT_REFRESH_SECRET to long random strings

cp frontend/.env.example frontend/.env.local
nano frontend/.env.local   # Set NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# 3. Build and start
docker-compose up --build -d

# 4. Run database migrations
docker-compose exec backend npx prisma migrate deploy
```

Your app will be at http://your-server-ip:3000

### Nginx reverse proxy (for custom domain + HTTPS)

```nginx
# /etc/nginx/sites-available/fluxdesk
server {
    server_name yourdomain.com;
    location / { proxy_pass http://localhost:3000; proxy_set_header Host $host; }
}

server {
    server_name api.yourdomain.com;
    location / { proxy_pass http://localhost:4000; proxy_set_header Host $host; }
}
```

```bash
certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

---

## Option 2 — Railway (Easiest, ~$5/mo)

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **PostgreSQL** plugin to your project
4. Create two services: `backend` and `frontend`
5. Set environment variables in Railway dashboard:
   - Backend: `DATABASE_URL` (auto from Railway Postgres), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`
   - Frontend: `NEXT_PUBLIC_API_URL` (your Railway backend URL)
6. Deploy — Railway auto-detects Dockerfiles

---

## Option 3 — Render

### Backend (Web Service)
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: Node 22
- Add env vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`

### Frontend (Static Site or Web Service)
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: Node 22
- Add env vars: `NEXT_PUBLIC_API_URL`

### Database
- Add a **Render PostgreSQL** database and copy the connection string to `DATABASE_URL`

---

## Production Checklist

- [ ] Change `JWT_SECRET` to a random 64-char string: `openssl rand -hex 32`
- [ ] Change `JWT_REFRESH_SECRET` to a different random string
- [ ] Set `NODE_ENV=production` on backend
- [ ] Set `FRONTEND_URL` to your actual frontend domain on backend
- [ ] Enable HTTPS / SSL (Nginx + certbot or Railway/Render auto-HTTPS)
- [ ] Run `prisma migrate deploy` after first deploy
- [ ] Set up database backups (pg_dump cron or Railway/Render managed backups)
