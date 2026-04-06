#!/bin/bash
# ============================================================
# RelmDesk — Script de Diagnóstico e Recuperação
# Uso: ssh root@177.153.39.134 "bash -s" < scripts/fix-vps.sh
# Ou:  ssh root@177.153.39.134 && bash /home/ubuntu/HelmDesk/scripts/fix-vps.sh
# ============================================================

set -e

APP_DIR="/home/ubuntu/HelmDesk"
LOG_DIR="/var/log/relmdesk"
BACKEND_PORT=5000
FRONTEND_PORT=3000

echo ""
echo "======================================================"
echo "  🔍  RelmDesk — Diagnóstico e Recuperação"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Sistema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OS:  $(lsb_release -d 2>/dev/null | cut -f2 || uname -a)"
echo "  RAM: $(free -h | grep Mem | awk '{print $2 " total / " $3 " usado / " $7 " livre"}')"
echo "  Swap: $(free -h | grep Swap | awk '{print $2 " total / " $3 " usado"}')"
echo "  Disco: $(df -h / | tail -1 | awk '{print $2 " total / " $3 " usado / " $4 " livre"}')"
echo "  CPU load: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  2. Dependências"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Node.js: $(node --version 2>/dev/null || echo '❌ NÃO INSTALADO')"
echo "  npm:     $(npm --version 2>/dev/null || echo '❌ NÃO INSTALADO')"
echo "  PM2:     $(pm2 --version 2>/dev/null || echo '❌ NÃO INSTALADO')"
echo "  psql:    $(psql --version 2>/dev/null | head -1 || echo '❌ NÃO INSTALADO')"
echo "  git:     $(git --version 2>/dev/null || echo '❌ NÃO INSTALADO')"

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  3. PostgreSQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PG_STATUS=$(systemctl is-active postgresql 2>/dev/null || echo "unknown")
echo "  Status: $PG_STATUS"

if [ "$PG_STATUS" != "active" ]; then
  echo "  ⚠️  PostgreSQL não está ativo — tentando iniciar..."
  systemctl start postgresql && echo "  ✅ PostgreSQL iniciado" || echo "  ❌ Falha ao iniciar PostgreSQL"
fi

# Testar conexão
DB_OK=$(sudo -u postgres psql -d relmdesk -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d '[:space:]' || echo "ERRO")
if [[ "$DB_OK" =~ ^[0-9]+$ ]]; then
  echo "  ✅ Banco 'relmdesk' acessível — $DB_OK usuário(s)"
else
  echo "  ❌ Banco 'relmdesk' inacessível: $DB_OK"
  echo ""
  echo "  Tentando recriar usuário e banco..."
  sudo -u postgres psql -c "CREATE USER relmdesk_user WITH PASSWORD 'relmdesk_pass_2024';" 2>/dev/null || true
  sudo -u postgres psql -c "CREATE DATABASE relmdesk OWNER relmdesk_user;" 2>/dev/null || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE relmdesk TO relmdesk_user;" 2>/dev/null || true
  sudo -u postgres psql -d relmdesk -c "GRANT ALL ON SCHEMA public TO relmdesk_user;" 2>/dev/null || true
  echo "  Rodando migrations..."
  cd "$APP_DIR/backend" && node migrations/run.js && node migrations/seed.js || true
fi

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  4. Portas"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Porta 3000: $(ss -tlnp | grep ':3000' | awk '{print $1, $4, $6}' || echo 'não ouvindo')"
echo "  Porta 5000: $(ss -tlnp | grep ':5000' | awk '{print $1, $4, $6}' || echo 'não ouvindo')"

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  5. Firewall (UFW)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
UFW_STATUS=$(ufw status 2>/dev/null | head -3 || echo "ufw não disponível")
echo "$UFW_STATUS"

# Garantir portas abertas
ufw allow 22/tcp   2>/dev/null || true
ufw allow 3000/tcp 2>/dev/null || true
ufw allow 5000/tcp 2>/dev/null || true
echo "  ✅ Portas 22, 3000 e 5000 garantidas no firewall"

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  6. Repositório"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  echo "  ✅ Repositório encontrado"
  echo "  Branch: $(git branch --show-current)"
  echo "  Commit: $(git log -1 --format='%h %s (%ar)')"
  echo "  Atualizando código..."
  git stash 2>/dev/null || true
  git pull origin main 2>&1 | tail -3
else
  echo "  ❌ Repositório não encontrado em $APP_DIR"
  echo "  Clonando..."
  mkdir -p "$APP_DIR"
  git clone https://github.com/adrianogogogo/HelmDesk.git "$APP_DIR"
  chown -R ubuntu:ubuntu "$APP_DIR" 2>/dev/null || true
fi

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  7. Arquivos .env"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend .env
if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo "  ⚠️  backend/.env não encontrado — criando..."
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
  echo "  ✅ backend/.env criado"
