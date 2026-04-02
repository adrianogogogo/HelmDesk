const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// POST /api/public/tickets — create ticket without login
router.post('/tickets', async (req, res, next) => {
  try {
    const {
      title, description, brand_id, issue_type_id, issue_subtype_id,
      client_name, client_email, client_phone, client_cpf,
      products = [], priority = 'normal'
    } = req.body;

    if (!title || !client_name || !client_email) {
      return res.status(400).json({ error: 'Title, name and email are required' });
    }

    // Create system user placeholder to reference as created_by
    const systemUserId = await getSystemUser();

    const { rows } = await pool.query(`
      INSERT INTO tickets (
        title, description, department_id, priority, brand_id,
        issue_type_id, issue_subtype_id,
        client_name, client_email, client_phone, client_cpf,
        created_by, ball_owner_id, status_id
      ) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,1)
      RETURNING id, ticket_number, public_token, title, client_email, created_at
    `, [
      title, description, priority, brand_id || null,
      issue_type_id || null, issue_subtype_id || null,
      client_name, client_email, client_phone || null, client_cpf || null,
      systemUserId
    ]);

    const ticket = rows[0];

    // Products
    for (const prod of products) {
      await pool.query(`
        INSERT INTO ticket_products (ticket_id, product_name, brand_name, serial_number, invoice_number, purchase_date)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [ticket.id, prod.product_name, prod.brand_name, prod.serial_number, prod.invoice_number, prod.purchase_date || null]);
    }

    // History
    await pool.query(`
      INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
      VALUES ($1,$2,'ticket_created','Ticket criado via portal público',FALSE)
    `, [ticket.id, systemUserId]);

    res.status(201).json({
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      public_token: ticket.public_token,
      message: 'Seu ticket foi criado com sucesso! Guarde o número para acompanhamento.',
      track_url: `${process.env.APP_URL || 'http://177.153.39.134:3000'}/acompanhar/${ticket.public_token}`
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/public/tickets/:token — track without login
router.get('/tickets/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { rows } = await pool.query(`
      SELECT t.id, t.ticket_number, t.title, t.created_at, t.updated_at,
             ts.name as status_name, ts.color as status_color, ts.sort_order as status_order,
             b.name as brand_name, it.name as issue_type_name,
             t.client_name, t.description
      FROM tickets t
      LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
      LEFT JOIN brands b ON b.id = t.brand_id
      LEFT JOIN issue_types it ON it.id = t.issue_type_id
      WHERE t.public_token = $1 AND t.is_anonymized = FALSE
    `, [token]);

    if (!rows.length) return res.status(404).json({ error: 'Ticket not found' });

    // Public history (non-internal only)
    const { rows: history } = await pool.query(`
      SELECT th.action_type, th.note, th.created_at,
             ts.name as status_to_name, ts.color as status_color
      FROM ticket_history th
      LEFT JOIN ticket_statuses ts ON ts.id = th.status_to_id
      WHERE th.ticket_id = $1 AND th.is_internal = FALSE
      ORDER BY th.created_at ASC
    `, [rows[0].id]);

    res.json({ ...rows[0], history });
  } catch (err) {
    next(err);
  }
});

// GET /api/public/brands
router.get('/brands', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name, slug FROM brands WHERE is_active=TRUE ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/public/issue-types
router.get('/issue-types', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT it.id, it.name, 
             json_agg(json_build_object('id',ist.id,'name',ist.name) ORDER BY ist.sort_order) as subtypes
      FROM issue_types it
      LEFT JOIN issue_subtypes ist ON ist.issue_type_id = it.id AND ist.is_active = TRUE
      WHERE it.is_active = TRUE
      GROUP BY it.id ORDER BY it.sort_order
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

async function getSystemUser() {
  const { rows } = await pool.query(`SELECT id FROM users WHERE email='admin@relmbikes.com.br' LIMIT 1`);
  return rows[0]?.id;
}

module.exports = router;
