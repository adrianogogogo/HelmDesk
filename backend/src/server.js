require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const server = http.createServer(app);

// ============================================================
// Socket.IO (Chat interno)
// ============================================================
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://177.153.39.134:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

// ============================================================
// Middleware
// ============================================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // CSP gerenciado pelo frontend
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://177.153.39.134:3000',
    'http://localhost:3000',
    'http://177.153.39.134:3000'
  ],
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting — standardHeaders:false para não expor X-RateLimit-Remaining ao cliente
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});
app.use('/api/', apiLimiter);

// Rate limit mais rigoroso para autenticação (evitar brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  skipSuccessfulRequests: true,
});

// Middleware de sanitização básica — remove campos com valores suspeitos
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (val) => {
      if (typeof val === 'string') return val.slice(0, 4096); // limitar tamanho de strings
      return val;
    };
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]);
      }
    }
  }
  next();
};
app.use(sanitizeBody);

// Middleware de segurança adicional — headers extras
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ============================================================
// Routes
// ============================================================
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/products', require('./routes/products'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/issue-types', require('./routes/issueTypes'));
app.use('/api/search', require('./routes/search'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/config', require('./routes/config'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/public', require('./routes/public'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'RelmDesk API v1',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// 404 — rotas /api/* não encontradas (antes do error handler)
// ============================================================
app.use('/api', (_, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ============================================================
// Socket.IO - Chat interno
// ============================================================
const socketService = require('./services/socketService');
socketService.init(io);

// ============================================================
// Error handler
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  let status = err.status || 500;
  let message = err.message || 'Erro interno do servidor';

  // Tratar e mascarar erros técnicos do PostgreSQL para o usuário final
  if (err.code || (err.message && (err.message.includes('uuid') || err.message.includes('OFFSET') || err.message.includes('LIMIT')))) {
    // 22P02 ou mensagem contendo uuid: Sintaxe inválida de UUID
    if (err.code === '22P02' || err.message.includes('uuid')) {
      status = 400;
      message = 'Identificador inválido ou formato de ID incorreto.';
    }
    // 2201W, 2201X ou mensagem contendo OFFSET/LIMIT: Limite/offset inválidos
    else if (err.code === '2201W' || err.code === '2201X' || err.message.includes('OFFSET') || err.message.includes('LIMIT')) {
      status = 400;
      message = 'Parâmetros de paginação inválidos.';
    }
    // Outros erros internos de banco de dados
    else {
      status = 500;
      message = 'Erro ao processar operação no banco de dados.';
    }
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================
// Start
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RelmDesk API running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS origin: ${process.env.FRONTEND_URL}`);
});

module.exports = { app, server, io };
