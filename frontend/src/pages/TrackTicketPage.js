import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress,
  Alert, Paper, List, ListItem, ListItemText
} from '@mui/material';
import { publicAPI } from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TrackTicketPage = () => {
  const { token } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    publicAPI.trackTicket(token)
      .then(r => setTicket(r.data))
      .catch(() => setError('Ticket não encontrado. Verifique o link.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0d2137, #1565C0)' }}>
      <CircularProgress sx={{ color: 'white' }} />
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d2137 0%, #1565C0 100%)', py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 640, mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <img src="/logo-color.png" alt="RelmDesk" style={{ maxWidth: 200, width: '100%' }}
            onError={e => e.target.style.display = 'none'} />
          <Typography variant="h5" fontWeight={700} sx={{ color: 'white', mt: 2 }}>
            Acompanhar Ticket
          </Typography>
        </Box>

        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : ticket ? (
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    #{ticket.ticket_number}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={500}>{ticket.title}</Typography>
                </Box>
                <Chip
                  label={ticket.status_name}
                  sx={{ bgcolor: (ticket.status_color || '#666') + '20', color: ticket.status_color || '#666', fontWeight: 700 }}
                />
              </Box>

              {/* Progress bar */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(i => (
                    <Box key={i} sx={{
                      flex: 1, height: 8, borderRadius: 2,
                      bgcolor: i <= (ticket.status_order || 1) ? ticket.status_color || '#1565C0' : '#e0e0e0',
                    }} />
                  ))}
                </Box>
              </Box>

              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Typography variant="body2">{ticket.description || 'Sem descrição'}</Typography>
              </Paper>

              <Typography variant="subtitle2" fontWeight={600} gutterBottom>📋 Histórico de atualizações</Typography>
              {ticket.history?.length > 0 ? (
                <List dense>
                  {ticket.history.map((h, i) => (
                    <ListItem key={i} sx={{ bgcolor: '#f8fafc', borderRadius: 1, mb: 1 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {h.status_to_name && <Chip label={h.status_to_name} size="small" sx={{ bgcolor: (h.status_color || '#666') + '20', color: h.status_color || '#666', fontWeight: 600, fontSize: 10 }} />}
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {h.note && `${h.note} · `}
                            {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">Nenhuma atualização ainda</Typography>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
                Criado em {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm")}
              </Typography>
            </CardContent>
          </Card>
        ) : null}
      </Box>
    </Box>
  );
};

export default TrackTicketPage;
