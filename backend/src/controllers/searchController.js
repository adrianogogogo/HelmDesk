const pool = require('../config/database');

// GET /api/search?q=termo
const search = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.length < 2) return res.json({ results: [] });

    const user = req.user;
    const internalRoles = ['atendente', 'gestor', 'diretor'];
    const term = `%${q}%`;
    const params = [term, term, term, term, term, term, parseInt(limit)];

    let visibilityWhere = '';
    if (!internalRoles.includes(user.role)) {
      if (user.role === 'loja') {
        visibilityWhere = `AND t.store_id = '${user.store_id}'`;
      } else if (user.role === 'cliente') {
        visibilityWhere = `AND (t.client_user_id = '${user.id}' OR t.created_by = '${user.id}')`;
      }
    }

    const { rows } = await pool.query(`
      SELECT DISTINCT
        t.id, t.ticket_number, t.title, t.client_name, t.client_email, t.client_phone,
        t.created_at, ts.name as status_name, ts.color as status_color, ts.slug as status_slug,
        b.name as brand_name,
        'ticket' as result_type
      FROM tickets t
      LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
      LEFT JOIN brands b ON b.id = t.brand_id
      LEFT JOIN ticket_products tp ON tp.ticket_id = t.id
      WHERE t.is_anonymized = FALSE
        ${visibilityWhere}
        AND (
          t.ticket_number ILIKE $1 OR
          t.title ILIKE $2 OR
          t.client_name ILIKE $3 OR
          t.client_email ILIKE $4 OR
          t.client_phone ILIKE $5 OR
          t.client_cpf ILIKE $6 OR
          t.description ILIKE $2 OR
          tp.serial_number ILIKE $2 OR
          tp.product_name ILIKE $2
        )
      ORDER BY t.updated_at DESC
      LIMIT $7
    `, params);

    res.json({ results: rows, query: q });
  } catch (err) {
    next(err);
  }
};

// GET /api/search/suggest?q=termo (autocomplete)
const suggest = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ suggestions: [] });

    const user = req.user;
    const internalRoles = ['atendente', 'gestor', 'diretor'];
    const term = `%${q}%`;

    let visibilityWhere = '';
    if (!internalRoles.includes(user.role)) {
      if (user.role === 'loja') visibilityWhere = `AND t.store_id = '${user.store_id}'`;
      else if (user.role === 'cliente') visibilityWhere = `AND (t.client_user_id = '${user.id}' OR t.created_by = '${user.id}')`;
    }

    const { rows } = await pool.query(`
      SELECT DISTINCT
        t.id, t.ticket_number, t.title, t.client_name,
        ts.name as status_name, ts.color as status_color
      FROM tickets t
      LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
      WHERE t.is_anonymized = FALSE
        ${visibilityWhere}
        AND (
          t.ticket_number ILIKE $1 OR
          t.title ILIKE $1 OR
          t.client_name ILIKE $1 OR
          t.client_email ILIKE $1 OR
          t.client_phone ILIKE $1
        )
      ORDER BY t.updated_at DESC
      LIMIT 8
    `, [term]);

    res.json({ suggestions: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { search, suggest };
