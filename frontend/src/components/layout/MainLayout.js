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

  const sidebarWidth = sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar fixa — position fixed, não ocupa espaço no flex */}
      <Sidebar width={SIDEBAR_WIDTH} />

      {/* Conteúdo principal — deslocado pela largura da sidebar */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${sidebarWidth}px)`,
          ml: `${sidebarWidth}px`,
          transition: 'margin 0.25s ease, width 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
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
