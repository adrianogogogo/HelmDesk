import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Drawer, Box, Typography, IconButton, List, ListItem, ListItemAvatar,
  ListItemText, Avatar, Divider, TextField, Button, Badge, Chip, Paper,
  Tooltip
} from '@mui/material';
import { Close, Send, ArrowBack, Add, Circle } from '@mui/icons-material';
import {
  setChatOpen, setActiveRoom, setMessages, setRooms, setUsers, markRoomRead, setIsChatPage, addMessage
} from '../../store/slices/chatSlice';
import { chatAPI } from '../../services/api';
import { joinRoom, leaveRoom, sendMessage, sendTyping, sendStopTyping, getSocket } from '../../services/socket';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const ChatDrawer = () => {
  const dispatch = useDispatch();
  const { isOpen, rooms, activeRoom, messages, users } = useSelector(s => s.chat);
  const { user } = useSelector(s => s.auth);
  const [messageText, setMessageText] = useState('');
  const [view, setView] = useState('rooms'); // rooms | users | chat
  const [typing, setTyping] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);
  const inputRef = useRef(null);

  // Carregar salas e usuários ao abrir
  useEffect(() => {
    if (isOpen) {
      chatAPI.getRooms().then(r => dispatch(setRooms(r.data))).catch(() => {});
      chatAPI.getUsers().then(r => dispatch(setUsers(r.data))).catch(() => {});
    }
  }, [isOpen, dispatch]);

  // Carregar mensagens ao entrar numa sala
  useEffect(() => {
    if (activeRoom) {
      chatAPI.getMessages(activeRoom.id)
        .then(r => {
          dispatch(setMessages(r.data));
          dispatch(markRoomRead(activeRoom.id));
        })
        .catch(() => {});
      joinRoom(activeRoom.id);
      setView('chat');
      // Focar no input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeRoom, dispatch]);

  // Rolar para o fim quando chegam mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Marcar como lido quando estamos na sala
    if (activeRoom && messages.length > 0) {
      dispatch(markRoomRead(activeRoom.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Listeners de socket para typing e mensagens
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTyping = ({ user_name, room_id }) => {
      if (activeRoom && room_id === activeRoom.id) setTyping(user_name);
    };
    const handleStopTyping = ({ room_id }) => {
      if (!activeRoom || room_id === activeRoom.id) setTyping(null);
    };

    // Notificação de nova mensagem em sala não ativa
    const handleChatNotification = (data) => {
      if (data && data.room_id) {
        dispatch(addMessage({
          id: `notif_${Date.now()}`,
          room_id: data.room_id,
          message: data.message || '',
          sender_name: data.sender_name || '',
          sender_id: -1,
          created_at: new Date().toISOString(),
        }));
        // Toast somente se o drawer está fechado ou a sala ativa é diferente
        const notInRoom = !activeRoom || activeRoom.id !== data.room_id;
        if (!isOpen || notInRoom) {
          toast(`💬 ${data.sender_name || 'Alguém'}: ${(data.message || '').slice(0, 60)}`, {
            duration: 4000,
            style: { background: '#1565C0', color: '#fff', fontSize: 13 },
          });
        }
      } else {
        chatAPI.getRooms().then(r => dispatch(setRooms(r.data))).catch(() => {});
      }
    };

    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('chat_notification', handleChatNotification);

    return () => {
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('chat_notification', handleChatNotification);
    };
  }, [activeRoom, dispatch, isOpen]);

  const handleSend = () => {
    if (!messageText.trim() || !activeRoom) return;
    sendMessage(activeRoom.id, messageText.trim());
    setMessageText('');
    sendStopTyping(activeRoom.id);
    inputRef.current?.focus();
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

  const handleBackToRooms = () => {
    if (activeRoom) leaveRoom(activeRoom.id);
    setView('rooms');
    dispatch(setActiveRoom(null));
    dispatch(setMessages([]));
    // Recarregar salas para atualizar contadores
    chatAPI.getRooms().then(r => dispatch(setRooms(r.data))).catch(() => {});
  };

  const handleOpenRoom = (room) => {
    dispatch(setActiveRoom(room));
  };

  const roomName = useCallback((room) => {
    if (room.name) return room.name;
    const other = room.other_members?.[0];
    return other?.name || 'Conversa';
  }, []);

  const roomAvatar = (room) => {
    const name = roomName(room);
    return name?.charAt(0)?.toUpperCase() || '?';
  };

  const formatTime = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    if (isToday(d)) return format(d, 'HH:mm');
    return format(d, 'dd/MM', { locale: ptBR });
  };

  const isOnline = (room) => {
    if (room.type !== 'direct') return false;
    return room.other_members?.[0]?.is_online || false;
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={() => {
        if (activeRoom) leaveRoom(activeRoom.id);
        dispatch(setChatOpen(false));
      }}
      sx={{ '& .MuiDrawer-paper': { width: 380, display: 'flex', flexDirection: 'column' } }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', p: 1.5, pl: 2,
        borderBottom: '1px solid', borderColor: 'divider',
        background: 'linear-gradient(135deg, #0d2137 0%, #1a3a5c 100%)',
        minHeight: 56,
      }}>
        {view !== 'rooms' && (
          <IconButton size="small" onClick={handleBackToRooms} sx={{ color: 'white', mr: 1 }}>
            <ArrowBack fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          {view === 'rooms' && (
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'white' }}>
              💬 Chat Interno
            </Typography>
          )}
          {view === 'users' && (
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'white' }}>
              👥 Nova conversa
            </Typography>
          )}
          {view === 'chat' && activeRoom && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={isOnline(activeRoom) ? (
                  <Circle sx={{ fontSize: 10, color: '#4CAF50' }} />
                ) : null}
              >
                <Avatar sx={{ width: 30, height: 30, bgcolor: '#1565C0', fontSize: 12 }}>
                  {roomAvatar(activeRoom)}
                </Avatar>
              </Badge>
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: 'white', lineHeight: 1.2 }}>
                  {roomName(activeRoom)}
                </Typography>
                {isOnline(activeRoom) && (
                  <Typography variant="caption" sx={{ color: '#4CAF50', lineHeight: 1 }}>
                    online
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {view === 'rooms' && (
          <Tooltip title="Nova conversa">
            <IconButton size="small" onClick={() => setView('users')} sx={{ color: 'rgba(255,255,255,0.8)', mr: 0.5 }}>
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <IconButton size="small" onClick={() => {
          if (activeRoom) leaveRoom(activeRoom.id);
          dispatch(setChatOpen(false));
        }} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* ── Lista de salas ────────────────────────────────── */}
      {view === 'rooms' && (
        <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
          {rooms.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', px: 3 }}>
              <Typography variant="body2" gutterBottom>Nenhuma conversa ainda</Typography>
              <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => setView('users')}>
                + Iniciar conversa
              </Button>
            </Box>
          )}
          {rooms.map(room => {
            const unread = parseInt(room.unread_count) || 0;
            return (
              <React.Fragment key={room.id}>
                <ListItem
                  onClick={() => handleOpenRoom(room)}
                  sx={{
                    py: 1.5, px: 2, cursor: 'pointer',
                    bgcolor: unread > 0 ? 'rgba(21,101,192,0.05)' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background 0.15s',
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 48 }}>
                    <Badge badgeContent={unread > 0 ? unread : null} color="error" max={99}>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={isOnline(room) ? (
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4CAF50', border: '2px solid white' }} />
                        ) : null}
                      >
                        <Avatar sx={{ width: 40, height: 40, bgcolor: '#1565C0', fontSize: 15 }}>
                          {roomAvatar(room)}
                        </Avatar>
                      </Badge>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={unread > 0 ? 700 : 500}
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {roomName(room)}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary"
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {room.last_message || 'Nenhuma mensagem'}
                      </Typography>
                    }
                    sx={{ overflow: 'hidden', mr: 1 }}
                  />
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    {room.last_message_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {formatTime(room.last_message_at)}
                      </Typography>
                    )}
                    {room.type === 'group' && (
                      <Chip label="grupo" size="small" sx={{ height: 16, fontSize: 9, mt: 0.3 }} />
                    )}
                  </Box>
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            );
          })}
        </List>
      )}

      {/* ── Lista de usuários para nova conversa ─────────── */}
      {view === 'users' && (
        <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
          {users.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <Typography variant="body2">Nenhum usuário disponível</Typography>
            </Box>
          )}
          {users.map(u => (
            <React.Fragment key={u.id}>
              <ListItem onClick={() => openDirectChat(u)} sx={{ cursor: 'pointer', py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
                <ListItemAvatar sx={{ minWidth: 48 }}>
                  <Badge
                    overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: u.is_online ? '#4CAF50' : '#bdbdbd', border: '2px solid white' }} />
                    }
                  >
                    <Avatar sx={{ width: 40, height: 40, bgcolor: '#1565C0', fontSize: 15 }}>
                      {u.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={500}>{u.name}</Typography>}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                      <Chip label={u.role} size="small" sx={{ height: 16, fontSize: 9 }} />
                      {u.is_online && <Chip label="online" size="small" color="success" sx={{ height: 16, fontSize: 9 }} />}
                    </Box>
                  }
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* ── Janela de chat ───────────────────────────────── */}
      {view === 'chat' && (
        <>
          <Box sx={{
            flexGrow: 1, overflowY: 'auto', p: 1.5,
            display: 'flex', flexDirection: 'column', gap: 0.5,
            bgcolor: 'background.default',
          }}>
            {messages.length === 0 && (
              <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                <Typography variant="body2">Nenhuma mensagem ainda</Typography>
                <Typography variant="caption">Seja o primeiro a escrever! 👋</Typography>
              </Box>
            )}
            {messages.map((msg, idx) => {
              const isMe = msg.sender_id === user?.id;
              const prevMsg = messages[idx - 1];
              const showName = !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
              const showTime = !messages[idx + 1] || messages[idx + 1]?.sender_id !== msg.sender_id;

              return (
                <Box key={msg.id} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', mb: showTime ? 0.8 : 0 }}>
                  {!isMe && showName && (
                    <Avatar sx={{ width: 26, height: 26, fontSize: 11, mr: 0.8, mt: 0.3, bgcolor: '#1565C0', alignSelf: 'flex-start' }}>
                      {msg.sender_name?.charAt(0)}
                    </Avatar>
                  )}
                  {!isMe && !showName && <Box sx={{ width: 26, mr: 0.8, flexShrink: 0 }} />}

                  <Box sx={{ maxWidth: '78%' }}>
                    {!isMe && showName && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5, display: 'block', mb: 0.2 }}>
                        {msg.sender_name}
                      </Typography>
                    )}
                    <Paper
                      elevation={0}
                      sx={{
                        p: '7px 12px',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        bgcolor: isMe ? '#1565C0' : 'background.paper',
                        border: isMe ? 'none' : '1px solid',
                        borderColor: 'divider',
                        wordBreak: 'break-word',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: isMe ? 'white' : 'text.primary', lineHeight: 1.5 }}>
                        {msg.message}
                      </Typography>
                    </Paper>
                    {showTime && (
                      <Typography variant="caption" sx={{
                        color: 'text.disabled', display: 'block',
                        textAlign: isMe ? 'right' : 'left', mt: 0.2, px: 0.5, fontSize: 10
                      }}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
            {typing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1 }}>
                <Avatar sx={{ width: 20, height: 20, fontSize: 9, bgcolor: '#1565C0' }}>
                  {typing?.charAt(0)}
                </Avatar>
                <Paper sx={{ p: '5px 10px', borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <Box key={i} sx={{
                        width: 5, height: 5, borderRadius: '50%', bgcolor: 'text.disabled',
                        animation: 'bounce 1.2s infinite',
                        animationDelay: `${i * 0.2}s`,
                        '@keyframes bounce': {
                          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
                          '40%': { transform: 'scale(1)', opacity: 1 },
                        }
                      }} />
                    ))}
                  </Box>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                inputRef={inputRef}
                fullWidth size="small"
                placeholder="Digite uma mensagem... (Enter para enviar)"
                value={messageText}
                onChange={e => handleTypingInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                multiline maxRows={4}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: 14 }
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!messageText.trim()}
                sx={{
                  bgcolor: messageText.trim() ? 'primary.main' : 'action.disabledBackground',
                  color: messageText.trim() ? 'white' : 'action.disabled',
                  width: 38, height: 38,
                  '&:hover': { bgcolor: messageText.trim() ? 'primary.dark' : 'action.disabledBackground' },
                  flexShrink: 0,
                }}
              >
                <Send fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </>
      )}
    </Drawer>
  );
};

export default ChatDrawer;
