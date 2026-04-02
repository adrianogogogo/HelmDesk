import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ChatDrawer from '../chat/ChatDrawer';
import { setNotifications } from '../../store/slices/notificationSlice';
import { notificationAPI } from '../../services/api';
import { initSocket } from '../../services/socket';

// Deve coincidir com as constantes definidas em Sidebar.js
const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED = 70;

const MainLayout = () => {
  const { sidebarOpen } = useSelector(s => s.ui);
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    notificationAPI.list().then(r => dispatch(setNotifications(r.data))).catch(() => {});
    if (user) initSocket(user.id, dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dispatch]);

  // Sidebar usa position:fixed — o conteúdo principal precisa
  // de uma margem esquerda igual à largura atual da sidebar para não ficar embaixo dela
  const sidebarWidth = sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Sidebar: position fixed, fora do fluxo normal do DOM */}
      <Sidebar />

      {/* Espaçador invisível que reserva o espaço da sidebar no fluxo flex */}
      <Box
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          transition: 'width 0.25s ease',
        }}
      />

      {/* Conteúdo principal: ocupa o espaço restante após o espaçador */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,           // previne overflow horizontal
          overflow: 'hidden',
        }}
      >
        <TopBar />
        <Box sx={{ flexGrow: 1, p: 3, pt: 2 }}>
          <Outlet />
        </Box>
      </Box>

      <ChatDrawer />
    </Box>
  );
};

export default MainLayout;
