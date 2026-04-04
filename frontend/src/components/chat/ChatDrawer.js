import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Drawer, Box, Typography, IconButton, List, ListItem, ListItemAvatar,
  ListItemText, Avatar, Divider, TextField, Button, Badge, Chip, Paper
} from '@mui/material';
import { Close, Send, ArrowBack } from '@mui/icons-material';
import { setChatOpen, setActiveRoom, setMessages, setRooms, setUsers } from '../../store/slices/chatSlice';
import { chatAPI } from '../../services/api';
import { joinRoom, sendMessage, sendTyping, sendStopTyping, getSocket } from '../../services/socket';
import { format } from 'date-fns';

const ChatDrawer = () => {
  const dispatch = useDispatch();
  const { isOpen, rooms, activeRoom, messages, users } = useSelector(s => s.chat);
  const { user } = useSelector(s => s.auth);
  const [messageText, setMessageText] = useState('');
  const [view, setView] = useState('rooms'); // rooms | users | chat
  const [typing, setTyping] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatAPI.getRooms().then(r => dispatch(setRooms(r.data))).catch(() => {});
      chatAPI.getUsers().then(r => dispatch(setUsers(r.data))).catch(() => {});
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (activeRoom) {
      chatAPI.getMessages(activeRoom.id).then(r => dispatch(setMessages(r.data))).catch(() => {});
      joinRoom(activeRoom.id);
      setView('chat');
    }
  }, [activeRoom, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleTyping = ({ user_name }) => setTyping(user_name);
    const handleStopTyping = () => setTyping(null);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    return () => { socket.off('user_typing', handleTyping); socket.off('user_stop_typing', handleStopTyping); };
  }, []);

  const handleSend = () => {
    if (!messageText.trim() || !activeRoom) return;
    sendMessage(activeRoom.id, messageText.trim());
    setMessageText('');
    sendStopTyping(activeRoom.id);
  };

  const handleTypingInput = (val) => {
    setMessageText(val);
    if (!activeRoom) return;
    sendTyping(activeRoom.id, user?.name);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendStopTyping(activeRoom.id), 2000);
  };

  const openDirectChat = async (targetUser) => {
    try {
      const { data: room } = await chatAPI.createRoom({ target_user_id: targetUser.id, type: 'direct' });
      room.other_members = [{ id: targetUser.id, name: targetUser.name, role: targetUser.role, is_online: targetUser.is_online }];
      dispatch(setActiveRoom(room));
    } catch {}
  };

  const roomName = (room) => {
    if (room.name) return room.name;
    const other = room.other_members?.[0];
    return other?.name || 'Conversa';
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={() => dispatch(setChatOpen(false))}
      sx={{ '& .MuiDrawer-paper': { width: 360, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#0d2137' }}>
        {view !== 'rooms' && (
          <IconButton size="small" onClick={() => { setView('rooms'); dispatch(setActiveRoom(null)); }} sx={{ color: 'white', mr: 1 }}>
            <ArrowBack />
          </IconButton>
        )}
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'white', flexGrow: 1 }}>
          {view === 'rooms' && '💬 Chat Interno'}
          {view === 'users' && '👥 Nova conversa'}
          {view === 'chat' && roomName(activeRoom || {})}
        </Typography>
        {view === 'rooms' && (
          <Button size="small" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }} onClick={() => setView('users')}>
            + Nova
          </Button>
        )}
        <IconButton size="small" onClick={() => dispatch(setChatOpen(false))} sx={{ color: 'rgba(255,255,255,0.8)' }}>
          <Close />
        </IconButton>
      </Box>

      {/* Rooms list */}
      {view === 'rooms' && (
        <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {rooms.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <Typography variant="body2">Nenhuma conversa ainda</Typography>
              <Button size="small" sx={{ mt: 1 }} onClick={() => setView('users')}>Iniciar conversa</Button>
            </Box>
          )}
          {rooms.map(room => (
            <React.Fragment key={room.id}>
              <ListItem onClick={() => dispatch(setActiveRoom(room))} sx={{ py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                <ListItemAvatar>
                  <Badge badgeContent={room.unread_count > 0 ? room.unread_count : null} color="error">
                    <Avatar sx={{ bgcolor: '#1565C0' }}>{roomName(room)?.charAt(0)}</Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={room.unread_count > 0 ? 700 : 400}>{roomName(room)}</Typography>}
                  secondary={
                    <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 220 }}>
                      {room.last_message || 'Sem mensagens'}
                    </Typography>
                  }
                />
                {room.last_message_at && (
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(room.last_message_at), 'HH:mm')}
                  </Typography>
                )}
              </ListItem>
              <Divider variant="inset" />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Users list */}
      {view === 'users' && (
        <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {users.map(u => (
            <React.Fragment key={u.id}>
              <ListItem onClick={() => openDirectChat(u)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                <ListItemAvatar>
                  <Badge
                    overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: u.is_online ? '#4CAF50' : '#bbb', border: '2px solid white' }} />}
                  >
                    <Avatar sx={{ bgcolor: '#1565C0' }}>{u.name?.charAt(0)}</Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={500}>{u.name}</Typography>}
                  secondary={<Chip label={u.role} size="small" sx={{ height: 18, fontSize: 10 }} />}
                />
                {u.is_online && <Chip label="online" size="small" color="success" sx={{ height: 18, fontSize: 10 }} />}
              </ListItem>
              <Divider variant="inset" />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Chat view */}
      {view === 'chat' && (
        <>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              return (
                <Box key={msg.id} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && (
                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, mr: 1, alignSelf: 'flex-end', bgcolor: '#1565C0' }}>
                      {msg.sender_name?.charAt(0)}
                    </Avatar>
                  )}
                  <Box sx={{ maxWidth: '75%' }}>
                    {!isMe && (
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.3, display: 'block', ml: 0.5 }}>
                        {msg.sender_name}
                      </Typography>
                    )}
                    <Paper
                      className={isMe ? 'chat-bubble-me' : 'chat-bubble-other'}
                      sx={{ p: '8px 12px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}
                    >
                      <Typography variant="body2">{msg.message}</Typography>
                    </Paper>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: 'block', textAlign: isMe ? 'right' : 'left', px: 0.5 }}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            {typing && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {typing} está digitando...
              </Typography>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth size="small" placeholder="Digite uma mensagem..."
                value={messageText}
                onChange={e => handleTypingInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                multiline maxRows={3}
              />
              <IconButton color="primary" onClick={handleSend} disabled={!messageText.trim()}>
                <Send />
              </IconButton>
            </Box>
          </Box>
        </>
      )}
    </Drawer>
  );
};

export default ChatDrawer;
