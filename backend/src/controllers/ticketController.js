const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/tickets — list with filters
const getTickets = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      status_id, brand_id, assigned_to, priority,
      search, store_id, page = 1, limit = 20,
      sort = 'created_at', order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereConditions = ['t.is_anonymized = FALSE'];

    // RBAC visibility
    const internalRoles = ['atendente', 'gestor', 'diretor'];
    if (!internalRoles.includes(user.role)) {
      if (user.role === 'cliente') {
        params.push(user.id);
        whereConditions.push(`(t.client_user_id = $${params.length} OR t.created_by = $${params.length})`);
      } else if (user.role === 'loja') {
        params.push(user.store_id);
        whereConditions.push(`t.store_id = $${params.length}`);
      }
    }

    if (status_id) { params.push(status_id); whereConditions.push(`t.status_id = $${params.length}`); }
    if (brand_id) { params.push(brand_id); whereConditions.push(`t.brand_id = $${params.length}`); }
    if (assigned_to) { params.push(assigned_to); whereConditions.push(`t.assigned_to = $${params.length}`); }
    if (priority) { params.push(priority); whereConditions.push(`t.priority = $${params.length}`); }
    if (store_id && internalRoles.includes(user.role)) { params.push(store_id); whereConditions.push(`t.store_id = $${params.length}`); }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(t.title ILIKE $${params.length} OR t.client_name ILIKE $${params.length} OR t.ticket_number ILIKE $${params.length})`);
    }

    const where = whereConditions.length ? 'WHERE ' + whereConditions.join(' AND ') : '';
    const sortMap = { created_at: 't.created_at', updated_at: 't.updated_at', ticket_number: 't.ticket_number' };
    const sortCol = sortMap[sort] || 't.created_at';

    const countQuery = `SELECT COUNT(*) FROM tickets t ${where}`;
    const { rows: countRows } = await pool.query(countQuery, params);
    const total = parseInt(countRows[0].count);

    params.push(parseInt(limit), offset);
    const dataQuery = `
      SELECT 
        t.id, t.ticket_number, t.title, t.priority, t.created_at, t.updated_at,
        t.client_name, t.client_email, t.client_phone,
        ts.name as status_name, ts.slug as status_slug, ts.color as status_color,
        b.name as brand_name,
        u_assigned.name as assigned_name,
        u_ball.name as ball_owner_name,
        u_ball.id as ball_owner_id,
        s.name as store_name,
        it.name as issue_type_name,
        (SELECT COUNT(*) FROM ticket_products tp WHERE tp.ticket_id = t.id) as product_count,
        (SELECT COUNT(*) FROM tasks tk WHERE tk.ticket_id = t.id AND tk.status != 'concluida') as pending_tasks
      FROM tickets t
      LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
      LEFT JOIN brands b ON b.id = t.brand_id
      LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
      LEFT JOIN users u_ball ON u_ball.id = t.ball_owner_id
      LEFT JOIN stores s ON s.id = t.store_id
      LEFT JOIN issue_types it ON it.id = t.issue_type_id
      ${where}
      ORDER BY ${sortCol} ${order === 'ASC' ? 'ASC' : 'DESC'}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await pool.query(dataQuery, params);
    res.json({ tickets: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/tickets/:id — full detail
const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(`
      SELECT 
        t.*,
        ts.name as status_name, ts.slug as status_slug, ts.color as status_color, ts.sort_order as status_order,
        b.name as brand_name,
        it.name as issue_type_name,
        ist.name as issue_subtype_name,
        u_created.name as created_by_name,
        u_assigned.name as assigned_name, u_assigned.email as assigned_email,
        u_ball.name as ball_owner_name, u_ball.email as ball_owner_email,
        s.name as store_name, s.cnpj as store_cnpj
      FROM tickets t
      LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
      LEFT JOIN brands b ON b.id = t.brand_id
      LEFT JOIN issue_types it ON it.id = t.issue_type_id
      LEFT JOIN issue_subtypes ist ON ist.id = t.issue_subtype_id
      LEFT JOIN users u_created ON u_created.id = t.created_by
      LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
      LEFT JOIN users u_ball ON u_ball.id = t.ball_owner_id
      LEFT JOIN stores s ON s.id = t.store_id
      WHERE t.id = $1
    `, [id]);

    if (!rows.length) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = rows[0];

    // Products
    const { rows: products } = await pool.query(`
      SELECT tp.*, p.name as product_db_name, p.sku, b.name as brand_db_name
      FROM ticket_products tp
      LEFT JOIN products p ON p.id = tp.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE tp.ticket_id = $1
    `, [id]);

    // History
    const { rows: history } = await pool.query(`
      SELECT th.*, u.name as user_name, u.role as user_role,
             ts_from.name as status_from_name, ts_to.name as status_to_name,
             u_ball_from.name as ball_from_name, u_ball_to.name as ball_to_name
      FROM ticket_history th
      LEFT JOIN users u ON u.id = th.user_id
      LEFT JOIN ticket_statuses ts_from ON ts_from.id = th.status_from_id
      LEFT JOIN ticket_statuses ts_to ON ts_to.id = th.status_to_id
      LEFT JOIN users u_ball_from ON u_ball_from.id = th.ball_from_id
      LEFT JOIN users u_ball_to ON u_ball_to.id = th.ball_to_id
      WHERE th.ticket_id = $1
      ORDER BY th.created_at ASC
    `, [id]);

    // Blocks
    const { rows: blocks } = await pool.query(`
      SELECT tb.*, bt.name as block_type_name, bt.slug as block_type_slug,
             u.name as created_by_name
      FROM ticket_blocks tb
      LEFT JOIN block_types bt ON bt.id = tb.block_type_id
      LEFT JOIN users u ON u.id = tb.created_by
      WHERE tb.ticket_id = $1 AND tb.is_active = TRUE
      ORDER BY bt.sort_order
    `, [id]);

    // Solutions
    const { rows: solutions } = await pool.query(`
      SELECT ts.*, u_prop.name as proposed_by_name, u_appr.name as approved_by_name
      FROM ticket_solutions ts
      LEFT JOIN users u_prop ON u_prop.id = ts.proposed_by
      LEFT JOIN users u_appr ON u_appr.id = ts.approved_by
      WHERE ts.ticket_id = $1
      ORDER BY ts.created_at DESC
    `, [id]);

    // Tasks
    const { rows: tasks } = await pool.query(`
      SELECT tk.*, u.name as assigned_name
      FROM tasks tk
      LEFT JOIN users u ON u.id = tk.assigned_to
      WHERE tk.ticket_id = $1
      ORDER BY tk.sort_order ASC
    `, [id]);

    // Attachments
    const { rows: attachments } = await pool.query(`
      SELECT a.*, u.name as uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON u.id = a.uploaded_by
      WHERE a.ticket_id = $1
      ORDER BY a.created_at DESC
    `, [id]);

    res.json({ ...ticket, products, history, blocks, solutions, tasks, attachments });
  } catch (err) {
    next(err);
  }
};

