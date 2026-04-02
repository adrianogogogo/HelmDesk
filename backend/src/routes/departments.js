const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM departments ORDER BY sort_order');
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
