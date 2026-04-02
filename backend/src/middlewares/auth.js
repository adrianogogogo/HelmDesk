const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      'SELECT id, name, email, role, department_id, store_id, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access forbidden',
        required: roles,
        current: req.user.role
      });
    }
    next();
  };
};

// Internal users only (not cliente/loja)
const internalOnly = (req, res, next) => {
  const internalRoles = ['atendente', 'gestor', 'diretor'];
  if (!req.user || !internalRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Internal access only' });
  }
  next();
};

// Ticket visibility middleware
const ticketAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const internalRoles = ['atendente', 'gestor', 'diretor'];

    if (internalRoles.includes(user.role)) {
      return next(); // full access
    }

    const { rows } = await pool.query(
      'SELECT id, client_user_id, store_id, created_by FROM tickets WHERE id = $1',
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = rows[0];

    if (user.role === 'cliente') {
      if (ticket.client_user_id !== user.id && ticket.created_by !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (user.role === 'loja') {
      if (ticket.store_id !== user.store_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, authorize, internalOnly, ticketAccess };
