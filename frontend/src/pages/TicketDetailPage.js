import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Chip, Tabs, Tab,
  Grid, Divider, CircularProgress, Avatar, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Alert,
  List, ListItem, ListItemText, ListItemAvatar, Paper
} from '@mui/material';
import {
  Edit, AttachFile, Assignment, History, ArrowBack,
  SportsScore, WhatsApp, CheckCircle, Cancel, Add,
  Upload, Inventory, Build, LocalShipping, Payment
} from '@mui/icons-material';
import { ticketAPI, userAPI, taskAPI } from '../services/api';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const STATUS_LIST = [
  { id: 1, name: 'Novo', slug: 'novo', color: '#2196F3' },
  { id: 2, name: 'Em Triagem', slug: 'em-triagem', color: '#FF9800' },
  { id: 3, name: 'Aguardando Informações', slug: 'aguardando-informacoes', color: '#FFC107' },
  { id: 4, name: 'Em Análise', slug: 'em-analise', color: '#9C27B0' },
  { id: 5, name: 'Solução Proposta', slug: 'solucao-proposta', color: '#00BCD4' },
  { id: 6, name: 'Em Execução', slug: 'em-execucao', color: '#FF5722' },
  { id: 7, name: 'Logística/Envio', slug: 'logistica-envio', color: '#795548' },
  { id: 8, name: 'Aguardando Confirmação', slug: 'aguardando-confirmacao', color: '#607D8B' },
  { id: 9, name: 'Resolvido', slug: 'resolvido', color: '#4CAF50' },
  { id: 10, name: 'Fechado/Arquivado', slug: 'fechado', color: '#9E9E9E' },
];

// Status Ruler Component
const StatusRuler = ({ currentStatusId }) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
      {STATUS_LIST.map(s => (
        <Tooltip key={s.id} title={s.name}>
          <Box sx={{
            flex: 1, height: 8, borderRadius: 2,
            bgcolor: s.id <= currentStatusId ? s.color : s.color + '25',
            transition: 'all 0.3s',
            cursor: 'default',
          }} />
        </Tooltip>
      ))}
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="caption" color="text.secondary">Novo</Typography>
      <Chip
        label={STATUS_LIST.find(s => s.id === currentStatusId)?.name || 'Desconhecido'}
        size="small"
        sx={{
          bgcolor: STATUS_LIST.find(s => s.id === currentStatusId)?.color + '20',
          color: STATUS_LIST.find(s => s.id === currentStatusId)?.color,
          fontWeight: 700, fontSize: 12
        }}
      />
      <Typography variant="caption" color="text.secondary">Fechado</Typography>
    </Box>
  </Box>
);

