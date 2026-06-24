import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Alert, Paper, IconButton, Tooltip, Autocomplete, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment
} from '@mui/material';
import { Add, Delete, PersonAdd, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ticketAPI, brandAPI, issueAPI, productAPI, clientAPI } from '../services/api';
import toast from 'react-hot-toast';

// Normaliza telefone: adiciona +55 se não tiver DDI
const normalizePhone = (v) => {
  if (!v) return v;
  const digits = v.replace(/\D/g, '');
  if (!digits) return v;
  if (v.startsWith('+')) return v;
  if (digits.length >= 12) return '+' + digits;
  return '+55' + digits;
};

const emptyProduct = {
  product_id: null,
  product_name: '',
  brand_name: '',
  serial_number: '',
  invoice_number: '',
  purchase_date: '',
};

// Dialog para criar novo cliente on-the-fly
const QuickClientDialog = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', cpf: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => { setForm({ name: '', email: '', phone: '', cpf: '' }); setError(''); onClose(); };
  const handleSave = async () => {
    setError('');
    if (!form.name?.trim()) { setError('Nome é obrigatório'); return; }
    setLoading(true);
    try {
      const { data } = await clientAPI.create({
        ...form,
        phone: form.phone ? normalizePhone(form.phone) : '',
      });
      toast.success('✅ Cliente cadastrado!');
      handleClose();
      onCreated(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao cadastrar cliente');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <PersonAdd sx={{ mr: 1, verticalAlign: 'middle' }} />
        Novo Cliente
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Nome completo *"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="E-mail" type="email"
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Telefone / WhatsApp"
              placeholder="+55 11 9 9999-9999"
              helperText="+55 adicionado automaticamente"
              value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="CPF"
              value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Cadastrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const NewTicketPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const [brands, setBrands] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [productCatalog, setProductCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quickClientDialog, setQuickClientDialog] = useState(false);

  // Client search state
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);

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
    client_user_id: null,
    products: [{ ...emptyProduct }],
  });

  useEffect(() => {
    brandAPI.list().then(r => setBrands(r.data)).catch(() => {});
    issueAPI.list().then(r => setIssueTypes(r.data)).catch(() => {});
    productAPI.list({ limit: 200 }).then(r => setProductCatalog(r.data?.products || r.data || [])).catch(() => {});
  }, []);

  // Debounce client search
  const searchClients = useCallback(async (q) => {
    if (!q || q.length < 2) { setClientResults([]); return; }
    setClientSearchLoading(true);
    try {
      const { data } = await clientAPI.search(q);
      setClientResults(data || []);
    } catch { setClientResults([]); }
    finally { setClientSearchLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchClients(clientSearch), 350);
    return () => clearTimeout(timer);
  }, [clientSearch, searchClients]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setForm(p => ({
      ...p,
      client_user_id: client.id,
      client_name: client.name,
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_cpf: client.cpf || '',
    }));
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setClientSearch('');
    setForm(p => ({ ...p, client_user_id: null, client_name: '', client_email: '', client_phone: '', client_cpf: '' }));
  };

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

  // Selecionar produto do catálogo
  const selectCatalogProduct = (idx, catalogProduct) => {
    if (!catalogProduct) {
      updateProduct(idx, 'product_id', null);
      updateProduct(idx, 'product_name', '');
      return;
    }
    setForm(p => {
      const products = [...p.products];
      products[idx] = {
        ...products[idx],
        product_id: catalogProduct.id,
        product_name: catalogProduct.name,
        brand_name: catalogProduct.brand_name || '',
      };
      return { ...p, products };
    });
  };

  const handlePhoneBlur = () => {
    if (form.client_phone) {
      setForm(p => ({ ...p, client_phone: normalizePhone(p.client_phone) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Título é obrigatório'); return; }
    if ((form.description || '').trim().length < 50) {
      setError('A descrição detalhada é obrigatória e deve ter no mínimo 50 caracteres');
      return;
    }
    const prodSemNota = form.products.findIndex(p => (p.product_name || '').trim() && !(p.invoice_number || '').trim());
    if (prodSemNota !== -1) {
      setError(`Informe o número da nota fiscal do Produto ${prodSemNota + 1}`);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        client_phone: form.client_phone ? normalizePhone(form.client_phone) : '',
      };
      const { data } = await ticketAPI.create(payload);
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
        {/* Dados do chamado */}
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
                    <MenuItem value="normal">🟢 Normal</MenuItem>
                    <MenuItem value="high">🟠 Alta</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth required multiline rows={4} size="small"
                  label="Descrição detalhada *"
                  placeholder="Descreva o problema com detalhes: o que acontece, quando ocorreu, impacto..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  error={form.description.trim().length > 0 && form.description.trim().length < 50}
                  helperText={`Obrigatório — mínimo de 50 caracteres (${form.description.trim().length}/50)`}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Dados do Cliente — apenas staff interno */}
        {!['loja', 'cliente'].includes(user?.role) && (
          <Card sx={{ mb: 2.5 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>👤 Dados do Cliente</Typography>
                <Button size="small" variant="outlined" startIcon={<PersonAdd />}
                  onClick={() => setQuickClientDialog(true)}>
                  Novo Cliente
                </Button>
              </Box>

              {/* Busca de cliente existente */}
              {!selectedClient ? (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth size="small"
                    label="Buscar cliente cadastrado (nome, e-mail, CPF ou telefone)"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">
                        {clientSearchLoading ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                      </InputAdornment>
                    }}
                    placeholder="Digite para buscar..."
                  />
                  {clientResults.length > 0 && (
                    <Paper variant="outlined" sx={{ mt: 0.5, maxHeight: 200, overflow: 'auto', borderRadius: 1 }}>
                      {clientResults.map(c => (
                        <Box key={c.id}
                          onClick={() => handleSelectClient(c)}
                          sx={{ px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
                                borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.email || ''}{c.phone ? ' · ' + c.phone : ''}{c.cpf ? ' · CPF: ' + c.cpf : ''}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  )}
                  {clientSearch.length >= 2 && clientResults.length === 0 && !clientSearchLoading && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Nenhum cliente encontrado.
                      <Button size="small" sx={{ ml: 1 }} onClick={() => setQuickClientDialog(true)}>
                        Cadastrar novo
                      </Button>
                    </Alert>
                  )}
                </Box>
              ) : (
                <Alert severity="success" sx={{ mb: 2 }}
                  action={<Button size="small" color="inherit" onClick={handleClearClient}>Trocar</Button>}>
                  Cliente selecionado: <strong>{selectedClient.name}</strong>
                  {selectedClient.email ? ` · ${selectedClient.email}` : ''}
                  {selectedClient.phone ? ` · ${selectedClient.phone}` : ''}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Nome completo"
                    value={form.client_name}
                    onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="E-mail" type="email"
                    value={form.client_email}
                    onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Telefone / WhatsApp"
                    placeholder="+55 11 9 9999-9999"
                    helperText="+55 adicionado automaticamente ao sair do campo"
                    value={form.client_phone}
                    onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))}
                    onBlur={handlePhoneBlur}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="CPF"
                    value={form.client_cpf}
                    onChange={e => setForm(p => ({ ...p, client_cpf: e.target.value }))} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Produtos */}
        <Card sx={{ mb: 2.5 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                🚴 Produto(s) — {form.products.length}/3
              </Typography>
              <Tooltip title={form.products.length >= 3 ? 'Máximo de 3 produtos' : 'Adicionar produto'}>
                <span>
                  <Button size="small" variant="outlined" startIcon={<Add />}
                    onClick={addProduct} disabled={form.products.length >= 3}>
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
                    {prod.product_id && (
                      <Chip label="Do catálogo" size="small" color="success"
                        sx={{ ml: 1, height: 18, fontSize: 10 }} />
                    )}
                  </Typography>
                  {form.products.length > 1 && (
                    <Tooltip title="Remover produto">
                      <IconButton size="small" color="error" onClick={() => removeProduct(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {/* Busca no catálogo */}
                <Box sx={{ mb: 1.5 }}>
                  <Autocomplete
                    size="small"
                    options={productCatalog}
                    getOptionLabel={o => `${o.name}${o.brand_name ? ' — ' + o.brand_name : ''}`}
                    value={productCatalog.find(p => p.id === prod.product_id) || null}
                    onChange={(_, val) => selectCatalogProduct(idx, val)}
                    renderInput={(params) => (
                      <TextField {...params} label="Buscar no catálogo de produtos (opcional)"
                        placeholder="Digite o nome do produto..." size="small" />
                    )}
                    noOptionsText="Nenhum produto no catálogo — preencha manualmente abaixo"
                    clearOnEscape
                  />
                </Box>

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Nome do produto"
                      value={prod.product_name}
                      onChange={e => updateProduct(idx, 'product_name', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Número de série"
                      value={prod.serial_number}
                      onChange={e => updateProduct(idx, 'serial_number', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Nota fiscal *"
                      value={prod.invoice_number}
                      onChange={e => updateProduct(idx, 'invoice_number', e.target.value)}
                      error={!!(prod.product_name || '').trim() && !(prod.invoice_number || '').trim()}
                      helperText={(prod.product_name || '').trim() && !(prod.invoice_number || '').trim() ? 'Obrigatória' : ''} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Data de compra" type="date"
                      InputLabelProps={{ shrink: true }}
                      value={prod.purchase_date}
                      onChange={e => updateProduct(idx, 'purchase_date', e.target.value)} />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </CardContent>
        </Card>

        {/* Ações */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={() => navigate('/tickets')} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}
            sx={{ minWidth: 140, fontWeight: 700 }}>
            {loading ? <CircularProgress size={20} /> : '✅ Criar Ticket'}
          </Button>
        </Box>
      </Box>

      <QuickClientDialog
        open={quickClientDialog}
        onClose={() => setQuickClientDialog(false)}
        onCreated={(client) => { handleSelectClient(client); }}
      />
    </Box>
  );
};

export default NewTicketPage;
