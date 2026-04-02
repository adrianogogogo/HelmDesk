import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Tabs, Tab, TextField, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Switch,
  FormControlLabel, Tooltip, Divider, List, ListItem, ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { Save, Add, Edit, Settings, Email, Block, Tune } from '@mui/icons-material';
import { configAPI } from '../services/api';
import toast from 'react-hot-toast';

const TICKET_STATUSES = [
  { id: 1, name: 'Novo', slug: 'novo', color: '#2196F3', description: 'Ticket recém aberto' },
  { id: 2, name: 'Em triagem', slug: 'em-triagem', color: '#FF9800', description: 'Em análise inicial' },
  { id: 3, name: 'Aguardando informações', slug: 'aguardando-informacoes', color: '#FFC107', description: 'Aguardando dados do cliente' },
  { id: 4, name: 'Em análise', slug: 'em-analise', color: '#9C27B0', description: 'Equipe analisando o problema' },
  { id: 5, name: 'Solução proposta', slug: 'solucao-proposta', color: '#00BCD4', description: 'Solução aguardando aprovação' },
  { id: 6, name: 'Em execução', slug: 'em-execucao', color: '#FF5722', description: 'Solução sendo executada' },
  { id: 7, name: 'Logística/Envio', slug: 'logistica-envio', color: '#795548', description: 'Produto em trânsito' },
  { id: 8, name: 'Aguardando confirmação', slug: 'aguardando-confirmacao', color: '#607D8B', description: 'Aguardando confirmação do cliente' },
  { id: 9, name: 'Resolvido', slug: 'resolvido', color: '#4CAF50', description: 'Problema resolvido (observação 20 dias)' },
  { id: 10, name: 'Fechado/Arquivado', slug: 'fechado', color: '#9E9E9E', description: 'Arquivado automaticamente após 20 dias' },
];

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

