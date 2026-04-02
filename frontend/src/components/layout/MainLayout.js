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

const MainLayout = () => {
  const { sidebarOpen } = useSelector(s => s.ui);
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    // Load notifications
    notificationAPI.list().then(r => dispatch(setNotifications(r.data))).catch(() => {});
    // Init socket
    if (user) initSocket(user.id, dispatch);
  }, [user, dispatch]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar width={SIDEBAR_WIDTH} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '70px',
          transition: 'margin 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
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
