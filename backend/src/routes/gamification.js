const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middlewares/auth');

// GET /api/gamification/ranking?month=4&year=2024
router.get('/ranking', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const { month = now.getMonth() + 1, year = now.getFullYear(), department_id = 1 } = req.query;

    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.role, u.avatar_url,
             COUNT(g.id) as gols,
             RANK() OVER (ORDER BY COUNT(g.id) DESC) as position
      FROM users u
      LEFT JOIN goals g ON g.user_id = u.id AND g.month = $1 AND g.year = $2
      WHERE u.role IN ('atendente','gestor','diretor')
        AND u.is_active = TRUE AND u.department_id = $3
      GROUP BY u.id, u.name, u.role, u.avatar_url
      ORDER BY gols DESC
    `, [month, year, department_id]);

    res.json({ ranking: rows, month: parseInt(month), year: parseInt(year) });
  } catch (err) { next(err); }
});

// GET /api/gamification/my-goals
router.get('/my-goals', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const { month = now.getMonth() + 1, year = now.getFullYear() } = req.query;
    const { rows } = await pool.query(`
      SELECT COUNT(*) as total_gols, action_type, COUNT(*) as count
      FROM goals WHERE user_id=$1 AND month=$2 AND year=$3
      GROUP BY action_type
    `, [req.user.id, month, year]);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/gamification/championship
router.get('/championship', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT cm.*, u.name as winner_name
      FROM championship_months cm
      LEFT JOIN users u ON u.id = cm.winner_id
      ORDER BY cm.year DESC, cm.month DESC
      LIMIT 12
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
