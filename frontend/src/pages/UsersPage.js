import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Grid, Switch, FormControlLabel } from '@mui/material';
import { Add } from '@mui/icons-material';
import { userAPI, authAPI, storeAPI } from '../services/api';
import toast from 'react-hot-toast';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'atendente', department_id: 1, store_id: '' });

  const load = async () => {
    const [u, s] = await Promise.all([userAPI.list(), storeAPI.list()]);
    setUsers(u.data); setStores(s.data);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      await authAPI.register(form);
      toast.success('Usuário criado!');
      setOpen(false); load();
    } catch {}
  };

  const ROLES = ['cliente', 'loja', 'atendente', 'gestor', 'diretor'];
  const ROLE_COLORS = { cliente: 'default', loja: 'info', atendente: 'primary', gestor: 'warning', diretor: 'error' };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Usuários</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Novo Usuário</Button>
      </Box>
      <Card>
        <Table size="small">
          <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>E-mail</TableCell><TableCell>Perfil</TableCell><TableCell>Departamento</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{u.name}</Typography></TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><Chip label={u.role} size="small" color={ROLE_COLORS[u.role] || 'default'} /></TableCell>
                <TableCell>{u.department_name || '—'}</TableCell>
                <TableCell><Chip label={u.is_active ? 'Ativo' : 'Inativo'} size="small" color={u.is_active ? 'success' : 'default'} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Novo Usuário</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Nome *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="E-mail *" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Senha *" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></Grid>
            <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>Perfil</InputLabel><Select value={form.role} label="Perfil" onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>{ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}</Select></FormControl></Grid>
            {form.role === 'loja' && <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>Loja</InputLabel><Select value={form.store_id} label="Loja" onChange={e => setForm(p => ({ ...p, store_id: e.target.value }))}>{stores.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl></Grid>}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name || !form.email || !form.password}>Criar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default UsersPage;