// POST /api/tickets — create
const createTicket = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      title, description, department_id = 1, priority = 'normal',
      brand_id, issue_type_id, issue_subtype_id,
      store_id, client_name, client_email, client_phone, client_cpf,
      products = [], assigned_to
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const ballOwner = assigned_to || user.id;

    const { rows } = await pool.query(`
      INSERT INTO tickets (
        title, description, department_id, priority, brand_id,
        issue_type_id, issue_subtype_id, store_id,
        client_name, client_email, client_phone, client_cpf,
        created_by, assigned_to, ball_owner_id,
        client_user_id, status_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,1)
      RETURNING *
    `, [
      title, description, department_id, priority, brand_id || null,
      issue_type_id || null, issue_subtype_id || null, store_id || user.store_id || null,
      client_name || user.name, client_email || user.email,
      client_phone || user.phone, client_cpf || user.cpf,
      user.id, assigned_to || null, ballOwner,
      user.role === 'cliente' ? user.id : null
    ]);

    const ticket = rows[0];

    // Insert products
    for (const prod of products) {
      await pool.query(`
        INSERT INTO ticket_products (ticket_id, product_id, product_name, brand_name, serial_number, invoice_number, purchase_date, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [ticket.id, prod.product_id || null, prod.product_name, prod.brand_name,
          prod.serial_number, prod.invoice_number, prod.purchase_date || null, prod.notes]);
    }

    // History entry
    await pool.query(`
      INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, note, is_internal, status_to_id)
      VALUES ($1,$2,'ticket_created','Ticket criado',$3,FALSE,1)
    `, [ticket.id, user.id, `Ticket #${ticket.ticket_number} criado`]);

    // Goal
    await registerGoal(user.id, ticket.id, null, 'ticket_created');

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tickets/:id/status — update status (pop-up)
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { status_id, ball_owner_id, note, is_internal = true } = req.body;

    // Get current ticket
    const { rows: ticketRows } = await pool.query(
      'SELECT * FROM tickets WHERE id = $1', [id]
    );
    if (!ticketRows.length) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = ticketRows[0];

    const oldStatusId = ticket.status_id;
    const oldBallOwnerId = ticket.ball_owner_id;
    const newBallOwnerId = ball_owner_id || user.id;

    // Update ticket
    await pool.query(`
      UPDATE tickets SET status_id = $1, ball_owner_id = $2, updated_at = NOW()
      WHERE id = $3
    `, [status_id || oldStatusId, newBallOwnerId, id]);

    // History entry (imutável)
    const { rows: histRows } = await pool.query(`
      INSERT INTO ticket_history (
        ticket_id, user_id, action_type, note, is_internal,
        status_from_id, status_to_id, ball_from_id, ball_to_id
      ) VALUES ($1,$2,'status_change',$3,$4,$5,$6,$7,$8)
      RETURNING id
    `, [id, user.id, note || null, is_internal,
        oldStatusId, status_id || oldStatusId,
        oldBallOwnerId, newBallOwnerId]);

    // Goal
    await registerGoal(user.id, id, null, 'status_change', histRows[0].id);

    // If cost solution, auto-create manager task
    if (status_id === 5) { // Solução Proposta
      await checkSolutionCost(id, user.id);
    }

    // Notify ball new owner
    if (newBallOwnerId !== user.id) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_ticket_id)
        VALUES ($1,'Bola do ticket!', $2, 'ticket', $3)
      `, [newBallOwnerId, `Você recebeu a bola do ticket #${ticket.ticket_number}`, id]);
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) io.emit('ticket_updated', { ticketId: id });

    res.json({ message: 'Status updated', ticket_id: id });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tickets/:id — update fields
