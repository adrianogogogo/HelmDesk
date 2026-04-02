const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'relmdesk_jwt_secret_super_secure_2024_bikes_relm';

const generateToken = (userId, role, departmentId) => {
  return jwt.sign(
    { userId, role, departmentId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE AND is_anonymized = FALSE',
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Log de auditoria — não-crítico: não falha o login se der erro
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
         VALUES ($1, 'login', 'user', $1::text, $2)`,
        [user.id, req.ip]
      );
    } catch (auditErr) {
      console.warn('⚠️  Aviso: falha ao registrar audit_log no login:', auditErr.message);
    }

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
    console.error('❌ Erro no login:', err.message, err.stack);
    next(err);
  }
};

// POST /api/auth/register (gestor/diretor cria usuários)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department_id, store_id, phone, cpf } = req.body;

    const creatorRole = req.user?.role;
    if (!['gestor', 'diretor'].includes(creatorRole)) {
      return res.status(403).json({ error: 'Apenas gestores podem criar usuários' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, department_id, store_id, phone, cpf, lgpd_consent, lgpd_consent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW()) RETURNING id, name, email, role`,
      [uuidv4(), name, email.toLowerCase().trim(), hash, role || 'atendente',
       department_id || 1, store_id || null, phone || null, cpf || null]
    );

    res.status(201).json({ user: rows[0], message: 'Usuário criado com sucesso' });
  } catch (err) {
    console.error('❌ Erro no registro:', err.message);
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
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Erro no /me:', err.message);
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
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao alterar senha:', err.message);
    next(err);
  }
};

// GET /api/auth/departments (tela de login)
const getDepartments = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, slug, description, is_active, is_v1 FROM departments ORDER BY sort_order'
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao buscar departamentos:', err.message);
    next(err);
  }
};

module.exports = { login, register, me, changePassword, getDepartments };
