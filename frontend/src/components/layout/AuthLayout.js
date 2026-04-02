import React from 'react';
import { Box } from '@mui/material';

const AuthLayout = ({ children }) => (
  <Box
    sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d2137 0%, #1565C0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </Box>
);

export default AuthLayout;
