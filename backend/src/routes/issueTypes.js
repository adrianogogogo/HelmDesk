const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT it.*, json_agg(json_build_object('id',ist.id,'name',ist.name) ORDER BY ist.sort_order) as subtypes
      FROM issue_types it
      LEFT JOIN issue_subtypes ist ON ist.issue_type_id = it.id AND ist.is_active = TRUE
      WHERE it.is_active = TRUE
      GROUP BY it.id ORDER BY it.sort_order
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
