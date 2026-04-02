import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, InputBase, Paper, List, ListItem,
  Typography, Chip, CircularProgress, Divider
} from '@mui/material';
import { Search, ConfirmationNumber } from '@mui/icons-material';
import { searchAPI } from '../../services/api';

let debounceTimer;

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceTimer);

    if (val.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    debounceTimer = setTimeout(async () => {
      try {
        const { data } = await searchAPI.suggest(val);
        setSuggestions(data.suggestions || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (ticket) => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    navigate(`/tickets/${ticket.id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.length >= 2) {
      setOpen(false);
      navigate(`/busca?q=${encodeURIComponent(query)}`);
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <Box ref={wrapperRef} sx={{ position: 'relative', width: '100%', maxWidth: 480 }}>
      <Paper
        elevation={0}
        sx={{
          display: 'flex', alignItems: 'center', px: 1.5, py: 0.5,
          border: '1px solid', borderColor: open ? 'primary.main' : 'divider',
          borderRadius: 2, bgcolor: 'background.default',
          transition: 'border-color 0.2s',
        }}
      >
        {loading ? (
          <CircularProgress size={16} sx={{ mr: 1, color: 'text.secondary' }} />
        ) : (
          <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
        )}
        <InputBase
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Buscar tickets, clientes, CPF, telefone..."
          sx={{ flex: 1, fontSize: 14 }}
          inputProps={{ 'aria-label': 'busca' }}
        />
      </Paper>

      {/* Autocomplete dropdown */}
      {open && suggestions.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            mt: 0.5, zIndex: 9999, borderRadius: 2, overflow: 'hidden',
            maxHeight: 400, overflowY: 'auto',
          }}
        >
          <Box sx={{ px: 2, py: 1, bgcolor: 'background.default' }}>
            <Typography variant="caption" color="text.secondary">
              Sugestões — pressione Enter para ver todos
            </Typography>
          </Box>
          <Divider />
          <List dense disablePadding>
            {suggestions.map((ticket) => (
              <ListItem
                key={ticket.id}
                button
                onClick={() => handleSelect(ticket)}
                sx={{ '&:hover': { bgcolor: 'action.hover' }, py: 1 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <ConfirmationNumber sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                  <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        #{ticket.ticket_number}
                      </Typography>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.title}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {ticket.client_name}
                    </Typography>
                  </Box>
                  <Chip
                    label={ticket.status_name}
                    size="small"
                    sx={{
                      height: 20, fontSize: 10, flexShrink: 0,
                      bgcolor: ticket.status_color + '20',
                      color: ticket.status_color,
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default SearchBar;
