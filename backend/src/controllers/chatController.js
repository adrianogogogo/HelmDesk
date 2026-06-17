const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/chat/rooms
const getRooms = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(`
      SELECT cr.id, cr.name, cr.type, cr.created_at,
             (SELECT cm.message FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
             (SELECT cm.created_at FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_at,
             (SELECT COUNT(*) FROM chat_messages cm WHERE cm.room_id = cr.id 
              AND cm.created_at > COALESCE((SELECT crm2.last_read_at FROM chat_room_members crm2 WHERE crm2.room_id = cr.id AND crm2.user_id = $1), '1970-01-01')
              AND cm.sender_id != $1) as unread_count,
             (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'role', u.role, 'is_online', u.is_online))
              FROM chat_room_members crm3
              JOIN users u ON u.id = crm3.user_id
              WHERE crm3.room_id = cr.id AND crm3.user_id != $1) as other_members
      FROM chat_rooms cr
      JOIN chat_room_members crm ON crm.room_id = cr.id AND crm.user_id = $1
      ORDER BY last_message_at DESC NULLS LAST
    `, [userId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/chat/rooms/:roomId/messages
const getMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Verify membership
    const { rows: member } = await pool.query(
      'SELECT id FROM chat_room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, req.user.id]
    );
    if (!member.length) return res.status(403).json({ error: 'Você não é membro desta sala' });

    const { rows } = await pool.query(`
      SELECT cm.*, u.name as sender_name, u.role as sender_role, u.avatar_url as sender_avatar
      FROM chat_messages cm
      LEFT JOIN users u ON u.id = cm.sender_id
      WHERE cm.room_id = $1 AND cm.is_deleted = FALSE
      ORDER BY cm.created_at DESC
      LIMIT $2 OFFSET $3
    `, [roomId, parseInt(limit), offset]);

    // Mark as read
    await pool.query(
      'UPDATE chat_room_members SET last_read_at = NOW() WHERE room_id = $1 AND user_id = $2',
      [roomId, req.user.id]
    );

    res.json(rows.reverse());
  } catch (err) {
    next(err);
  }
};

// POST /api/chat/rooms — create/find direct room
const createOrFindRoom = async (req, res, next) => {
  try {
    const { target_user_id, type = 'direct', name } = req.body;
    const userId = req.user.id;

    if (type === 'direct' && target_user_id) {
      // Check if room exists
      const { rows: existing } = await pool.query(`
        SELECT cr.id FROM chat_rooms cr
        JOIN chat_room_members m1 ON m1.room_id = cr.id AND m1.user_id = $1
        JOIN chat_room_members m2 ON m2.room_id = cr.id AND m2.user_id = $2
        WHERE cr.type = 'direct'
        LIMIT 1
      `, [userId, target_user_id]);

      if (existing.length) {
        const { rows } = await pool.query('SELECT * FROM chat_rooms WHERE id = $1', [existing[0].id]);
        return res.json(rows[0]);
      }

      // Create new
      const { rows: room } = await pool.query(
        `INSERT INTO chat_rooms (type, created_by) VALUES ('direct',$1) RETURNING *`, [userId]
      );
      await pool.query(
        `INSERT INTO chat_room_members (room_id, user_id) VALUES ($1,$2),($1,$3)`,
        [room[0].id, userId, target_user_id]
      );
      return res.status(201).json(room[0]);
    }

    // Group room
    const { rows: room } = await pool.query(
      `INSERT INTO chat_rooms (name, type, created_by) VALUES ($1,'group',$2) RETURNING *`,
      [name, userId]
    );
    await pool.query(
      `INSERT INTO chat_room_members (room_id, user_id) VALUES ($1,$2)`,
      [room[0].id, userId]
    );
    res.status(201).json(room[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/chat/users — list internal users for chat
const getChatUsers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, role, is_online, last_seen_at, avatar_url
      FROM users
      WHERE role IN ('atendente','gestor','diretor','superadmin')
        AND is_active = TRUE
        AND id != $1
      ORDER BY is_online DESC, name ASC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getRooms, getMessages, createOrFindRoom, getChatUsers };
