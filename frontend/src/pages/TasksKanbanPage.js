import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, Avatar, Grid, Paper, Divider, Link
} from '@mui/material';
import {
  DndContext, rectIntersection, PointerSensor,
  KeyboardSensor, useSensor, useSensors, DragOverlay, useDroppable
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Add, WhatsApp, Edit, Delete, ConfirmationNumber,
  DragIndicator, CalendarToday, Person, CheckCircle, OpenInNew, Close
} from '@mui/icons-material';
import { taskAPI, userAPI } from '../services/api';
import { useDispatch, useSelector } from 'react-redux';
import { setKanban, moveTask } from '../store/slices/taskSlice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLUMNS = [
  { key: 'pendente',     label: 'Pendente',     emoji: '📋', color: '#607D8B', bg: '#607D8B0D' },
  { key: 'em_andamento', label: 'Em Andamento', emoji: '⚡', color: '#FF9800', bg: '#FF98000D' },
  { key: 'concluida',    label: 'Concluída',    emoji: '✅', color: '#4CAF50', bg: '#4CAF500D' },
];

const PRIORITIES = {
  urgent: { label: 'Urgente', color: '#F44336', bg: '#FFEBEE' },
  high:   { label: 'Alta',    color: '#FF9800', bg: '#FFF3E0' },
  normal: { label: 'Normal',  color: '#2196F3', bg: '#E3F2FD' },
  low:    { label: 'Baixa',   color: '#9E9E9E', bg: '#F5F5F5' },
};

