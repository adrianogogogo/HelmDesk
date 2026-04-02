import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Chip } from '@mui/material';
import { Add } from '@mui/icons-material';
import { storeAPI } from '../services/api';
import toast from 'react-hot-toast';

const StoresPage = () => {
  const [stores, setStores] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', cnpj: '', email: '', phone: '', address: '', city: '', state: '' });

  const load = () => storeAPI.list().then(r => setStores(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      await storeAPI.create(form);
      toast.success('Loja criada!');
      setOpen(false); load();
    } catch {}
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Lojas</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Nova Loja</Button>
      </Box>
      <Card>
        <Table size="small">
          <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>CNPJ</TableCell><TableCell>E-mail</TableCell><TableCell>Telefone</TableCell><TableCell>Cidade/UF</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
          <TableBody>
            {stores.map(s => (
              <TableRow key={s.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{s.name}</Typography></TableCell>
                <TableCell>{s.cnpj || '—'}</TableCell><TableCell>{s.email || '—'}</TableCell>
                <TableCell>{s.phone || '—'}</TableCell><TableCell>{s.city ? `${s.city}/${s.state}` : '—'}</TableCell>
                <TableCell><Chip label={s.is_active ? 'Ativa' : 'Inativa'} size="small" color={s.is_active ? 'success' : 'default'} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Nova Loja</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Nome *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="CNPJ" value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="E-mail" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Telefone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="Cidade" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></Grid>
            <Grid item xs={2}><TextField fullWidth size="small" label="UF" inputProps={{ maxLength: 2 }} value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value.toUpperCase() }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default StoresPage;
