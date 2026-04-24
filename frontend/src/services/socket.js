import { io } from 'socket.io-client';
import { addMessage, updateUserOnline, setRooms } from '../store/slices/chatSlice';
import { setNotifications } from '../store/slices/notificationSlice';
import { notificationAPI, chatAPI } from './api';

let socket = null;
let _dispatch = null;

export const initSocket = (userId, dispatch) => {
  _dispatch = dispatch;
  if (socket) socket.disconnect();

  socket = io(process.env.REACT_APP_SOCKET_URL || 'http://177.153.39.134:5000', {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 15,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket conectado:', socket.id);
    socket.emit('authenticate', userId);
  });

  socket.on('connect_error', (err) => {
    console.warn('⚠️ Socket connect_error:', err.message);
  });

  // Nova mensagem recebida enquanto está na sala
  socket.on('new_message', (msg) => {
    dispatch(addMessage(msg));
  });

  // Notificação de nova mensagem em sala que o usuário não está visualizando
  // Usa addMessage para atualização instantânea sem chamada de API
  socket.on('chat_notification', (data) => {
    if (data && data.room_id) {
      // Criar mensagem fictícia para atualizar contadores e sala imediatamente
      dispatch(addMessage({
        id: `notif_${Date.now()}`,
        room_id: data.room_id,
        message: data.message || '',
        sender_name: data.sender_name || '',
        sender_id: -1,
        created_at: new Date().toISOString(),
      }));
    } else {
      // Fallback: recarregar salas
      chatAPI.getRooms().then(r => dispatch(setRooms(r.data))).catch(() => {});
    }
  });

  socket.on('user_online', (data) => {
    dispatch(updateUserOnline(data));
  });

  socket.on('ticket_updated', () => {
    notificationAPI.list().then(r => dispatch(setNotifications(r.data))).catch(() => {});
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket desconectado:', reason);
  });

  return socket;
};

export const getSocket = () => socket;
export const getDispatch = () => _dispatch;
export const disconnectSocket = () => socket?.disconnect();

export const joinRoom = (roomId) => socket?.emit('join_room', roomId);
export const leaveRoom = (roomId) => socket?.emit('leave_room', roomId);
export const sendMessage = (roomId, message) => socket?.emit('send_message', { room_id: roomId, message });
export const sendTyping = (roomId, userName) => socket?.emit('typing', { room_id: roomId, user_name: userName });
export const sendStopTyping = (roomId) => socket?.emit('stop_typing', { room_id: roomId });
