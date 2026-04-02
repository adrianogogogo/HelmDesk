const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM brands WHERE is_active=TRUE ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
