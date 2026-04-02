import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Card, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, Avatar, Grid, Paper
} from '@mui/material';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Add, WhatsApp, Edit, Delete, ConfirmationNumber, DragIndicator } from '@mui/icons-material';
import { taskAPI, userAPI } from '../services/api';
import { useDispatch, useSelector } from 'react-redux';
import { setKanban, moveTask } from '../store/slices/taskSlice';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLUMNS = [
  { key: 'pendente', label: '📋 Pendente', color: '#607D8B' },
  { key: 'em_andamento', label: '⚡ Em Andamento', color: '#FF9800' },
  { key: 'concluida', label: '✅ Concluída', color: '#4CAF50' },
];

const SortableTaskCard = ({ task, onWhatsApp, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={isDragging ? 8 : 1}
      sx={{ p: 2, mb: 1.5, borderRadius: 2, cursor: 'grab', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.12)' } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box {...attributes} {...listeners} sx={{ color: 'text.disabled', cursor: 'grab', pt: 0.2 }}>
          <DragIndicator fontSize="small" />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          {task.ticket_number && (
            <Chip label={`#${task.ticket_number}`} size="small"
              icon={<ConfirmationNumber sx={{ fontSize: '12px !important' }} />}
              sx={{ mb: 1, height: 20, fontSize: 10, bgcolor: '#1565C020', color: '#1565C0' }} />
          )}
          <Typography variant="body2" fontWeight={600} gutterBottom>{task.title}</Typography>
          {task.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {task.description.length > 80 ? task.description.substring(0, 80) + '...' : task.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {task.assigned_name && (
                <Tooltip title={task.assigned_name}>
                  <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#1565C0' }}>
                    {task.assigned_name?.charAt(0)}
                  </Avatar>
                </Tooltip>
              )}
              {task.due_date && (
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(task.due_date), 'dd/MM')}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="WhatsApp">
                <IconButton size="small" sx={{ color: '#25D366' }} onClick={() => onWhatsApp(task)}>
                  <WhatsApp sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => onEdit(task)}>
                  <Edit sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton size="small" color="error" onClick={() => onDelete(task)}>
                  <Delete sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

const emptyForm = { title: '', description: '', assigned_to: '', ticket_id: '', due_date: '', status: 'pendente' };

const TasksKanbanPage = () => {
  const dispatch = useDispatch();
  const { kanban } = useSelector(s => s.tasks);
  const [users, setUsers] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadKanban = async () => {
    try {
      const { data } = await taskAPI.kanban();
      dispatch(setKanban(data));
    } catch { }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadKanban();
    userAPI.list().then(r => setUsers(r.data.filter(u => ['atendente', 'gestor', 'diretor'].includes(u.role)))).catch(() => {});
  }, []);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find source column
    let sourceCol = null;
    for (const col of COLUMNS) {
      if (kanban[col.key]?.find(t => t.id === active.id)) { sourceCol = col.key; break; }
    }

    // Find dest column (over could be a column key or task id)
    let destCol = COLUMNS.find(c => c.key === over.id)?.key;
    if (!destCol) {
      for (const col of COLUMNS) {
        if (kanban[col.key]?.find(t => t.id === over.id)) { destCol = col.key; break; }
      }
    }

    if (!sourceCol || !destCol || sourceCol === destCol) return;

    dispatch(moveTask({ taskId: active.id, fromCol: sourceCol, toCol: destCol }));
    try {
      await taskAPI.update(active.id, { status: destCol });
      toast.success('Tarefa movida!');
    } catch {
      loadKanban();
    }
  };

  const openCreate = () => { setEditingTask(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (task) => {
    setEditingTask(task);
    setForm({ title: task.title, description: task.description || '', assigned_to: task.assigned_to || '', ticket_id: task.ticket_id || '', due_date: task.due_date ? task.due_date.substring(0, 10) : '', status: task.status });
    setDialog(true);
  };

  const handleSave = async () => {
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
    if (!window.confirm('Excluir tarefa?')) return;
    try {
      await taskAPI.delete(task.id);
      toast.success('Tarefa excluída');
      loadKanban();
    } catch { }
  };

  const handleWhatsApp = async (task) => {
    try {
      const { data } = await taskAPI.whatsapp(task.id);
      window.open(data.url, '_blank');
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
          <Typography variant="body2" color="text.secondary">{totalTasks} tarefa(s) no total</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Nova Tarefa</Button>
      </Box>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {COLUMNS.map(col => (
            <Grid item xs={12} md={4} key={col.key}>
              <Card sx={{ bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{
                  px: 2, py: 1.5,
                  borderBottom: '3px solid',
                  borderColor: col.color,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <Typography variant="subtitle2" fontWeight={700}>{col.label}</Typography>
                  <Chip label={kanban[col.key]?.length || 0} size="small"
                    sx={{ bgcolor: col.color + '20', color: col.color, fontWeight: 700 }} />
                </Box>
                <Box sx={{ p: 1.5, minHeight: 200 }}>
                  <SortableContext
                    items={(kanban[col.key] || []).map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {(kanban[col.key] || []).map(task => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onWhatsApp={handleWhatsApp}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </SortableContext>
                  {(kanban[col.key] || []).length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                      <Typography variant="caption">Arraste tarefas aqui</Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DndContext>

      {/* Task Dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Título *" size="small" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <TextField fullWidth label="Descrição" size="small" multiline rows={3} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <FormControl fullWidth size="small">
              <InputLabel>Responsável</InputLabel>
              <Select value={form.assigned_to} label="Responsável"
                onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                <MenuItem value="">Não atribuído</MenuItem>
                {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="Prazo" size="small" type="date" InputLabelProps={{ shrink: true }}
              value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={form.status} label="Status"
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <MenuItem value="pendente">Pendente</MenuItem>
                <MenuItem value="em_andamento">Em Andamento</MenuItem>
                <MenuItem value="concluida">Concluída</MenuItem>
              </Select>
            </FormControl>
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
