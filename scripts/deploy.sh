#!/bin/bash
# ============================================================
# RelmDesk — Deploy Script
# Uso: cd /home/ubuntu/HelmDesk && bash scripts/deploy.sh
# Executar sempre após: git pull origin main
# ============================================================

set -e
APP_DIR="/home/ubuntu/HelmDesk"
LOG_DIR="/var/log/relmdesk"
FRONTEND_PORT=3000
BACKEND_PORT=5000

echo ""
echo "======================================================"
echo "  🚀  RelmDesk — Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

# ---- Log dir ----
mkdir -p "$LOG_DIR"

# ---- SWAP (garante 2 GB para o build do React em VPS com pouca RAM) ----
echo ""
echo "💾 Verificando swap..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
  echo "✅ Swap de 2 GB criado e persistido"
elif ! swapon --show | grep -q /swapfile; then
  swapon /swapfile 2>/dev/null || true
  echo "✅ Swap reativado"
else
  echo "✅ Swap já ativo — $(free -h | grep Swap | awk '{print $2}')"
fi

# ---- Verificar diretório ----
if [ ! -d "$APP_DIR/.git" ]; then
  echo ""
  echo "❌ Diretório $APP_DIR não é um repositório git."
  echo "   Execute primeiro: bash scripts/setup-vps.sh"
  exit 1
fi

cd "$APP_DIR"

# ---- Pull código mais recente ----
echo ""
echo "📥 Atualizando código do GitHub (main)..."
git stash 2>/dev/null || true
git pull origin main
echo "✅ Código atualizado — commit: $(git log -1 --format='%h %s')"

# ============================================================
# BACKEND
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  BACKEND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR/backend"

echo ""
echo "📦 Instalando dependências do backend..."
npm install --production 2>&1 | tail -5

# Verificar .env — o deploy NÃO provisiona segredos. Crie o .env manualmente
# (a partir de backend/.env.example) com os valores reais antes do primeiro deploy.
if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo ""
  echo "❌ backend/.env não encontrado."
  echo "   Crie-o a partir de backend/.env.example com os segredos reais e rode novamente."
  echo "   Ex.: cp backend/.env.example backend/.env && nano backend/.env"
  exit 1
fi

echo ""
echo "🐘 Rodando migrations do banco..."
node migrations/run.js

# Seed apenas se não há usuários (primeiro deploy)
USER_COUNT=$(sudo -u postgres psql -d relmdesk -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d '[:space:]' || echo "0")
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo "🌱 Banco vazio — executando seed de dados iniciais..."
  node migrations/seed.js
  echo "✅ Seed concluído"
else
  echo "✅ Banco já tem $USER_COUNT usuário(s) — seed ignorado"
fi

# ============================================================
# FRONTEND
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FRONTEND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR/frontend"

# Garantir .env do frontend
if [ ! -f "$APP_DIR/frontend/.env" ]; then
  echo ""
  echo "⚠️  Arquivo frontend/.env não encontrado — criando..."
  cat > "$APP_DIR/frontend/.env" << 'FENVEOF'
REACT_APP_API_URL=http://177.153.39.134:5000/api
REACT_APP_SOCKET_URL=http://177.153.39.134:5000
FENVEOF
  echo "✅ frontend/.env criado"
fi

echo ""
echo "📦 Instalando dependências do frontend..."
npm install --legacy-peer-deps 2>&1 | tail -5

echo ""
echo "🔨 Compilando frontend (pode levar 3-6 min em VPS com pouca RAM)..."
echo "   Parâmetros: CI=false  GENERATE_SOURCEMAP=false  --max-old-space-size=1536"
CI=false GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=1536 \
  npm run build 2>&1 | tail -20

BUILD_SIZE=$(du -sh "$APP_DIR/frontend/build" 2>/dev/null | cut -f1 || echo "?")
echo "✅ Build concluído — tamanho: $BUILD_SIZE"

# ============================================================
# PM2
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PM2 — Serviços"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR"

# Backend
if pm2 describe relmdesk-backend > /dev/null 2>&1; then
  echo "  → Recarregando backend..."
  pm2 reload relmdesk-backend
else
  echo "  → Iniciando backend via ecosystem.config.js..."
  pm2 start "$APP_DIR/ecosystem.config.js"
fi

# Frontend (SPA estático via pm2 serve)
if pm2 describe relmdesk-frontend > /dev/null 2>&1; then
  echo "  → Recarregando frontend..."
  pm2 reload relmdesk-frontend
else
  echo "  → Iniciando frontend (pm2 serve)..."
  pm2 serve "$APP_DIR/frontend/build" $FRONTEND_PORT --name relmdesk-frontend --spa
fi

pm2 save
echo ""
pm2 status

# ============================================================
# SAÚDE
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Verificando saúde da API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 3  # aguarda backend subir

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:${BACKEND_PORT}/api/health" 2>/dev/null || echo "000")

if [ "$HEALTH" = "200" ]; then
  echo "✅ API respondendo — HTTP $HEALTH"
else
  echo "⚠️  API retornou HTTP $HEALTH — verifique logs:"
  echo "   pm2 logs relmdesk-backend --lines 30"
fi

# ============================================================
# RESUMO
# ============================================================
echo ""
echo "======================================================"
echo "  ✅  Deploy concluído!"
echo "======================================================"
echo ""
echo "  🌐 Frontend  → http://177.153.39.134:${FRONTEND_PORT}"
echo "  🔌 API       → http://177.153.39.134:${BACKEND_PORT}/api/health"
echo "  📋 PM2 logs  → pm2 logs relmdesk-backend"
echo "  📋 Erros     → pm2 logs relmdesk-backend --err"
echo ""
echo "  🔑 Credenciais padrão (após seed):"
echo "     admin@relmbikes.com.br    / Admin@2024!  (Diretor)"
echo "     gestor@relmbikes.com.br   / Admin@2024!  (Gestor)"
echo "     atendente@relmbikes.com.br / Admin@2024! (Atendente)"
echo "     loja@demo.com.br          / Loja@2024!   (Loja)"
echo ""
