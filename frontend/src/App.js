import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from './theme';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import NewTicketPage from './pages/NewTicketPage';
import TasksKanbanPage from './pages/TasksKanbanPage';
import ProductsPage from './pages/ProductsPage';
import ClientsPage from './pages/ClientsPage';
import ReportsPage from './pages/ReportsPage';
import ConfigPage from './pages/ConfigPage';
import SearchPage from './pages/SearchPage';
import GamificationPage from './pages/GamificationPage';
import ChatPage from './pages/ChatPage';
import OpenTicketPage from './pages/OpenTicketPage';
import TrackTicketPage from './pages/TrackTicketPage';
import UsersPage from './pages/UsersPage';
import StoresPage from './pages/StoresPage';
import NotFoundPage from './pages/NotFoundPage';
import QuadroVisualPage from './pages/QuadroVisualPage';

// Protected route
const ProtectedRoute = ({ children, allowedRoles, redirectTo = '/dashboard' }) => {
  const { isAuthenticated, user } = useSelector(s => s.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
};

// Home sensível ao perfil: internos vão para o Dashboard; loja/cliente para Tickets
const RoleHome = () => {
  const { user } = useSelector(s => s.auth);
  const internal = ['atendente', 'gestor', 'diretor'].includes(user?.role);
  return <Navigate to={internal ? '/dashboard' : '/tickets'} replace />;
};

function App() {
  const { darkMode } = useSelector(s => s.ui);
  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
        <Route path="/abrir-ticket" element={<OpenTicketPage />} />
        <Route path="/acompanhar/:token" element={<TrackTicketPage />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<RoleHome />} />
          <Route path="dashboard" element={
            <ProtectedRoute allowedRoles={['atendente','gestor','diretor']} redirectTo="/tickets">
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/novo" element={<NewTicketPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="tarefas" element={<TasksKanbanPage />} />
          <Route path="chat" element={<ProtectedRoute allowedRoles={['atendente','gestor','diretor']}><ChatPage /></ProtectedRoute>} />
          <Route path="produtos" element={<ProductsPage />} />
          <Route path="clientes" element={<ProtectedRoute allowedRoles={['atendente','gestor','diretor']} redirectTo="/tickets"><ClientsPage /></ProtectedRoute>} />
          <Route path="lojas" element={<ProtectedRoute allowedRoles={['gestor','diretor']}><StoresPage /></ProtectedRoute>} />
          <Route path="usuarios" element={<ProtectedRoute allowedRoles={['gestor','diretor']}><UsersPage /></ProtectedRoute>} />
          <Route path="relatorios" element={<ProtectedRoute allowedRoles={['gestor','diretor']}><ReportsPage /></ProtectedRoute>} />
          <Route path="configuracoes" element={<ProtectedRoute allowedRoles={['gestor','diretor']}><ConfigPage /></ProtectedRoute>} />
          <Route path="busca" element={<SearchPage />} />
          <Route path="futebol" element={<GamificationPage />} />
          <Route path="quadro" element={<ProtectedRoute allowedRoles={['atendente','gestor','diretor']}><QuadroVisualPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
