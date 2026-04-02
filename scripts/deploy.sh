#!/bin/bash
# ============================================================
# RelmDesk v1 — Deploy Script (run on VPS after git pull)
# ============================================================

set -e
APP_DIR="/home/ubuntu/HelmDesk"

echo "🚀 Deploying RelmDesk v1..."

cd $APP_DIR

# Backend
echo "📦 Installing backend deps..."
cd $APP_DIR/backend
npm install --production

echo "🐘 Running migrations..."
node migrations/run.js

# Frontend
echo "⚛️  Building frontend..."
cd $APP_DIR/frontend
npm install
CI=false npm run build

# Restart
echo "🔄 Restarting services..."
pm2 reload relmdesk-backend 2>/dev/null || pm2 start $APP_DIR/ecosystem.config.js
pm2 serve $APP_DIR/frontend/build 3000 --name relmdesk-frontend --spa 2>/dev/null || true
pm2 save

echo "✅ Deploy complete!"
pm2 status
