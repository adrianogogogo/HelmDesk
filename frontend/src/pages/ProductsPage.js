import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Grid } from '@mui/material';
import { Add } from '@mui/icons-material';
import { productAPI, brandAPI } from '../services/api';
import toast from 'react-hot-toast';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', brand_id: '', sku: '', system_id: '', korp_id: '' });

  const load = async () => {
    const [p, b] = await Promise.all([productAPI.list(), brandAPI.list()]);
    setProducts(p.data); setBrands(b.data);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      await productAPI.create(form);
      toast.success('Produto criado!');
      setOpen(false);
      setForm({ name: '', description: '', brand_id: '', sku: '', system_id: '', korp_id: '' });
      load();
    } catch {}
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Produtos</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Novo Produto</Button>
      </Box>
      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell><TableCell>Marca</TableCell><TableCell>SKU</TableCell>
              <TableCell>ID Sistema</TableCell><TableCell>ID KORP</TableCell><TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{p.name}</Typography><Typography variant="caption" color="text.secondary">{p.description}</Typography></TableCell>
                <TableCell>{p.brand_name}</TableCell>
                <TableCell><code>{p.sku}</code></TableCell>
                <TableCell>{p.system_id || '—'}</TableCell>
                <TableCell>{p.korp_id || '—'}</TableCell>
                <TableCell><Chip label={p.is_active ? 'Ativo' : 'Inativo'} size="small" color={p.is_active ? 'success' : 'default'} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Novo Produto</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Nome *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Grid>
            <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>Marca</InputLabel><Select value={form.brand_id} label="Marca" onChange={e => setForm(p => ({ ...p, brand_id: e.target.value }))}>{brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="SKU" value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="ID Sistema" value={form.system_id} onChange={e => setForm(p => ({ ...p, system_id: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="ID KORP" value={form.korp_id} onChange={e => setForm(p => ({ ...p, korp_id: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" multiline rows={2} label="Descrição" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>
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
export default ProductsPage;
