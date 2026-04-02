#!/bin/bash
# ============================================================
# RelmDesk v1 — VPS First-Time Setup Script
# Run as root or with sudo on Ubuntu 22.04
# Usage: bash scripts/setup-vps.sh
# ============================================================

set -e

echo "======================================================"
echo "🚀 RelmDesk v1 — VPS Setup Script"
echo "======================================================"

APP_DIR="/home/ubuntu/HelmDesk"
APP_USER="ubuntu"

# --- System update ---
echo ""
echo "📦 Updating system packages..."
apt-get update -y
apt-get install -y curl git wget build-essential unzip

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
fi

# Setup PM2 to start on boot for ubuntu user
pm2 startup systemd -u $APP_USER --hp /home/$APP_USER 2>/dev/null || \
  pm2 startup systemd 2>/dev/null || true

# --- serve (static file server for React build) ---
npm list -g serve 2>/dev/null | grep serve || npm install -g serve

# --- PostgreSQL ---
if ! command -v psql &>/dev/null; then
  echo "📦 Installing PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib
  systemctl start postgresql
  systemctl enable postgresql
fi
echo "✅ PostgreSQL: $(psql --version | head -1)"

# --- Create PostgreSQL user and database ---
echo ""
echo "🐘 Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE USER relmdesk_user WITH PASSWORD 'relmdesk_pass_2024';" 2>/dev/null || echo "  (user already exists)"
sudo -u postgres psql -c "CREATE DATABASE relmdesk OWNER relmdesk_user;" 2>/dev/null || echo "  (database already exists)"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE relmdesk TO relmdesk_user;" 2>/dev/null || true
sudo -u postgres psql -d relmdesk -c "GRANT ALL ON SCHEMA public TO relmdesk_user;" 2>/dev/null || true

# --- Firewall ---
echo ""
echo "🔒 Configuring firewall..."
ufw allow 22/tcp 2>/dev/null || true
ufw allow 3000/tcp 2>/dev/null || true
ufw allow 5000/tcp 2>/dev/null || true
echo "y" | ufw enable 2>/dev/null || true

# --- Log directory ---
mkdir -p /var/log/relmdesk
chown $APP_USER:$APP_USER /var/log/relmdesk 2>/dev/null || true

# --- App directory ---
mkdir -p $APP_DIR
chown $APP_USER:$APP_USER $APP_DIR 2>/dev/null || true

# --- Clone if not already there ---
if [ ! -d "$APP_DIR/.git" ]; then
  echo ""
  echo "📥 Cloning RelmDesk repository..."
  git clone https://github.com/adrianogogogo/HelmDesk.git $APP_DIR
  chown -R $APP_USER:$APP_USER $APP_DIR
fi

echo ""
echo "======================================================"
echo "✅ System setup complete!"
echo "======================================================"
echo ""
echo "Now run the deploy script to install and start RelmDesk:"
echo ""
echo "  cd $APP_DIR"
echo "  bash scripts/deploy.sh"
echo ""
echo "🌐 After deploy, access:"
echo "   Frontend:    http://177.153.39.134:3000"
echo "   Backend API: http://177.153.39.134:5000/api/health"
echo ""
echo "🔑 Default credentials (after seed):"
echo "   admin@relmbikes.com.br  / Admin@2024!"
echo "   gestor@relmbikes.com.br / Admin@2024!"
echo ""