// Status Update Dialog
const StatusUpdateDialog = ({ open, onClose, ticket, onSuccess }) => {
  const { user } = useSelector(s => s.auth);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    status_id: ticket?.status_id || 1,
    ball_owner_id: user?.id || '',
    note: '',
    is_internal: true,
  });

  useEffect(() => {
    if (open) {
      setForm({ status_id: ticket?.status_id || 1, ball_owner_id: user?.id || '', note: '', is_internal: true });
      userAPI.list().then(r => setUsers(r.data)).catch(() => {});
    }
  }, [open, ticket, user]);

  const handleSubmit = async () => {
    try {
      await ticketAPI.updateStatus(ticket.id, form);
      toast.success('Status atualizado! ⚽ Gol registrado!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        ⚡ Atualizar Status — #{ticket?.ticket_number}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Novo Status</InputLabel>
              <Select value={form.status_id} label="Novo Status"
                onChange={e => setForm(p => ({ ...p, status_id: parseInt(e.target.value) }))}>
                {STATUS_LIST.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                      {s.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>⚽ Passar bola para</InputLabel>
              <Select value={form.ball_owner_id} label="⚽ Passar bola para"
                onChange={e => setForm(p => ({ ...p, ball_owner_id: e.target.value }))}>
                {users.map(u => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth multiline rows={3} size="small"
              label="Notificação interna (opcional)"
              placeholder="Escreva uma nota sobre esta atualização..."
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Visibilidade</InputLabel>
              <Select value={form.is_internal} label="Visibilidade"
                onChange={e => setForm(p => ({ ...p, is_internal: e.target.value }))}>
                <MenuItem value={true}>🔒 Interno (só equipe)</MenuItem>
                <MenuItem value={false}>👁️ Visível ao cliente</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} sx={{ fontWeight: 700 }}>
          ⚡ Atualizar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main Component
const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [statusDialog, setStatusDialog] = useState(false);
  const [fileInput, setFileInput] = useState(null);

  const internalRoles = ['atendente', 'gestor', 'diretor'];

  const loadTicket = async () => {
    try {
      const { data } = await ticketAPI.getById(id);
      setTicket(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTicket(); }, [id]);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    try {
      await ticketAPI.uploadAttachments(id, formData);
      toast.success('Arquivo(s) anexado(s)!');
      loadTicket();
    } catch {
      toast.error('Erro ao enviar arquivo');
    }
  };

  const handleApproveSolution = async (solutionId, approved, reason) => {
    try {
      await ticketAPI.approveSolution(id, solutionId, { approved, rejection_reason: reason });
      toast.success(approved ? 'Solução aprovada!' : 'Solução reprovada');
      loadTicket();
    } catch {
      toast.error('Erro ao processar');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!ticket) return <Box sx={{ mt: 4 }}><Alert severity="error">Ticket não encontrado</Alert></Box>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/tickets')} size="small">
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={700}>
              #{ticket.ticket_number}
            </Typography>
            <Chip label={ticket.status_name} size="small"
              sx={{ bgcolor: (ticket.status_color || '#666') + '20', color: ticket.status_color || '#666', fontWeight: 700 }} />
            <Chip label={ticket.priority === 'urgent' ? '🔴 Urgente' : ticket.priority === 'high' ? '🟠 Alta' : '🔵 Normal'} size="small" variant="outlined" />
            {ticket.brand_name && <Chip label={ticket.brand_name} size="small" variant="outlined" />}
          </Box>
          <Typography variant="body1" sx={{ mt: 0.5 }}>{ticket.title}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          {internalRoles.includes(user?.role) && (
            <Button variant="contained" onClick={() => setStatusDialog(true)} sx={{ fontWeight: 700 }}>
              ⚡ Atualizar Status
            </Button>
          )}
        </Box>
      </Box>

      {/* Status Ruler */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 2 }}>
          <StatusRuler currentStatusId={ticket.status_id} />
        </CardContent>
      </Card>

      <Grid container spacing={2.5}>
        {/* Left — Main content */}
        <Grid item xs={12} md={8}>
          <Card>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label="Principal" />
              <Tab label="Anexos" />
              <Tab label={`Tarefas (${ticket.tasks?.length || 0})`} />
              <Tab label={`Histórico (${ticket.history?.length || 0})`} />
            </Tabs>

            {/* Tab 0: Principal */}
            {tab === 0 && (
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Tipo de Problema</Typography>
                    <Typography variant="body2" fontWeight={600}>{ticket.issue_type_name || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Subtipo</Typography>
                    <Typography variant="body2" fontWeight={600}>{ticket.issue_subtype_name || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Descrição</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {ticket.description || '—'}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Products */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    <Inventory fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                    Produtos ({ticket.products?.length || 0})
                  </Typography>
                  {internalRoles.includes(user?.role) && (
                    <Button size="small" startIcon={<Add />} onClick={() => {}}>Adicionar</Button>
                  )}
                </Box>
                {ticket.products?.map(p => (
                  <Paper key={p.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Produto</Typography>
                        <Typography variant="body2" fontWeight={500}>{p.product_name || p.product_db_name || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="caption" color="text.secondary">Marca</Typography>
                        <Typography variant="body2">{p.brand_name || p.brand_db_name || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Série</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {p.serial_number || '—'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="caption" color="text.secondary">NF</Typography>
                        <Typography variant="body2">{p.invoice_number || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="caption" color="text.secondary">Compra</Typography>
                        <Typography variant="body2">
                          {p.purchase_date ? format(new Date(p.purchase_date), 'dd/MM/yyyy') : '—'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                {/* Blocks */}
                {ticket.blocks?.map(block => (
                  <Box key={block.id} sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      {block.block_type_slug === 'solucao-proposta' && '💡 '}
                      {block.block_type_slug === 'faturamento' && '💰 '}
                      {block.block_type_slug === 'logistica' && '📦 '}
                      {block.block_type_name}
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(block.content, null, 2)}
                      </Typography>
                    </Paper>
                  </Box>
                ))}

                {/* Solutions */}
                {ticket.solutions?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>💡 Soluções Propostas</Typography>
                    {ticket.solutions.map(sol => (
                      <Paper key={sol.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2">{sol.description}</Typography>
                            {sol.has_cost && (
                              <Chip label={`Custo: R$ ${parseFloat(sol.cost_value).toFixed(2)}`} size="small"
                                color="warning" sx={{ mt: 0.5 }} />
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              Proposta por: {sol.proposed_by_name} • {format(new Date(sol.created_at), 'dd/MM/yyyy HH:mm')}
                            </Typography>
                          </Box>
                          <Box sx={{ ml: 2 }}>
                            <Chip
                              label={sol.status}
                              size="small"
                              color={sol.status === 'aprovado' ? 'success' : sol.status === 'reprovado' ? 'error' : 'default'}
                            />
                          </Box>
                        </Box>
                        {sol.status === 'pendente' && ['gestor','diretor'].includes(user?.role) && (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />}
                              onClick={() => handleApproveSolution(sol.id, true)}>Aprovar</Button>
                            <Button size="small" variant="outlined" color="error" startIcon={<Cancel />}
                              onClick={() => handleApproveSolution(sol.id, false, 'Reprovado')}>Reprovar</Button>
                          </Box>
                        )}
                      </Paper>
                    ))}
                  </Box>
                )}
              </CardContent>
            )}

            {/* Tab 1: Attachments */}
            {tab === 1 && (
              <CardContent>
                {internalRoles.includes(user?.role) && (
                  <Box sx={{ mb: 2 }}>
                    <input type="file" multiple hidden ref={r => setFileInput(r)} onChange={handleFileUpload} />
                    <Button variant="outlined" startIcon={<Upload />} onClick={() => fileInput?.click()}>
                      Upload de Arquivos (máx 15MB)
                    </Button>
                  </Box>
                )}
                <Grid container spacing={1.5}>
                  {ticket.attachments?.map(att => (
                    <Grid item xs={12} sm={6} md={4} key={att.id}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AttachFile sx={{ color: 'primary.main' }} />
                        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                            {att.original_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(att.size_bytes / 1024).toFixed(0)} KB
                          </Typography>
                        </Box>
                        <Button size="small" href={att.url} target="_blank" rel="noreferrer">
                          Ver
                        </Button>
                      </Paper>
                    </Grid>
                  ))}
                  {!ticket.attachments?.length && (
                    <Grid item xs={12}>
                      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        Nenhum anexo ainda
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            )}

            {/* Tab 2: Tasks */}
            {tab === 2 && (
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button size="small" variant="outlined" startIcon={<Add />}>Nova Tarefa</Button>
                </Box>
                {ticket.tasks?.map(task => (
                  <Paper key={task.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
                        {task.description && <Typography variant="caption" color="text.secondary">{task.description}</Typography>}
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip label={task.status} size="small"
                            color={task.status === 'concluida' ? 'success' : task.status === 'em_andamento' ? 'warning' : 'default'} />
                          {task.assigned_name && (
                            <Chip label={`→ ${task.assigned_name}`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </Box>
                      <Tooltip title="Lembrar via WhatsApp">
                        <IconButton size="small" color="success"
                          onClick={async () => {
                            try {
                              const { data } = await taskAPI.whatsapp(task.id);
                              window.open(data.whatsapp_url, '_blank');
                            } catch { toast.error('Sem número de telefone'); }
                          }}>
                          <WhatsApp fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                ))}
                {!ticket.tasks?.length && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    Nenhuma tarefa vinculada
                  </Typography>
                )}
              </CardContent>
            )}

            {/* Tab 3: History */}
            {tab === 3 && (
              <CardContent>
                <List dense>
                  {ticket.history?.map(h => (
                    <React.Fragment key={h.id}>
                      <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main' }}>
                            {h.user_name?.charAt(0) || '?'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Typography variant="body2" fontWeight={600}>{h.user_name || 'Sistema'}</Typography>
                              {h.status_to_name && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {h.status_from_name && (
                                    <>
                                      <Chip label={h.status_from_name} size="small" sx={{ height: 18, fontSize: 10 }} />
                                      <Typography variant="caption">→</Typography>
                                    </>
                                  )}
                                  <Chip label={h.status_to_name} size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
                                </Box>
                              )}
                              {h.ball_to_name && (
                                <Typography variant="caption" sx={{ color: 'success.main' }}>
                                  ⚽ → {h.ball_to_name}
                                </Typography>
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              {h.note && <Typography variant="body2" sx={{ mt: 0.5 }}>{h.note}</Typography>}
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                {' · '}{h.is_internal ? '🔒 Interno' : '👁️ Público'}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                  {!ticket.history?.length && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      Sem histórico ainda
                    </Typography>
                  )}
                </List>
              </CardContent>
            )}
          </Card>
        </Grid>

        {/* Right — Sidebar info */}
        <Grid item xs={12} md={4}>
          {/* Ball & Assigned */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>⚽ Bola do Ticket</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Avatar sx={{ bgcolor: '#1565C0' }}>{ticket.ball_owner_name?.charAt(0) || '?'}</Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{ticket.ball_owner_name || 'Não atribuído'}</Typography>
                  <Typography variant="caption" color="text.secondary">Responsável atual</Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="caption" color="text.secondary">Atendente</Typography>
              <Typography variant="body2">{ticket.assigned_name || 'Não atribuído'}</Typography>
            </CardContent>
          </Card>

          {/* Client info */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>👤 Cliente</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Nome</Typography>
                  <Typography variant="body2" fontWeight={500}>{ticket.client_name || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">E-mail</Typography>
                  <Typography variant="body2">{ticket.client_email || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Telefone</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{ticket.client_phone || '—'}</Typography>
                    {ticket.client_phone && (
                      <Tooltip title="WhatsApp">
                        <IconButton size="small" color="success"
                          href={`https://wa.me/55${ticket.client_phone?.replace(/\D/g,'')}?text=Olá! Sobre seu ticket %23${ticket.ticket_number}`}
                          target="_blank">
                          <WhatsApp fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
                {ticket.store_name && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Loja</Typography>
                    <Typography variant="body2">{ticket.store_name}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>📅 Datas</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Criado em</Typography>
                  <Typography variant="body2">{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Última atualização</Typography>
                  <Typography variant="body2">{format(new Date(ticket.updated_at), 'dd/MM/yyyy HH:mm')}</Typography>
                </Box>
                {ticket.resolved_at && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Resolvido em</Typography>
                    <Typography variant="body2" color="success.main">{format(new Date(ticket.resolved_at), 'dd/MM/yyyy HH:mm')}</Typography>
                  </Box>
                )}
                {ticket.auto_close_at && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Fecha automaticamente</Typography>
                    <Typography variant="body2" color="warning.main">{format(new Date(ticket.auto_close_at), 'dd/MM/yyyy')}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Dialog */}
      <StatusUpdateDialog
        open={statusDialog}
        onClose={() => setStatusDialog(false)}
        ticket={ticket}
        onSuccess={loadTicket}
      />
    </Box>
  );
};

export default TicketDetailPage;
