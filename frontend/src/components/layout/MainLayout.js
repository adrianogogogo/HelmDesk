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
  // de padding-left igual à largura atual da sidebar para não ficar embaixo dela
  const sidebarWidth = sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Sidebar: position fixed, fora do fluxo normal do DOM */}
      <Sidebar />

      {/* Conteúdo principal: deslocado via paddingLeft (não margin) */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pl: `${sidebarWidth}px`,       // empurra para direita da sidebar
          transition: 'padding-left 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
          boxSizing: 'border-box',
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
