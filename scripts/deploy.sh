#!/bin/bash
# ============================================================
# RelmDesk v1 — Deploy Script
# Run on VPS after setup-vps.sh
# Usage: cd /home/ubuntu/HelmDesk && bash scripts/deploy.sh
# ============================================================

set -e
APP_DIR="/home/ubuntu/HelmDesk"
LOG_DIR="/var/log/relmdesk"

echo "======================================================"
echo "🚀 RelmDesk v1 — Deploy"
echo "======================================================"

# Create log dir if needed
mkdir -p $LOG_DIR

# ---- SWAP (ensure 1GB swap for React build on low-RAM VPS) ----
if [ ! -f /swapfile ]; then
  echo ""
  echo "💾 Creating 1GB swapfile for build..."
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "✅ Swap enabled: $(free -h | grep Swap)"
elif ! swapon --show | grep -q /swapfile; then
  swapon /swapfile 2>/dev/null || true
  echo "✅ Swap enabled: $(free -h | grep Swap)"
else
  echo "✅ Swap already active: $(free -h | grep Swap)"
fi

cd $APP_DIR

# Pull latest code (stash local changes first to avoid conflicts)
echo ""
echo "📥 Pulling latest code from GitHub..."
git stash 2>/dev/null || true
git pull origin main

# ---- BACKEND ----
echo ""
echo "📦 Installing backend dependencies..."
cd $APP_DIR/backend
npm install --production

echo ""
echo "🐘 Running database migrations..."
node migrations/run.js

# Seed only if no users exist (first deploy)
USER_COUNT=$(sudo -u postgres psql -d relmdesk -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d '[:space:]' || echo "0")
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo "🌱 Seeding database with default users..."
  node migrations/seed.js
else
  echo "✅ Database already has $USER_COUNT user(s) — skipping seed"
fi

# ---- FRONTEND ----
echo ""
echo "⚛️  Installing frontend dependencies..."
cd $APP_DIR/frontend
npm install --legacy-peer-deps 2>&1 | tail -3

echo ""
echo "🔨 Building frontend (3-5 min on low-RAM VPS)..."
echo "   Using NODE_OPTIONS=--max-old-space-size=512"
CI=false npm run build 2>&1 | tail -15

BUILD_SIZE=$(du -sh $APP_DIR/frontend/build 2>/dev/null | cut -f1)
echo "✅ Frontend build complete: $BUILD_SIZE"

# ---- PM2 ----
echo ""
echo "🔄 Starting / reloading PM2 services..."
cd $APP_DIR

# Start or reload backend
if pm2 describe relmdesk-backend > /dev/null 2>&1; then
  echo "  → Reloading backend..."
  pm2 reload relmdesk-backend
else
  echo "  → Starting backend (ecosystem.config.js)..."
  pm2 start $APP_DIR/ecosystem.config.js
fi

# Start or reload frontend static server
if pm2 describe relmdesk-frontend > /dev/null 2>&1; then
  echo "  → Reloading frontend..."
  pm2 reload relmdesk-frontend
else
  echo "  → Starting frontend with pm2 serve..."
  pm2 serve $APP_DIR/frontend/build 3000 --name relmdesk-frontend --spa
fi

pm2 save

echo ""
echo "======================================================"
echo "✅ Deploy complete!"
echo "======================================================"
pm2 status

echo ""
echo "🌐 URLs:"
echo "   Frontend  → http://177.153.39.134:3000"
echo "   Backend   → http://177.153.39.134:5000/api/health"
echo ""
echo "🔑 Default credentials:"
echo "   admin@relmbikes.com.br   / Admin@2024!  (Diretor)"
echo "   gestor@relmbikes.com.br  / Admin@2024!  (Gestor)"
echo "   atendente@relmbikes.com.br / Admin@2024! (Atendente)"
echo "   loja@demo.com.br         / Loja@2024!   (Loja)"
echo ""
