const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middlewares/auth');

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
      `UPDATE system_configs SET value=$1, updated_by=$2, updated_at=NOW() WHERE key=$3`,
      [value, req.user.id, req.params.key]
    );
    res.json({ message: 'Config updated' });
  } catch (err) { next(err); }
});

// GET /api/config/block-types
router.get('/block-types', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM block_types WHERE is_active=TRUE ORDER BY sort_order');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/config/issue-types (full management)
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
