import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar, Toolbar, IconButton, Badge, Box, Typography, Avatar,
  Menu, MenuItem, Divider, Tooltip, InputBase, Paper
} from '@mui/material';
import {
  Notifications, Chat, Brightness4, Brightness7, Search,
  Logout, Person, Lock
} from '@mui/icons-material';
import { logout } from '../../store/slices/authSlice';
import { toggleDarkMode, setSearchOpen } from '../../store/slices/uiSlice';
import { setChatOpen } from '../../store/slices/chatSlice';
import SearchBar from '../search/SearchBar';

const TopBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { darkMode } = useSelector(s => s.ui);
  const { unread } = useSelector(s => s.notifications);
  const internalRoles = ['atendente', 'gestor', 'diretor'];

  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
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

        {/* Chat (internal only) */}
        {internalRoles.includes(user?.role) && (
          <Tooltip title="Chat interno">
            <IconButton size="small" onClick={() => dispatch(setChatOpen(true))}>
              <Chat />
            </IconButton>
          </Tooltip>
        )}

        {/* Notifications */}
        <Tooltip title="Notificações">
          <IconButton size="small" onClick={() => navigate('/dashboard')}>
            <Badge badgeContent={unread} color="error" max={99}>
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

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2">{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/configuracoes'); }}>
            <Person fontSize="small" sx={{ mr: 1 }} /> Perfil
          </MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); }}>
            <Lock fontSize="small" sx={{ mr: 1 }} /> Alterar senha
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <Logout fontSize="small" sx={{ mr: 1 }} /> Sair
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
