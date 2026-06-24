import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Chip, Tabs, Tab,
  Grid, Divider, CircularProgress, Avatar, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem,
  Alert, Switch, FormControlLabel,
  List, ListItem, ListItemText, ListItemAvatar, Paper
} from '@mui/material';
import {
  AttachFile, ArrowBack,
  WhatsApp, CheckCircle, Cancel, Add,
  Upload, Inventory, Lightbulb, NoteAdd, ContentCopy,
  PictureAsPdf
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

// Tipos de solução
const SOLUTION_TYPES = [
  { value: 'reparo',    label: '🔧 Reparo / Manutenção',      requiresDirector: false },
  { value: 'troca',    label: '🔄 Troca de Produto',          requiresDirector: true  },
  { value: 'reembolso',label: '💰 Reembolso',                 requiresDirector: true  },
  { value: 'cortesia', label: '🎁 Cortesia / Bonificação',    requiresDirector: false },
  { value: 'outro',    label: '📋 Outro',                     requiresDirector: false },
];

// Os ícones estão embutidos nos labels de SOLUTION_TYPES

// Rótulos legíveis por action_type
const ACTION_LABELS = {
  ticket_created: { label: 'Ticket criado', icon: '🎫' },
  status_change: { label: 'Status atualizado', icon: '⚡' },
  field_updated: { label: 'Campo editado', icon: '✏️' },
  task_created: { label: 'Tarefa criada', icon: '📋' },
  task_completed: { label: 'Tarefa concluída', icon: '✅' },
  solution_proposed: { label: 'Solução proposta', icon: '💡' },
  solution_approved: { label: 'Solução aprovada', icon: '✅' },
  solution_rejected: { label: 'Solução reprovada', icon: '❌' },
  attachment: { label: 'Arquivo anexado', icon: '📎' },
  note: { label: 'Nota adicionada', icon: '📝' },
};

// Status Ruler — visual melhorado
const StatusRuler = ({ currentStatusId }) => {
  const current = STATUS_LIST.find(s => s.id === currentStatusId);
  return (
    <Box>
      {/* Barra de progresso */}
      <Box sx={{ display: 'flex', gap: 0.4, mb: 0.8 }}>
        {STATUS_LIST.map(s => {
          const isActive = s.id === currentStatusId;
          const isPast   = s.id < currentStatusId;
          return (
            <Tooltip key={s.id} title={s.name} placement="top">
              <Box sx={{
                flex: 1, height: 10, borderRadius: 3,
                bgcolor: isActive ? s.color : isPast ? s.color + 'AA' : s.color + '20',
                transition: 'all 0.3s',
                boxShadow: isActive ? `0 0 6px ${s.color}` : 'none',
                cursor: 'default',
              }} />
            </Tooltip>
          );
        })}
      </Box>
      {/* Labels */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>Novo</Typography>
        {current && (
          <Chip
            label={current.name}
            size="small"
            sx={{
              bgcolor: current.color + '20',
              color: current.color,
              fontWeight: 700,
              fontSize: 11,
              border: `1px solid ${current.color}50`,
              px: 0.5,
            }}
          />
        )}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>Fechado</Typography>
      </Box>
      {/* Step counter */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
        <Typography variant="caption" color="text.disabled">
          Etapa {currentStatusId} de {STATUS_LIST.length}
        </Typography>
      </Box>
    </Box>
  );
};

// Dialog: Atualizar Status
const StatusUpdateDialog = ({ open, onClose, ticket, onSuccess }) => {
  const { user } = useSelector(s => s.auth);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    status_id: ticket?.status_id || 1,
    ball_owner_id: '',
    note: '',
    is_internal: true,
  });

  useEffect(() => {
    if (open) {
      setForm({ status_id: ticket?.status_id || 1, ball_owner_id: user?.id || '', note: '', is_internal: true });
      userAPI.list().then(r => setUsers(r.data.filter(u => ['atendente','gestor','diretor','superadmin'].includes(u.role)))).catch(() => {});
    }
  }, [open, ticket, user]);

  const handleSubmit = async () => {
    try {
      await ticketAPI.updateStatus(ticket.id, form);
      toast.success('Status atualizado! ⚽ Gol registrado!');
      onSuccess();
      onClose();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>⚡ Atualizar Status — #{ticket?.ticket_number}</DialogTitle>
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
                <MenuItem value="">— Manter comigo —</MenuItem>
                {users.map(u => (
                  <MenuItem key={u.id} value={u.id}>{u.name} ({u.role})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={3} size="small"
              label="Nota (opcional)" placeholder="Escreva uma nota sobre esta atualização..."
              value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch checked={form.is_internal}
                  onChange={e => setForm(p => ({ ...p, is_internal: e.target.checked }))} />
              }
              label={form.is_internal ? '🔒 Nota interna (só equipe)' : '👁️ Visível ao cliente'}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} sx={{ fontWeight: 700 }}>⚡ Atualizar</Button>
      </DialogActions>
    </Dialog>
  );
};

// Dialog: Propor Solução
const SolutionDialog = ({ open, onClose, ticketId, onSuccess }) => {
  const emptyForm = { description: '', solution_type: 'reparo', has_cost: false, cost_value: '', cost_notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(emptyForm); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedType = SOLUTION_TYPES.find(t => t.value === form.solution_type);
  const requiresDirector = selectedType?.requiresDirector || false;

  const handleSubmit = async () => {
    if (!form.description.trim()) { toast.error('Descrição da solução é obrigatória'); return; }
    setSaving(true);
    try {
      await ticketAPI.addSolution(ticketId, {
        ...form,
        cost_value: form.has_cost ? parseFloat(form.cost_value) || 0 : null,
      });
      toast.success('Solução proposta! Aguardando autorização. ⚽');
      onSuccess();
      onClose();
    } catch {
      toast.error('Erro ao propor solução');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>💡 Propor Solução</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>

          {/* Tipo de solução */}
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Solução *</InputLabel>
              <Select value={form.solution_type} label="Tipo de Solução *"
                onChange={e => setForm(p => ({ ...p, solution_type: e.target.value }))}>
                {SOLUTION_TYPES.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>{t.label}</span>
                      {t.requiresDirector && (
                        <Chip label="Requer Diretor" size="small" color="warning" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Alerta de dois níveis */}
          {requiresDirector && (
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ py: 0.5 }}>
                <Typography variant="caption">
                  🔐 <strong>{selectedType.label}</strong> requer autorização em <strong>dois níveis</strong>:
                  gestor aprova → diretor confirma antes de executar.
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* Descrição */}
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={4} size="small" label="Descrição da solução *"
              placeholder="Descreva detalhadamente a solução proposta..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </Grid>

          {/* Tem custo? */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch checked={form.has_cost}
                  onChange={e => setForm(p => ({ ...p, has_cost: e.target.checked }))} />
              }
              label="Solução envolve custo financeiro?"
            />
          </Grid>
          {form.has_cost && (
            <>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Valor (R$)" type="number"
                  inputProps={{ min: 0, step: '0.01' }}
                  value={form.cost_value}
                  onChange={e => setForm(p => ({ ...p, cost_value: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Observações financeiras"
                  value={form.cost_notes}
                  onChange={e => setForm(p => ({ ...p, cost_notes: e.target.value }))} />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="success" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : '💡 Propor Solução'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Dialog: Criar Tarefa
const TaskDialog = ({ open, onClose, ticketId, users, onSuccess }) => {
  const { user } = useSelector(s => s.auth);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'normal', due_date: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Título é obrigatório'); return; }
    setSaving(true);
    try {
      await taskAPI.create({ ...form, ticket_id: ticketId, assigned_to: form.assigned_to || user.id, due_date: form.due_date || null });
      toast.success('Tarefa criada! ⚽');
      onSuccess();
      onClose();
      setForm({ title: '', description: '', assigned_to: '', priority: 'normal', due_date: '' });
    } catch {
      toast.error('Erro ao criar tarefa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>📋 Nova Tarefa</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Título *" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} size="small" label="Descrição" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Atribuir a</InputLabel>
              <Select value={form.assigned_to} label="Atribuir a"
                onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                <MenuItem value="">— Eu mesmo —</MenuItem>
                {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name} ({u.role})</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Prioridade</InputLabel>
              <Select value={form.priority} label="Prioridade"
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <MenuItem value="normal">⚪ Normal</MenuItem>
                <MenuItem value="high">🟠 Alta</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Data limite" type="date"
              InputLabelProps={{ shrink: true }} value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'Criar Tarefa'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Dialog: Reprovar Solução (substitui window.prompt — evita aria-hidden warning)
const RejectDialog = ({ open, onClose, onConfirm, isDirector }) => {
  const [reason, setReason] = useState('');
  const handleClose = () => { setReason(''); onClose(); };
  const handleConfirm = () => { onConfirm(reason || 'Reprovado'); setReason(''); onClose(); };
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle sx={{ fontWeight: 700 }}>
        ❌ {isDirector ? 'Reprovar como Diretor' : 'Reprovar Solução'}
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth autoFocus size="small" multiline rows={3}
          label="Motivo da reprovação (opcional)"
          placeholder="Descreva o motivo..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          sx={{ mt: 1 }}
          onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleConfirm()}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button variant="contained" color="error" onClick={handleConfirm}>Reprovar</Button>
      </DialogActions>
    </Dialog>
  );
};

// Tab de Relatório para E-mail
const EmailReportTab = ({ ticket }) => {
  const [copied, setCopied] = useState(false);

  const buildEmailText = () => {
    const lines = [];
    lines.push(`═══════════════════════════════════════`);
    lines.push(`  RESUMO DO TICKET — RelmDesk`);
    lines.push(`═══════════════════════════════════════`);
    lines.push(`Ticket:    #${ticket.ticket_number}`);
    lines.push(`Assunto:   ${ticket.title}`);
    lines.push(`Status:    ${ticket.status_name}`);
    lines.push(`Prioridade:${ticket.priority === 'high' ? ' Alta' : ' Normal'}`);
    lines.push(`Marca:     ${ticket.brand_name || '—'}`);
    lines.push(`Tipo:      ${ticket.issue_type_name || '—'}${ticket.issue_subtype_name ? ' / ' + ticket.issue_subtype_name : ''}`);
    lines.push(``);
    lines.push(`───────────────────────────────────────`);
    lines.push(`CLIENTE`);
    lines.push(`───────────────────────────────────────`);
    lines.push(`Nome:      ${ticket.client_name || '—'}`);
    lines.push(`E-mail:    ${ticket.client_email || '—'}`);
    lines.push(`Telefone:  ${ticket.client_phone || '—'}`);
    if (ticket.store_name) lines.push(`Loja:      ${ticket.store_name}`);
    lines.push(``);
    lines.push(`───────────────────────────────────────`);
    lines.push(`DESCRIÇÃO DO PROBLEMA`);
    lines.push(`───────────────────────────────────────`);
    lines.push(ticket.description || '(sem descrição)');
    lines.push(``);

    if (ticket.products?.length) {
      lines.push(`───────────────────────────────────────`);
      lines.push(`PRODUTOS`);
      lines.push(`───────────────────────────────────────`);
      ticket.products.forEach((p, i) => {
        lines.push(`Produto ${i + 1}: ${p.product_name || '—'}`);
        if (p.serial_number) lines.push(`  Série: ${p.serial_number}`);
        if (p.invoice_number) lines.push(`  NF: ${p.invoice_number}`);
        if (p.purchase_date) lines.push(`  Compra: ${p.purchase_date}`);
      });
      lines.push(``);
    }

    if (ticket.solutions?.length) {
      lines.push(`───────────────────────────────────────`);
      lines.push(`SOLUÇÕES PROPOSTAS`);
      lines.push(`───────────────────────────────────────`);
      ticket.solutions.forEach((s, i) => {
        const typeMap = { reparo: 'Reparo', troca: 'Troca', reembolso: 'Reembolso', cortesia: 'Cortesia', outro: 'Outro' };
        lines.push(`Solução ${i + 1} [${typeMap[s.solution_type] || s.solution_type}] — ${s.status === 'aprovado' ? '✅ APROVADA' : s.status === 'reprovado' ? '❌ REPROVADA' : '⏳ PENDENTE'}`);
        lines.push(`  ${s.description}`);
        if (s.has_cost) lines.push(`  Custo: R$ ${parseFloat(s.cost_value || 0).toFixed(2)}${s.cost_notes ? ' — ' + s.cost_notes : ''}`);
        if (s.rejection_reason) lines.push(`  Motivo reprovação: ${s.rejection_reason}`);
      });
      lines.push(``);
    }

    lines.push(`───────────────────────────────────────`);
    lines.push(`ATENDIMENTO`);
    lines.push(`───────────────────────────────────────`);
    lines.push(`Atendente:   ${ticket.assigned_name || '—'}`);
    lines.push(`Responsável: ${ticket.ball_owner_name || '—'}`);
    lines.push(`Aberto em:   ${ticket.created_at ? new Date(ticket.created_at).toLocaleString('pt-BR') : '—'}`);
    lines.push(`Atualizado:  ${ticket.updated_at ? new Date(ticket.updated_at).toLocaleString('pt-BR') : '—'}`);
    if (ticket.resolved_at) lines.push(`Resolvido:   ${new Date(ticket.resolved_at).toLocaleString('pt-BR')}`);
    lines.push(``);
    lines.push(`═══════════════════════════════════════`);
    lines.push(`Gerado pelo sistema RelmDesk`);
    lines.push(`═══════════════════════════════════════`);
    return lines.join('\n');
  };

  const emailText = buildEmailText();

  const handleCopy = () => {
    // navigator.clipboard só funciona em HTTPS ou localhost
    // Fallback para HTTP via execCommand
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(emailText).then(() => {
        setCopied(true);
        toast.success('📋 Copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 3000);
      }).catch(() => copyFallback());
    } else {
      copyFallback();
    }
  };

  const copyFallback = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = emailText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      toast.success('📋 Copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Não foi possível copiar automaticamente. Selecione o texto manualmente.');
    }
  };

  const handleExportPDF = () => {
    const win = window.open('', '_blank');
    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Ticket #${ticket.ticket_number} — RelmDesk</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 30px; max-width: 800px; margin: auto; }
        h1 { font-size: 20px; color: #1565C0; border-bottom: 2px solid #1565C0; pb: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 16px; }
        .section-title { font-weight: bold; background: #f0f4ff; padding: 4px 8px; border-left: 3px solid #1565C0; margin-bottom: 6px; }
        .row { display: flex; gap: 8px; margin-bottom: 3px; }
        .label { color: #666; min-width: 130px; }
        .status-chip { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #e3f2fd; color: #1565C0; }
        pre { background: #f9f9f9; border: 1px solid #ddd; padding: 12px; border-radius: 4px; white-space: pre-wrap; font-family: inherit; }
        .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; }
      </style></head><body>
      <h1>📋 Ticket #${ticket.ticket_number} — ${ticket.title}</h1>
      <div class="section">
        <div class="section-title">Informações Gerais</div>
        <div class="row"><span class="label">Status:</span> <span class="status-chip">${ticket.status_name}</span></div>
        <div class="row"><span class="label">Prioridade:</span> ${ticket.priority}</div>
        <div class="row"><span class="label">Marca:</span> ${ticket.brand_name || '—'}</div>
        <div class="row"><span class="label">Tipo:</span> ${ticket.issue_type_name || '—'}${ticket.issue_subtype_name ? ' / ' + ticket.issue_subtype_name : ''}</div>
      </div>
      <div class="section">
        <div class="section-title">Cliente</div>
        <div class="row"><span class="label">Nome:</span> ${ticket.client_name || '—'}</div>
        <div class="row"><span class="label">E-mail:</span> ${ticket.client_email || '—'}</div>
        <div class="row"><span class="label">Telefone:</span> ${ticket.client_phone || '—'}</div>
        ${ticket.store_name ? `<div class="row"><span class="label">Loja:</span> ${ticket.store_name}</div>` : ''}
      </div>
      <div class="section">
        <div class="section-title">Descrição do Problema</div>
        <pre>${ticket.description || '(sem descrição)'}</pre>
      </div>
      ${ticket.products?.length ? `<div class="section"><div class="section-title">Produtos</div>${ticket.products.map((p, i) => `<div><b>Produto ${i + 1}:</b> ${p.product_name || '—'}${p.serial_number ? ' | Série: ' + p.serial_number : ''}${p.invoice_number ? ' | NF: ' + p.invoice_number : ''}</div>`).join('')}</div>` : ''}
      ${ticket.solutions?.length ? `<div class="section"><div class="section-title">Soluções Propostas</div>${ticket.solutions.map((s, i) => `<div><b>Solução ${i + 1}:</b> [${s.solution_type}] ${s.description} — <b>${s.status}</b>${s.has_cost ? ' | Custo: R$ ' + parseFloat(s.cost_value || 0).toFixed(2) : ''}</div>`).join('')}</div>` : ''}
      <div class="section">
        <div class="section-title">Atendimento</div>
        <div class="row"><span class="label">Atendente:</span> ${ticket.assigned_name || '—'}</div>
        <div class="row"><span class="label">Responsável:</span> ${ticket.ball_owner_name || '—'}</div>
        <div class="row"><span class="label">Aberto em:</span> ${ticket.created_at ? new Date(ticket.created_at).toLocaleString('pt-BR') : '—'}</div>
        ${ticket.resolved_at ? `<div class="row"><span class="label">Resolvido:</span> ${new Date(ticket.resolved_at).toLocaleString('pt-BR')}</div>` : ''}
      </div>
      <div class="footer">Gerado pelo sistema RelmDesk — ${new Date().toLocaleString('pt-BR')}</div>
      <script>window.onload = function(){ window.print(); }</script>
    </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>📧 Relatório para E-mail</Typography>
          <Typography variant="body2" color="text.secondary">
            Copie o texto abaixo para colar em um e-mail ou exporte como PDF
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<ContentCopy />}
            color={copied ? 'success' : 'primary'}
            onClick={handleCopy}>
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
          <Button size="small" variant="contained" startIcon={<PictureAsPdf />}
            color="error" onClick={handleExportPDF}>
            Exportar PDF
          </Button>
        </Box>
      </Box>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
        <Typography
          component="pre"
          sx={{
            fontFamily: 'Courier New, monospace', fontSize: 12,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            color: 'text.primary', m: 0, lineHeight: 1.6,
          }}
        >
          {emailText}
        </Typography>
      </Paper>
    </Box>
  );
};

// Dialog: Adicionar Nota Interna
const NoteDialog = ({ open, onClose, ticketId, onSuccess }) => {
  const [note, setNote] = useState('');
  const [isInternal, setIsInternal] = useState(true);
  const [loading, setLoading] = useState(false);
  const handleClose = () => { setNote(''); setIsInternal(true); onClose(); };
  const handleSave = async () => {
    if (!note.trim()) { toast.error('Nota não pode estar vazia'); return; }
    setLoading(true);
    try {
      await ticketAPI.addNote(ticketId, { note, is_internal: isInternal });
      toast.success('📝 Nota adicionada!');
      handleClose();
      onSuccess();
    } catch {
      toast.error('Erro ao adicionar nota');
    } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle sx={{ fontWeight: 700 }}>📝 Adicionar Nota</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth autoFocus multiline rows={4} size="small"
          label="Nota" placeholder="Descreva a observação..."
          value={note} onChange={e => setNote(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />
        <FormControlLabel
          control={<Switch checked={isInternal} onChange={e => setIsInternal(e.target.checked)} size="small" />}
          label={<Typography variant="body2">{isInternal ? '🔒 Nota interna (apenas equipe)' : '👁️ Nota pública (visível ao cliente)'}</Typography>}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || !note.trim()}>
          {loading ? 'Salvando...' : 'Salvar Nota'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================
// Main Component
// ============================================================
const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [statusDialog, setStatusDialog] = useState(false);
  const [solutionDialog, setSolutionDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [fileInput, setFileInput] = useState(null);
  const [internalUsers, setInternalUsers] = useState([]);
  const [noteDialog, setNoteDialog] = useState(false);
  // RejectDialog state — substitui window.prompt para evitar aria-hidden warning
  const [rejectDialog, setRejectDialog] = useState({ open: false, solutionId: null, isDirector: false });

  const internalRoles = ['atendente', 'gestor', 'diretor', 'superadmin'];
  const canEdit = internalRoles.includes(user?.role);

  const loadTicket = async () => {
    try {
      const { data } = await ticketAPI.getById(id);
      setTicket(data);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadTicket(); }, [id]);

  useEffect(() => {
    if (user && internalRoles.includes(user.role)) {
      userAPI.list().then(r => setInternalUsers(r.data.filter(u => internalRoles.includes(u.role)))).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const { data } = await ticketAPI.approveSolution(id, solutionId, { approved, rejection_reason: reason });
      if (approved) {
        if (data.next_level === 'diretor') {
          toast.success('✅ Aprovado! Aguardando confirmação do diretor.');
        } else {
          toast.success('✅ Solução aprovada — execução iniciada!');
        }
      } else {
        toast.success('❌ Solução reprovada');
      }
      loadTicket();
    } catch {
      toast.error('Erro ao processar solução');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!ticket) return <Box sx={{ mt: 4 }}><Alert severity="error">Ticket não encontrado</Alert></Box>;

  const pendingSolutions = ticket.solutions?.filter(s => s.status === 'pendente') || [];
  // Soluções que o usuário atual precisa autorizar agora
  const myPendingActions = pendingSolutions.filter(s =>
    (s.authorization_level === 'gestor' && ['gestor','diretor','superadmin'].includes(user?.role)) ||
    (s.authorization_level === 'diretor' && ['diretor','superadmin'].includes(user?.role))
  );
  const awaitingDirectorCount = pendingSolutions.filter(s => s.authorization_level === 'diretor').length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/tickets')} size="small">
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={700}>#{ticket.ticket_number}</Typography>
            <Chip label={ticket.status_name} size="small"
              sx={{ bgcolor: (ticket.status_color || '#666') + '20', color: ticket.status_color || '#666', fontWeight: 700 }} />
            <Chip label={
              ticket.priority === 'high' ? '🟠 Alta' : '⚪ Normal'
            } size="small" variant="outlined" />
            {ticket.brand_name && <Chip label={ticket.brand_name} size="small" variant="outlined" />}
          </Box>
          <Typography variant="body1" sx={{ mt: 0.5 }}>{ticket.title}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canEdit && (
            <>
              <Button variant="outlined" color="success" startIcon={<Lightbulb />}
                onClick={() => setSolutionDialog(true)} size="small">
                Propor Solução
              </Button>
              <Button variant="contained" onClick={() => setStatusDialog(true)} sx={{ fontWeight: 700 }}>
                ⚡ Atualizar Status
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Alertas de soluções pendentes */}
      {myPendingActions.length > 0 && user?.role === 'diretor' && awaitingDirectorCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          🔐 {awaitingDirectorCount} solução(ões) aguardando sua <strong>confirmação de diretor</strong> — veja a aba <strong>Principal</strong>
        </Alert>
      )}
      {myPendingActions.length > 0 && ['gestor','diretor'].includes(user?.role) && awaitingDirectorCount === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          💡 {myPendingActions.length} solução(ões) aguardando sua autorização — veja a aba <strong>Principal</strong>
        </Alert>
      )}

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
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
              variant="scrollable" scrollButtons="auto">
              <Tab label="Principal" />
              <Tab label="Anexos" />
              <Tab label={`Tarefas (${ticket.tasks?.length || 0})`} />
              <Tab label={`Histórico (${ticket.history?.length || 0})`} />
              <Tab label="📧 E-mail" />
            </Tabs>

            {/* ===================== Tab 0: Principal ===================== */}
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

                {/* Produtos */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    <Inventory fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                    Produtos ({ticket.products?.length || 0})
                  </Typography>
                </Box>
                {ticket.products?.length > 0 ? ticket.products.map(p => (
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
                )) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>Nenhum produto vinculado</Typography>
                )}

                {/* Soluções */}
                {(ticket.solutions?.length > 0 || canEdit) && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        💡 Soluções Propostas ({ticket.solutions?.length || 0})
                      </Typography>
                      {canEdit && (
                        <Button size="small" startIcon={<Add />} variant="outlined" color="success"
                          onClick={() => setSolutionDialog(true)}>
                          Propor
                        </Button>
                      )}
                    </Box>
                    {ticket.solutions?.length > 0 ? ticket.solutions.map(sol => {
                      const typeLabel = SOLUTION_TYPES.find(t => t.value === sol.solution_type)?.label || sol.solution_type;
                      const isAwaitingGestor  = sol.status === 'pendente' && sol.authorization_level === 'gestor';
                      const isAwaitingDirector = sol.status === 'pendente' && sol.authorization_level === 'diretor';
                      const canActAsGestor  = isAwaitingGestor  && ['gestor','diretor','superadmin'].includes(user?.role);
                      const canActAsDirector = isAwaitingDirector && ['diretor','superadmin'].includes(user?.role);
                      const borderColor = sol.status === 'aprovado' ? 'success.main'
                                        : sol.status === 'reprovado' ? 'error.main'
                                        : isAwaitingDirector ? 'warning.main' : 'divider';
                      return (
                        <Paper key={sol.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, borderColor }}>
                          {/* Cabeçalho: tipo + status */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Chip
                                label={typeLabel}
                                size="small"
                                sx={{ fontWeight: 700, fontSize: 11,
                                  bgcolor: sol.solution_type === 'troca' ? '#FF980020' :
                                           sol.solution_type === 'reembolso' ? '#F4433620' :
                                           sol.solution_type === 'cortesia' ? '#9C27B020' : '#1565C020',
                                  color:   sol.solution_type === 'troca' ? '#E65100' :
                                           sol.solution_type === 'reembolso' ? '#C62828' :
                                           sol.solution_type === 'cortesia' ? '#6A1B9A' : '#0D47A1',
                                }}
                              />
                              {sol.requires_director && (
                                <Chip label="🔐 Requer Diretor" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                              )}
                            </Box>
                            <Chip
                              label={
                                sol.status === 'aprovado' ? '✅ Aprovado' :
                                sol.status === 'reprovado' ? '❌ Reprovado' :
                                isAwaitingDirector ? '⏳ Aguard. Diretor' : '⏳ Aguard. Gestor'
                              }
                              color={sol.status === 'aprovado' ? 'success' : sol.status === 'reprovado' ? 'error' : isAwaitingDirector ? 'warning' : 'default'}
                              size="small" sx={{ flexShrink: 0 }}
                            />
                          </Box>

                          {/* Descrição */}
                          <Typography variant="body2" sx={{ mb: 1 }}>{sol.description}</Typography>

                          {/* Custo */}
                          {sol.has_cost && (
                            <Box sx={{ display: 'flex', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                              <Chip label={`💰 Custo: R$ ${parseFloat(sol.cost_value || 0).toFixed(2)}`}
                                size="small" color="warning" />
                              {sol.cost_notes && (
                                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                  {sol.cost_notes}
                                </Typography>
                              )}
                            </Box>
                          )}

                          {/* Autores e datas */}
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Proposta por: <strong>{sol.proposed_by_name}</strong> • {format(new Date(sol.created_at), 'dd/MM/yyyy HH:mm')}
                          </Typography>
                          {sol.approved_by_name && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {sol.status === 'reprovado' ? '❌ Reprovado' : '✅ Aprovado (nível 1)'} por: <strong>{sol.approved_by_name}</strong>
                            </Typography>
                          )}
                          {sol.director_approved_by && (
                            <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                              🔐 Confirmado pelo diretor — execução autorizada
                            </Typography>
                          )}

                          {/* Motivo de reprovação */}
                          {sol.rejection_reason && (
                            <Alert severity="error" sx={{ mt: 1, py: 0 }}>Motivo: {sol.rejection_reason}</Alert>
                          )}
                          {sol.director_rejection_reason && (
                            <Alert severity="error" sx={{ mt: 1, py: 0 }}>Reprovado pelo diretor: {sol.director_rejection_reason}</Alert>
                          )}

                          {/* Ações de autorização — Nível 1: gestor */}
                          {canActAsGestor && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                              <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />}
                                onClick={() => handleApproveSolution(sol.id, true)}>
                                {sol.requires_director ? 'Aprovar (enviar ao Diretor)' : 'Aprovar'}
                              </Button>
                              <Button size="small" variant="outlined" color="error" startIcon={<Cancel />}
                                onClick={() => setRejectDialog({ open: true, solutionId: sol.id, isDirector: false })}>
                                Reprovar
                              </Button>
                            </Box>
                          )}

                          {/* Ações de autorização — Nível 2: diretor */}
                          {canActAsDirector && (
                            <Box sx={{ mt: 1.5 }}>
                              <Alert severity="warning" sx={{ mb: 1, py: 0.5 }}>
                                <Typography variant="caption">
                                  🔐 Esta solução foi aprovada pelo gestor e aguarda sua <strong>confirmação final</strong> como diretor.
                                </Typography>
                              </Alert>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />}
                                  onClick={() => handleApproveSolution(sol.id, true)}>
                                  Confirmar e Autorizar Execução
                                </Button>
                                <Button size="small" variant="outlined" color="error" startIcon={<Cancel />}
                                  onClick={() => setRejectDialog({ open: true, solutionId: sol.id, isDirector: true })}>
                                  Reprovar
                                </Button>
                              </Box>
                            </Box>
                          )}
                        </Paper>
                      );
                    }) : (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                        Nenhuma solução proposta ainda
                      </Typography>
                    )}
                  </>
                )}

                {/* Blocos */}
                {ticket.blocks?.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>📦 Blocos do Ticket</Typography>
                    {ticket.blocks.map(block => (
                      <Box key={block.id} sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase' }}>
                          {block.block_type_name}
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mt: 0.5 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
                            {typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)}
                          </Typography>
                        </Paper>
                      </Box>
                    ))}
                  </>
                )}
              </CardContent>
            )}

            {/* ===================== Tab 1: Anexos ===================== */}
            {tab === 1 && (
              <CardContent>
                {canEdit && (
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
                            {(att.size_bytes / 1024).toFixed(0)} KB • {att.uploaded_by_name}
                          </Typography>
                        </Box>
                        <Button size="small" href={att.url} target="_blank" rel="noreferrer">Ver</Button>
                      </Paper>
                    </Grid>
                  ))}
                  {!ticket.attachments?.length && (
                    <Grid item xs={12}>
                      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>Nenhum anexo ainda</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            )}

            {/* ===================== Tab 2: Tarefas ===================== */}
            {tab === 2 && (
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  {canEdit && (
                    <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setTaskDialog(true)}>
                      Nova Tarefa
                    </Button>
                  )}
                </Box>
                {ticket.tasks?.map(task => {
                  const statusColor = task.status === 'concluida' ? 'success' : task.status === 'em_andamento' ? 'warning' : 'default';
                  return (
                    <Paper key={task.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
                          {task.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {task.description}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Chip label={task.status} size="small" color={statusColor} />
                            {task.assigned_name && (
                              <Chip label={`→ ${task.assigned_name}`} size="small" variant="outlined" />
                            )}
                            {task.due_date && (
                              <Typography variant="caption" color="text.secondary">
                                📅 {format(new Date(task.due_date), 'dd/MM/yyyy')}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {task.status !== 'concluida' && (
                          <Tooltip title="Lembrar via WhatsApp">
                            <IconButton size="small" color="success"
                              onClick={async () => {
                                try {
                                  const { data } = await taskAPI.whatsapp(task.id);
                                  window.open(data.whatsapp_url, '_blank');
                                } catch { toast.error('Usuário sem número de telefone cadastrado'); }
                              }}>
                              <WhatsApp fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
                {!ticket.tasks?.length && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    Nenhuma tarefa vinculada a este ticket
                  </Typography>
                )}
              </CardContent>
            )}

            {/* ===================== Tab 3: Histórico ===================== */}
            {tab === 3 && (
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  {canEdit && (
                    <Button size="small" variant="outlined" startIcon={<NoteAdd />}
                      onClick={() => setNoteDialog(true)}>
                      Adicionar Nota
                    </Button>
                  )}
                </Box>
                <List dense>
                  {ticket.history?.map(h => {
                    const actionInfo = ACTION_LABELS[h.action_type] || { label: h.action_type, icon: '📌' };
                    return (
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
                                <Chip label={`${actionInfo.icon} ${actionInfo.label}`} size="small"
                                  sx={{ height: 20, fontSize: 10 }} variant="outlined" />
                                {h.status_from_name && h.status_to_name && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Chip label={h.status_from_name} size="small" sx={{ height: 18, fontSize: 10 }} />
                                    <Typography variant="caption">→</Typography>
                                    <Chip label={h.status_to_name} size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
                                  </Box>
                                )}
                                {h.ball_to_name && (
                                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                                    ⚽ → {h.ball_to_name}
                                  </Typography>
                                )}
                              </Box>
                            }
                            secondary={
                              <Box>
                                {h.note && (
                                  <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
                                    "{h.note}"
                                  </Typography>
                                )}
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
                    );
                  })}
                  {!ticket.history?.length && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      Sem histórico ainda
                    </Typography>
                  )}
                </List>
              </CardContent>
            )}

            {/* ===================== Tab 4: Relatório E-mail ===================== */}
            {tab === 4 && (
              <CardContent>
                <EmailReportTab ticket={ticket} />
              </CardContent>
            )}
          </Card>
        </Grid>

        {/* Right — Sidebar info */}
        <Grid item xs={12} md={4}>
          {/* Bola & Atendente */}
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
              <Typography variant="caption" color="text.secondary">Atendente designado</Typography>
              <Typography variant="body2">{ticket.assigned_name || '—'}</Typography>
            </CardContent>
          </Card>

          {/* Cliente */}
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
                      <Tooltip title="Abrir WhatsApp">
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

          {/* Datas */}
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
                    <Typography variant="body2" color="success.main">
                      {format(new Date(ticket.resolved_at), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                  </Box>
                )}
                {ticket.auto_close_at && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Fecha automaticamente</Typography>
                    <Typography variant="body2" color="warning.main">
                      {format(new Date(ticket.auto_close_at), 'dd/MM/yyyy')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialogs */}
      <StatusUpdateDialog open={statusDialog} onClose={() => setStatusDialog(false)}
        ticket={ticket} onSuccess={loadTicket} />

      <SolutionDialog open={solutionDialog} onClose={() => setSolutionDialog(false)}
        ticketId={id} onSuccess={loadTicket} />

      <TaskDialog open={taskDialog} onClose={() => setTaskDialog(false)}
        ticketId={id} users={internalUsers} onSuccess={loadTicket} />

      <NoteDialog open={noteDialog} onClose={() => setNoteDialog(false)}
        ticketId={id} onSuccess={loadTicket} />

      {/* RejectDialog — substitui window.prompt para corrigir aria-hidden warning */}
      <RejectDialog
        open={rejectDialog.open}
        isDirector={rejectDialog.isDirector}
        onClose={() => setRejectDialog({ open: false, solutionId: null, isDirector: false })}
        onConfirm={(reason) => handleApproveSolution(rejectDialog.solutionId, false, reason)}
      />
    </Box>
  );
};

export default TicketDetailPage;
