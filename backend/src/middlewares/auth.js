const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'relmdesk_jwt_secret_super_secure_2024_bikes_relm';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acesso não informado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { rows } = await pool.query(
      'SELECT id, name, email, role, department_id, store_id, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Controle de acesso por perfil (RBAC)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso não permitido',
        perfil_necessario: roles,
        perfil_atual: req.user.role
      });
    }
    next();
  };
};

// Somente usuários internos (não cliente/loja)
const internalOnly = (req, res, next) => {
  const internalRoles = ['atendente', 'gestor', 'diretor'];
  if (!req.user || !internalRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso restrito a usuários internos' });
  }
  next();
};

// Middleware de visibilidade de ticket
const ticketAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const internalRoles = ['atendente', 'gestor', 'diretor'];

    if (internalRoles.includes(user.role)) {
      return next(); // acesso total
    }

    const { rows } = await pool.query(
      'SELECT id, client_user_id, store_id, created_by FROM tickets WHERE id = $1',
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const ticket = rows[0];

    if (user.role === 'cliente') {
      if (ticket.client_user_id !== user.id && ticket.created_by !== user.id) {
        return res.status(403).json({ error: 'Acesso negado a este ticket' });
      }
    } else if (user.role === 'loja') {
      if (ticket.store_id !== user.store_id) {
        return res.status(403).json({ error: 'Acesso negado a este ticket' });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, authorize, internalOnly, ticketAccess };
