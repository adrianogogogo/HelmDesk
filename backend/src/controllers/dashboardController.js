const pool = require('../config/database');

// GET /api/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Tickets by status
    const { rows: byStatus } = await pool.query(`
      SELECT ts.name, ts.slug, ts.color, COUNT(t.id) as count
      FROM ticket_statuses ts
      LEFT JOIN tickets t ON t.status_id = ts.id AND t.is_anonymized = FALSE
      GROUP BY ts.id, ts.name, ts.slug, ts.color
      ORDER BY ts.sort_order
    `);

    // Total tickets
    const { rows: totals } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days,
        COUNT(*) FILTER (WHERE status_id NOT IN (9,10)) as open,
        COUNT(*) FILTER (WHERE status_id = 9) as resolved,
        COUNT(*) FILTER (WHERE status_id = 10) as closed
      FROM tickets WHERE is_anonymized = FALSE
    `);

    // Tickets by brand
    const { rows: byBrand } = await pool.query(`
      SELECT b.name as brand, COUNT(t.id) as count
      FROM brands b
      LEFT JOIN tickets t ON t.brand_id = b.id AND t.is_anonymized = FALSE
      GROUP BY b.id, b.name
      ORDER BY count DESC
    `);

    // Tickets by priority
    const { rows: byPriority } = await pool.query(`
      SELECT priority, COUNT(*) as count
      FROM tickets WHERE is_anonymized = FALSE
      GROUP BY priority
    `);

    // Pending tasks
    const { rows: taskStats } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pendente') as pendente,
        COUNT(*) FILTER (WHERE status = 'em_andamento') as em_andamento,
        COUNT(*) FILTER (WHERE status = 'concluida') as concluida
      FROM tasks
    `);

    // Recent tickets
    // client_name vem direto da coluna t.client_name (texto livre)
    // ou do usuário vinculado via client_user_id, se houver
    const { rows: recentTickets } = await pool.query(`
      SELECT t.id, t.ticket_number, t.title, t.created_at, t.priority,
             ts.name as status_name, ts.color as status_color,
             b.name as brand_name,
             COALESCE(u.name, t.client_name) as client_name
      FROM tickets t
      LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
      LEFT JOIN brands b ON b.id = t.brand_id
      LEFT JOIN users u ON u.id = t.client_user_id
      WHERE t.is_anonymized = FALSE
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    // Gamification - current month top 10
    const { rows: ranking } = await pool.query(`
      SELECT u.id, u.name, u.role, COUNT(g.id) as gols,
             RANK() OVER (ORDER BY COUNT(g.id) DESC) as position
      FROM users u
      LEFT JOIN goals g ON g.user_id = u.id AND g.month = $1 AND g.year = $2
      WHERE u.role IN ('atendente','gestor','diretor','superadmin') AND u.is_active = TRUE
      GROUP BY u.id, u.name, u.role
      ORDER BY gols DESC
      LIMIT 10
    `, [month, year]);

    // Monthly ticket trend (last 6 months)
    const { rows: trend } = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM tickets
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    res.json({
      tickets: {
        ...totals[0],
        by_status: byStatus,
        by_brand: byBrand,
        by_priority: byPriority,
        recent: recentTickets,
        trend
      },
      tasks: taskStats[0],
      gamification: {
        current_month: month,
        current_year: year,
        ranking
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
