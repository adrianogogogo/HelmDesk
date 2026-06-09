const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const VALID_PRIORITIES = ['low', 'normal', 'high', 'critical'];

const sanitizeText = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
};

// GET /api/tickets — list with filters
const getTickets = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      status_id, brand_id, assigned_to, ball_owner_id, priority,
      search, store_id, page = 1, limit = 20,
      sort = 'created_at', order = 'DESC',
      exclude_status_ids   // "9,10" para filtro "Ativos"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const offset = (pageNum - 1) * limitNum;
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
    if (exclude_status_ids && !status_id) {
      const ids = exclude_status_ids.split(',').map(Number).filter(Boolean);
      if (ids.length) whereConditions.push(`t.status_id NOT IN (${ids.join(',')})`);
    }
    if (brand_id) { params.push(brand_id); whereConditions.push(`t.brand_id = $${params.length}`); }
    if (assigned_to) { params.push(assigned_to); whereConditions.push(`t.assigned_to = $${params.length}`); }
    if (ball_owner_id) { params.push(ball_owner_id); whereConditions.push(`t.ball_owner_id = $${params.length}`); }
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

    params.push(limitNum, offset);
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
    res.json({ tickets: rows, total, page: pageNum, limit: limitNum });
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

    if (!rows.length) return res.status(404).json({ error: 'Ticket não encontrado' });
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

    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Prioridade inválida. Valores permitidos: ${VALID_PRIORITIES.join(', ')}` });
    }

    if (products.length > 3) {
      return res.status(400).json({ error: 'Um ticket pode ter no máximo 3 produtos vinculados' });
    }

    const cleanTitle = sanitizeText(title);
    const cleanDescription = sanitizeText(description);
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
      cleanTitle, cleanDescription, department_id, priority, brand_id || null,
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
    if (!ticketRows.length) return res.status(404).json({ error: 'Ticket não encontrado' });
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

    // Notifica o CRM sobre a alteração de status
    notifyCrmOfStatusChange(id, status_id || oldStatusId, note || 'Status atualizado no HelmDesk');

    res.json({ message: 'Status atualizado', ticket_id: id });
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
      return res.status(403).json({ error: 'Sem permissão para editar tickets' });
    }

    const fields = req.body;

    if (fields.priority !== undefined && !VALID_PRIORITIES.includes(fields.priority)) {
      return res.status(400).json({ error: `Prioridade inválida. Valores permitidos: ${VALID_PRIORITIES.join(', ')}` });
    }
    if (fields.title !== undefined) fields.title = sanitizeText(fields.title);
    if (fields.description !== undefined) fields.description = sanitizeText(fields.description);

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

    if (!setClauses.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

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

    res.json({ message: 'Ticket atualizado' });
  } catch (err) {
    next(err);
  }
};

// POST /api/tickets/:id/products — add product
const addProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { product_id, product_name, brand_name, serial_number, invoice_number, purchase_date, notes } = req.body;

    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) FROM ticket_products WHERE ticket_id = $1', [id]
    );
    if (parseInt(countRows[0].count) >= 3) {
      return res.status(400).json({ error: 'Um ticket pode ter no máximo 3 produtos vinculados' });
    }

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
    res.json({ message: 'Produto removido' });
  } catch (err) {
    next(err);
  }
};

// Tipos de solução que requerem aprovação do diretor obrigatoriamente
const SOLUTION_TYPES_REQUIRE_DIRECTOR = ['troca', 'reembolso'];

// Rótulos legíveis por tipo de solução
const SOLUTION_TYPE_LABELS = {
  reparo:    'Reparo / Manutenção',
  troca:     'Troca de Produto',
  reembolso: 'Reembolso',
  cortesia:  'Cortesia / Bonificação',
  outro:     'Outro',
};

// POST /api/tickets/:id/solutions
const addSolution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      description,
      solution_type = 'outro',
      has_cost,
      cost_value,
      cost_notes,
    } = req.body;
    const user = req.user;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Descrição da solução é obrigatória' });
    }

    // Troca e reembolso sempre exigem aprovação do diretor
    const requiresDirector = SOLUTION_TYPES_REQUIRE_DIRECTOR.includes(solution_type);

    const { rows } = await pool.query(`
      INSERT INTO ticket_solutions
        (ticket_id, description, solution_type, has_cost, cost_value, cost_notes,
         proposed_by, requires_director, authorization_level)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      id, description, solution_type,
      has_cost || false, cost_value || null, cost_notes || null,
      user.id, requiresDirector,
      'gestor', // sempre começa aguardando o gestor
    ]);

    const solution = rows[0];

    // Buscar dados do ticket para as tarefas automáticas
    const { rows: ticketRows } = await pool.query(
      'SELECT ticket_number, department_id FROM tickets WHERE id = $1', [id]
    );
    const ticketNumber = ticketRows[0]?.ticket_number;
    const deptId = ticketRows[0]?.department_id || 1;

    // Criar tarefa automática para gestor aprovar
    const { rows: managers } = await pool.query(
      `SELECT id FROM users WHERE role IN ('gestor','diretor') AND is_active = TRUE AND department_id = $1 LIMIT 1`,
      [deptId]
    );
    if (managers.length) {
      const typeLabel = SOLUTION_TYPE_LABELS[solution_type] || solution_type;
      const hasCostInfo = has_cost && cost_value > 0 ? ` | Custo: R$ ${parseFloat(cost_value).toFixed(2)}` : '';
      await pool.query(`
        INSERT INTO tasks (title, description, ticket_id, assigned_to, created_by, status, priority)
        VALUES ($1,$2,$3,$4,$5,'pendente','high')
      `, [
        `✅ Autorizar solução — ${typeLabel} | Ticket #${ticketNumber}`,
        `Solução proposta: ${description}${hasCostInfo}${cost_notes ? ' | ' + cost_notes : ''}`,
        id, managers[0].id, user.id,
      ]);
    }

    // Notificar gestores sobre solução pendente
    const { rows: notifTargets } = await pool.query(
      `SELECT id FROM users WHERE role IN ('gestor','diretor') AND is_active = TRUE AND department_id = $1`,
      [deptId]
    );
    for (const target of notifTargets) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_ticket_id)
        VALUES ($1,$2,$3,'solution',$4)
      `, [
        target.id,
        '💡 Nova solução para autorizar',
        `Ticket #${ticketNumber}: solução do tipo "${SOLUTION_TYPE_LABELS[solution_type]}" aguarda sua autorização.`,
        id,
      ]);
    }

    await pool.query(`
      INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
      VALUES ($1,$2,'solution_proposed',$3,TRUE)
    `, [id, user.id,
      `[${SOLUTION_TYPE_LABELS[solution_type] || solution_type}] ${description}${has_cost ? ` | R$ ${cost_value}` : ''}`,
    ]);

    await registerGoal(user.id, id, null, 'solution_proposed');

    // Emitir socket
    const io = req.app.get('io');
    if (io) io.emit('ticket_updated', { ticketId: id });

    res.status(201).json(solution);
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
      return res.status(403).json({ error: 'Apenas gestores e diretores podem autorizar soluções' });
    }

    // Buscar solução atual
    const { rows: solRows } = await pool.query(
      'SELECT * FROM ticket_solutions WHERE id = $1 AND ticket_id = $2',
      [solutionId, id]
    );
    if (!solRows.length) {
      return res.status(404).json({ error: 'Solução não encontrada' });
    }
    const sol = solRows[0];

    // Buscar ticket
    const { rows: ticketRows } = await pool.query(
      'SELECT ticket_number, department_id FROM tickets WHERE id = $1', [id]
    );
    const ticketNumber = ticketRows[0]?.ticket_number;
    const deptId = ticketRows[0]?.department_id || 1;

    const typeLabel = SOLUTION_TYPE_LABELS[sol.solution_type] || sol.solution_type;

    // -------------------------------------------------------
    // REPROVAÇÃO — qualquer nível pode reprovar
    // -------------------------------------------------------
    if (!approved) {
      await pool.query(`
        UPDATE ticket_solutions
        SET status = 'reprovado',
            approved_by = $1, approved_at = NOW(),
            rejection_reason = $2
        WHERE id = $3
      `, [user.id, rejection_reason || 'Reprovado', solutionId]);

      await pool.query(`
        INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
        VALUES ($1,$2,'solution_rejected',$3,TRUE)
      `, [id, user.id, `[${typeLabel}] Reprovado: ${rejection_reason || '—'}` ]);

      await registerGoal(user.id, id, null, 'reprovado');

      const io = req.app.get('io');
      if (io) io.emit('ticket_updated', { ticketId: id });

      return res.json({ message: 'Solução reprovada' });
    }

    // -------------------------------------------------------
    // APROVAÇÃO — lógica de dois níveis
    // -------------------------------------------------------

    // NÍVEL 1: Gestor aprova (primeira etapa)
    if (sol.authorization_level === 'gestor' && ['gestor', 'diretor'].includes(user.role)) {

      // Se requer diretor → avança para próximo nível
      if (sol.requires_director && user.role === 'gestor') {
        await pool.query(`
          UPDATE ticket_solutions
          SET authorization_level = 'diretor',
              approved_by = $1, approved_at = NOW()
          WHERE id = $2
        `, [user.id, solutionId]);

        // Notificar diretores
        const { rows: directors } = await pool.query(
          `SELECT id FROM users WHERE role = 'diretor' AND is_active = TRUE AND department_id = $1`,
          [deptId]
        );
        for (const dir of directors) {
          await pool.query(`
            INSERT INTO notifications (user_id, title, message, type, related_ticket_id)
            VALUES ($1,$2,$3,'solution',$4)
          `, [
            dir.id,
            '🔐 Autorização de diretor necessária',
            `Ticket #${ticketNumber}: solução de "${typeLabel}" aprovada pelo gestor, aguarda sua confirmação final.`,
            id,
          ]);
          // Criar tarefa para o diretor
          await pool.query(`
            INSERT INTO tasks (title, description, ticket_id, assigned_to, created_by, status, priority)
            VALUES ($1,$2,$3,$4,$5,'pendente','urgent')
          `, [
            `🔐 Confirmar autorização — ${typeLabel} | Ticket #${ticketNumber}`,
            `Gestor ${user.name} aprovou. Aguarda confirmação do diretor para prosseguir.`,
            id, dir.id, user.id,
          ]);
        }

        await pool.query(`
          INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
          VALUES ($1,$2,'solution_approved',$3,TRUE)
        `, [id, user.id, `[${typeLabel}] Aprovado pelo gestor — aguardando confirmação do diretor`]);

        const io = req.app.get('io');
        if (io) io.emit('ticket_updated', { ticketId: id });

        return res.json({
          message: 'Solução aprovada pelo gestor — aguardando confirmação do diretor',
          next_level: 'diretor',
        });
      }

      // Não requer diretor (ou é o próprio diretor aprovando diretamente) → aprovação final
      await _finalizeApproval({ pool, id, solutionId, sol, user, ticketNumber, typeLabel, deptId });
      const io = req.app.get('io');
      if (io) io.emit('ticket_updated', { ticketId: id });
      return res.json({ message: 'Solução aprovada e fluxo de execução iniciado' });
    }

    // NÍVEL 2: Diretor confirma
    if (sol.authorization_level === 'diretor') {
      if (user.role !== 'diretor') {
        return res.status(403).json({ error: 'Esta solução requer confirmação do diretor' });
      }

      await pool.query(`
        UPDATE ticket_solutions
        SET director_approved_by = $1, director_approved_at = NOW(), authorization_level = 'concluido'
        WHERE id = $2
      `, [user.id, solutionId]);

      await _finalizeApproval({ pool, id, solutionId, sol, user, ticketNumber, typeLabel, deptId });
      const io = req.app.get('io');
      if (io) io.emit('ticket_updated', { ticketId: id });
      return res.json({ message: 'Solução confirmada pelo diretor — fluxo de execução iniciado' });
    }

    return res.status(400).json({ error: 'Esta solução já foi processada' });

  } catch (err) {
    next(err);
  }
};

