const pool = require('../config/database');

const connectedUsers = new Map(); // userId -> socketId

const init = (io) => {
  io.on('connection', (socket) => {

    // Authenticate socket
    socket.on('authenticate', async (userId) => {
      if (!userId) return;
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;

      // Marcar online
      await pool.query(
        'UPDATE users SET is_online=TRUE, last_seen_at=NOW() WHERE id=$1', [userId]
      ).catch(console.error);

      io.emit('user_online', { userId, online: true });
    });

    // Join room
    socket.on('join_room', (roomId) => {
      socket.join(`room:${roomId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      const { room_id, message } = data;
      const userId = socket.userId;
      if (!userId || !room_id || !message) return;

      try {
        // Verify membership
        const { rows: member } = await pool.query(
          'SELECT id FROM chat_room_members WHERE room_id=$1 AND user_id=$2', [room_id, userId]
        );
        if (!member.length) return;

        const { rows } = await pool.query(`
          INSERT INTO chat_messages (room_id, sender_id, message)
          VALUES ($1,$2,$3) RETURNING *
        `, [room_id, userId, message]);

        const { rows: user } = await pool.query(
          'SELECT name, role, avatar_url FROM users WHERE id=$1', [userId]
        );

        const msg = {
          ...rows[0],
          sender_name: user[0]?.name,
          sender_role: user[0]?.role,
          sender_avatar: user[0]?.avatar_url
        };

        io.to(`room:${room_id}`).emit('new_message', msg);
      } catch (err) {
        console.error('Socket message error:', err);
      }
    });

    // Typing indicator
    socket.on('typing', ({ room_id, user_name }) => {
      socket.to(`room:${room_id}`).emit('user_typing', { user_name, room_id });
    });

    socket.on('stop_typing', ({ room_id }) => {
      socket.to(`room:${room_id}`).emit('user_stop_typing', { room_id });
    });

    // Desconexão
    socket.on('disconnect', async () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        await pool.query(
          'UPDATE users SET is_online=FALSE, last_seen_at=NOW() WHERE id=$1', [socket.userId]
        ).catch(console.error);
        io.emit('user_online', { userId: socket.userId, online: false });
      }
    });
  });
};

const getSocketIdByUser = (userId) => connectedUsers.get(userId);

module.exports = { init, getSocketIdByUser };