const ConfigPage = () => {
  const [tab, setTab] = useState(0);
  const [configs, setConfigs] = useState({});
  const [blockTypes, setBlockTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockForm, setBlockForm] = useState({ name: '', slug: '', icon: '', description: '' });
  const [editingBlock, setEditingBlock] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    configAPI.list().then(r => {
      const map = {};
      (r.data || []).forEach(c => { map[c.key] = c.value; });
      setConfigs(map);
    }).catch(() => {});
    configAPI.blockTypes().then(r => setBlockTypes(r.data || [])).catch(() => {});
  }, []);

  const saveConfig = async (key) => {
    try {
      await configAPI.update(key, configs[key]);
      toast.success('Configuração salva!');
    } catch {
      toast.error('Erro ao salvar configuração');
    }
  };

  const handleBlockSave = async () => {
    setError('');
    try {
      const { default: api } = await import('../services/api');
      if (editingBlock) {
        await api.patch(`/config/block-types/${editingBlock.id}`, blockForm);
        toast.success('Bloco atualizado!');
      } else {
        await api.post('/config/block-types', blockForm);
        toast.success('Bloco criado!');
      }
      setBlockDialog(false);
      configAPI.blockTypes().then(r => setBlockTypes(r.data || [])).catch(() => {});
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar bloco');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Configurações</Typography>
        <Typography variant="body2" color="text.secondary">Administração do sistema RelmDesk</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}>
        <Tab label="Fluxo de Status" icon={<Tune fontSize="small" />} iconPosition="start" />
        <Tab label="Blocos de Ticket" icon={<Settings fontSize="small" />} iconPosition="start" />
        <Tab label="E-mail (V2)" icon={<Email fontSize="small" />} iconPosition="start" />
        <Tab label="Geral" />
      </Tabs>

      {/* Tab: Status Flow */}
      <TabPanel value={tab} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Workflow de Status — 10 etapas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Estes são os status fixos do sistema. O ticket percorre este fluxo com o campo "Bola do ticket" indicando o responsável atual.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={40}>#</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Cor</TableCell>
                  <TableCell>Descrição</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {TICKET_STATUSES.map(s => (
                  <TableRow key={s.id}>
                    <TableCell><Typography variant="caption" fontWeight={700}>{s.id}</Typography></TableCell>
                    <TableCell>
                      <Chip label={s.name} size="small"
                        sx={{ bgcolor: s.color + '20', color: s.color, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{s.slug}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: s.color }} />
                        <Typography variant="caption">{s.color}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{s.description}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.main', borderRadius: 2, color: 'white' }}>
              <Typography variant="body2">
                <strong>Auto-arquivamento:</strong> Após 20 dias no status "Resolvido", o ticket é automaticamente movido para "Fechado/Arquivado".
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab: Block Types */}
      <TabPanel value={tab} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>Blocos modulares do ticket</Typography>
          <Button variant="contained" size="small" startIcon={<Add />}
            onClick={() => { setEditingBlock(null); setBlockForm({ name: '', slug: '', icon: '', description: '' }); setBlockDialog(true); }}>
            Novo Bloco
          </Button>
        </Box>
        <Card>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Ícone</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blockTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                    Nenhum bloco configurado — os padrões estão na migration inicial
                  </TableCell>
                </TableRow>
              ) : blockTypes.map(b => (
                <TableRow key={b.id} hover>
                  <TableCell fontWeight={500}>{b.name}</TableCell>
                  <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{b.slug}</Typography></TableCell>
                  <TableCell>{b.icon || '—'}</TableCell>
                  <TableCell>{b.description || '—'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => { setEditingBlock(b); setBlockForm({ name: b.name, slug: b.slug, icon: b.icon || '', description: b.description || '' }); setBlockDialog(true); }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabPanel>

      {/* Tab: Email (V2) */}
      <TabPanel value={tab} index={2}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Email color="disabled" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" fontWeight={600}>Templates de E-mail</Typography>
                <Chip label="Disponível em V2" size="small" color="warning" sx={{ mt: 0.5 }} />
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Os templates de e-mail automático serão configurados na versão 2 do RelmDesk.
              O sistema possui um servidor SMTP configurado, mas os envios automáticos estão desativados por ora.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Templates previstos para V2:</Typography>
            <List dense>
              {['Novo ticket aberto', 'Atualização de status', 'Solução proposta', 'Ticket resolvido', 'Ticket arquivado', 'Convite de cadastro (cliente sem login)', 'Lembrete de tarefa'].map(t => (
                <ListItem key={t} sx={{ py: 0.5 }}>
                  <ListItemText primary={<Typography variant="body2">📧 {t}</Typography>} />
                  <ListItemSecondaryAction>
                    <Chip label="V2" size="small" variant="outlined" />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab: General */}
      <TabPanel value={tab} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>Configurações gerais</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[
                { key: 'company_name', label: 'Nome da empresa', placeholder: 'Relm Bikes' },
                { key: 'helpdesk_email', label: 'E-mail do helpdesk', placeholder: 'helpdesk@relmbikes.com.br' },
                { key: 'whatsapp_number', label: 'Número WhatsApp (com DDI)', placeholder: '+5511999999999' },
                { key: 'auto_close_days', label: 'Dias para arquivamento automático', placeholder: '20' },
              ].map(cfg => (
                <Box key={cfg.key} sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                  <TextField
                    label={cfg.label} size="small" sx={{ flexGrow: 1 }}
                    placeholder={cfg.placeholder}
                    value={configs[cfg.key] || ''}
                    onChange={e => setConfigs(p => ({ ...p, [cfg.key]: e.target.value }))}
                  />
                  <Button variant="outlined" size="small" startIcon={<Save />} onClick={() => saveConfig(cfg.key)}>
                    Salvar
                  </Button>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Block Dialog */}
      <Dialog open={blockDialog} onClose={() => setBlockDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBlock ? 'Editar Bloco' : 'Novo Bloco'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Nome *" size="small" value={blockForm.name} onChange={e => setBlockForm(p => ({ ...p, name: e.target.value }))} />
            <TextField fullWidth label="Slug *" size="small" value={blockForm.slug} onChange={e => setBlockForm(p => ({ ...p, slug: e.target.value }))} helperText="Ex: faturamento, logistica, solucao" />
            <TextField fullWidth label="Ícone (emoji)" size="small" value={blockForm.icon} onChange={e => setBlockForm(p => ({ ...p, icon: e.target.value }))} placeholder="💰" />
            <TextField fullWidth label="Descrição" size="small" multiline rows={2} value={blockForm.description} onChange={e => setBlockForm(p => ({ ...p, description: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBlockDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleBlockSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConfigPage;