// Finaliza aprovação: marca como aprovado, avança status do ticket e cria tarefas de execução
async function _finalizeApproval({ pool, id, solutionId, sol, user, ticketNumber, typeLabel, deptId }) {
  await pool.query(`
    UPDATE ticket_solutions
    SET status = 'aprovado', approved_by = COALESCE(approved_by, $1), approved_at = COALESCE(approved_at, NOW())
    WHERE id = $2
  `, [user.id, solutionId]);

  // ── Ações automáticas por tipo de solução ──────────────────────────────
  let newStatusId = null;
  let executionTaskTitle = null;
  let executionTaskDesc = null;

  if (sol.solution_type === 'troca') {
    // Avança para Logística/Envio (status 7)
    newStatusId = 7;
    executionTaskTitle = `📦 Executar TROCA de produto — Ticket #${ticketNumber}`;
    executionTaskDesc = `Solução de troca aprovada. ${sol.description}${sol.cost_notes ? ' | ' + sol.cost_notes : ''}`;
  } else if (sol.solution_type === 'reembolso') {
    // Avança para Em Execução (status 6)
    newStatusId = 6;
    const valor = sol.cost_value ? `R$ ${parseFloat(sol.cost_value).toFixed(2)}` : 'valor a definir';
    executionTaskTitle = `💰 Processar REEMBOLSO — ${valor} | Ticket #${ticketNumber}`;
    executionTaskDesc = `Reembolso autorizado no valor de ${valor}. ${sol.description}${sol.cost_notes ? ' | ' + sol.cost_notes : ''}`;
  } else if (sol.solution_type === 'reparo') {
    newStatusId = 6; // Em Execução
    executionTaskTitle = `🔧 Executar REPARO — Ticket #${ticketNumber}`;
    executionTaskDesc = `Solução de reparo aprovada. ${sol.description}`;
  } else if (sol.solution_type === 'cortesia') {
    newStatusId = 6;
    executionTaskTitle = `🎁 Processar CORTESIA — Ticket #${ticketNumber}`;
    executionTaskDesc = `Cortesia aprovada. ${sol.description}${sol.cost_value ? ` | R$ ${parseFloat(sol.cost_value).toFixed(2)}` : ''}`;
  } else {
    newStatusId = 6; // Em Execução (genérico)
    executionTaskTitle = `⚙️ Executar solução — Ticket #${ticketNumber}`;
    executionTaskDesc = sol.description;
  }

  // Atualizar status do ticket
  if (newStatusId) {
    await pool.query(
      'UPDATE tickets SET status_id = $1, updated_at = NOW() WHERE id = $2',
      [newStatusId, id]
    );
    // Notifica o CRM sobre a alteração de status via aprovação de solução
    notifyCrmOfStatusChange(id, newStatusId, `Solução de ${typeLabel} aprovada — execução iniciada`);
  }

  // Criar tarefa de execução para atendente/gestor do departamento
  const { rows: assignees } = await pool.query(
    `SELECT id FROM users WHERE role IN ('atendente','gestor') AND is_active = TRUE AND department_id = $1 ORDER BY role DESC LIMIT 1`,
    [deptId]
  );
  if (assignees.length && executionTaskTitle) {
    const priority = ['troca', 'reembolso'].includes(sol.solution_type) ? 'high' : 'normal';
    await pool.query(`
      INSERT INTO tasks (title, description, ticket_id, assigned_to, created_by, status, priority)
      VALUES ($1,$2,$3,$4,$5,'pendente',$6)
    `, [executionTaskTitle, executionTaskDesc, id, assignees[0].id, user.id, priority]);
  }

  // Registrar no histórico
  await pool.query(`
    INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
    VALUES ($1,$2,'solution_approved',$3,TRUE)
  `, [id, user.id, `[${typeLabel}] Solução aprovada — execução iniciada`]);

  await pool.query(`
    INSERT INTO goals (user_id, ticket_id, task_id, history_id, action_type, month, year)
    VALUES ($1,$2,NULL,NULL,'aprovado',$3,$4)
  `, [user.id, id, new Date().getMonth() + 1, new Date().getFullYear()]);
}

