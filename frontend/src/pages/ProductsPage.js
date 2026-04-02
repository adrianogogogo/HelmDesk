import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Tooltip, InputAdornment, Alert, Grid
} from '@mui/material';
import { Add, Edit, Search, Inventory2 } from '@mui/icons-material';
import { productAPI, brandAPI } from '../services/api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', brand_id: '', sku: '', model: '', year: '', description: '', is_active: true };

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [prodRes, brandRes] = await Promise.all([productAPI.list(), brandAPI.list()]);
      setProducts(prodRes.data?.products || prodRes.data || []);
      setBrands(brandRes.data || []);
    } catch { }
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.model?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setDialog(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, brand_id: p.brand_id || '', sku: p.sku || '', model: p.model || '', year: p.year || '', description: p.description || '', is_active: p.is_active });
    setError('');
    setDialog(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      if (editing) {
        await productAPI.update(editing.id, form);
        toast.success('Produto atualizado!');
      } else {
        await productAPI.create(form);
        toast.success('Produto criado!');
      }
      setDialog(false);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar produto');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Produtos</Typography>
          <Typography variant="body2" color="text.secondary">{products.length} produto(s) cadastrado(s)</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Novo Produto</Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Buscar por nome, SKU, modelo..." value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ width: 400 }} />
      </Box>

      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Marca</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Ano</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Inventory2 fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{p.brand_name || '—'}</TableCell>
                <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{p.sku || '—'}</Typography></TableCell>
                <TableCell>{p.model || '—'}</TableCell>
                <TableCell>{p.year || '—'}</TableCell>
                <TableCell>
                  <Chip label={p.is_active ? 'Ativo' : 'Inativo'} size="small" color={p.is_active ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => openEdit(p)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nome *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Marca</InputLabel>
                <Select value={form.brand_id} label="Marca" onChange={e => setForm(p => ({ ...p, brand_id: e.target.value }))}>
                  <MenuItem value="">Nenhuma</MenuItem>
                  {brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="SKU" value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Modelo" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Ano" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} size="small" type="number" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Descrição" multiline rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} size="small" />
            </Grid>
            {editing && (
              <Grid item xs={12}>
                <FormControlLabel control={<Switch checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />} label="Produto ativo" />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsPage;
