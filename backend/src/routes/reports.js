const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middlewares/auth');

// GET /api/reports/tickets
router.get('/tickets', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { from, to, status_id, brand_id, assigned_to, format } = req.query;

    let where = ['t.is_anonymized = FALSE'];
    const params = [];

    if (from) { params.push(from); where.push(`t.created_at >= $${params.length}`); }
    if (to) { params.push(to); where.push(`t.created_at <= $${params.length}`); }
    if (status_id) { params.push(status_id); where.push(`t.status_id = $${params.length}`); }
    if (brand_id) { params.push(brand_id); where.push(`t.brand_id = $${params.length}`); }
    if (assigned_to) { params.push(assigned_to); where.push(`t.assigned_to = $${params.length}`); }

    const { rows } = await pool.query(`
      SELECT t.ticket_number, t.title, t.priority, t.created_at, t.updated_at,
             t.client_name, t.client_email,
             ts.name as status, b.name as brand,
             u.name as assigned_to, s.name as store,
             it.name as issue_type
      FROM tickets t
      LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
      LEFT JOIN brands b ON b.id = t.brand_id
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN stores s ON s.id = t.store_id
      LEFT JOIN issue_types it ON it.id = t.issue_type_id
      WHERE ${where.join(' AND ')}
      ORDER BY t.created_at DESC
    `, params);

    if (format === 'csv') {
      const CSV_HEADERS = 'ticket_number,title,priority,created_at,updated_at,client_name,client_email,status,brand,assigned_to,store,issue_type';
      const csvRows = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
      const csv = [CSV_HEADERS, ...csvRows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-tickets.csv');
      return res.send(csv);
    }

    res.json({ data: rows, total: rows.length });
  } catch (err) { next(err); }
});

module.exports = router;
