import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, Avatar, Grid, Paper
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Add, WhatsApp, Edit, Delete, ConfirmationNumber } from '@mui/icons-material';
import { taskAPI, userAPI, ticketAPI } from '../services/api';
import { useDispatch, useSelector } from 'react-redux';
import { setKanban, moveTask } from '../store/slices/taskSlice';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLUMNS = [
  { key: 'pendente', label: 'Pendente', color: '#607D8B' },
  { key: 'em_andamento', label: 'Em Andamento', color: '#FF9800' },
  { key: 'concluida', label: 'Concluída', color: '#4CAF50' },
];

const TaskCard = ({ task, index, onWhatsApp, onEdit }) => (
  <Draggable draggableId={task.id} index={index}>
    {(provided, snapshot) => (
      <Paper
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        elevation={snapshot.isDragging ? 8 : 1}
        className={snapshot.isDragging ? 'kanban-card-dragging' : ''}
        sx={{ p: 2, mb: 1.5, borderRadius: 2, cursor: 'grab', transition: 'box-shadow 0.2s',
          '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.12)' } }}
      >
        {task.ticket_number && (
          <Chip
            label={`#${task.ticket_number}`}
            size="small"
            icon={<ConfirmationNumber sx={{ fontSize: '12px !important' }} />}
            sx={{ mb: 1, height: 20, fontSize: 10, bgcolor: '#1565C020', color: '#1565C0' }}
          />
        )}
        <Typography variant="body2" fontWeight={600} gutterBottom>{task.title}</Typography>
        {task.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {task.description.length > 80 ? task.description.substring(0, 80) + '...' : task.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#1565C0' }}>
              {task.assigned_name?.charAt(0) || '?'}
            </Avatar>
            <Typography variant="caption" color="text.secondary">
              {task.assigned_name?.split(' ')[0] || 'Não atribuído'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="WhatsApp">
              <IconButton size="small" color="success" onClick={() => onWhatsApp(task)}>
                <WhatsApp sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => onEdit(task)}>
                <Edit sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {task.due_date && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
            ⏰ {format(new Date(task.due_date), 'dd/MM')}
          </Typography>
        )}
      </Paper>
    )}
  </Draggable>
);

const TasksKanbanPage = () => {
  const dispatch = useDispatch();
  const { kanban } = useSelector(s => s.tasks);
  const { user } = useSelector(s => s.auth);
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'normal', due_date: '' });

  const loadKanban = useCallback(async () => {
    try {
      const { data } = await taskAPI.kanban();
      dispatch(setKanban(data));
    } catch {}
  }, [dispatch]);

  useEffect(() => {
    loadKanban();
    userAPI.list().then(r => setUsers(r.data)).catch(() => {});
  }, [loadKanban]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const fromCol = source.droppableId;
    const toCol = destination.droppableId;

    dispatch(moveTask({ taskId: draggableId, fromCol, toCol }));

    try {
      await taskAPI.update(draggableId, { status: toCol, sort_order: destination.index });
      toast.success(`Tarefa movida para "${COLUMNS.find(c => c.key === toCol)?.label}"`);
    } catch {
      loadKanban(); // revert
    }
  };

  const handleSaveTask = async () => {
    try {
      if (editTask) {
        await taskAPI.update(editTask.id, form);
        toast.success('Tarefa atualizada!');
      } else {
        await taskAPI.create(form);
        toast.success('Tarefa criada! ⚽');
      }
      setDialogOpen(false);
      setEditTask(null);
      setForm({ title: '', description: '', assigned_to: '', priority: 'normal', due_date: '' });
      loadKanban();
    } catch {}
  };

  const openCreate = () => {
    setEditTask(null);
    setForm({ title: '', description: '', assigned_to: user?.id || '', priority: 'normal', due_date: '' });
    setDialogOpen(true);
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({ title: task.title, description: task.description || '', assigned_to: task.assigned_to || '', priority: task.priority, due_date: task.due_date ? task.due_date.split('T')[0] : '' });
    setDialogOpen(true);
  };

  const handleWhatsApp = async (task) => {
    try {
      const { data } = await taskAPI.whatsapp(task.id);
      window.open(data.whatsapp_url, '_blank');
    } catch {
      toast.error('Usuário sem telefone cadastrado');
    }
  };

  const totalCount = Object.values(kanban).flat().length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Tarefas — Kanban</Typography>
          <Typography variant="body2" color="text.secondary">{totalCount} tarefa(s) no total</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Nova Tarefa</Button>
      </Box>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {COLUMNS.map(col => (
            <Grid item xs={12} md={4} key={col.key}>
              <Card sx={{ height: '100%', bgcolor: 'background.default' }}>
                <CardContent sx={{ pb: '8px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: col.color }} />
                      <Typography variant="subtitle1" fontWeight={700}>{col.label}</Typography>
                    </Box>
                    <Chip
                      label={kanban[col.key]?.length || 0}
                      size="small"
                      sx={{ bgcolor: col.color + '20', color: col.color, fontWeight: 700 }}
                    />
                  </Box>

                  <Droppable droppableId={col.key}>
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                          minHeight: 200,
                          p: 1,
                          borderRadius: 2,
                          bgcolor: snapshot.isDraggingOver ? col.color + '10' : 'transparent',
                          transition: 'background 0.2s',
                        }}
                      >
                        {kanban[col.key]?.map((task, idx) => (
                          <TaskCard
                            key={task.id} task={task} index={idx}
                            onWhatsApp={handleWhatsApp}
                            onEdit={openEdit}
                          />
                        ))}
                        {provided.placeholder}
                        {!kanban[col.key]?.length && (
                          <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                            <Typography variant="caption">Sem tarefas aqui</Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Título *" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} size="small" label="Descrição"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Responsável</InputLabel>
                <Select value={form.assigned_to} label="Responsável"
                  onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                  {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Prioridade</InputLabel>
                <Select value={form.priority} label="Prioridade"
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <MenuItem value="low">Baixa</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Prazo" type="date"
                value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveTask} disabled={!form.title}>
            {editTask ? 'Salvar' : 'Criar Tarefa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksKanbanPage;
