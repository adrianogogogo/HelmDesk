#!/bin/bash
# ============================================================
# RelmDesk — VPS First-Time Setup Script
# Sistema: Ubuntu 22.04 LTS
# Executar como root: bash scripts/setup-vps.sh
# ============================================================

set -e

echo ""
echo "======================================================"
echo "  🚀  RelmDesk — Setup inicial do VPS"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

APP_DIR="/home/ubuntu/HelmDesk"
APP_USER="ubuntu"
REPO_URL="https://github.com/adrianogogogo/HelmDesk.git"

# ---- Sistema ----
echo ""
echo "📦 Atualizando pacotes do sistema..."
apt-get update -y
apt-get install -y curl git wget build-essential unzip lsb-release gnupg ca-certificates

# ---- Node.js 20 ----
if ! command -v node &>/dev/null; then
  echo ""
  echo "📦 Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "✅ Node.js: $(node --version)"
echo "✅ npm:     $(npm --version)"

# ---- PM2 ----
if ! command -v pm2 &>/dev/null; then
  echo ""
  echo "📦 Instalando PM2 globalmente..."
  npm install -g pm2
fi
echo "✅ PM2: $(pm2 --version)"

# Configurar PM2 para iniciar no boot
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" 2>/dev/null || \
  pm2 startup systemd 2>/dev/null || true

# ---- serve (servidor estático para o build React) ----
if ! npm list -g serve 2>/dev/null | grep -q serve; then
  echo ""
  echo "📦 Instalando 'serve' globalmente..."
  npm install -g serve
fi
echo "✅ serve instalado"

# ---- PostgreSQL ----
if ! command -v psql &>/dev/null; then
  echo ""
  echo "📦 Instalando PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib
  systemctl start postgresql
  systemctl enable postgresql
fi
echo "✅ PostgreSQL: $(psql --version | head -1)"

# ---- Banco de dados ----
echo ""
echo "🐘 Configurando banco de dados..."
sudo -u postgres psql -c "CREATE USER relmdesk_user WITH PASSWORD 'relmdesk_pass_2024';" \
  2>/dev/null || echo "  ⚠️  Usuário já existe — ok"
sudo -u postgres psql -c "CREATE DATABASE relmdesk OWNER relmdesk_user;" \
  2>/dev/null || echo "  ⚠️  Banco já existe — ok"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE relmdesk TO relmdesk_user;" \
  2>/dev/null || true
sudo -u postgres psql -d relmdesk -c "GRANT ALL ON SCHEMA public TO relmdesk_user;" \
  2>/dev/null || true
echo "✅ Banco de dados 'relmdesk' pronto"

# ---- Firewall ----
echo ""
echo "🔒 Configurando firewall (UFW)..."
ufw allow 22/tcp   2>/dev/null || true   # SSH
ufw allow 3000/tcp 2>/dev/null || true   # Frontend
ufw allow 5000/tcp 2>/dev/null || true   # Backend API
echo "y" | ufw enable 2>/dev/null || true
echo "✅ Portas 22, 3000 e 5000 liberadas"

# ---- Diretório de logs ----
mkdir -p /var/log/relmdesk
chown "$APP_USER:$APP_USER" /var/log/relmdesk 2>/dev/null || true

# ---- Diretório da aplicação ----
mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR" 2>/dev/null || true

# ---- Clonar repositório ----
if [ ! -d "$APP_DIR/.git" ]; then
  echo ""
  echo "📥 Clonando repositório HelmDesk..."
  git clone "$REPO_URL" "$APP_DIR"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
  echo "✅ Repositório clonado"
else
  echo "✅ Repositório já existe em $APP_DIR"
fi

# ---- .env backend ----
if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo ""
  echo "📝 Criando backend/.env com valores padrão..."
  cat > "$APP_DIR/backend/.env" << 'ENVEOF'
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=relmdesk
DB_USER=relmdesk_user
DB_PASSWORD=relmdesk_pass_2024
JWT_SECRET=relmdesk_jwt_secret_super_secure_2024_bikes_relm
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://177.153.39.134:3000
APP_URL=http://177.153.39.134:3000
MAX_FILE_SIZE=15728640
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
ENVEOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/backend/.env"
  echo "✅ backend/.env criado"
fi

# ---- .env frontend ----
if [ ! -f "$APP_DIR/frontend/.env" ]; then
  echo ""
  echo "📝 Criando frontend/.env..."
  cat > "$APP_DIR/frontend/.env" << 'FENVEOF'
REACT_APP_API_URL=http://177.153.39.134:5000/api
REACT_APP_SOCKET_URL=http://177.153.39.134:5000
FENVEOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/frontend/.env"
  echo "✅ frontend/.env criado"
fi

echo ""
echo "======================================================"
echo "  ✅  Setup do sistema concluído!"
echo "======================================================"
echo ""
echo "  Próximo passo — execute o deploy:"
echo ""
echo "    cd $APP_DIR"
echo "    bash scripts/deploy.sh"
echo ""
echo "  🌐 Após o deploy:"
echo "     Frontend:    http://177.153.39.134:3000"
echo "     Backend API: http://177.153.39.134:5000/api/health"
echo ""
echo "  🔑 Credenciais padrão (após seed):"
echo "     admin@relmbikes.com.br  / Admin@2024!  (Diretor)"
echo "     gestor@relmbikes.com.br / Admin@2024!  (Gestor)"
echo ""
