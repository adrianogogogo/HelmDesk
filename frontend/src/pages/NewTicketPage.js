import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Alert, Paper, IconButton, Tooltip
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ticketAPI, brandAPI, issueAPI } from '../services/api';
import toast from 'react-hot-toast';

const emptyProduct = { product_name: '', brand_name: '', serial_number: '', invoice_number: '', purchase_date: '' };

const NewTicketPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const [brands, setBrands] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    brand_id: '',
    issue_type_id: '',
    issue_subtype_id: '',
    priority: 'normal',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_cpf: '',
    products: [{ ...emptyProduct }]
  });

  useEffect(() => {
    brandAPI.list().then(r => setBrands(r.data)).catch(() => {});
    issueAPI.list().then(r => setIssueTypes(r.data)).catch(() => {});
  }, []);

  const selectedType = issueTypes.find(t => t.id === parseInt(form.issue_type_id));

  const addProduct = () => {
    if (form.products.length >= 3) { toast.error('Máximo de 3 produtos por ticket'); return; }
    setForm(p => ({ ...p, products: [...p.products, { ...emptyProduct }] }));
  };

  const removeProduct = (idx) => {
    if (form.products.length === 1) return;
    setForm(p => ({ ...p, products: p.products.filter((_, i) => i !== idx) }));
  };

  const updateProduct = (idx, field, value) => {
    setForm(p => {
      const products = [...p.products];
      products[idx] = { ...products[idx], [field]: value };
      return { ...p, products };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) { setError('Título é obrigatório'); return; }

    setLoading(true);
    try {
      const { data } = await ticketAPI.create(form);
      toast.success(`Ticket #${data.ticket_number} criado com sucesso! ⚽`);
      navigate(`/tickets/${data.id}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao criar ticket. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Novo Ticket</Typography>
        <Typography variant="body2" color="text.secondary">
          Preencha as informações para abrir um novo chamado
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Card sx={{ mb: 2.5 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>📋 Dados do chamado</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth required size="small" label="Título *"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  helperText="Descreva brevemente o problema"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Marca</InputLabel>
                  <Select value={form.brand_id} label="Marca"
                    onChange={e => setForm(p => ({ ...p, brand_id: e.target.value }))}>
                    <MenuItem value="">— Selecione —</MenuItem>
                    {brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Problema</InputLabel>
                  <Select value={form.issue_type_id} label="Tipo de Problema"
                    onChange={e => setForm(p => ({ ...p, issue_type_id: e.target.value, issue_subtype_id: '' }))}>
                    <MenuItem value="">— Selecione —</MenuItem>
                    {issueTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              {selectedType?.subtypes?.filter(s => s.id)?.length > 0 && (
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Subtipo</InputLabel>
                    <Select value={form.issue_subtype_id} label="Subtipo"
                      onChange={e => setForm(p => ({ ...p, issue_subtype_id: e.target.value }))}>
                      <MenuItem value="">— Selecione —</MenuItem>
                      {selectedType.subtypes.filter(s => s.id).map(s => (
                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Prioridade</InputLabel>
                  <Select value={form.priority} label="Prioridade"
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    <MenuItem value="low">🔵 Baixa</MenuItem>
                    <MenuItem value="normal">🟢 Normal</MenuItem>
                    <MenuItem value="high">🟠 Alta</MenuItem>
                    <MenuItem value="urgent">🔴 Urgente</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth multiline rows={4} size="small"
                  label="Descrição detalhada"
                  placeholder="Descreva o problema com detalhes: o que acontece, quando ocorreu, impacto..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Client info — only for internal staff */}
        {!['loja', 'cliente'].includes(user?.role) && (
          <Card sx={{ mb: 2.5 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>👤 Dados do Cliente</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth size="small" label="Nome completo"
                    value={form.client_name}
                    onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth size="small" label="E-mail" type="email"
                    value={form.client_email}
                    onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth size="small" label="Telefone / WhatsApp"
                    value={form.client_phone}
                    onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth size="small" label="CPF"
                    value={form.client_cpf}
                    onChange={e => setForm(p => ({ ...p, client_cpf: e.target.value }))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Products */}
        <Card sx={{ mb: 2.5 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                🚴 Produto(s) — {form.products.length}/3
              </Typography>
              <Tooltip title={form.products.length >= 3 ? 'Máximo de 3 produtos' : 'Adicionar produto'}>
                <span>
                  <Button
                    size="small" variant="outlined" startIcon={<Add />}
                    onClick={addProduct} disabled={form.products.length >= 3}
                  >
                    Produto
                  </Button>
                </span>
              </Tooltip>
            </Box>

            {form.products.map((prod, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Produto {idx + 1}
                  </Typography>
                  {form.products.length > 1 && (
                    <Tooltip title="Remover produto">
                      <IconButton size="small" color="error" onClick={() => removeProduct(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Nome do produto"
                      value={prod.product_name} onChange={e => updateProduct(idx, 'product_name', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Número de série"
                      value={prod.serial_number} onChange={e => updateProduct(idx, 'serial_number', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Nota fiscal"
                      value={prod.invoice_number} onChange={e => updateProduct(idx, 'invoice_number', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Data de compra" type="date"
                      InputLabelProps={{ shrink: true }}
                      value={prod.purchase_date} onChange={e => updateProduct(idx, 'purchase_date', e.target.value)} />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={() => navigate('/tickets')} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit" variant="contained" disabled={loading}
            sx={{ minWidth: 140, fontWeight: 700 }}
          >
            {loading ? <CircularProgress size={20} /> : '✅ Criar Ticket'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default NewTicketPage;
