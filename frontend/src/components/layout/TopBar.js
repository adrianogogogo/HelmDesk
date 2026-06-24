import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar, Toolbar, IconButton, Badge, Box, Typography, Avatar,
  Menu, MenuItem, Divider, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, List,
  ListItem, ListItemText, Chip, CircularProgress
} from '@mui/material';
import {
  Notifications, Chat, Brightness4, Brightness7,
  Logout, Person, Lock, CheckCircle, ConfirmationNumber
} from '@mui/icons-material';
import { logout } from '../../store/slices/authSlice';
import { toggleDarkMode } from '../../store/slices/uiSlice';
import { setChatOpen } from '../../store/slices/chatSlice';
import { setNotifications, markAllRead } from '../../store/slices/notificationSlice';
import { authAPI, notificationAPI } from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import SearchBar from '../search/SearchBar';

// -------------------------------------------------------
// Dialog: Alterar Senha
// -------------------------------------------------------
const ChangePasswordDialog = ({ open, onClose }) => {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setForm({ current_password: '', new_password: '', confirm_password: '' });
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.current_password || !form.new_password) {
      setError('Preencha todos os campos');
      return;
    }
    if (form.new_password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword({ current_password: form.current_password, new_password: form.new_password });
      toast.success('Senha alterada com sucesso!');
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>🔒 Alterar Senha</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && (
            <Typography variant="body2" color="error" sx={{ bgcolor: 'error.main', color: 'white', p: 1, borderRadius: 1 }}>
              {error}
            </Typography>
          )}
          <TextField
            fullWidth size="small" type="password"
            label="Senha atual"
            value={form.current_password}
            onChange={e => setForm(p => ({ ...p, current_password: e.target.value }))}
            autoComplete="current-password"
          />
          <TextField
            fullWidth size="small" type="password"
            label="Nova senha (mín. 6 caracteres)"
            value={form.new_password}
            onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
            autoComplete="new-password"
          />
          <TextField
            fullWidth size="small" type="password"
            label="Confirmar nova senha"
            value={form.confirm_password}
            onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
            autoComplete="new-password"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={18} /> : 'Alterar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// -------------------------------------------------------
// TopBar principal
// -------------------------------------------------------
const TopBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { darkMode } = useSelector(s => s.ui);
  const { list: notifList, unread } = useSelector(s => s.notifications);
  const { unreadTotal: chatUnread } = useSelector(s => s.chat);
  const internalRoles = ['atendente', 'gestor', 'diretor', 'superadmin'];

  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [changePassOpen, setChangePassOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleNotifOpen = async (e) => {
    setNotifAnchor(e.currentTarget);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.readAll();
      dispatch(markAllRead());
    } catch {
      toast.error('Erro ao marcar notificações como lidas');
    }
  };

  const handleNotifClick = async (notif) => {
    // Marcar como lida individualmente
    if (!notif.is_read) {
      try {
        await notificationAPI.read(notif.id);
        // Atualiza lista local
        const updated = notifList.map(n => n.id === notif.id ? { ...n, is_read: true } : n);
        dispatch(setNotifications(updated));
      } catch { /* silencioso */ }
    }
    setNotifAnchor(null);
    // Navegar para o ticket relacionado, se houver
    if (notif.related_ticket_id) {
      navigate(`/tickets/${notif.related_ticket_id}`);
    }
  };

  const recentNotifs = notifList.slice(0, 8);

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Box sx={{ flexGrow: 1, maxWidth: 480 }}>
            <SearchBar />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Dark mode */}
          <Tooltip title={darkMode ? 'Modo claro' : 'Modo escuro'}>
            <IconButton onClick={() => dispatch(toggleDarkMode())} size="small">
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          {/* Chat (interno only) */}
          {internalRoles.includes(user?.role) && (
            <Tooltip title="Chat interno">
              <IconButton size="small" onClick={() => dispatch(setChatOpen(true))}>
                <Badge badgeContent={chatUnread > 0 ? chatUnread : null} color="error" max={99}>
                  <Chat />
                </Badge>
              </IconButton>
            </Tooltip>
          )}

          {/* Notificações */}
          <Tooltip title="Notificações">
            <IconButton size="small" onClick={handleNotifOpen}>
              <Badge badgeContent={unread || null} color="error" max={99}>
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User menu */}
          <Tooltip title={user?.name}>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#1565C0', fontSize: 13 }}>
                {user?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>

          {/* Menu do usuário */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ sx: { minWidth: 220 } }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2">{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={user?.role}
                  size="small"
                  sx={{ fontSize: 10, height: 18, textTransform: 'capitalize' }}
                />
              </Box>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/dashboard'); }}>
              <Person fontSize="small" sx={{ mr: 1 }} /> Meu Perfil
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); setChangePassOpen(true); }}>
              <Lock fontSize="small" sx={{ mr: 1 }} /> Alterar Senha
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <Logout fontSize="small" sx={{ mr: 1 }} /> Sair
            </MenuItem>
          </Menu>

          {/* Dropdown de notificações */}
          <Menu
            anchorEl={notifAnchor}
            open={Boolean(notifAnchor)}
            onClose={() => setNotifAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ sx: { width: 360, maxHeight: 480 } }}
          >
            <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={700}>
                🔔 Notificações {unread > 0 && `(${unread} novas)`}
              </Typography>
              {unread > 0 && (
                <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: 11 }}>
                  Marcar todas como lidas
                </Button>
              )}
            </Box>
            <Divider />
            {recentNotifs.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CheckCircle sx={{ color: 'text.disabled', fontSize: 32, mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Nenhuma notificação
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {recentNotifs.map(n => (
                  <React.Fragment key={n.id}>
                    <ListItem
                      onClick={() => handleNotifClick(n)}
                      sx={{
                        py: 1.5, px: 2, cursor: 'pointer',
                        bgcolor: n.is_read ? 'transparent' : 'rgba(21,101,192,0.05)',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Box sx={{ mr: 1.5, flexShrink: 0 }}>
                        <ConfirmationNumber sx={{ color: n.is_read ? 'text.disabled' : 'primary.main', fontSize: 20 }} />
                      </Box>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={n.is_read ? 400 : 700} sx={{ lineHeight: 1.3 }}>
                            {n.message}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(n.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </Typography>
                        }
                      />
                      {!n.is_read && (
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0, ml: 1 }} />
                      )}
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
            {notifList.length > 8 && (
              <Box sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Mostrando as 8 mais recentes
                </Typography>
              </Box>
            )}
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Dialog: Alterar Senha */}
      <ChangePasswordDialog open={changePassOpen} onClose={() => setChangePassOpen(false)} />
    </>
  );
};

export default TopBar;
