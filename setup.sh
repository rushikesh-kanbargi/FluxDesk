#!/bin/bash
set -e

echo "🚀 Setting up FluxDesk..."

# Backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Copy .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created backend/.env — please edit it with your settings"
fi

# Generate Prisma client
npx prisma generate

cd ..

# Frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Copy .env if not exists
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "✅ Created frontend/.env.local"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit frontend/.env.local — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET"
echo "  2. Start PostgreSQL (or run: docker-compose up postgres -d)"
echo "  3. Run migrations: cd frontend && npx prisma migrate dev --name init"
echo "  4. Start app:      cd frontend && npm run dev"
echo ""
echo "  Or run everything with Docker: docker-compose up --build"
echo ""
echo "  App: http://localhost:3000"
