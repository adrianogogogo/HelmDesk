import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, Avatar, Grid, Paper, Divider
} from '@mui/material';
import {
  DndContext, closestCenter, PointerSensor,
  KeyboardSensor, useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Add, WhatsApp, Edit, Delete, ConfirmationNumber,
  DragIndicator, CalendarToday, Person
} from '@mui/icons-material';
import { taskAPI, userAPI } from '../services/api';
import { useDispatch, useSelector } from 'react-redux';
import { setKanban, moveTask } from '../store/slices/taskSlice';
import toast from 'react-hot-toast';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLUMNS = [
  { key: 'pendente',     label: 'Pendente',     emoji: '📋', color: '#607D8B', bg: '#607D8B12' },
  { key: 'em_andamento', label: 'Em Andamento', emoji: '⚡', color: '#FF9800', bg: '#FF980012' },
  { key: 'concluida',    label: 'Concluída',    emoji: '✅', color: '#4CAF50', bg: '#4CAF5012' },
];

const PRIORITIES = {
  urgent: { label: 'Urgente', color: '#F44336', bg: '#FFEBEE' },
  high:   { label: 'Alta',    color: '#FF9800', bg: '#FFF3E0' },
  normal: { label: 'Normal',  color: '#2196F3', bg: '#E3F2FD' },
  low:    { label: 'Baixa',   color: '#9E9E9E', bg: '#F5F5F5' },
};

