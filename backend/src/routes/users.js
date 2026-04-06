const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middlewares/auth');
const { register } = require('../controllers/authController');

// GET /api/users — atendente pode listar para filtros; gestor/diretor têm acesso completo
router.get('/', authenticate, authorize('atendente', 'gestor', 'diretor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.is_active, u.created_at,
             u.department_id, d.name as department_name, s.name as store_name, s.id as store_id
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN stores s ON s.id = u.store_id
      WHERE u.is_anonymized = FALSE
      ORDER BY u.name ASC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/users — criar usuário (gestor/diretor); delega ao authController.register
router.post('/', authenticate, authorize('gestor', 'diretor'), register);

// PATCH /api/users/:id
router.patch('/:id', authenticate, authorize('gestor', 'diretor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone, is_active, department_id, store_id, password } = req.body;

    if (password) {
      // Se uma nova senha foi fornecida, atualiza com hash
      const password_hash = await bcrypt.hash(password, 10);
      await pool.query(`
        UPDATE users SET
          name = COALESCE($1, name), email = COALESCE($2, email),
          role = COALESCE($3, role), phone = COALESCE($4, phone),
          is_active = COALESCE($5, is_active), department_id = COALESCE($6, department_id),
          store_id = COALESCE($7, store_id), password_hash = $8,
          updated_at = NOW()
        WHERE id = $9
      `, [name, email, role, phone, is_active, department_id, store_id || null, password_hash, id]);
    } else {
      await pool.query(`
        UPDATE users SET
          name = COALESCE($1, name), email = COALESCE($2, email),
          role = COALESCE($3, role), phone = COALESCE($4, phone),
          is_active = COALESCE($5, is_active), department_id = COALESCE($6, department_id),
          store_id = COALESCE($7, store_id), updated_at = NOW()
        WHERE id = $8
      `, [name, email, role, phone, is_active, department_id, store_id || null, id]);
    }

    res.json({ message: 'Usuário atualizado' });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id (LGPD anonymize)
router.delete('/:id', authenticate, authorize('diretor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(`
      UPDATE users SET
        name = 'ANONIMIZADO', email = uuid_generate_v4() || '@anon.com',
        password_hash = '', phone = NULL, cpf = NULL,
        is_active = FALSE, is_anonymized = TRUE, anonymized_at = NOW()
      WHERE id = $1
    `, [id]);
    await pool.query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1,'lgpd_anonymize','user',$2)`,
      [req.user.id, id]);
    res.json({ message: 'Usuário anonimizado (LGPD)' });
  } catch (err) { next(err); }
});

module.exports = router;
