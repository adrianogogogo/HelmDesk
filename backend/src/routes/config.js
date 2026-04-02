const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middlewares/auth');

// GET /api/config/block-types (MUST be before /:key)
router.get('/block-types', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM block_types WHERE is_active=TRUE ORDER BY sort_order');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/config/block-types
router.post('/block-types', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { name, slug, icon, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO block_types (name, slug, icon, description) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, slug, icon, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/config/block-types/:id
router.patch('/block-types/:id', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { name, slug, icon, description } = req.body;
    await pool.query(
      `UPDATE block_types SET name=COALESCE($1,name), slug=COALESCE($2,slug),
       icon=COALESCE($3,icon), description=COALESCE($4,description) WHERE id=$5`,
      [name, slug, icon, description, req.params.id]
    );
    res.json({ message: 'Tipo de bloco atualizado' });
  } catch (err) { next(err); }
});

// GET /api/config
router.get('/', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM system_configs ORDER BY category, key');
    res.json(rows);
  } catch (err) { next(err); }
});

// PATCH /api/config/:key
router.patch('/:key', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { value } = req.body;
    await pool.query(
      `INSERT INTO system_configs (key, value, updated_by, updated_at) VALUES ($3, $1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value=$1, updated_by=$2, updated_at=NOW()`,
      [value, req.user.id, req.params.key]
    );
    res.json({ message: 'Configuração salva' });
  } catch (err) { next(err); }
});

// POST /api/config/issue-types (full management)
router.post('/issue-types', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO issue_types (name, department_id) VALUES ($1,$2) RETURNING *',
      [name, department_id || 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
