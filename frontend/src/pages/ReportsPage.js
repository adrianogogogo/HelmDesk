import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { Download } from '@mui/icons-material';
import { reportAPI, brandAPI, ticketAPI } from '../services/api';
import { format } from 'date-fns';

const ReportsPage = () => {
  const [statuses, setStatuses] = useState([]);
  const [brands, setBrands] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ from: '', to: '', status_id: '', brand_id: '' });

  useEffect(() => {
    ticketAPI.getStatuses().then(r => setStatuses(r.data)).catch(() => {});
    brandAPI.list().then(r => setBrands(r.data)).catch(() => {});
  }, []);

  const run = async (fmt = '') => {
    setLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      if (fmt === 'csv') { params.format = 'csv'; window.open(`${process.env.REACT_APP_API_URL}/reports/tickets?${new URLSearchParams(params)}`, '_blank'); return; }
      const { data } = await reportAPI.tickets(params);
      setResults(data.data || []);
    } finally { setLoading(false); }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Relatórios</Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={6} md={2}><TextField fullWidth size="small" label="De" type="date" InputLabelProps={{ shrink: true }} value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} /></Grid>
            <Grid item xs={6} md={2}><TextField fullWidth size="small" label="Até" type="date" InputLabelProps={{ shrink: true }} value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} /></Grid>
            <Grid item xs={6} md={2}><FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select value={filters.status_id} label="Status" onChange={e => setFilters(p => ({ ...p, status_id: e.target.value }))}><MenuItem value="">Todos</MenuItem>{statuses.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={6} md={2}><FormControl fullWidth size="small"><InputLabel>Marca</InputLabel><Select value={filters.brand_id} label="Marca" onChange={e => setFilters(p => ({ ...p, brand_id: e.target.value }))}><MenuItem value="">Todas</MenuItem>{brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={6} md={2}><Button variant="contained" fullWidth onClick={() => run()} disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Gerar'}</Button></Grid>
            <Grid item xs={6} md={2}><Button variant="outlined" fullWidth startIcon={<Download />} onClick={() => run('csv')}>CSV</Button></Grid>
          </Grid>
        </CardContent>
      </Card>
      {results.length > 0 && (
        <Card>
          <Typography variant="body2" sx={{ p: 2, pb: 0 }} color="text.secondary">{results.length} registro(s)</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>Número</TableCell><TableCell>Título</TableCell><TableCell>Cliente</TableCell><TableCell>Status</TableCell><TableCell>Marca</TableCell><TableCell>Data</TableCell></TableRow></TableHead>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell><Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>#{r.ticket_number}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{r.title}</Typography></TableCell>
                  <TableCell>{r.client_name}</TableCell>
                  <TableCell><Chip label={r.status} size="small" /></TableCell>
                  <TableCell>{r.brand || '—'}</TableCell>
                  <TableCell><Typography variant="caption">{r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy') : '—'}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Box>
  );
};
export default ReportsPage;
