const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const generateToken = (userId, role, departmentId) => {
  return jwt.sign(
    { userId, role, departmentId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password, department_id } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE AND is_anonymized = FALSE',
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Log audit
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
       VALUES ($1, 'login', 'user', $1, $2)`,
      [user.id, req.ip]
    );

    const token = generateToken(user.id, user.role, user.department_id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        store_id: user.store_id,
        avatar_url: user.avatar_url
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register (admin creates users)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department_id, store_id, phone, cpf } = req.body;

    // Only gestor/diretor can create users
    const creatorRole = req.user?.role;
    if (!['gestor', 'diretor'].includes(creatorRole)) {
      return res.status(403).json({ error: 'Only managers can create users' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, department_id, store_id, phone, cpf, lgpd_consent, lgpd_consent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW()) RETURNING id, name, email, role`,
      [uuidv4(), name, email.toLowerCase().trim(), hash, role || 'atendente', 
       department_id || 1, store_id || null, phone || null, cpf || null]
    );

    res.status(201).json({ user: rows[0], message: 'User created successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const me = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department_id, u.store_id, 
              u.phone, u.avatar_url, u.is_online, u.last_seen_at,
              d.name as department_name, s.name as store_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN stores s ON s.id = u.store_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1', [req.user.id]
    );
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/departments (for login screen)
const getDepartments = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, slug, description, is_active, is_v1 FROM departments ORDER BY sort_order'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, me, changePassword, getDepartments };
