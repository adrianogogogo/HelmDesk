import { io } from 'socket.io-client';
import { addMessage, updateUserOnline } from '../store/slices/chatSlice';
import { setNotifications } from '../store/slices/notificationSlice';
import { notificationAPI } from './api';

let socket = null;

export const initSocket = (userId, dispatch) => {
  if (socket) socket.disconnect();

  socket = io(process.env.REACT_APP_SOCKET_URL || 'http://177.153.39.134:5000', {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
    socket.emit('authenticate', userId);
  });

  socket.on('new_message', (msg) => {
    dispatch(addMessage(msg));
  });

  socket.on('user_online', (data) => {
    dispatch(updateUserOnline(data));
  });

  socket.on('ticket_updated', () => {
    // Reload notifications
    notificationAPI.list().then(r => dispatch(setNotifications(r.data))).catch(() => {});
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  return socket;
};

export const getSocket = () => socket;
export const disconnectSocket = () => socket?.disconnect();

export const joinRoom = (roomId) => socket?.emit('join_room', roomId);
export const sendMessage = (roomId, message) => socket?.emit('send_message', { room_id: roomId, message });
export const sendTyping = (roomId, userName) => socket?.emit('typing', { room_id: roomId, user_name: userName });
export const sendStopTyping = (roomId) => socket?.emit('stop_typing', { room_id: roomId });
