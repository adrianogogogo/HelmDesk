import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, Chip, Divider, InputAdornment,
  IconButton, FormControlLabel, Checkbox
} from '@mui/material';
import { Visibility, VisibilityOff, LockClock } from '@mui/icons-material';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const DEPT_ICONS = {
  bikes: '🚴', wireless: '📡', componentes: '🔧', audio: '🎵', monitoramento: '📊'
};

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { sessionExpiredAt } = useSelector(s => s.auth);

  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    () => !!localStorage.getItem('relmdesk_remember')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authAPI.getDepartments().then(r => {
      setDepartments(r.data);
      const active = r.data.find(d => d.is_v1);
      if (active) setSelectedDept(active);
    }).catch(() => {});
  }, []);

  // Persistir preferência de remember-me
  useEffect(() => {
    if (rememberMe) {
      localStorage.setItem('relmdesk_remember', '1');
    } else {
      localStorage.removeItem('relmdesk_remember');
    }
  }, [rememberMe]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedDept?.is_active) {
      setError('Departamento não disponível');
      return;
    }
    setLoading(true);
    setError('');
    dispatch(loginStart());
    try {
      const { data } = await authAPI.login({
        email,
        password,
        department_id: selectedDept?.id,
        remember_me: rememberMe,
      });
      dispatch(loginSuccess({ ...data, rememberMe }));
      toast.success(`Bem-vindo(a), ${data.user.name}! 👋`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao fazer login';
      setError(msg);
      dispatch(loginFailure(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 480, px: 2 }}>
      {/* Logo */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <img
          src="/logo-color.png"
          alt="RelmDesk"
          style={{ maxWidth: 280, width: '100%' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }}>
          Sistema de Helpdesk
        </Typography>
      </Box>

      {/* Department selector */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
        {departments.map(dept => (
          <Chip
            key={dept.id}
            label={`${DEPT_ICONS[dept.slug] || '📦'} ${dept.name}`}
            onClick={() => dept.is_active && setSelectedDept(dept)}
            sx={{
              fontWeight: 600,
              cursor: dept.is_active ? 'pointer' : 'not-allowed',
              bgcolor: selectedDept?.id === dept.id
                ? 'rgba(255,255,255,0.25)'
                : dept.is_active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
              color: dept.is_active ? 'white' : 'rgba(255,255,255,0.35)',
              border: selectedDept?.id === dept.id ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
              '& .MuiChip-label': { px: 2 },
              transition: 'all 0.2s',
              ':hover': dept.is_active ? { bgcolor: 'rgba(255,255,255,0.2)' } : {},
            }}
          />
        ))}
      </Box>

      {/* Aviso de sessão expirada */}
      {sessionExpiredAt && (
        <Alert
          severity="warning"
          icon={<LockClock />}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          Sua sessão expirou por inatividade. Por segurança, faça login novamente.
        </Alert>
      )}

      {/* Login card */}
      <Card elevation={0} sx={{ borderRadius: 3, overflow: 'visible', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Entrar no sistema
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedDept
              ? `Departamento: ${selectedDept.name}`
              : 'Selecione um departamento acima'}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth label="E-mail" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              required sx={{ mb: 2 }} size="small"
              autoComplete="email" autoFocus
            />
            <TextField
              fullWidth label="Senha" value={password}
              onChange={e => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              required sx={{ mb: 1.5 }} size="small"
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {/* Checkbox: Manter este browser conectado */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Manter este browser conectado
                </Typography>
              }
              sx={{ mb: 2, ml: 0.5 }}
            />

            <Button
              fullWidth type="submit" variant="contained" size="large"
              disabled={loading || !selectedDept?.is_active}
              sx={{ mb: 2, py: 1.5, fontSize: 15, fontWeight: 700, borderRadius: 2 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Entrar'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Cliente com problema?{' '}
              <Typography
                component="a"
                href="/abrir-ticket"
                variant="body2"
                sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
              >
                Abrir ticket sem login →
              </Typography>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'rgba(255,255,255,0.4)' }}>
        RelmDesk v1 © {new Date().getFullYear()} Relm — Divisão Bikes
      </Typography>
    </Box>
  );
};

export default LoginPage;
