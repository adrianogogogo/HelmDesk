import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, ListItemSecondaryAction, Switch, TextField, Button, Divider, Alert, Chip } from '@mui/material';
import { configAPI } from '../services/api';
import toast from 'react-hot-toast';

const ConfigPage = () => {
  const [configs, setConfigs] = useState([]);
  const [edits, setEdits] = useState({});

  useEffect(() => {
    configAPI.list().then(r => setConfigs(r.data)).catch(() => {});
  }, []);

  const handleSave = async (key, value) => {
    try {
      await configAPI.update(key, value);
      toast.success('Configuração salva!');
      setConfigs(c => c.map(x => x.key === key ? { ...x, value } : x));
    } catch {}
  };

  const grouped = configs.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  const catLabels = { general: '⚙️ Geral', tickets: '🎫 Tickets', email: '📧 E-mail (V2)', whatsapp: '💬 WhatsApp' };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Configurações do Sistema</Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        As configurações de e-mail serão ativadas na versão V2. Os demais itens são configuráveis agora.
      </Alert>
      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {catLabels[cat] || cat}
              {cat === 'email' && <Chip label="V2" size="small" sx={{ ml: 1 }} color="warning" />}
            </Typography>
            <List dense>
              {items.map(cfg => (
                <React.Fragment key={cfg.key}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={600}>{cfg.key}</Typography>}
                      secondary={cfg.description}
                    />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 2 }}>
                      {cfg.value === 'true' || cfg.value === 'false' ? (
                        <Switch
                          checked={cfg.value === 'true'}
                          disabled={cat === 'email'}
                          onChange={e => handleSave(cfg.key, e.target.checked ? 'true' : 'false')}
                        />
                      ) : (
                        <>
                          <TextField
                            size="small" value={edits[cfg.key] ?? cfg.value ?? ''}
                            onChange={e => setEdits(p => ({ ...p, [cfg.key]: e.target.value }))}
                            disabled={cat === 'email'} sx={{ minWidth: 280 }}
                          />
                          <Button size="small" variant="outlined"
                            disabled={cat === 'email' || edits[cfg.key] === undefined || edits[cfg.key] === cfg.value}
                            onClick={() => handleSave(cfg.key, edits[cfg.key])}>Salvar</Button>
                        </>
                      )}
                    </Box>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};
export default ConfigPage;
