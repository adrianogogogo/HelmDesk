import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, Button, Chip,
  Avatar, LinearProgress, Table, TableBody,
  TableCell, TableHead, TableRow, CircularProgress
} from '@mui/material';
import {
  ConfirmationNumber, Assignment, TrendingUp, SportsScore,
  Add, CheckCircle, OpenInNew
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MEDAL = ['🥇', '🥈', '🥉'];

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
          <Typography variant="h4" fontWeight={700} color={color || 'text.primary'}>{value ?? 0}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Box sx={{ bgcolor: (color || '#1565C0') + '15', borderRadius: 2, p: 1.2, color: color || 'primary.main' }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.get().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!data) return null;

  const { tickets, tasks, gamification } = data;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Relm Help Desk — {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/tickets/novo')}>
          Novo Ticket
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total de Tickets" value={tickets?.total} icon={<ConfirmationNumber />} color="#1565C0" subtitle={`${tickets?.last_7_days} nos últimos 7 dias`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Abertos" value={tickets?.open} icon={<TrendingUp />} color="#FF9800" subtitle="Aguardando resolução" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Resolvidos" value={tickets?.resolved} icon={<CheckCircle />} color="#4CAF50" subtitle="Em observação (20 dias)" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Tarefas Pendentes" value={tasks?.pendente} icon={<Assignment />} color="#9C27B0" subtitle={`${tasks?.em_andamento} em andamento`} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Tickets por Status */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Tickets por Status</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {tickets?.by_status?.filter(s => parseInt(s.count) > 0).map(s => (
                  <Box key={s.slug}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                        <Typography variant="body2">{s.name}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>{s.count}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((parseInt(s.count) / Math.max(parseInt(tickets?.total), 1)) * 100, 100)}
                      sx={{ height: 4, borderRadius: 2, bgcolor: s.color + '20', '& .MuiLinearProgress-bar': { bgcolor: s.color } }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tickets por Marca */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Por Marca</Typography>
              {tickets?.by_brand?.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={tickets.by_brand.filter(b => parseInt(b.count) > 0)}
                      dataKey="count" nameKey="brand" cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                    >
                      {['#1565C0','#FF9800','#4CAF50','#9C27B0'].map((c,i) => (
                        <Cell key={i} fill={c} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 180 }}>
                  <Typography variant="body2" color="text.secondary">Nenhum dado</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {tickets?.by_brand?.map((b, i) => (
                  <Chip key={b.brand} label={`${b.brand}: ${b.count}`} size="small"
                    sx={{ bgcolor: ['#1565C0','#FF9800','#4CAF50','#9C27B0'][i % 4] + '15',
                          color: ['#1565C0','#FF9800','#4CAF50','#9C27B0'][i % 4] }} />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Futebol da Relm Ranking */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #0d2137 0%, #1565C0 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SportsScore sx={{ color: 'white' }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'white' }}>
                  ⚽ Futebol da Relm
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Campeonato {format(new Date(), "MMMM/yyyy", { locale: ptBR })}
              </Typography>
              <Box sx={{ mt: 2 }}>
                {gamification?.ranking?.slice(0, 5).map((player, idx) => (
                  <Box key={player.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Typography sx={{ fontSize: 18, minWidth: 28 }}>{MEDAL[idx] || `${idx+1}`}</Typography>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'rgba(255,255,255,0.2)' }}>
                      {player.name?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                        {player.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${player.gols || 0} ⚽`}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }}
                    />
                  </Box>
                ))}
                {!gamification?.ranking?.length && (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', mt: 2 }}>
                    Nenhuma atividade este mês ainda
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tickets recentes */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Tickets Recentes</Typography>
                <Button size="small" endIcon={<OpenInNew />} onClick={() => navigate('/tickets')}>Ver todos</Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell>Título</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Marca</TableCell>
                    <TableCell>Data</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets?.recent?.map(t => (
                    <TableRow key={t.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets/${t.id}`)}>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                          #{t.ticket_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2">{t.client_name}</Typography></TableCell>
                      <TableCell>
                        <Chip label={t.status_name} size="small"
                          sx={{ bgcolor: (t.status_color || '#666') + '20', color: t.status_color || '#666', fontWeight: 600, fontSize: 11 }} />
                      </TableCell>
                      <TableCell><Typography variant="body2">{t.brand_name || '—'}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(t.created_at), 'dd/MM/yyyy')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