// Card individual (sortable)
const SortableTaskCard = ({ task, onWhatsApp, onEdit, onDelete, isDragOverlay }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const pri = PRIORITIES[task.priority] || PRIORITIES.normal;
  const dueDateRaw = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDateRaw && isPast(dueDateRaw) && task.status !== 'concluida' && !isToday(dueDateRaw);
  const isDueToday = dueDateRaw && isToday(dueDateRaw) && task.status !== 'concluida';

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={isDragOverlay ? 8 : isDragging ? 0 : 1}
      sx={{
        mb: 1.5, borderRadius: 2,
        border: '1px solid',
        borderColor: isOverdue ? '#F44336' : isDueToday ? '#FF9800' : 'divider',
        bgcolor: 'background.paper',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        overflow: 'hidden',
        '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.13)', borderColor: 'primary.main' },
        cursor: isDragOverlay ? 'grabbing' : 'default',
      }}
    >
      {/* Barra de prioridade (topo) */}
      <Box sx={{ height: 3, bgcolor: pri.color, borderRadius: '2px 2px 0 0' }} />

      <Box sx={{ p: 1.5 }}>
        {/* Linha 1: drag + ticket + prioridade */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          <Box
            {...attributes} {...listeners}
            sx={{ color: 'text.disabled', cursor: 'grab', mt: 0.3, flexShrink: 0, touchAction: 'none' }}
          >
            <DragIndicator fontSize="small" />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Linha de badges */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 0.8, flexWrap: 'wrap', alignItems: 'center' }}>
              {task.ticket_number && (
                <Chip
                  label={`#${task.ticket_number}`} size="small"
                  icon={<ConfirmationNumber sx={{ fontSize: '11px !important' }} />}
                  sx={{ height: 18, fontSize: 10, bgcolor: '#1565C015', color: '#1565C0', fontWeight: 700 }}
                />
              )}
              <Chip
                label={pri.label} size="small"
                sx={{ height: 18, fontSize: 10, bgcolor: pri.bg, color: pri.color, fontWeight: 600 }}
              />
            </Box>

            {/* Título */}
            <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.5 }}>
              {task.title}
            </Typography>

            {/* Descrição */}
            {task.description && (
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'block', mb: 0.8, lineHeight: 1.4 }}>
                {task.description.length > 90 ? task.description.substring(0, 90) + '…' : task.description}
              </Typography>
            )}

            <Divider sx={{ my: 0.8 }} />

            {/* Footer: assignee + data + ações */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Assignee + data */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {task.assigned_name ? (
                  <Tooltip title={task.assigned_name}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#1565C0', flexShrink: 0 }}>
                      {task.assigned_name.charAt(0)}
                    </Avatar>
                  </Tooltip>
                ) : (
                  <Tooltip title="Não atribuído">
                    <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#e0e0e0', color: '#9e9e9e', flexShrink: 0 }}>
                      <Person sx={{ fontSize: 14 }} />
                    </Avatar>
                  </Tooltip>
                )}
                {dueDateRaw && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <CalendarToday sx={{ fontSize: 11, color: isOverdue ? 'error.main' : isDueToday ? 'warning.main' : 'text.disabled' }} />
                    <Typography variant="caption"
                      sx={{ fontWeight: isOverdue || isDueToday ? 700 : 400,
                            color: isOverdue ? 'error.main' : isDueToday ? 'warning.main' : 'text.secondary' }}>
                      {isOverdue ? '⚠️ ' : isDueToday ? '🔔 ' : ''}
                      {format(dueDateRaw, 'dd/MM', { locale: ptBR })}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Ações */}
              <Box sx={{ display: 'flex', gap: 0 }}>
                <Tooltip title="Lembrete WhatsApp">
                  <IconButton size="small" sx={{ color: '#25D366', p: 0.4 }} onClick={() => onWhatsApp(task)}>
                    <WhatsApp sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar">
                  <IconButton size="small" sx={{ p: 0.4 }} onClick={() => onEdit(task)}>
                    <Edit sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <IconButton size="small" color="error" sx={{ p: 0.4 }} onClick={() => onDelete(task)}>
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

// Coluna droppable
const KanbanColumn = ({ col, tasks, onWhatsApp, onEdit, onDelete }) => (
  <Box
    sx={{
      bgcolor: col.bg,
      borderRadius: 3,
      border: '1px solid',
      borderColor: col.color + '30',
      minHeight: 300,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* Header */}
    <Box sx={{
      px: 2, py: 1.5,
      borderBottom: `3px solid ${col.color}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderRadius: '12px 12px 0 0',
    }}>
      <Typography variant="subtitle2" fontWeight={700}>
        {col.emoji} {col.label}
      </Typography>
      <Chip
        label={tasks.length}
        size="small"
        sx={{ bgcolor: col.color, color: '#fff', fontWeight: 700, fontSize: 11, height: 20 }}
      />
    </Box>

    {/* Cards */}
    <Box sx={{ p: 1.5, flexGrow: 1 }}>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map(task => (
          <SortableTaskCard key={task.id} task={task}
            onWhatsApp={onWhatsApp} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </SortableContext>
      {tasks.length === 0 && (
        <Box sx={{
          textAlign: 'center', py: 5, color: 'text.disabled',
          border: '2px dashed', borderColor: col.color + '40',
          borderRadius: 2, mt: 0.5,
        }}>
          <Typography variant="caption">Arraste tarefas aqui</Typography>
        </Box>
      )}
    </Box>
  </Box>
);

const emptyForm = { title: '', description: '', assigned_to: '', ticket_id: '', due_date: '', status: 'pendente', priority: 'normal' };

const TasksKanbanPage = () => {
  const dispatch = useDispatch();
  const { kanban } = useSelector(s => s.tasks);
  const [users, setUsers] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadKanban = async () => {
    try {
      const { data } = await taskAPI.kanban();
      dispatch(setKanban(data));
    } catch { }
  };

  useEffect(() => {
    loadKanban();
    userAPI.list()
      .then(r => setUsers(r.data.filter(u => ['atendente', 'gestor', 'diretor'].includes(u.role))))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findTaskById = (id) => {
    for (const col of COLUMNS) {
      const t = kanban[col.key]?.find(t => t.id === id);
      if (t) return t;
    }
    return null;
  };

  const findColByTaskId = (id) => {
    for (const col of COLUMNS) {
      if (kanban[col.key]?.find(t => t.id === id)) return col.key;
    }
    return null;
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveTask(findTaskById(active.id));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const sourceCol = findColByTaskId(active.id);
    let destCol = COLUMNS.find(c => c.key === over.id)?.key;
    if (!destCol) destCol = findColByTaskId(over.id);

    if (!sourceCol || !destCol || sourceCol === destCol) return;

    dispatch(moveTask({ taskId: active.id, fromCol: sourceCol, toCol: destCol }));
    try {
      await taskAPI.update(active.id, { status: destCol });
      toast.success(`Tarefa movida para ${COLUMNS.find(c => c.key === destCol)?.label}!`);
    } catch {
      loadKanban();
    }
  };

  const openCreate = () => { setEditingTask(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      ticket_id: task.ticket_id || '',
      due_date: task.due_date ? task.due_date.substring(0, 10) : '',
      status: task.status,
      priority: task.priority || 'normal',
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
      const msg = encodeURIComponent(`Olá! Você tem uma tarefa pendente: *${task.title}*. Acesse o sistema: http://177.153.39.134:3000`);
      window.open(`https://wa.me/?text=${msg}`, '_blank');
    }
  };

  const totalTasks = COLUMNS.reduce((acc, col) => acc + (kanban[col.key]?.length || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Tarefas — Kanban</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalTasks} tarefa(s) no total
            {' · '}
            {COLUMNS.map(c => `${kanban[c.key]?.length || 0} ${c.label.toLowerCase()}`).join(' · ')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Nova Tarefa</Button>
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Grid container spacing={2}>
          {COLUMNS.map(col => (
            <Grid item xs={12} md={4} key={col.key}>
              <KanbanColumn
                col={col}
                tasks={kanban[col.key] || []}
                onWhatsApp={handleWhatsApp}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>

        {/* Overlay visível durante o drag */}
        <DragOverlay>
          {activeTask ? (
            <SortableTaskCard
              task={activeTask}
              onWhatsApp={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Dialog criar/editar */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingTask ? '✏️ Editar Tarefa' : '➕ Nova Tarefa'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Título *" size="small" value={form.title}
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
                  <InputLabel>Status</InputLabel>
                  <Select value={form.status} label="Status"
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
          <Button variant="contained" onClick={handleSave} disabled={loading || !form.title}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksKanbanPage;
