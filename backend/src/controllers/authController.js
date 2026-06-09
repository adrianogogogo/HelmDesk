const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'relmdesk_jwt_secret_super_secure_2024_bikes_relm';

// ─── Controle de tentativas de login por e-mail (em memória) ────────────────
// Chave: email, Valor: { count, lockedUntil }
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 10;       // tentativas antes de bloquear
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 min de bloqueio

const checkLoginAttempts = (email) => {
  const key = email.toLowerCase().trim();
  const entry = loginAttempts.get(key);
  if (!entry) return { blocked: false };
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    return { blocked: true, remaining };
  }
  // Desbloqueado — resetar
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    loginAttempts.delete(key);
  }
  return { blocked: false };
};

const recordFailedAttempt = (email) => {
  const key = email.toLowerCase().trim();
  const entry = loginAttempts.get(key) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_DURATION_MS;
    console.warn(`🔒 Login bloqueado para: ${key} por 15 minutos`);
  }
  loginAttempts.set(key, entry);
};

const clearLoginAttempts = (email) => {
  loginAttempts.delete(email.toLowerCase().trim());
};

// Limpar entradas expiradas a cada 30 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts) {
    if (!entry.lockedUntil || now >= entry.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
}, 30 * 60 * 1000);

// ─── Helper: gerar token ──────────────────────────────────────────────────────
const generateToken = (userId, role, departmentId, rememberMe = false) => {
  // remember-me = 30 dias; sessão normal = 8 horas
  const expiresIn = rememberMe
    ? (process.env.JWT_REMEMBER_EXPIRES || '30d')
    : (process.env.JWT_EXPIRES_IN || '8h');
  return jwt.sign(
    { userId, role, departmentId, rememberMe },
    JWT_SECRET,
    { expiresIn }
  );
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const password = req.body.password || '';
    const remember_me = req.body.remember_me;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    // Verificar bloqueio por tentativas excessivas
    const lockCheck = checkLoginAttempts(email);
    if (lockCheck.blocked) {
      return res.status(429).json({
        error: `Conta temporariamente bloqueada por excesso de tentativas. Aguarde ${lockCheck.remaining} minuto(s).`
      });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE AND is_anonymized = FALSE',
      [email]
    );

    if (!rows.length) {
      recordFailedAttempt(email);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      recordFailedAttempt(email);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Login bem-sucedido — limpar tentativas
    clearLoginAttempts(email);

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

    const token = generateToken(user.id, user.role, user.department_id, !!remember_me);

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

const VALID_ROLES = ['cliente', 'loja', 'atendente', 'gestor', 'diretor'];

// POST /api/auth/register (gestor/diretor cria usuários)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department_id, store_id, phone, cpf } = req.body;

    const creatorRole = req.user?.role;
    if (!['gestor', 'diretor'].includes(creatorRole)) {
      return res.status(403).json({ error: 'Apenas gestores podem criar usuários' });
    }

    const effectiveRole = role || 'atendente';
    if (!VALID_ROLES.includes(effectiveRole)) {
      return res.status(400).json({ error: `Perfil inválido. Valores permitidos: ${VALID_ROLES.join(', ')}` });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, department_id, store_id, phone, cpf, lgpd_consent, lgpd_consent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW()) RETURNING id, name, email, role`,
      [uuidv4(), name, email.toLowerCase().trim(), hash, effectiveRole,
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

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Preencha todos os campos' });
    }
    if (typeof new_password !== 'string' || new_password.length < 6 || new_password.length > 128) {
      return res.status(400).json({ error: 'A nova senha deve ter entre 6 e 128 caracteres' });
    }

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
