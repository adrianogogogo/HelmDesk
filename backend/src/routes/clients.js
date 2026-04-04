const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middlewares/auth');

// List clients (internal only) — suporta ?search=
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search } = req.query;
    let where = `WHERE role IN ('cliente','loja') AND is_anonymized = FALSE`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR cpf ILIKE $1)`;
    }
    const { rows } = await pool.query(`
      SELECT id, name, email, phone, cpf, role, created_at,
             (SELECT COUNT(*) FROM tickets t WHERE t.client_user_id = users.id) as ticket_count
      FROM users
      ${where}
      ORDER BY name ASC
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// Create client (atendente, gestor, diretor)
router.post('/', authenticate, authorize('atendente','gestor','diretor'), async (req, res, next) => {
  try {
    const { name, email, phone, cpf } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

    // Normaliza telefone: adiciona +55 se não tem DDI
    let normalizedPhone = phone || null;
    if (normalizedPhone) {
      const digits = normalizedPhone.replace(/\D/g, '');
      if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = digits.length >= 12 ? '+' + digits : '+55' + digits;
      }
    }

    // Email único? (só validar se informado)
    if (email?.trim()) {
      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE email = $1', [email.trim()]
      );
      if (existing.length) return res.status(409).json({ error: 'E-mail já cadastrado no sistema' });
    }

    // Gera senha aleatória (cliente não terá login por ora)
    const randomPass = Math.random().toString(36).slice(-10);
    const hashedPass = await bcrypt.hash(randomPass, 10);

    const { rows } = await pool.query(`
      INSERT INTO users (name, email, phone, cpf, role, password_hash, is_active, department_id)
      VALUES ($1, $2, $3, $4, 'cliente', $5, TRUE, 1)
      RETURNING id, name, email, phone, cpf, role, created_at
    `, [name.trim(), email?.trim() || null, normalizedPhone, cpf?.trim() || null, hashedPass]);

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Update client
router.patch('/:id', authenticate, authorize('atendente','gestor','diretor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, cpf } = req.body;

    let normalizedPhone = phone || null;
    if (normalizedPhone) {
      const digits = normalizedPhone.replace(/\D/g, '');
      if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = digits.length >= 12 ? '+' + digits : '+55' + digits;
      }
    }

    await pool.query(`
      UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = $3,
        cpf = COALESCE($4, cpf),
        updated_at = NOW()
      WHERE id = $5
    `, [name || null, email || null, normalizedPhone, cpf || null, id]);

    res.json({ message: 'Cliente atualizado' });
  } catch (err) { next(err); }
});

module.exports = router;
