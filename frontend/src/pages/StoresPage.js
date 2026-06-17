import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, Tooltip, InputAdornment, Alert, Grid,
  Paper
} from '@mui/material';
import { Add, Edit, Store, Search, ContentCopy, CheckCircle } from '@mui/icons-material';
import { storeAPI } from '../services/api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', cnpj: '', email: '', phone: '', address: '', city: '', state: '', password: '', is_active: true };

const StoresPage = () => {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [createdLogin, setCreatedLogin] = useState(null); // {email, password, storeName}

  const load = () => storeAPI.list().then(r => setStores(r.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const filtered = stores.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.cnpj?.includes(search) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setDialog(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, cnpj: s.cnpj || '', email: s.email || '', phone: s.phone || '', address: s.address || '', city: s.city || '', state: s.state || '', password: '', is_active: s.is_active }); setError(''); setDialog(true); };

  const handleSave = async () => {
    setError('');
    try {
      if (editing) {
        await storeAPI.update(editing.id, form);
        toast.success('Loja atualizada!');
        setDialog(false);
        load();
      } else {
        const { data } = await storeAPI.create(form);
        setDialog(false);
        load();
        // Mostrar credenciais de acesso criadas automaticamente
        if (data.user_created) {
          setCreatedLogin({
            email: data.login_email,
            password: data.login_password,
            storeName: data.name,
          });
        } else {
          toast.success(data.message || 'Loja criada!');
        }
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar loja');
    }
  };

  const copyToClipboard = (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => toast.success('Copiado!'));
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success('Copiado!');
      }
    } catch { toast.error('Não foi possível copiar'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Lojas</Typography>
          <Typography variant="body2" color="text.secondary">{stores.length} loja(s) cadastrada(s)</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Nova Loja</Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Buscar por nome, CNPJ, cidade..." value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ width: 400 }} />
      </Box>

      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>CNPJ</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Cidade/UF</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  Nenhuma loja encontrada
                </TableCell>
              </TableRow>
            ) : filtered.map(s => (
              <TableRow key={s.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Store fontSize="small" color="primary" />
                    <Typography variant="body2" fontWeight={500}>{s.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{s.cnpj || '—'}</TableCell>
                <TableCell>{s.email || '—'}</TableCell>
                <TableCell>{s.phone || '—'}</TableCell>
                <TableCell>{s.city ? `${s.city}${s.state ? `/${s.state}` : ''}` : '—'}</TableCell>
                <TableCell>
                  <Chip label={s.is_active ? 'Ativa' : 'Inativa'} size="small" color={s.is_active ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => openEdit(s)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog: Credenciais da nova loja */}
      <Dialog open={Boolean(createdLogin)} onClose={() => setCreatedLogin(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle color="success" />
          Loja criada com sucesso!
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Login de acesso criado automaticamente para <strong>{createdLogin?.storeName}</strong>:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">E-mail</Typography>
                <Typography variant="body2" fontWeight={600}>{createdLogin?.email}</Typography>
              </Box>
              <Tooltip title="Copiar e-mail">
                <IconButton size="small" onClick={() => copyToClipboard(createdLogin?.email)}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Senha</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: 1 }}>
                  {createdLogin?.password}
                </Typography>
              </Box>
              <Tooltip title="Copiar senha">
                <IconButton size="small" onClick={() => copyToClipboard(createdLogin?.password)}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
          <Alert severity="warning" sx={{ mt: 2, fontSize: 12 }}>
            Anote estas credenciais! A senha não pode ser recuperada depois que você fechar esta janela.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              copyToClipboard(`E-mail: ${createdLogin?.email}\nSenha: ${createdLogin?.password}`);
            }}
          >
            Copiar tudo
          </Button>
          <Button onClick={() => setCreatedLogin(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Loja' : 'Nova Loja'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Nome *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} size="small" /></Grid>
            <Grid item xs={6}><TextField fullWidth label="CNPJ" value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} size="small" /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Telefone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} size="small" /></Grid>
            <Grid item xs={12}><TextField fullWidth label="E-mail" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} size="small" /></Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={editing ? "Nova senha do usuário de acesso (opcional)" : "Senha do usuário de acesso (opcional)"}
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Endereço" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} size="small" /></Grid>
            <Grid item xs={8}><TextField fullWidth label="Cidade" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} size="small" /></Grid>
            <Grid item xs={4}><TextField fullWidth label="UF" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} size="small" inputProps={{ maxLength: 2 }} /></Grid>
            {editing && (
              <Grid item xs={12}>
                <FormControlLabel control={<Switch checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />} label="Loja ativa" />
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

export default StoresPage;
