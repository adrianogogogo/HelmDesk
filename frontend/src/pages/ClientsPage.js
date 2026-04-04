import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, TextField, InputAdornment, CircularProgress, Avatar, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert
} from '@mui/material';
import { Search, Add, PersonAdd } from '@mui/icons-material';
import api, { clientAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const emptyClientForm = { name: '', email: '', phone: '', cpf: '' };

// Normaliza telefone: adiciona +55 se não tiver DDI
const normalizePhone = (v) => {
  const digits = v.replace(/\D/g, '');
  if (!digits) return v;
  // Se já começa com + ou tem mais de 12 dígitos (ex: 5511...) deixa como está
  if (v.startsWith('+')) return v;
  if (digits.length >= 12) return '+' + digits;
  // Adiciona +55 se não há DDI
  return '+55' + digits;
};

const AddClientDialog = ({ open, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyClientForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => { setForm(emptyClientForm); setError(''); onClose(); };

  const handleSave = async () => {
    setError('');
    if (!form.name?.trim()) { setError('Nome é obrigatório'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        phone: form.phone ? normalizePhone(form.phone) : '',
      };
      const { data } = await clientAPI.create(payload);
      toast.success('✅ Cliente cadastrado!');
      handleClose();
      onSaved(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao cadastrar cliente');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <PersonAdd sx={{ mr: 1, verticalAlign: 'middle' }} />
        Adicionar Cliente
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Nome completo *"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="E-mail" type="email"
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Telefone / WhatsApp"
              placeholder="+55 11 9 9999-9999"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              helperText="DDI +55 será adicionado automaticamente se não informado"
            />
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

const ClientsPage = () => {
  const { user } = useSelector(s => s.auth);
  const canAdd = ['atendente', 'gestor', 'diretor'].includes(user?.role);

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);

  const loadClients = () => {
    setLoading(true);
    api.get('/clients')
      .then(r => setClients(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClients(); }, []);

  const filtered = clients.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.cpf?.includes(search)
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Clientes e Lojas</Typography>
          <Typography variant="body2" color="text.secondary">
            {clients.length} cliente(s) cadastrado(s)
          </Typography>
        </Box>
        {canAdd && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialog(true)}>
            Adicionar Cliente
          </Button>
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por nome, e-mail, telefone ou CPF..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
          }}
          sx={{ width: 420 }}
        />
      </Box>

      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>CPF</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Tickets</TableCell>
              <TableCell>Cadastro</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: c.role === 'loja' ? '#1565C0' : '#9C27B0' }}>
                      {c.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" fontWeight={500}>{c.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell><Typography variant="body2">{c.email}</Typography></TableCell>
                <TableCell><Typography variant="body2">{c.phone || '—'}</Typography></TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {c.cpf || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={c.role === 'loja' ? 'Loja' : 'Cliente'} size="small"
                    color={c.role === 'loja' ? 'primary' : 'default'} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${c.ticket_count || 0} ticket(s)`} size="small"
                    color={parseInt(c.ticket_count) > 0 ? 'info' : 'default'}
                    variant={parseInt(c.ticket_count) > 0 ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AddClientDialog
        open={addDialog}
        onClose={() => setAddDialog(false)}
        onSaved={() => { loadClients(); }}
      />
    </Box>
  );
};

export default ClientsPage;
