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

const VALID_ROLES = ['cliente', 'loja', 'atendente', 'gestor', 'diretor', 'superadmin'];

// PATCH /api/users/:id
router.patch('/:id', authenticate, authorize('gestor', 'diretor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone, is_active, department_id, store_id, password } = req.body;

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Perfil inválido. Valores permitidos: ${VALID_ROLES.join(', ')}` });
    }

    // Carrega o usuário alvo para validar regras de privilégio
    const { rows: targetRows } = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (!targetRows.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const targetRole = targetRows[0].role;
    const isSelf = String(req.user.id) === String(id);

    // Proteção de contas de superadmin: somente um superadmin altera contas de superadmin
    if (targetRole === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Apenas um superadmin pode alterar contas de superadmin' });
    }

    // Gestor não pode alterar contas de diretor (evita sequestro de conta de super-admin)
    if (req.user.role === 'gestor' && targetRole === 'diretor') {
      return res.status(403).json({ error: 'Gestores não podem alterar contas de diretor' });
    }

    // Somente um superadmin pode conceder o perfil de superadmin a outro usuário
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Apenas um superadmin pode conceder o status de superadmin' });
    }

    // Alterar o perfil (role) de um usuário: apenas diretor ou superadmin
    if (role !== undefined && role !== targetRole && !['diretor', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Apenas diretores ou superadmins podem alterar o perfil de um usuário' });
    }

    // Ninguém pode alterar o próprio perfil (evita auto-elevação)
    if (role !== undefined && role !== targetRole && isSelf) {
      return res.status(403).json({ error: 'Você não pode alterar o seu próprio perfil' });
    }

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

// DELETE /api/users/:id — exclusão inteligente (diretor ou superadmin)
// Hard delete se não houver vínculos; caso contrário anonimiza (LGPD), preservando histórico.
router.delete('/:id', authenticate, authorize('diretor', 'superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (String(req.user.id) === String(id)) {
      return res.status(403).json({ error: 'Você não pode excluir a sua própria conta' });
    }

    const { rows: targetRows } = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (!targetRows.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    // Somente um superadmin pode excluir outro superadmin
    if (targetRows[0].role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Apenas um superadmin pode excluir contas de superadmin' });
    }

    // Tenta exclusão definitiva; se houver vínculos (FK), anonimiza.
    try {
      const del = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      if (!del.rowCount) return res.status(404).json({ error: 'Usuário não encontrado' });
      try {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1,'delete','user',$2)`,
          [req.user.id, id]
        );
      } catch (e) { /* auditoria não-crítica */ }
      return res.json({ message: 'Usuário excluído definitivamente', mode: 'deleted' });
    } catch (err) {
      if (err.code !== '23503') throw err; // só trata violação de FK
      // Possui vínculos (tickets, histórico, etc.) → anonimiza para cumprir LGPD
      await pool.query(`
        UPDATE users SET
          name = 'ANONIMIZADO', email = uuid_generate_v4() || '@anon.com',
          password_hash = '', phone = NULL, cpf = NULL,
          is_active = FALSE, is_anonymized = TRUE, anonymized_at = NOW()
        WHERE id = $1
      `, [id]);
      try {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1,'lgpd_anonymize','user',$2)`,
          [req.user.id, id]
        );
      } catch (e) { /* auditoria não-crítica */ }
      return res.json({
        message: 'Usuário possui vínculos e foi anonimizado (LGPD), preservando o histórico',
        mode: 'anonymized',
      });
    }
  } catch (err) { next(err); }
});

module.exports = router;
