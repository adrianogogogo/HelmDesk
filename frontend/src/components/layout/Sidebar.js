import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Divider, Tooltip, Typography, Avatar, Chip
} from '@mui/material';
import {
  Dashboard, ConfirmationNumber, Assignment, Inventory2,
  People, BarChart, Settings, Search, SportsScore,
  Store, Group, ChevronLeft, ChevronRight
} from '@mui/icons-material';
import { toggleSidebar } from '../../store/slices/uiSlice';

const menuItems = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard', roles: ['atendente','gestor','diretor','loja','cliente'] },
  { label: 'Tickets', icon: <ConfirmationNumber />, path: '/tickets', roles: ['atendente','gestor','diretor','loja','cliente'] },
  { label: 'Tarefas', icon: <Assignment />, path: '/tarefas', roles: ['atendente','gestor','diretor'] },
  { label: 'Busca', icon: <Search />, path: '/busca', roles: ['atendente','gestor','diretor','loja','cliente'] },
  { divider: true },
  { label: 'Produtos', icon: <Inventory2 />, path: '/produtos', roles: ['atendente','gestor','diretor'] },
  { label: 'Clientes', icon: <People />, path: '/clientes', roles: ['atendente','gestor','diretor'] },
  { label: 'Lojas', icon: <Store />, path: '/lojas', roles: ['gestor','diretor'] },
  { label: 'Usuários', icon: <Group />, path: '/usuarios', roles: ['gestor','diretor'] },
  { divider: true },
  { label: 'Futebol da Relm', icon: <SportsScore />, path: '/futebol', roles: ['atendente','gestor','diretor'] },
  { label: 'Relatórios', icon: <BarChart />, path: '/relatorios', roles: ['gestor','diretor'] },
  { label: 'Configurações', icon: <Settings />, path: '/configuracoes', roles: ['gestor','diretor'] },
];

const Sidebar = ({ width }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector(s => s.ui);
  const { user } = useSelector(s => s.auth);

  const roleName = {
    cliente: 'Cliente', loja: 'Loja', atendente: 'Atendente',
    gestor: 'Gestor', diretor: 'Diretor'
  };

  const filteredMenu = menuItems.filter(item =>
    item.divider || !item.roles || item.roles.includes(user?.role)
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: sidebarOpen ? width : 70,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: sidebarOpen ? width : 70,
          transition: 'width 0.25s ease',
          overflowX: 'hidden',
          background: 'linear-gradient(180deg, #0d2137 0%, #1a3a5c 100%)',
          color: 'white',
          borderRight: 'none',
          boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 1200,
        },
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 72 }}>
        {sidebarOpen ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/logo-white.png" alt="RelmDesk" style={{ height: 36, objectFit: 'contain' }} 
              onError={(e) => { e.target.style.display='none'; }}
            />
          </Box>
        ) : (
          <img src="/favicon.png" alt="R" style={{ height: 32, width: 32, objectFit: 'contain' }} />
        )}
        <Box
          onClick={() => dispatch(toggleSidebar())}
          sx={{ cursor: 'pointer', color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}
        >
          {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* User info */}
      {sidebarOpen && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#1565C0', fontSize: 14 }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </Typography>
              <Chip
                label={roleName[user?.role] || user?.role}
                size="small"
                sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(255,255,255,0.15)', color: 'white', '& .MuiChip-label': { px: 1 } }}
              />
            </Box>
          </Box>
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1 }} />

      {/* Menu */}
      <List sx={{ px: 1, flexGrow: 1 }}>
        {filteredMenu.map((item, idx) => {
          if (item.divider) return <Divider key={idx} sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />;

          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

          return (
            <Tooltip key={item.path} title={!sidebarOpen ? item.label : ''} placement="right">
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    minHeight: 44,
                    px: sidebarOpen ? 1.5 : 1,
                    justifyContent: sidebarOpen ? 'initial' : 'center',
                    bgcolor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    '& .MuiListItemIcon-root': {
                      color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                      minWidth: sidebarOpen ? 40 : 'unset',
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  {sidebarOpen && (
                    <ListItemText
                      primary={item.label}
                      sx={{
                        '& .MuiTypography-root': {
                          fontSize: 14, fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'white' : 'rgba(255,255,255,0.75)',
                          whiteSpace: 'nowrap',
                        }
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </Tooltip>
          );
        })}
      </List>

      {/* Bottom: Dept indicator */}
      {sidebarOpen && (
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4CAF50' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Bikes — v1
            </Typography>
          </Box>
        </Box>
      )}
    </Drawer>
  );
};

export default Sidebar;
