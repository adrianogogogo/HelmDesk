import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box, Typography, List, ListItem, ListItemAvatar, ListItemText,
  Avatar, Divider, TextField, IconButton, Badge, Chip, Paper, Button,
  InputAdornment, Tooltip
} from '@mui/material';
import { Send, Add, Circle, Search, ArrowBack } from '@mui/icons-material';
import {
  setRooms, setActiveRoom, setMessages, setUsers, markRoomRead, setIsChatPage, addMessage
} from '../store/slices/chatSlice';
import { chatAPI } from '../services/api';
import { joinRoom, leaveRoom, sendMessage, sendTyping, sendStopTyping, getSocket } from '../services/socket';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const ChatPage = () => {
  const dispatch = useDispatch();
  const { rooms, activeRoom, messages, users } = useSelector(s => s.chat);
  const { user } = useSelector(s => s.auth);

  const [view, setView] = useState('rooms'); // 'rooms' | 'users'
  const [messageText, setMessageText] = useState('');
  const [typing, setTyping] = useState(null);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);
  const inputRef = useRef(null);

  // Sinalizar que estamos na ChatPage (para contagem de não lidos)
  useEffect(() => {
    dispatch(setIsChatPage(true));
    return () => dispatch(setIsChatPage(false));
  }, [dispatch]);

  // Carregar dados iniciais
  useEffect(() => {
    chatAPI.getRooms().then(r => dispatch(setRooms(r.data))).catch(() => {});
    chatAPI.getUsers().then(r => dispatch(setUsers(r.data))).catch(() => {});
  }, [dispatch]);

  // Carregar mensagens ao selecionar sala
  useEffect(() => {
    if (activeRoom) {
      chatAPI.getMessages(activeRoom.id)
        .then(r => {
          dispatch(setMessages(r.data));
          dispatch(markRoomRead(activeRoom.id));
        })
        .catch(() => {});
      joinRoom(activeRoom.id);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      if (activeRoom) leaveRoom(activeRoom.id);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.id]);

  // Rolar para o fim
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (activeRoom && messages.length > 0) dispatch(markRoomRead(activeRoom.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTyping = ({ user_name, room_id }) => {
      if (activeRoom && room_id === activeRoom.id) setTyping(user_name);
    };
    const handleStopTyping = ({ room_id }) => {
      if (!activeRoom || room_id === activeRoom.id) setTyping(null);
    };

    // Notificação de nova mensagem em outra sala
    const handleChatNotification = (data) => {
      if (data && data.room_id) {
        // Atualizar contadores via addMessage
        dispatch(addMessage({
          id: `notif_${Date.now()}`,
          room_id: data.room_id,
          message: data.message || '',
          sender_name: data.sender_name || '',
          sender_id: -1,
          created_at: new Date().toISOString(),
        }));
        // Toast somente se a mensagem não é da sala ativa
        if (!activeRoom || activeRoom.id !== data.room_id) {
          toast(`💬 ${data.sender_name || 'Alguém'}: ${(data.message || '').slice(0, 60)}`, {
            duration: 4000,
            icon: '💬',
            style: {
              background: '#1565C0',
              color: '#fff',
              fontSize: 13,
            },
          });
        }
      } else {
        chatAPI.getRooms().then(r => dispatch(setRooms(r.data))).catch(() => {});
      }
    };

    // Nova mensagem na sala ativa
    const handleNewMessage = (msg) => {
      dispatch(addMessage(msg));
    };

    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('chat_notification', handleChatNotification);
    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('chat_notification', handleChatNotification);
      socket.off('new_message', handleNewMessage);
    };
  }, [activeRoom, dispatch]);

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
      room.other_members = [{
        id: targetUser.id, name: targetUser.name,
        role: targetUser.role, is_online: targetUser.is_online
      }];
      dispatch(setActiveRoom(room));
      setView('rooms');
    } catch {}
  };

  const roomName = useCallback((room) => {
    if (room?.name) return room.name;
    return room?.other_members?.[0]?.name || 'Conversa';
  }, []);

  const isOnline = (room) => room?.type === 'direct' && (room?.other_members?.[0]?.is_online || false);

  const formatMsgTime = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Ontem ' + format(d, 'HH:mm');
    return format(d, 'dd/MM HH:mm', { locale: ptBR });
  };

  const formatListTime = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    if (isToday(d)) return format(d, 'HH:mm');
    return format(d, 'dd/MM', { locale: ptBR });
  };

  const filteredRooms = rooms.filter(r =>
    !search || roomName(r).toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)', minHeight: 500, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>

      {/* ── Painel esquerdo: lista de salas / usuários ────── */}
      <Box sx={{
        width: { xs: activeRoom ? 0 : '100%', md: 320 },
        flexShrink: 0,
        display: { xs: activeRoom ? 'none' : 'flex', md: 'flex' },
        flexDirection: 'column',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}>
        {/* Header lateral */}
        <Box sx={{
          p: 2, pb: 1,
          background: 'linear-gradient(135deg, #0d2137 0%, #1a3a5c 100%)',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'white' }}>
              💬 Chat Interno
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={view === 'rooms' ? 'Nova conversa' : 'Voltar às conversas'}>
                <IconButton size="small" onClick={() => setView(v => v === 'rooms' ? 'users' : 'rooms')}
                  sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {view === 'rooms' ? <Add fontSize="small" /> : <ArrowBack fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <TextField
            size="small" fullWidth
            placeholder={view === 'rooms' ? 'Buscar conversas...' : 'Buscar usuários...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }} /></InputAdornment>,
              sx: {
                bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, color: 'white', fontSize: 13,
                '& input::placeholder': { color: 'rgba(255,255,255,0.5)' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.6)' },
              }
            }}
            inputProps={{ sx: { color: 'white' } }}
          />
        </Box>

        {/* Lista de salas */}
        {view === 'rooms' && (
          <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
            {filteredRooms.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary', px: 2 }}>
                <Typography variant="body2" gutterBottom>Nenhuma conversa</Typography>
                <Button size="small" variant="outlined" onClick={() => setView('users')}>
                  Iniciar conversa
                </Button>
              </Box>
            )}
            {filteredRooms.map(room => {
              const unread = parseInt(room.unread_count) || 0;
              const isActive = activeRoom?.id === room.id;
              return (
                <React.Fragment key={room.id}>
                  <ListItem
                    onClick={() => dispatch(setActiveRoom(room))}
                    sx={{
                      py: 1.5, px: 2, cursor: 'pointer',
                      bgcolor: isActive ? 'primary.main' + '18' : unread > 0 ? 'rgba(21,101,192,0.05)' : 'transparent',
                      borderLeft: isActive ? '3px solid' : '3px solid transparent',
                      borderColor: isActive ? 'primary.main' : 'transparent',
                      '&:hover': { bgcolor: isActive ? 'primary.main' + '25' : 'action.hover' },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 50 }}>
                      <Badge badgeContent={unread > 0 ? unread : null} color="error" max={99}>
                        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={isOnline(room) ? (
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4CAF50', border: '2px solid white' }} />
                          ) : null}>
                          <Avatar sx={{ width: 42, height: 42, bgcolor: isActive ? 'primary.main' : '#1565C0', fontSize: 15 }}>
                            {roomName(room)?.charAt(0)?.toUpperCase()}
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
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontWeight: unread > 0 ? 600 : 400 }}>
                          {room.last_message || 'Nenhuma mensagem'}
                        </Typography>
                      }
                      sx={{ overflow: 'hidden', mr: 1 }}
                    />
                    <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>
                        {formatListTime(room.last_message_at)}
                      </Typography>
                      {room.type === 'group' && (
                        <Chip label="grupo" size="small" sx={{ height: 14, fontSize: 9, mt: 0.3 }} />
                      )}
                    </Box>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              );
            })}
          </List>
        )}

        {/* Lista de usuários */}
        {view === 'users' && (
          <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
            {filteredUsers.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <Typography variant="body2">Nenhum usuário encontrado</Typography>
              </Box>
            )}
            {filteredUsers.map(u => (
              <React.Fragment key={u.id}>
                <ListItem onClick={() => openDirectChat(u)} sx={{ cursor: 'pointer', py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
                  <ListItemAvatar sx={{ minWidth: 50 }}>
                    <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: u.is_online ? '#4CAF50' : '#bdbdbd', border: '2px solid white' }} />}>
                      <Avatar sx={{ width: 42, height: 42, bgcolor: '#1565C0', fontSize: 15 }}>
                        {u.name?.charAt(0)?.toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={500}>{u.name}</Typography>}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3, alignItems: 'center' }}>
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
      </Box>

      {/* ── Painel direito: mensagens ─────────────────────── */}
      <Box sx={{
        flexGrow: 1,
        display: { xs: activeRoom ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}>
        {!activeRoom ? (
          /* Tela inicial sem sala selecionada */
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
            <Typography variant="h6" sx={{ fontSize: 40, mb: 2 }}>💬</Typography>
            <Typography variant="h6" fontWeight={600} gutterBottom>Bem-vindo ao Chat</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: 300 }}>
              Selecione uma conversa à esquerda ou inicie uma nova para sua equipe.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setView('users')}>
              Nova conversa
            </Button>
          </Box>
        ) : (
          <>
            {/* Header da sala ativa */}
            <Box sx={{
              px: 2, py: 1.2,
              background: 'linear-gradient(135deg, #0d2137 0%, #1a3a5c 100%)',
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              {/* botão voltar no mobile */}
              <IconButton size="small" onClick={() => dispatch(setActiveRoom(null))}
                sx={{ color: 'white', display: { md: 'none' } }}>
                <ArrowBack />
              </IconButton>

              <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={isOnline(activeRoom) ? <Circle sx={{ fontSize: 12, color: '#4CAF50' }} /> : null}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: '#1565C0', fontSize: 14 }}>
                  {roomName(activeRoom)?.charAt(0)?.toUpperCase()}
                </Avatar>
              </Badge>
              <Box>
                <Typography variant="body1" fontWeight={700} sx={{ color: 'white', lineHeight: 1.2 }}>
                  {roomName(activeRoom)}
                </Typography>
                <Typography variant="caption" sx={{ color: isOnline(activeRoom) ? '#4CAF50' : 'rgba(255,255,255,0.5)' }}>
                  {isOnline(activeRoom) ? 'online' : activeRoom.type === 'group' ? 'grupo' : 'offline'}
                </Typography>
              </Box>
            </Box>

            {/* Mensagens */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
              {messages.length === 0 && (
                <Box sx={{ textAlign: 'center', mt: 6, color: 'text.secondary' }}>
                  <Typography variant="h5" sx={{ mb: 1 }}>👋</Typography>
                  <Typography variant="body2">Nenhuma mensagem ainda</Typography>
                  <Typography variant="caption">Seja o primeiro a dizer olá!</Typography>
                </Box>
              )}
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id;
                const prevMsg = messages[idx - 1];
                const nextMsg = messages[idx + 1];
                const showAvatar = !isMe && (!nextMsg || nextMsg.sender_id !== msg.sender_id);
                const showName = !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
                const showTime = !nextMsg || nextMsg.sender_id !== msg.sender_id;
                const isFirst = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                return (
                  <Box key={msg.id} sx={{
                    display: 'flex',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    mt: isFirst ? 1 : 0,
                    alignItems: 'flex-end',
                    gap: 0.8,
                  }}>
                    {/* Avatar esquerdo */}
                    {!isMe && (
                      <Box sx={{ width: 32, flexShrink: 0 }}>
                        {showAvatar && (
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: '#1565C0' }}>
                            {msg.sender_name?.charAt(0)}
                          </Avatar>
                        )}
                      </Box>
                    )}

                    <Box sx={{ maxWidth: '72%' }}>
                      {showName && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.3, ml: 0.5 }}>
                          {msg.sender_name}
                        </Typography>
                      )}
                      <Paper elevation={0} sx={{
                        px: 1.5, py: 0.8,
                        borderRadius: isMe
                          ? isFirst ? '16px 4px 16px 16px' : '16px 4px 4px 16px'
                          : isFirst ? '4px 16px 16px 16px' : '4px 16px 16px 4px',
                        bgcolor: isMe ? '#1565C0' : 'background.paper',
                        border: isMe ? 'none' : '1px solid',
                        borderColor: 'divider',
                        wordBreak: 'break-word',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}>
                        <Typography variant="body2" sx={{ color: isMe ? 'white' : 'text.primary', lineHeight: 1.5 }}>
                          {msg.message}
                        </Typography>
                      </Paper>
                      {showTime && (
                        <Typography variant="caption" sx={{
                          color: 'text.disabled', display: 'block',
                          textAlign: isMe ? 'right' : 'left', mt: 0.3, fontSize: 10, px: 0.5
                        }}>
                          {formatMsgTime(msg.created_at)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}

              {/* Indicador de digitação */}
              {typing && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 10, bgcolor: '#1565C0' }}>{typing?.charAt(0)}</Avatar>
                  <Paper sx={{ px: 1.5, py: 1, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <Box key={i} sx={{
                          width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.disabled',
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

            {/* Input de mensagem */}
            <Box sx={{ p: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  inputRef={inputRef}
                  fullWidth size="small"
                  placeholder="Digite uma mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                  value={messageText}
                  onChange={e => handleTypingInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  multiline maxRows={6}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: 14 } }}
                />
                <Tooltip title="Enviar (Enter)">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={handleSend}
                      disabled={!messageText.trim()}
                      sx={{
                        bgcolor: messageText.trim() ? 'primary.main' : undefined,
                        color: messageText.trim() ? 'white' : undefined,
                        width: 42, height: 42,
                        '&:hover': { bgcolor: messageText.trim() ? 'primary.dark' : undefined },
                      }}
                    >
                      <Send fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ChatPage;
