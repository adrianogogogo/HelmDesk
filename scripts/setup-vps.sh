#!/bin/bash
# ============================================================
# RelmDesk v1 — VPS Setup Script
# Run as root on 177.153.39.134
# ============================================================

set -e

echo "🚀 Starting RelmDesk v1 setup..."

# --- System update ---
apt-get update -y
apt-get install -y curl git wget build-essential

# --- Node.js 20 ---
if ! command -v node &>/dev/null; then
  echo "📦 Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"

# --- PM2 ---
if ! command -v pm2 &>/dev/null; then
  echo "📦 Installing PM2..."
  npm install -g pm2
  pm2 startup systemd -u root --hp /root
fi

# --- PostgreSQL ---
if ! command -v psql &>/dev/null; then
  echo "📦 Installing PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib
  systemctl start postgresql
  systemctl enable postgresql
fi

# --- Create PostgreSQL user and DB ---
echo "🐘 Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER relmdesk_user WITH PASSWORD 'relmdesk_pass_2024';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE relmdesk OWNER relmdesk_user;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE relmdesk TO relmdesk_user;" 2>/dev/null || true

# --- Firewall ---
ufw allow 22 2>/dev/null || true
ufw allow 3000 2>/dev/null || true
ufw allow 5000 2>/dev/null || true

# --- App directory ---
mkdir -p /home/ubuntu/HelmDesk
mkdir -p /var/log/relmdesk

echo ""
echo "✅ System setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd /home/ubuntu/HelmDesk"
echo "  2. git pull origin main"
echo "  3. cd backend && npm install --production"
echo "  4. node migrations/run.js"
echo "  5. cd ../frontend && npm install && npm run build"
echo "  6. pm2 start /home/ubuntu/HelmDesk/ecosystem.config.js"
echo "  7. pm2 serve /home/ubuntu/HelmDesk/frontend/build 3000 --name relmdesk-frontend --spa"
echo "  8. pm2 save"
echo ""
echo "🌐 Access:"
echo "   Frontend: http://177.153.39.134:3000"
echo "   Backend API: http://177.153.39.134:5000/api/health"