// LGPD - Anonymize ticket
const anonymizeTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!['gestor', 'diretor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
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
    res.json({ message: 'Ticket anonimizado (LGPD)' });
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

/**
 * Função helper para notificar o CRM via webhook sobre mudanças de status no HelmDesk
 */
const notifyCrmOfStatusChange = async (ticketId, statusId, note) => {
  try {
    const crmWebhookUrl = 'http://localhost:3003/api/helmdesk-bridge/webhook/ticket-status';
    console.log(`[CRM Webhook] Notificando CRM sobre alteração no ticket ${ticketId} para o status ${statusId}...`);
    
    // Usando API fetch nativa do Node 18+
    const response = await fetch(crmWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticket_id: ticketId,
        status_id: statusId,
        note: note || 'Alteração realizada no HelmDesk'
      })
    });
    
    if (response.ok) {
      console.log(`[CRM Webhook] CRM notificado com sucesso!`);
    } else {
      const text = await response.text();
      console.warn(`[CRM Webhook] Falha ao notificar CRM. Status: ${response.status}. Detalhes: ${text}`);
    }
  } catch (err) {
    console.error('[CRM Webhook] Erro ao enviar webhook para o CRM:', err.message);
  }
};

module.exports = {
  getTickets, getTicketById, createTicket, updateStatus, updateTicket,
  addProduct, removeProduct, addSolution, approveSolution, anonymizeTicket
};