const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const allowedRoles = ['atendente', 'gestor', 'diretor'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Not authorized to edit tickets' });
    }

    const fields = req.body;
    const updateable = [
      'title', 'description', 'priority', 'brand_id',
      'issue_type_id', 'issue_subtype_id', 'assigned_to'
    ];

    const setClauses = [];
    const params = [];
    for (const key of updateable) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        setClauses.push(`${key} = $${params.length}`);
      }
    }

    if (!setClauses.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    await pool.query(
      `UPDATE tickets SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
      params
    );

    await pool.query(`
      INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
      VALUES ($1,$2,'field_updated',$3,TRUE)
    `, [id, user.id, JSON.stringify(fields)]);

    await registerGoal(user.id, id, null, 'field_updated');

    res.json({ message: 'Ticket updated' });
  } catch (err) {
    next(err);
  }
};

// POST /api/tickets/:id/products — add product
const addProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { product_id, product_name, brand_name, serial_number, invoice_number, purchase_date, notes } = req.body;

    const { rows } = await pool.query(`
      INSERT INTO ticket_products (ticket_id, product_id, product_name, brand_name, serial_number, invoice_number, purchase_date, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [id, product_id || null, product_name, brand_name, serial_number, invoice_number, purchase_date || null, notes]);

    await pool.query(`
      INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
      VALUES ($1,$2,'field_updated','Produto adicionado ao ticket',TRUE)
    `, [id, req.user.id]);

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tickets/:id/products/:productId
const removeProduct = async (req, res, next) => {
  try {
    const { id, productId } = req.params;
    await pool.query('DELETE FROM ticket_products WHERE id = $1 AND ticket_id = $2', [productId, id]);
    res.json({ message: 'Product removed' });
  } catch (err) {
    next(err);
  }
};

// POST /api/tickets/:id/solutions
const addSolution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, has_cost, cost_value, cost_notes } = req.body;
    const user = req.user;

    const { rows } = await pool.query(`
      INSERT INTO ticket_solutions (ticket_id, description, has_cost, cost_value, cost_notes, proposed_by)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [id, description, has_cost || false, cost_value || null, cost_notes || null, user.id]);

    // If has cost, create auto task for manager
    if (has_cost && cost_value > 0) {
      const { rows: managers } = await pool.query(
        `SELECT id FROM users WHERE role IN ('gestor','diretor') AND is_active = TRUE AND department_id = 1 LIMIT 1`
      );
      if (managers.length) {
        const ticket = await pool.query('SELECT ticket_number FROM tickets WHERE id = $1', [id]);
        await pool.query(`
          INSERT INTO tasks (title, description, ticket_id, assigned_to, created_by, status, priority)
          VALUES ($1,$2,$3,$4,$5,'pendente','high')
        `, [
          `Aprovar solução com custo - Ticket #${ticket.rows[0]?.ticket_number}`,
          `Solução proposta com custo de R$ ${cost_value}. ${cost_notes || ''}`,
          id, managers[0].id, user.id
        ]);
      }
    }

    await pool.query(`
      INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
      VALUES ($1,$2,'solution_proposed',$3,TRUE)
    `, [id, user.id, description]);

    await registerGoal(user.id, id, null, 'solution_proposed');

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tickets/:id/solutions/:solutionId/approve
const approveSolution = async (req, res, next) => {
  try {
    const { id, solutionId } = req.params;
    const { approved, rejection_reason } = req.body;
    const user = req.user;

    if (!['gestor', 'diretor'].includes(user.role)) {
      return res.status(403).json({ error: 'Only managers can approve solutions' });
    }

    const status = approved ? 'aprovado' : 'reprovado';
    await pool.query(`
      UPDATE ticket_solutions SET status = $1, approved_by = $2, approved_at = NOW(), rejection_reason = $3
      WHERE id = $4 AND ticket_id = $5
    `, [status, user.id, rejection_reason || null, solutionId, id]);

    await pool.query(`
      INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
      VALUES ($1,$2,$3,$4,TRUE)
    `, [id, user.id, approved ? 'solution_approved' : 'solution_rejected',
        approved ? 'Solução aprovada' : `Solução reprovada: ${rejection_reason}`]);

    await registerGoal(user.id, id, null, status);

    res.json({ message: `Solution ${status}` });
  } catch (err) {
    next(err);
  }
};

