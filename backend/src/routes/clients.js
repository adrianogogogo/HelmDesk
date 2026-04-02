const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middlewares/auth');

// List clients (internal only)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, email, phone, cpf, role, created_at,
             (SELECT COUNT(*) FROM tickets t WHERE t.client_user_id = users.id) as ticket_count
      FROM users
      WHERE role IN ('cliente','loja') AND is_anonymized = FALSE
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
