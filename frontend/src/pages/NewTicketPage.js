import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, TextField, Button, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ticketAPI, brandAPI, issueAPI, storeAPI, productAPI } from '../services/api';
import toast from 'react-hot-toast';

const NewTicketPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const [brands, setBrands] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', brand_id: '', issue_type_id: '', issue_subtype_id: '',
    priority: 'normal', client_name: '', client_email: '', client_phone: '', client_cpf: '',
    products: [{ product_name: '', brand_name: '', serial_number: '', invoice_number: '', purchase_date: '' }]
  });

  useEffect(() => {
    brandAPI.list().then(r => setBrands(r.data)).catch(() => {});
    issueAPI.list().then(r => setIssueTypes(r.data)).catch(() => {});
  }, []);

  const selectedType = issueTypes.find(t => t.id === parseInt(form.issue_type_id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await ticketAPI.create(form);
      toast.success(`Ticket #${data.ticket_number} criado! ⚽`);
      navigate(`/tickets/${data.id}`);
    } catch { } finally { setLoading(false); }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Novo Ticket</Typography>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}><TextField fullWidth required size="small" label="Título *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Grid>
              <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>Marca</InputLabel><Select value={form.brand_id} label="Marca" onChange={e => setForm(p => ({ ...p, brand_id: e.target.value }))}><MenuItem value="">—</MenuItem>{brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</Select></FormControl></Grid>
              <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>Prioridade</InputLabel><Select value={form.priority} label="Prioridade" onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}><MenuItem value="low">Baixa</MenuItem><MenuItem value="normal">Normal</MenuItem><MenuItem value="high">Alta</MenuItem><MenuItem value="urgent">Urgente</MenuItem></Select></FormControl></Grid>
              <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>Tipo de Problema</InputLabel><Select value={form.issue_type_id} label="Tipo de Problema" onChange={e => setForm(p => ({ ...p, issue_type_id: e.target.value, issue_subtype_id: '' }))}><MenuItem value="">—</MenuItem>{issueTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}</Select></FormControl></Grid>
              {selectedType?.subtypes?.filter(s => s.id)?.length > 0 && (
                <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>Subtipo</InputLabel><Select value={form.issue_subtype_id} label="Subtipo" onChange={e => setForm(p => ({ ...p, issue_subtype_id: e.target.value }))}><MenuItem value="">—</MenuItem>{selectedType.subtypes.filter(s => s.id).map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl></Grid>
              )}
              <Grid item xs={12}><TextField fullWidth multiline rows={4} size="small" label="Descrição" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>

              {!['loja', 'cliente'].includes(user?.role) && (
                <>
                  <Grid item xs={12}><Typography variant="subtitle2" fontWeight={600}>👤 Dados do Cliente</Typography></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="Nome" value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="E-mail" value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="Telefone" value={form.client_phone} onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="CPF" value={form.client_cpf} onChange={e => setForm(p => ({ ...p, client_cpf: e.target.value }))} /></Grid>
                </>
              )}

              <Grid item xs={12}><Typography variant="subtitle2" fontWeight={600}>🚴 Produto(s)</Typography></Grid>
              {form.products.map((prod, idx) => (
                <Grid item xs={12} key={idx}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={4}><TextField fullWidth size="small" label="Produto" value={prod.product_name} onChange={e => { const p = [...form.products]; p[idx].product_name = e.target.value; setForm(f => ({ ...f, products: p })); }} /></Grid>
                    <Grid item xs={3}><TextField fullWidth size="small" label="Número de série" value={prod.serial_number} onChange={e => { const p = [...form.products]; p[idx].serial_number = e.target.value; setForm(f => ({ ...f, products: p })); }} /></Grid>
                    <Grid item xs={2}><TextField fullWidth size="small" label="Nota fiscal" value={prod.invoice_number} onChange={e => { const p = [...form.products]; p[idx].invoice_number = e.target.value; setForm(f => ({ ...f, products: p })); }} /></Grid>
                    <Grid item xs={3}><TextField fullWidth size="small" label="Data compra" type="date" InputLabelProps={{ shrink: true }} value={prod.purchase_date} onChange={e => { const p = [...form.products]; p[idx].purchase_date = e.target.value; setForm(f => ({ ...f, products: p })); }} /></Grid>
                  </Grid>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Button size="small" variant="outlined" onClick={() => setForm(p => ({ ...p, products: [...p.products, { product_name: '', brand_name: '', serial_number: '', invoice_number: '', purchase_date: '' }] }))}>+ Produto</Button>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button onClick={() => navigate('/tickets')}>Cancelar</Button>
                  <Button type="submit" variant="contained" disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Criar Ticket'}</Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NewTicketPage;