// LGPD - Anonymize ticket
const anonymizeTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!['gestor', 'diretor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.query(`
      UPDATE tickets SET
        client_name = 'ANONIMIZADO', client_email = 'anonimizado@anon.com',
        client_phone = '00000000000', client_cpf = '000.000.000-00',
        is_anonymized = TRUE, anonymized_at = NOW()
      WHERE id = $1
    `, [id]);
    await pool.query(`
      UPDATE ticket_products SET serial_number = 'ANONIMIZADO', invoice_number = 'ANONIMIZADO', is_anonymized = TRUE
      WHERE ticket_id = $1
    `, [id]);
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
      VALUES ($1,'lgpd_anonymize','ticket',$2)
    `, [req.user.id, id]);
    res.json({ message: 'Ticket anonymized (LGPD)' });
  } catch (err) {
    next(err);
  }
};

// Helper: register goal
const registerGoal = async (userId, ticketId, taskId, actionType, historyId = null) => {
  const now = new Date();
  await pool.query(`
    INSERT INTO goals (user_id, ticket_id, task_id, history_id, action_type, month, year)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [userId, ticketId, taskId, historyId, actionType, now.getMonth() + 1, now.getFullYear()]);
};

const checkSolutionCost = async (ticketId, userId) => {
  // placeholder for auto-task on solution proposed
};

module.exports = {
  getTickets, getTicketById, createTicket, updateStatus, updateTicket,
  addProduct, removeProduct, addSolution, approveSolution, anonymizeTicket
};