else
  echo "  ✅ backend/.env existe"
  # Garantir NODE_ENV=production
  if ! grep -q "NODE_ENV=production" "$APP_DIR/backend/.env"; then
    sed -i 's/NODE_ENV=development/NODE_ENV=production/' "$APP_DIR/backend/.env" 2>/dev/null || \
      echo "NODE_ENV=production" >> "$APP_DIR/backend/.env"
    echo "  ✅ NODE_ENV corrigido para production"
  fi
fi

# Frontend .env
if [ ! -f "$APP_DIR/frontend/.env" ]; then
  echo "  ⚠️  frontend/.env não encontrado — criando..."
  cat > "$APP_DIR/frontend/.env" << 'FENVEOF'
REACT_APP_API_URL=http://177.153.39.134:5000/api
REACT_APP_SOCKET_URL=http://177.153.39.134:5000
FENVEOF
  echo "  ✅ frontend/.env criado"
else
  echo "  ✅ frontend/.env existe"
fi

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  8. Dependências do backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$APP_DIR/backend"
npm install --production 2>&1 | tail -3

echo ""
echo "  Rodando migrations..."
node migrations/run.js

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  9. Build do frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BUILD_EXISTS=false
if [ -d "$APP_DIR/frontend/build" ] && [ -f "$APP_DIR/frontend/build/index.html" ]; then
  BUILD_SIZE=$(du -sh "$APP_DIR/frontend/build" | cut -f1)
  BUILD_DATE=$(stat -c '%y' "$APP_DIR/frontend/build/index.html" 2>/dev/null | cut -d' ' -f1)
  echo "  ✅ Build encontrado ($BUILD_SIZE) — data: $BUILD_DATE"
  echo "  ℹ️  Pulando rebuild (use deploy.sh para forçar rebuild)"
  BUILD_EXISTS=true
else
  echo "  ⚠️  Build não encontrado — compilando agora..."
  echo "      (pode levar 3-6 min em VPS com pouca RAM)"

  # Garantir swap
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
    echo "  ✅ Swap de 2 GB criado"
  elif ! swapon --show | grep -q /swapfile; then
    swapon /swapfile 2>/dev/null || true
  fi

  cd "$APP_DIR/frontend"
  npm install --legacy-peer-deps 2>&1 | tail -3
  CI=false GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=1536 npm run build 2>&1 | tail -10
  echo "  ✅ Build concluído: $(du -sh $APP_DIR/frontend/build | cut -f1)"
  BUILD_EXISTS=true
fi

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  10. PM2 — Reiniciando serviços"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$APP_DIR"

# Parar processos travados (se houver)
pm2 delete relmdesk-backend  2>/dev/null || true
pm2 delete relmdesk-frontend 2>/dev/null || true

# Iniciar backend
echo "  → Iniciando backend..."
pm2 start "$APP_DIR/ecosystem.config.js"

# Iniciar frontend
if [ "$BUILD_EXISTS" = true ]; then
  echo "  → Iniciando frontend (pm2 serve)..."
  pm2 serve "$APP_DIR/frontend/build" 3000 --name relmdesk-frontend --spa
fi

pm2 save
echo ""
pm2 status

# Configurar boot automático
pm2 startup systemd 2>/dev/null | tail -2 || true

# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  11. Verificando saúde"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Aguardando backend iniciar (5s)..."
sleep 5

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:${BACKEND_PORT}/api/health" 2>/dev/null || echo "000")

if [ "$HEALTH" = "200" ]; then
  echo "  ✅ API respondendo — HTTP $HEALTH"
else
  echo "  ❌ API retornou HTTP $HEALTH"
  echo ""
  echo "  Últimos erros do backend:"
  pm2 logs relmdesk-backend --lines 20 --nostream 2>/dev/null | tail -20 || \
    cat "$LOG_DIR/backend-error.log" 2>/dev/null | tail -20 || \
    echo "  (sem logs disponíveis)"
fi

FRONTEND_OK=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:${FRONTEND_PORT}" 2>/dev/null || echo "000")
echo "  Frontend HTTP: $FRONTEND_OK $([ "$FRONTEND_OK" = "200" ] && echo '✅' || echo '⚠️')"

# ============================================================
echo ""
echo "======================================================"
echo "  📋  Resumo"
echo "======================================================"
echo ""
echo "  API health:  HTTP $HEALTH"
echo "  Frontend:    HTTP $FRONTEND_OK"
echo ""
echo "  🌐 Acesse:"
echo "     http://177.153.39.134:3000  (frontend)"
echo "     http://177.153.39.134:5000/api/health  (API)"
echo ""
echo "  📋 Logs em tempo real:"
echo "     pm2 logs relmdesk-backend"
echo "     pm2 logs relmdesk-frontend"
echo ""
echo "  🔑 Credenciais:"
echo "     admin@relmbikes.com.br    / Admin@2024!"
echo "     gestor@relmbikes.com.br   / Admin@2024!"
echo "     atendente@relmbikes.com.br / Admin@2024!"
echo ""
if [ "$HEALTH" != "200" ]; then
  echo "  ⚠️  Se a API ainda não responder, verifique:"
  echo "     pm2 logs relmdesk-backend --lines 50 --nostream"
  echo "     cat /var/log/relmdesk/backend-error.log | tail -30"
  echo ""
fi
