import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Card, CardContent, Typography, Button, TextField, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, TablePagination,
  Select, MenuItem, FormControl, InputLabel, Grid, IconButton,
  Tooltip, CircularProgress, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { Add, FilterList, Refresh, OpenInNew, FilterAlt } from '@mui/icons-material';
import { ticketAPI, brandAPI, userAPI } from '../services/api';
import { setTickets } from '../store/slices/ticketSlice';
import { format } from 'date-fns';

const PRIORITIES = {
  urgent: { label: 'Urgente', color: '#F44336' },
  high:   { label: 'Alta',    color: '#FF9800' },
  normal: { label: 'Normal',  color: '#2196F3' },
  low:    { label: 'Baixa',   color: '#9E9E9E' },
};

// IDs dos status considerados "finalizados" (excluídos no filtro "Ativos")
const CLOSED_STATUS_IDS = [9, 10]; // Resolvido, Fechado/Arquivado

const TicketsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, total } = useSelector(s => s.tickets);
  const { user } = useSelector(s => s.auth);

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statuses, setStatuses] = useState([]);
  const [brands, setBrands] = useState([]);
  const [internalUsers, setInternalUsers] = useState([]);
  const [activePreset, setActivePreset] = useState('all'); // 'all' | 'active'
  const [localFilters, setLocalFilters] = useState({
    status_id: '',
    brand_id: '',
    priority: '',
    search: '',
    assigned_to: '',
  });

  const buildParams = (overrides = {}) => {
    const base = { page: page + 1, limit: rowsPerPage, ...localFilters, ...overrides };
    // Filtro "Ativos": excluir tickets resolvidos/fechados
    if (activePreset === 'active' && !base.status_id) {
      base.exclude_status_ids = CLOSED_STATUS_IDS.join(',');
    }
    Object.keys(base).forEach(k => (base[k] === '' || base[k] == null) && delete base[k]);
    return base;
  };

  const fetchData = async (overrides = {}) => {
    setLoading(true);
    try {
      const { data } = await ticketAPI.list(buildParams(overrides));
      dispatch(setTickets(data));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [page, rowsPerPage, activePreset]);

  useEffect(() => {
    ticketAPI.getStatuses().then(r => setStatuses(r.data)).catch(() => {});
    brandAPI.list().then(r => setBrands(r.data)).catch(() => {});
    if (['atendente', 'gestor', 'diretor'].includes(user?.role)) {
      userAPI.list().then(r =>
        setInternalUsers(r.data.filter(u => ['atendente', 'gestor', 'diretor'].includes(u.role)))
      ).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => { setPage(0); fetchData({ page: 1 }); };

  const clearFilters = () => {
    setLocalFilters({ status_id: '', brand_id: '', priority: '', search: '', assigned_to: '' });
    setActivePreset('all');
    setPage(0);
  };

  const hasActiveFilters = Object.values(localFilters).some(Boolean) || activePreset === 'active';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Tickets</Typography>
          <Typography variant="body2" color="text.secondary">{total} ticket(s) encontrado(s)</Typography>
        </Box>
        {['atendente','gestor','diretor','loja'].includes(user?.role) && (
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/tickets/novo')}>
            Novo Ticket
          </Button>
        )}
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 2 }}>
          {/* Linha 1: preset de atividade */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <FilterAlt fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>Vista rápida:</Typography>
            <ToggleButtonGroup
              value={activePreset}
              exclusive
              onChange={(_, v) => { if (v) { setActivePreset(v); setPage(0); } }}
              size="small"
            >
              <ToggleButton value="all" sx={{ px: 2, fontSize: 12 }}>Todos</ToggleButton>
              <ToggleButton value="active" sx={{ px: 2, fontSize: 12 }}>
                🟢 Ativos
              </ToggleButton>
            </ToggleButtonGroup>
            {hasActiveFilters && (
              <Button size="small" variant="text" color="error" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </Box>

          {/* Linha 2: filtros detalhados */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth size="small" label="Buscar..."
                value={localFilters.search}
                onChange={e => setLocalFilters(p => ({ ...p, search: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={localFilters.status_id} label="Status"
                  onChange={e => setLocalFilters(p => ({ ...p, status_id: e.target.value }))}>
                  <MenuItem value="">Todos</MenuItem>
                  {statuses.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Marca</InputLabel>
                <Select value={localFilters.brand_id} label="Marca"
                  onChange={e => setLocalFilters(p => ({ ...p, brand_id: e.target.value }))}>
                  <MenuItem value="">Todas</MenuItem>
                  {brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Prioridade</InputLabel>
                <Select value={localFilters.priority} label="Prioridade"
                  onChange={e => setLocalFilters(p => ({ ...p, priority: e.target.value }))}>
                  <MenuItem value="">Todas</MenuItem>
                  {Object.entries(PRIORITIES).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {['atendente','gestor','diretor'].includes(user?.role) && (
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Responsável</InputLabel>
                  <Select value={localFilters.assigned_to} label="Responsável"
                    onChange={e => setLocalFilters(p => ({ ...p, assigned_to: e.target.value }))}>
                    <MenuItem value="">Todos</MenuItem>
                    {internalUsers.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={6} md={1}>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button variant="contained" onClick={applyFilters} fullWidth size="small" sx={{ minWidth: 0 }}>
                  <FilterList />
                </Button>
                <Tooltip title="Atualizar">
                  <IconButton size="small" onClick={() => fetchData()}><Refresh /></IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Número</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Marca</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Prioridade</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Data</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">Nenhum ticket encontrado</Typography>
                </TableCell>
              </TableRow>
            ) : list.map(ticket => {
              const pri = PRIORITIES[ticket.priority] || PRIORITIES.normal;
              return (
                <TableRow key={ticket.id} hover sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      #{ticket.ticket_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ticket.title}
                    </Typography>
                    {ticket.pending_tasks > 0 && (
                      <Chip label={`${ticket.pending_tasks} tarefa(s)`} size="small"
                        sx={{ height: 16, fontSize: 10, mt: 0.3 }} color="warning" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{ticket.client_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{ticket.store_name}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{ticket.brand_name || '—'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={ticket.status_name} size="small"
                      sx={{ bgcolor: (ticket.status_color || '#666') + '20', color: ticket.status_color || '#666', fontWeight: 600, fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={pri.label} size="small"
                      sx={{ bgcolor: pri.color + '20', color: pri.color, fontWeight: 600, fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`Bola: ${ticket.ball_owner_name || '—'}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span style={{ fontSize: 14 }}>⚽</span>
                        <Typography variant="caption">{ticket.ball_owner_name?.split(' ')[0] || '—'}</Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(ticket.created_at), 'dd/MM/yy')}
                    </Typography>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Tooltip title="Abrir">
                      <IconButton size="small" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="por página"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Card>
    </Box>
  );
};

export default TicketsPage;
