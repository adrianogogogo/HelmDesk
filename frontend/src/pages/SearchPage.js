import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, Button,
  List, ListItem, ListItemText, Chip, CircularProgress, Divider, Paper
} from '@mui/material';
import { Search, ConfirmationNumber } from '@mui/icons-material';
import { searchAPI } from '../services/api';
import { format } from 'date-fns';

const SearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialQ = params.get('q') || '';

  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await searchAPI.search(q, 50);
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQ) handleSearch(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Busca Inteligente</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Busque por número, nome, CPF, telefone, e-mail ou qualquer texto dentro do ticket
      </Typography>

      <Card sx={{ mt: 2, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Ex: João Silva, 011999999999, CPF 123.456.789-00, REL-BIKES-000001..."
              InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
            <Button variant="contained" onClick={() => handleSearch()} disabled={loading} sx={{ px: 4, flexShrink: 0 }}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Buscar'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {searched && (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {results.length} resultado(s) para "{query}"
          </Typography>
          {results.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Nenhum resultado encontrado</Typography>
            </Paper>
          ) : (
            <List disablePadding>
              {results.map(r => (
                <React.Fragment key={r.id}>
                  <ListItem
                    button
                    onClick={() => navigate(`/tickets/${r.id}`)}
                    sx={{ borderRadius: 2, mb: 1, bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                      <ConfirmationNumber sx={{ color: 'primary.main' }} />
                    </Box>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            #{r.ticket_number}
                          </Typography>
                          <Typography variant="body2">{r.title}</Typography>
                          <Chip label={r.status_name} size="small"
                            sx={{ bgcolor: (r.status_color || '#666') + '20', color: r.status_color || '#666', fontWeight: 600, fontSize: 11 }} />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {r.client_name} · {r.brand_name || '—'} · {format(new Date(r.created_at), 'dd/MM/yyyy')}
                        </Typography>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SearchPage;
