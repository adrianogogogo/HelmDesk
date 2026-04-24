import React, { useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ChatDrawer from '../chat/ChatDrawer';
import { setNotifications } from '../../store/slices/notificationSlice';
import { notificationAPI } from '../../services/api';
import { initSocket } from '../../services/socket';
import { sessionExpired } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

// Deve coincidir com as constantes definidas em Sidebar.js
const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED = 70;

// Tempo de inatividade antes de deslogar (ms)
// 30 minutos para sessão sem remember-me, sem limite para remember-me
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

const MainLayout = () => {
  const { sidebarOpen } = useSelector(s => s.ui);
  const { user, rememberMe } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const inactivityTimer = useRef(null);

  // Reinicia o timer de inatividade
  const resetTimer = useCallback(() => {
    if (rememberMe) return; // sem timeout para "manter conectado"
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      toast.error('Sessão encerrada por inatividade. Faça login novamente.', { duration: 5000 });
      dispatch(sessionExpired());
      navigate('/login');
    }, INACTIVITY_TIMEOUT_MS);
  }, [rememberMe, dispatch, navigate]);

  // Inicializa e monitora eventos de atividade
  useEffect(() => {
    if (rememberMe) return; // sem inatividade para remember-me

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
      clearTimeout(inactivityTimer.current);
    };
  }, [rememberMe, resetTimer]);

  useEffect(() => {
    notificationAPI.list().then(r => dispatch(setNotifications(r.data))).catch(() => {});
    if (user) initSocket(user.id, dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dispatch]);

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
          minWidth: 0,
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
