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
      socket.currentRoom = roomId;
    });

    // Leave room
    socket.on('leave_room', (roomId) => {
      socket.leave(`room:${roomId}`);
      if (socket.currentRoom === roomId) socket.currentRoom = null;
    });

    // Send message
    socket.on('send_message', async (data) => {
      const { room_id, message } = data;
      const userId = socket.userId;
      if (!userId || !room_id || !message?.trim()) return;

      try {
        // Verificar membros da sala
        const { rows: members } = await pool.query(
          'SELECT user_id FROM chat_room_members WHERE room_id=$1', [room_id]
        );
        const memberIds = members.map(m => m.user_id);
        if (!memberIds.includes(userId)) return;

        // Salvar mensagem
        const { rows } = await pool.query(`
          INSERT INTO chat_messages (room_id, sender_id, message)
          VALUES ($1,$2,$3) RETURNING *
        `, [room_id, userId, message.trim()]);

        const { rows: userRows } = await pool.query(
          'SELECT name, role, avatar_url FROM users WHERE id=$1', [userId]
        );

        const msg = {
          ...rows[0],
          sender_name: userRows[0]?.name,
          sender_role: userRows[0]?.role,
          sender_avatar: userRows[0]?.avatar_url,
          room_id,
        };

        // Emitir para todos na sala
        io.to(`room:${room_id}`).emit('new_message', msg);

        // Notificar membros ausentes da sala (não estão no room: ou chat fechado)
        for (const memberId of memberIds) {
          if (memberId === userId) continue;
          const memberSocketId = connectedUsers.get(memberId);
          if (memberSocketId) {
            // Verificar se o membro está na sala (joined)
            const memberSocket = io.sockets.sockets.get(memberSocketId);
            const inRoom = memberSocket?.rooms?.has(`room:${room_id}`);
            if (!inRoom) {
              // Emitir evento específico de notificação de chat
              io.to(memberSocketId).emit('chat_notification', {
                room_id,
                sender_name: userRows[0]?.name,
                message: message.trim().substring(0, 80),
              });
            }
          }
        }

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
