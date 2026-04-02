import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
      <Typography variant="h1" sx={{ fontSize: 80 }}>🚴</Typography>
      <Typography variant="h4" fontWeight={700}>404 — Página não encontrada</Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
    </Box>
  );
};
export default NotFoundPage;
