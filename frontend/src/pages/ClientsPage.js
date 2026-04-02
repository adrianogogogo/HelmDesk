import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Table, TableHead, TableRow, TableCell, TableBody, Chip, TextField, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';
import { userAPI } from '../services/api';

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { userAPI.list().then(r => setClients(r.data.filter(u => ['cliente','loja'].includes(u.role)))).catch(() => {}); }, []);

  const filtered = clients.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.cpf?.includes(search));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Clientes e Lojas</Typography>
      </Box>
      <Box sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Buscar por nome, e-mail, telefone, CPF..." value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} sx={{ width: 400 }} />
      </Box>
      <Card>
        <Table size="small">
          <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>E-mail</TableCell><TableCell>Telefone</TableCell><TableCell>CPF</TableCell><TableCell>Tipo</TableCell><TableCell>Tickets</TableCell></TableRow></TableHead>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{c.name}</Typography></TableCell>
                <TableCell>{c.email}</TableCell><TableCell>{c.phone || '—'}</TableCell><TableCell>{c.cpf || '—'}</TableCell>
                <TableCell><Chip label={c.role} size="small" color={c.role === 'loja' ? 'primary' : 'default'} /></TableCell>
                <TableCell><Chip label={c.ticket_count} size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
};
export default ClientsPage;