// ─── Card individual (sortable) ───────────────────────────────
const SortableTaskCard = ({ task, onWhatsApp, onEdit, onDelete, onClose, onView, isDragOverlay }) => {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: String(task.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const pri = PRIORITIES[task.priority] || PRIORITIES.normal;
  const dueDateRaw = task.due_date ? new Date(task.due_date) : null;
  const isOverdue  = dueDateRaw && isPast(dueDateRaw)  && task.status !== 'concluida' && !isToday(dueDateRaw);
  const isDueToday = dueDateRaw && isToday(dueDateRaw) && task.status !== 'concluida';

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={isDragOverlay ? 8 : 1}
      sx={{
        mb: 1.5, borderRadius: 2,
        border: '1px solid',
        borderColor: isOverdue ? '#F44336' : isDueToday ? '#FF9800' : 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.13)', borderColor: 'primary.main' },
        cursor: isDragOverlay ? 'grabbing' : 'default',
      }}
    >
      {/* Barra de prioridade colorida no topo */}
      <Box sx={{ height: 3, bgcolor: pri.color }} />

      <Box sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          {/* Handle de drag */}
          <Box
            {...attributes}
            {...listeners}
            sx={{
              color: 'text.disabled', cursor: 'grab', mt: 0.3,
              flexShrink: 0, touchAction: 'none',
              '&:active': { cursor: 'grabbing' },
            }}
          >
            <DragIndicator fontSize="small" />
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Badges: ticket + prioridade */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 0.7, flexWrap: 'wrap', alignItems: 'center' }}>
              {task.ticket_number && (
                <Chip
                  label={`#${task.ticket_number}`} size="small"
                  icon={<ConfirmationNumber sx={{ fontSize: '11px !important' }} />}
                  onClick={(e) => { e.stopPropagation(); onView && onView('ticket', task); }}
                  sx={{ height: 18, fontSize: 10, bgcolor: '#1565C015', color: '#1565C0', fontWeight: 700, cursor: 'pointer' }}
                />
              )}
              <Chip
                label={pri.label} size="small"
                sx={{ height: 18, fontSize: 10, bgcolor: pri.bg, color: pri.color, fontWeight: 600 }}
              />
            </Box>

            {/* Título — clicável para ver detalhes */}
            <Typography
              variant="body2" fontWeight={700}
              sx={{ lineHeight: 1.3, mb: 0.4, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
              onClick={() => onView && onView('task', task)}
            >
              {task.title}
            </Typography>

            {/* Descrição truncada */}
            {task.description && (
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'block', mb: 0.8, lineHeight: 1.4 }}>
                {task.description.length > 80
                  ? task.description.substring(0, 80) + '…'
                  : task.description}
              </Typography>
            )}

            <Divider sx={{ my: 0.8 }} />

            {/* Footer: avatar + data + ações */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                {task.assigned_name ? (
                  <Tooltip title={task.assigned_name}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#1565C0', flexShrink: 0 }}>
                      {task.assigned_name.charAt(0)}
                    </Avatar>
                  </Tooltip>
                ) : (
                  <Tooltip title="Não atribuído">
                    <Avatar sx={{ width: 22, height: 22, bgcolor: '#e0e0e0', color: '#9e9e9e', flexShrink: 0 }}>
                      <Person sx={{ fontSize: 14 }} />
                    </Avatar>
                  </Tooltip>
                )}
                {dueDateRaw && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <CalendarToday sx={{
                      fontSize: 11,
                      color: isOverdue ? 'error.main' : isDueToday ? 'warning.main' : 'text.disabled',
                    }} />
                    <Typography variant="caption" sx={{
                      fontWeight: isOverdue || isDueToday ? 700 : 400,
                      color: isOverdue ? 'error.main' : isDueToday ? 'warning.main' : 'text.secondary',
                    }}>
                      {isOverdue ? '⚠️ ' : isDueToday ? '🔔 ' : ''}
                      {format(dueDateRaw, 'dd/MM', { locale: ptBR })}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Ações */}
              <Box sx={{ display: 'flex', gap: 0 }}>
                {task.status !== 'concluida' && (
                  <Tooltip title="Encerrar tarefa">
                    <IconButton size="small" sx={{ color: '#4CAF50', p: 0.4 }}
                      onClick={() => onClose(task)}>
                      <CheckCircle sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Lembrete WhatsApp">
                  <IconButton size="small" sx={{ color: '#25D366', p: 0.4 }}
                    onClick={() => onWhatsApp(task)}>
                    <WhatsApp sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar">
                  <IconButton size="small" sx={{ p: 0.4 }} onClick={() => onEdit(task)}>
                    <Edit sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <IconButton size="small" color="error" sx={{ p: 0.4 }}
                    onClick={() => onDelete(task)}>
                    <Delete sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

// ─── Coluna droppable ──────────────────────────────────────────
const KanbanColumn = ({ col, tasks, isDragOver, onWhatsApp, onEdit, onDelete, onClose, onView }) => {
  const { setNodeRef } = useDroppable({ id: col.key });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        bgcolor: isDragOver ? col.color + '18' : col.bg,
        borderRadius: 3, border: '2px solid',
        borderColor: isDragOver ? col.color : col.color + '30',
        minHeight: 340, display: 'flex', flexDirection: 'column',
        transition: 'all 0.15s',
      }}
    >
      <Box sx={{
        px: 2, py: 1.5, borderBottom: `3px solid ${col.color}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderRadius: '10px 10px 0 0',
      }}>
        <Typography variant="subtitle2" fontWeight={700}>{col.emoji} {col.label}</Typography>
        <Chip label={tasks.length} size="small"
          sx={{ bgcolor: col.color, color: '#fff', fontWeight: 700, fontSize: 11, height: 20 }} />
      </Box>

      <Box sx={{ p: 1.5, flexGrow: 1 }}>
        <SortableContext items={tasks.map(t => String(t.id))} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task}
              onWhatsApp={onWhatsApp} onEdit={onEdit}
              onDelete={onDelete} onClose={onClose} onView={onView} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <Box sx={{
            textAlign: 'center', py: 5, color: isDragOver ? col.color : 'text.disabled',
            border: '2px dashed', borderColor: isDragOver ? col.color : col.color + '40',
            borderRadius: 2, mt: 0.5, transition: 'all 0.15s',
          }}>
            <Typography variant="caption" fontWeight={isDragOver ? 700 : 400}>
              {isDragOver ? '⬇ Soltar aqui' : 'Arraste tarefas aqui'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const emptyForm = {
  title: '', description: '', assigned_to: '', ticket_id: '',
  due_date: '', status: 'pendente', priority: 'normal',
};

// ─── Página principal ──────────────────────────────────────────
const TasksKanbanPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { kanban } = useSelector(s => s.tasks);
  const { user } = useSelector(s => s.auth);
  const isAdmin = ['diretor', 'superadmin'].includes(user?.role);

  const [users, setUsers] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [overColKey, setOverColKey] = useState(null);
  const [viewTask, setViewTask] = useState(null); // popup de detalhe

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadKanban = async () => {
    try {
      const { data } = await taskAPI.kanban();
      // RBAC: admin vê tudo; outros veem apenas as suas
      if (!isAdmin && user) {
        const filtered = {};
        for (const col of ['pendente', 'em_andamento', 'concluida']) {
          filtered[col] = (data[col] || []).filter(
            t => String(t.assigned_to) === String(user.id) ||
                 String(t.created_by)  === String(user.id)
          );
        }
        dispatch(setKanban(filtered));
      } else {
        dispatch(setKanban(data));
      }
    } catch { }
  };

  useEffect(() => {
    loadKanban();
    userAPI.list()
      .then(r => setUsers(r.data.filter(u => ['atendente', 'gestor', 'diretor', 'superadmin'].includes(u.role))))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findColByTaskId = (id) => {
    const sid = String(id);
    for (const col of COLUMNS) {
      if (kanban[col.key]?.find(t => String(t.id) === sid)) return col.key;
    }
    return null;
  };

  const resolveDestCol = (overId) => {
    if (COLUMNS.find(c => c.key === overId)) return overId;
    return findColByTaskId(overId);
  };

  const handleDragStart = ({ active }) => {
    const sid = String(active.id);
    for (const col of COLUMNS) {
      const found = kanban[col.key]?.find(t => String(t.id) === sid);
      if (found) { setActiveTask(found); return; }
    }
    setActiveTask(null);
  };

  const handleDragOver = ({ over }) => {
    if (!over) { setOverColKey(null); return; }
    setOverColKey(resolveDestCol(over.id));
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    setOverColKey(null);
    if (!over) return;

    const sourceCol = findColByTaskId(active.id);
    const destCol   = resolveDestCol(over.id);
    if (!sourceCol || !destCol || sourceCol === destCol) return;

    dispatch(moveTask({ taskId: active.id, fromCol: sourceCol, toCol: destCol }));
    try {
      await taskAPI.update(active.id, { status: destCol });
      toast.success(
        `Tarefa movida para ${COLUMNS.find(c => c.key === destCol)?.label}!`,
        { icon: COLUMNS.find(c => c.key === destCol)?.emoji }
      );
    } catch {
      toast.error('Erro ao mover tarefa');
      loadKanban();
    }
  };

  const handleCloseTask = async (task) => {
    dispatch(moveTask({ taskId: String(task.id), fromCol: task.status, toCol: 'concluida' }));
    try {
      await taskAPI.update(task.id, { status: 'concluida' });
      toast.success('✅ Tarefa encerrada!');
    } catch {
      toast.error('Erro ao encerrar tarefa');
      loadKanban();
    }
  };

  const handleView = (type, task) => {
    if (type === 'ticket' && task.ticket_id) {
      navigate(`/tickets/${task.ticket_id}`);
    } else {
      setViewTask(task);
    }
  };

  const openCreate = () => { setEditingTask(null); setForm(emptyForm); setDialog(true); };
  const openEdit   = (task) => {
    setEditingTask(task);
    setForm({
      title:       task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      ticket_id:   task.ticket_id || '',
      due_date:    task.due_date ? task.due_date.substring(0, 10) : '',
      status:      task.status,
      priority:    task.priority || 'normal',
    });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Título é obrigatório'); return; }
    setLoading(true);
    try {
      if (editingTask) {
        await taskAPI.update(editingTask.id, form);
        toast.success('Tarefa atualizada! ⚽');
      } else {
        await taskAPI.create(form);
        toast.success('Tarefa criada! ⚽');
      }
      setDialog(false);
      loadKanban();
    } catch { } finally { setLoading(false); }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Excluir tarefa "${task.title}"?`)) return;
    try {
      await taskAPI.delete(task.id);
      toast.success('Tarefa excluída');
      loadKanban();
    } catch { }
  };

  const handleWhatsApp = async (task) => {
    try {
      const { data } = await taskAPI.whatsapp(task.id);
      window.open(data.whatsapp_url, '_blank');
    } catch {
      const msg = encodeURIComponent(
        `Olá! Você tem uma tarefa pendente: *${task.title}*. Acesse o sistema: http://177.153.39.134:3000`
      );
      window.open(`https://wa.me/?text=${msg}`, '_blank');
    }
  };

  const totalTasks = COLUMNS.reduce((acc, col) => acc + (kanban[col.key]?.length || 0), 0);
  const pri = viewTask ? (PRIORITIES[viewTask.priority] || PRIORITIES.normal) : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Tarefas — Kanban</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalTasks} tarefa(s) · {COLUMNS.map(c =>
              `${kanban[c.key]?.length || 0} ${c.label.toLowerCase()}`
            ).join(' · ')}
            {!isAdmin && <span style={{ color: '#FF9800', marginLeft: 8 }}>· apenas suas tarefas</span>}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Nova Tarefa</Button>
      </Box>

      <DndContext sensors={sensors} collisionDetection={rectIntersection}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {COLUMNS.map(col => (
            <Grid item xs={12} md={4} key={col.key}>
              <KanbanColumn
                col={col} tasks={kanban[col.key] || []}
                isDragOver={overColKey === col.key}
                onWhatsApp={handleWhatsApp} onEdit={openEdit}
                onDelete={handleDelete} onClose={handleCloseTask} onView={handleView}
              />
            </Grid>
          ))}
        </Grid>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeTask ? (
            <SortableTaskCard task={activeTask}
              onWhatsApp={() => {}} onEdit={() => {}}
              onDelete={() => {}} onClose={() => {}} onView={() => {}}
              isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Popup detalhe da tarefa ────────────────────────────── */}
      <Dialog open={!!viewTask} onClose={() => setViewTask(null)} maxWidth="sm" fullWidth disableRestoreFocus>
        {viewTask && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={pri.label} size="small"
                  sx={{ bgcolor: pri.bg, color: pri.color, fontWeight: 700 }} />
                <Typography variant="h6" fontWeight={700}>{viewTask.title}</Typography>
              </Box>
              <IconButton size="small" onClick={() => setViewTask(null)}><Close /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Ticket vinculado */}
                {viewTask.ticket_number && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ConfirmationNumber fontSize="small" color="primary" />
                    <Typography variant="body2" color="text.secondary">Ticket:</Typography>
                    <Link
                      component="button"
                      variant="body2"
                      fontWeight={700}
                      onClick={() => { setViewTask(null); navigate(`/tickets/${viewTask.ticket_id}`); }}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      #{viewTask.ticket_number}
                      <OpenInNew sx={{ fontSize: 13 }} />
                    </Link>
                    {viewTask.ticket_title && (
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                        — {viewTask.ticket_title}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>Status:</Typography>
                  {(() => {
                    const col = COLUMNS.find(c => c.key === viewTask.status);
                    return <Chip label={`${col?.emoji} ${col?.label}`} size="small"
                      sx={{ bgcolor: col?.color + '20', color: col?.color, fontWeight: 600 }} />;
                  })()}
                </Box>

                {/* Responsável */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>Responsável:</Typography>
                  {viewTask.assigned_name ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: '#1565C0' }}>
                        {viewTask.assigned_name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>{viewTask.assigned_name}</Typography>
                    </Box>
                  ) : <Typography variant="body2" color="text.secondary">Não atribuído</Typography>}
                </Box>

                {/* Prazo */}
                {viewTask.due_date && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>Prazo:</Typography>
                    <Typography variant="body2" fontWeight={600}
                      sx={{ color: isPast(new Date(viewTask.due_date)) && viewTask.status !== 'concluida' ? 'error.main' : 'inherit' }}>
                      {format(new Date(viewTask.due_date), "dd/MM/yyyy", { locale: ptBR })}
                    </Typography>
                  </Box>
                )}

                {/* Criado por */}
                {viewTask.created_by_name && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>Criado por:</Typography>
                    <Typography variant="body2">{viewTask.created_by_name}</Typography>
                  </Box>
                )}

                {/* Descrição */}
                {viewTask.description && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Descrição:</Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {viewTask.description}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
              {viewTask.status !== 'concluida' && (
                <Button
                  variant="contained" color="success" startIcon={<CheckCircle />}
                  onClick={() => { handleCloseTask(viewTask); setViewTask(null); }}
                >
                  Encerrar Tarefa
                </Button>
              )}
              <Button startIcon={<Edit />} onClick={() => { openEdit(viewTask); setViewTask(null); }}>
                Editar
              </Button>
              <Button onClick={() => setViewTask(null)}>Fechar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog criar / editar ──────────────────────────────── */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingTask ? '✏️ Editar Tarefa' : '➕ Nova Tarefa'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Título *" size="small"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <TextField fullWidth label="Descrição" size="small" multiline rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
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
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status inicial</InputLabel>
                  <Select value={form.status} label="Status inicial"
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <MenuItem value="pendente">📋 Pendente</MenuItem>
                    <MenuItem value="em_andamento">⚡ Em Andamento</MenuItem>
                    <MenuItem value="concluida">✅ Concluída</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <FormControl fullWidth size="small">
              <InputLabel>Responsável</InputLabel>
              <Select value={form.assigned_to} label="Responsável"
                onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                <MenuItem value="">Não atribuído</MenuItem>
                {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="Prazo" size="small" type="date"
              InputLabelProps={{ shrink: true }}
              value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={loading || !form.title}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksKanbanPage;
