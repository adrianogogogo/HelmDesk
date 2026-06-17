import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  FormControl, InputLabel, Select, MenuItem, Alert,
  CircularProgress, Divider, Paper
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { publicAPI } from '../services/api';
import toast from 'react-hot-toast';

const OpenTicketPage = () => {
  const [brands, setBrands] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', brand_id: '', issue_type_id: '', issue_subtype_id: '',
    client_name: '', client_email: '', client_phone: '', client_cpf: '',
    products: [{ product_name: '', brand_name: '', serial_number: '', invoice_number: '', purchase_date: '' }]
  });

  useEffect(() => {
    publicAPI.getBrands().then(r => setBrands(r.data)).catch(() => {});
    publicAPI.getIssueTypes().then(r => setIssueTypes(r.data)).catch(() => {});
  }, []);

  const selectedType = issueTypes.find(t => t.id === parseInt(form.issue_type_id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((form.description || '').trim().length < 50) {
      toast.error('A descrição detalhada é obrigatória e deve ter no mínimo 50 caracteres.');
      return;
    }
    const semNota = form.products.findIndex(p => !p.invoice_number?.trim());
    if (semNota !== -1) {
      toast.error(`Informe o número da nota fiscal do Produto ${semNota + 1}.`);
      return;
    }
    setLoading(true);
    try {
      const { data } = await publicAPI.createTicket(form);
      setSubmitted(data);
      toast.success('Ticket criado com sucesso!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar ticket');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Box sx={{
        minHeight: '100vh', background: 'linear-gradient(135deg, #0d2137 0%, #1565C0 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3
      }}>
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h1" sx={{ fontSize: 60, mb: 2 }}>✅</Typography>
            <Typography variant="h5" fontWeight={700} gutterBottom>Ticket criado com sucesso!</Typography>
            <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2" fontWeight={600}>Número do ticket: #{submitted.ticket_number}</Typography>
              <Typography variant="body2">{submitted.message}</Typography>
            </Alert>
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Link para acompanhamento:</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'primary.main', fontWeight: 600 }}>
                {submitted.track_url}
              </Typography>
            </Paper>
            <Button variant="contained" href={submitted.track_url} fullWidth sx={{ mb: 1 }}>
              Acompanhar meu ticket
            </Button>
            <Button variant="outlined" onClick={() => setSubmitted(null)} fullWidth>
              Abrir outro ticket
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0d2137 0%, #1565C0 100%)',
      py: 4, px: 2
    }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <img src="/logo-color.png" alt="RelmDesk" style={{ maxWidth: 240, width: '100%' }}
            onError={e => e.target.style.display = 'none'} />
          <Typography variant="h5" fontWeight={700} sx={{ color: 'white', mt: 2 }}>
            Abrir Ticket de Suporte
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Preencha o formulário abaixo para registrar seu chamado
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleSubmit}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>📋 Dados do problema</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth required size="small" label="Título do problema *" value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Marca</InputLabel>
                    <Select value={form.brand_id} label="Marca" onChange={e => setForm(p => ({ ...p, brand_id: e.target.value }))}>
                      <MenuItem value="">Selecione...</MenuItem>
                      {brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de problema</InputLabel>
                    <Select value={form.issue_type_id} label="Tipo de problema"
                      onChange={e => setForm(p => ({ ...p, issue_type_id: e.target.value, issue_subtype_id: '' }))}>
                      <MenuItem value="">Selecione...</MenuItem>
                      {issueTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                {selectedType?.subtypes?.filter(s => s.id)?.length > 0 && (
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Subtipo</InputLabel>
                      <Select value={form.issue_subtype_id} label="Subtipo"
                        onChange={e => setForm(p => ({ ...p, issue_subtype_id: e.target.value }))}>
                        <MenuItem value="">Selecione...</MenuItem>
                        {selectedType.subtypes.filter(s => s.id).map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField fullWidth required multiline rows={4} size="small" label="Descrição detalhada *"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    error={form.description.trim().length > 0 && form.description.trim().length < 50}
                    helperText={`Obrigatório — mínimo de 50 caracteres (${form.description.trim().length}/50)`} />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" fontWeight={600} gutterBottom>👤 Seus dados</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required size="small" label="Nome completo *" value={form.client_name}
                    onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required size="small" label="E-mail *" type="email" value={form.client_email}
                    onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Telefone / WhatsApp" value={form.client_phone}
                    onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="CPF" value={form.client_cpf}
                    onChange={e => setForm(p => ({ ...p, client_cpf: e.target.value }))} />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                🚴 Produto(s) — {form.products.length} produto(s)
              </Typography>
              {form.products.map((prod, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Produto {idx + 1}
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}><TextField fullWidth size="small" label="Nome do produto" value={prod.product_name}
                      onChange={e => { const p = [...form.products]; p[idx].product_name = e.target.value; setForm(f => ({ ...f, products: p })); }} /></Grid>
                    <Grid item xs={6}><TextField fullWidth size="small" label="Marca" value={prod.brand_name}
                      onChange={e => { const p = [...form.products]; p[idx].brand_name = e.target.value; setForm(f => ({ ...f, products: p })); }} /></Grid>
                    <Grid item xs={6}><TextField fullWidth size="small" label="Número de série" value={prod.serial_number}
                      onChange={e => { const p = [...form.products]; p[idx].serial_number = e.target.value; setForm(f => ({ ...f, products: p })); }} /></Grid>
                    <Grid item xs={6}><TextField fullWidth required size="small" label="Nota fiscal *" value={prod.invoice_number}
                      onChange={e => { const p = [...form.products]; p[idx].invoice_number = e.target.value; setForm(f => ({ ...f, products: p })); }} /></Grid>
                    <Grid item xs={6}><TextField fullWidth size="small" label="Data de compra" type="date" value={prod.purchase_date}
                      InputLabelProps={{ shrink: true }}
                      onChange={e => { const p = [...form.products]; p[idx].purchase_date = e.target.value; setForm(f => ({ ...f, products: p })); }} /></Grid>
                  </Grid>
                </Paper>
              ))}
              <Button size="small" startIcon={<Add />} variant="outlined"
                onClick={() => setForm(p => ({ ...p, products: [...p.products, { product_name: '', brand_name: '', serial_number: '', invoice_number: '', purchase_date: '' }] }))}>
                Adicionar produto
              </Button>

              <Box sx={{ mt: 3 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  🔒 Seus dados são protegidos conforme a LGPD e utilizados apenas para atendimento.
                </Typography>
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
                  sx={{ py: 1.5, fontWeight: 700, fontSize: 15 }}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : '📩 Enviar Ticket'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default OpenTicketPage;
