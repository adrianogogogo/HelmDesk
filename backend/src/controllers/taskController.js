const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/tasks
const getTasks = async (req, res, next) => {
  try {
    const user = req.user;
    const { ticket_id, assigned_to, status, department_id } = req.query;
    const internalRoles = ['atendente', 'gestor', 'diretor', 'superadmin'];

    let where = ['1=1'];
    const params = [];

    if (ticket_id) { params.push(ticket_id); where.push(`tk.ticket_id = $${params.length}`); }
    if (status) { params.push(status); where.push(`tk.status = $${params.length}`); }
    
    // Atendentes veem suas próprias tarefas + as vinculadas a tickets
    if (!internalRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Tarefas são para usuários internos apenas' });
    }
    
    if (assigned_to) { params.push(assigned_to); where.push(`tk.assigned_to = $${params.length}`); }

    const { rows } = await pool.query(`
      SELECT tk.*, 
             u.name as assigned_name, u.email as assigned_email,
             uc.name as created_by_name,
             t.ticket_number, t.title as ticket_title
      FROM tasks tk
      LEFT JOIN users u ON u.id = tk.assigned_to
      LEFT JOIN users uc ON uc.id = tk.created_by
      LEFT JOIN tickets t ON t.id = tk.ticket_id
      WHERE ${where.join(' AND ')}
      ORDER BY tk.sort_order ASC, tk.created_at ASC
    `, params);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/kanban — grouped by status
const getKanban = async (req, res, next) => {
  try {
    const { department_id = 1, assigned_to } = req.query;
    let where = [`tk.department_id = $1`];
    const params = [department_id];

    if (assigned_to) {
      params.push(assigned_to);
      where.push(`tk.assigned_to = $${params.length}`);
    }

    const { rows } = await pool.query(`
      SELECT tk.*, 
             u.name as assigned_name,
             t.ticket_number, t.title as ticket_title,
             ts.color as ticket_status_color
      FROM tasks tk
      LEFT JOIN users u ON u.id = tk.assigned_to
      LEFT JOIN tickets t ON t.id = tk.ticket_id
      LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
      WHERE ${where.join(' AND ')}
      ORDER BY tk.sort_order ASC, tk.created_at ASC
    `, params);

    const kanban = {
      pendente: rows.filter(r => r.status === 'pendente'),
      em_andamento: rows.filter(r => r.status === 'em_andamento'),
      concluida: rows.filter(r => r.status === 'concluida')
    };

    res.json(kanban);
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const user = req.user;
    const { title, description, ticket_id, assigned_to, priority, due_date, department_id = 1 } = req.body;

    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const { rows } = await pool.query(`
      INSERT INTO tasks (title, description, ticket_id, assigned_to, created_by, priority, due_date, department_id, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendente') RETURNING *
    `, [title, description, ticket_id || null, assigned_to || user.id, user.id,
        priority || 'normal', due_date || null, department_id]);

    const task = rows[0];

    // History if linked to ticket
    if (ticket_id) {
      await pool.query(`
        INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
        VALUES ($1,$2,'task_created',$3,TRUE)
      `, [ticket_id, user.id, `Tarefa criada: ${title}`]);
    }

    // Notify assigned user
    if (assigned_to && assigned_to !== user.id) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_task_id)
        VALUES ($1,'Nova tarefa atribuída',$2,'task',$3)
      `, [assigned_to, `Você tem uma nova tarefa: ${title}`, task.id]);
    }

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

const VALID_TASK_STATUSES = ['pendente', 'em_andamento', 'concluida'];

// PATCH /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, assigned_to, status, priority, sort_order, due_date } = req.body;
    const user = req.user;

    if (status !== undefined && !VALID_TASK_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Valores permitidos: ${VALID_TASK_STATUSES.join(', ')}` });
    }

    const { rows: current } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!current.length) return res.status(404).json({ error: 'Tarefa não encontrada' });
    const task = current[0];

    await pool.query(`
      UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        assigned_to = COALESCE($3, assigned_to),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        sort_order = COALESCE($6, sort_order),
        due_date = COALESCE($7, due_date),
        completed_at = CASE WHEN $4 = 'concluida' AND status != 'concluida' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE id = $8
    `, [title, description, assigned_to, status, priority, sort_order, due_date, id]);

    // If concluded, add goal
    if (status === 'concluida' && task.status !== 'concluida') {
      const now = new Date();
      await pool.query(`
        INSERT INTO goals (user_id, task_id, action_type, month, year)
        VALUES ($1,$2,'task_completed',$3,$4)
      `, [user.id, id, now.getMonth() + 1, now.getFullYear()]);

      if (task.ticket_id) {
        await pool.query(`
          INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
          VALUES ($1,$2,'task_completed',$3,TRUE)
        `, [task.ticket_id, user.id, `Tarefa concluída: ${task.title}`]);
      }
    }

    res.json({ message: 'Tarefa atualizada' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Tarefa excluída' });
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/:id/whatsapp — generate WhatsApp link
const getWhatsAppLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT tk.*, u.phone, u.name as assigned_name, t.ticket_number
      FROM tasks tk
      LEFT JOIN users u ON u.id = tk.assigned_to
      LEFT JOIN tickets t ON t.id = tk.ticket_id
      WHERE tk.id = $1
    `, [id]);

    if (!rows.length) return res.status(404).json({ error: 'Tarefa não encontrada' });
    const task = rows[0];

    if (!task.phone) return res.status(400).json({ error: 'Usuário atribuído não tem telefone cadastrado' });

    const appUrl = process.env.APP_URL || 'http://177.153.39.134:3000';
    const ticketLink = task.ticket_id
      ? `${appUrl}/tickets/${task.ticket_id}`
      : `${appUrl}/tasks`;

    const message = encodeURIComponent(
      `Olá, *${task.assigned_name}*! 👋\n\nVocê tem uma tarefa pendente no *RelmDesk*:\n\n` +
      `📋 *${task.title}*\n` +
      (task.ticket_number ? `🎫 Ticket: #${task.ticket_number}\n` : '') +
      `\nAcesse agora: ${ticketLink}\n\n_Relm Help Desk_`
    );

    const phone = task.phone.replace(/\D/g, '');
    const waLink = `https://wa.me/55${phone}?text=${message}`;

    // Record
    await pool.query('UPDATE tasks SET whatsapp_sent_at = NOW() WHERE id = $1', [id]);

    res.json({ whatsapp_url: waLink, phone: task.phone });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTasks, getKanban, createTask, updateTask, deleteTask, getWhatsAppLink };
