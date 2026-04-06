const pool = require('../config/database');

// GET /api/search?q=termo
const search = async (req, res, next) => {
  try {
    const { q, limit = 50 } = req.query;
    if (!q || q.length < 2) return res.json({ results: [] });

    const user = req.user;
    const internalRoles = ['atendente', 'gestor', 'diretor'];
    const term = `%${q}%`;

    // $1 = term (usamos o mesmo parâmetro repetidamente via $1)
    const params = [term, parseInt(limit)];
    let visibilityWhere = '';

    if (!internalRoles.includes(user.role)) {
      if (user.role === 'loja') {
        params.push(user.store_id); // $3
        visibilityWhere = 'AND t.store_id = $3';
      } else if (user.role === 'cliente') {
        params.push(user.id); // $3
        visibilityWhere = 'AND (t.client_user_id = $3 OR t.created_by = $3)';
      }
    }

    const { rows } = await pool.query(`
      SELECT DISTINCT ON (t.updated_at, t.id)
        t.id, t.ticket_number, t.title, t.client_name, t.client_email, t.client_phone,
        t.created_at, t.updated_at,
        ts.name as status_name, ts.color as status_color, ts.slug as status_slug,
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
          t.title        ILIKE $1 OR
          t.client_name  ILIKE $1 OR
          t.client_email ILIKE $1 OR
          t.client_phone ILIKE $1 OR
          t.description  ILIKE $1 OR
          COALESCE(t.client_cpf, '') ILIKE $1 OR
          COALESCE(tp.serial_number, '') ILIKE $1 OR
          COALESCE(tp.product_name, '')  ILIKE $1
        )
      ORDER BY t.updated_at DESC, t.id
      LIMIT $2
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

    const params = [term];
    let visibilityWhere = '';

    if (!internalRoles.includes(user.role)) {
      if (user.role === 'loja') {
        params.push(user.store_id); // $2
        visibilityWhere = 'AND t.store_id = $2';
      } else if (user.role === 'cliente') {
        params.push(user.id); // $2
        visibilityWhere = 'AND (t.client_user_id = $2 OR t.created_by = $2)';
      }
    }

    const { rows } = await pool.query(`
      SELECT DISTINCT ON (t.updated_at, t.id)
        t.id, t.ticket_number, t.title, t.client_name,
        t.updated_at,
        ts.name as status_name, ts.color as status_color
      FROM tickets t
      LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
      WHERE t.is_anonymized = FALSE
        ${visibilityWhere}
        AND (
          t.ticket_number ILIKE $1 OR
          t.title         ILIKE $1 OR
          t.client_name   ILIKE $1 OR
          t.client_email  ILIKE $1 OR
          t.client_phone  ILIKE $1
        )
      ORDER BY t.updated_at DESC, t.id
      LIMIT 8
    `, params);

    res.json({ suggestions: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { search, suggest };
