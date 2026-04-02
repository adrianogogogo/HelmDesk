import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Tooltip, Avatar, InputAdornment, Alert
} from '@mui/material';
import { Add, Edit, Block, Search, PersonOff } from '@mui/icons-material';
import { userAPI, storeAPI } from '../services/api';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'atendente', label: 'Atendente' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'loja', label: 'Loja' },
  { value: 'cliente', label: 'Cliente' },
];

const ROLE_COLORS = {
  atendente: 'info', gestor: 'warning', diretor: 'error', loja: 'primary', cliente: 'default'
};

const emptyForm = { name: '', email: '', password: '', role: 'atendente', phone: '', store_id: '', is_active: true };

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, storesRes] = await Promise.all([userAPI.list(), storeAPI.list()]);
      setUsers(usersRes.data);
      setStores(storesRes.data);
    } catch (e) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setDialog(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', store_id: u.store_id || '', is_active: u.is_active });
    setError('');
    setDialog(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, role: form.role, phone: form.phone, store_id: form.store_id || null, is_active: form.is_active };
        if (form.password) payload.password = form.password;
        await userAPI.update(editing.id, payload);
        toast.success('Usuário atualizado!');
      } else {
        const { default: api } = await import('../services/api');
        await api.post('/auth/register', form);
        toast.success('Usuário criado!');
      }
      setDialog(false);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const handleAnonymize = async (u) => {
    if (!window.confirm(`Anonimizar ${u.name}? Esta ação é irreversível (LGPD).`)) return;
    try {
      await userAPI.delete(u.id);
      toast.success('Usuário anonimizado (LGPD)');
      load();
    } catch {
      toast.error('Erro ao anonimizar');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Usuários</Typography>
          <Typography variant="body2" color="text.secondary">{users.length} usuário(s) cadastrado(s)</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Novo Usuário
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          size="small" placeholder="Buscar por nome, e-mail, telefone..." value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ width: 400 }}
        />
      </Box>

      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Perfil</TableCell>
              <TableCell>Loja</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Cadastro</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : filtered.map(u => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#1565C0' }}>
                      {u.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" fontWeight={500}>{u.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell><Typography variant="body2">{u.email}</Typography></TableCell>
                <TableCell><Typography variant="body2">{u.phone || '—'}</Typography></TableCell>
                <TableCell>
                  <Chip label={ROLES.find(r => r.value === u.role)?.label || u.role} size="small"
                    color={ROLE_COLORS[u.role] || 'default'} />
                </TableCell>
                <TableCell><Typography variant="body2">{u.store_name || '—'}</Typography></TableCell>
                <TableCell>
                  <Chip label={u.is_active ? 'Ativo' : 'Inativo'} size="small"
                    color={u.is_active ? 'success' : 'default'} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => openEdit(u)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Anonimizar (LGPD)">
                    <IconButton size="small" color="error" onClick={() => handleAnonymize(u)}>
                      <PersonOff fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog Create/Edit */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Nome *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} size="small" />
            <TextField fullWidth label="E-mail *" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} size="small" />
            <TextField fullWidth label={editing ? 'Nova senha (opcional)' : 'Senha *'} type="password" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} size="small" />
            <TextField fullWidth label="Telefone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} size="small" />
            <FormControl fullWidth size="small">
              <InputLabel>Perfil *</InputLabel>
              <Select value={form.role} label="Perfil *" onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </Select>
            </FormControl>
            {form.role === 'loja' && (
              <FormControl fullWidth size="small">
                <InputLabel>Loja</InputLabel>
                <Select value={form.store_id} label="Loja" onChange={e => setForm(p => ({ ...p, store_id: e.target.value }))}>
                  <MenuItem value="">Nenhuma</MenuItem>
                  {stores.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {editing && (
              <FormControlLabel control={<Switch checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />}
                label="Usuário ativo" />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
