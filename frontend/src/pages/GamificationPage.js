import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Avatar, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { SportsScore } from '@mui/icons-material';
import { gamificationAPI } from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const MEDALS = ['🥇', '🥈', '🥉'];
const COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', '#1565C0', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#607D8B'];

const GamificationPage = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await gamificationAPI.ranking({ month, year });
      setRanking(data.ranking || []);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [month, year]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })
  }));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ background: 'linear-gradient(135deg, #1565C0, #0d2137)', borderRadius: 2, p: 1.5 }}>
          <SportsScore sx={{ color: 'white', fontSize: 32 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>⚽ Futebol da Relm</Typography>
          <Typography variant="body2" color="text.secondary">Campeonato mensal de atendimento</Typography>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Mês</InputLabel>
          <Select value={month} label="Mês" onChange={e => setMonth(e.target.value)}>
            {months.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Ano</InputLabel>
          <Select value={year} label="Ano" onChange={e => setYear(e.target.value)}>
            {[2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {/* Podium */}
          {ranking.slice(0, 3).length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ background: 'linear-gradient(135deg, #0d2137 0%, #1565C0 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} textAlign="center" gutterBottom>
                    🏆 Pódio — {months.find(m => m.value === month)?.label}/{year}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 4, mt: 2, mb: 2 }}>
                    {/* 2nd */}
                    {ranking[1] && (
                      <Box sx={{ textAlign: 'center', mb: -1 }}>
                        <Avatar sx={{ width: 56, height: 56, mx: 'auto', mb: 1, bgcolor: '#C0C0C0', fontSize: 20, fontWeight: 700 }}>
                          {ranking[1].name?.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{ranking[1].name?.split(' ')[0]}</Typography>
                        <Chip label={`${ranking[1].gols} ⚽`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                        <Box sx={{ width: 80, height: 60, bgcolor: '#C0C0C0', mt: 1, mx: 'auto', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography fontSize={24}>🥈</Typography>
                        </Box>
                      </Box>
                    )}
                    {/* 1st */}
                    {ranking[0] && (
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar sx={{ width: 72, height: 72, mx: 'auto', mb: 1, bgcolor: '#FFD700', fontSize: 26, fontWeight: 700, color: '#333' }}>
                          {ranking[0].name?.charAt(0)}
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700 }}>{ranking[0].name?.split(' ')[0]}</Typography>
                        <Chip label={`${ranking[0].gols} ⚽`} sx={{ bgcolor: '#FFD700', color: '#333', fontWeight: 700 }} />
                        <Box sx={{ width: 80, height: 80, bgcolor: '#FFD700', mt: 1, mx: 'auto', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography fontSize={32}>🥇</Typography>
                        </Box>
                      </Box>
                    )}
                    {/* 3rd */}
                    {ranking[2] && (
                      <Box sx={{ textAlign: 'center', mb: -2 }}>
                        <Avatar sx={{ width: 48, height: 48, mx: 'auto', mb: 1, bgcolor: '#CD7F32', fontSize: 16, fontWeight: 700 }}>
                          {ranking[2].name?.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{ranking[2].name?.split(' ')[0]}</Typography>
                        <Chip label={`${ranking[2].gols} ⚽`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                        <Box sx={{ width: 80, height: 44, bgcolor: '#CD7F32', mt: 1, mx: 'auto', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography fontSize={20}>🥉</Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Full ranking table */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>📊 Tabela Completa</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Jogador</TableCell>
                      <TableCell>Cargo</TableCell>
                      <TableCell align="center">⚽ Gols</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ranking.map((player, idx) => (
                      <TableRow key={player.id} sx={{ bgcolor: idx < 3 ? ['#FFD70010', '#C0C0C010', '#CD7F3210'][idx] : 'transparent' }}>
                        <TableCell>
                          <Typography sx={{ fontSize: 18 }}>{MEDALS[idx] || idx + 1}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: COLORS[idx % COLORS.length] }}>
                              {player.name?.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={idx < 3 ? 700 : 400}>{player.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Chip label={player.role} size="small" variant="outlined" /></TableCell>
                        <TableCell align="center">
                          <Chip label={`${player.gols || 0} ⚽`} size="small"
                            sx={{ bgcolor: COLORS[idx % COLORS.length] + '20', color: COLORS[idx % COLORS.length], fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!ranking.length && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3 }}>
                          <Typography color="text.secondary">Nenhuma atividade registrada neste período</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Bar chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>📈 Gols por Jogador</Typography>
                {ranking.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ranking.map(p => ({ name: p.name?.split(' ')[0], gols: parseInt(p.gols || 0) }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={(v) => [`${v} ⚽`, 'Gols']} />
                      <Bar dataKey="gols" radius={[4, 4, 0, 0]}>
                        {ranking.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <Typography color="text.secondary">Nenhum dado</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default GamificationPage;
