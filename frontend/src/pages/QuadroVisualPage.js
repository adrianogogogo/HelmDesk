import React, {
  useRef, useState, useEffect, useCallback, useReducer
} from 'react';
import {
  Box, Typography, IconButton, Tooltip, Slider, Dialog,
  DialogTitle, DialogContent, DialogActions, Button, TextField,
  Menu, MenuItem, Divider, Chip, Paper, ToggleButton,
  ToggleButtonGroup, FormControlLabel, Switch, Popover,
  Select, FormControl, InputLabel
} from '@mui/material';
import {
  Add, Delete, ColorLens, Edit, ZoomIn, ZoomOut,
  Undo, Redo, Download, Upload, Brush, PanTool,
  RadioButtonUnchecked, CropSquare, HorizontalRule,
  ArrowRightAlt, AccountTree, Note, Wallpaper,
  Visibility, VisibilityOff, GridOn, Close,
  FormatColorFill, TextFields, Gesture, SelectAll,
  NoteAdd, FitScreen, Circle
} from '@mui/icons-material';
import toast from 'react-hot-toast';

// ─── Constantes ─────────────────────────────────────────────────────────────
const POSTIT_COLORS = [
  '#FFF9C4', '#FFECB3', '#F8BBD0', '#E1BEE7',
  '#B3E5FC', '#C8E6C9', '#FFE0B2', '#FFCDD2',
  '#DCEDC8', '#B2EBF2', '#F5F5F5', '#CFD8DC',
];

const SHAPE_TYPES = {
  POSTIT: 'postit',
  RECT: 'rect',
  CIRCLE: 'circle',
  DIAMOND: 'diamond',
  ARROW: 'arrow',
  TEXT: 'text',
  CONNECTION: 'connection',
};

const TOOLS = {
  SELECT: 'select',
  PAN: 'pan',
  POSTIT: 'postit',
  RECT: 'rect',
  CIRCLE: 'circle',
  DIAMOND: 'diamond',
  ARROW: 'arrow',
  TEXT: 'text',
  DRAW: 'draw',
  ERASE: 'erase',
  CONNECTION: 'connection',
};

const BG_COLORS = [
  { label: 'Branco', value: '#FFFFFF' },
  { label: 'Cinza Claro', value: '#F5F5F5' },
  { label: 'Cinza', value: '#E0E0E0' },
  { label: 'Azul Suave', value: '#E3F2FD' },
  { label: 'Verde Suave', value: '#E8F5E9' },
  { label: 'Areia', value: '#FFF8E1' },
  { label: 'Escuro', value: '#1E2A3A' },
  { label: 'Preto Quadro', value: '#212121' },
];

const genId = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const genPencilId = () => `pen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Reducer do quadro ───────────────────────────────────────────────────────
const initialState = {
  elements: [],
  pencilPaths: [],
  past: [],
  future: [],
  bgColor: '#F5F5F5',
  bgImage: null,
  showGrid: false,
  showPoints: true,
  gridSize: 24,
};

function boardReducer(state, action) {
  const pushHistory = (s) => ({
    ...s,
    past: [...s.past.slice(-49), { elements: s.elements, pencilPaths: s.pencilPaths }],
    future: [],
  });

  switch (action.type) {
    case 'ADD_ELEMENT': {
      const ns = pushHistory(state);
      return { ...ns, elements: [...ns.elements, action.payload] };
    }
    case 'UPDATE_ELEMENT': {
      const ns = pushHistory(state);
      return {
        ...ns,
        elements: ns.elements.map(el =>
          el.id === action.payload.id ? { ...el, ...action.payload.changes } : el
        ),
      };
    }
    case 'DELETE_ELEMENT': {
      const ns = pushHistory(state);
      const ids = Array.isArray(action.payload) ? action.payload : [action.payload];
      return {
        ...ns,
        elements: ns.elements.filter(el => !ids.includes(el.id)),
        pencilPaths: ns.pencilPaths.filter(p => !ids.includes(p.id)),
      };
    }
    case 'ADD_PENCIL_PATH': {
      const ns = pushHistory(state);
      return { ...ns, pencilPaths: [...ns.pencilPaths, action.payload] };
    }
    case 'SET_BG_COLOR':
      return { ...state, bgColor: action.payload };
    case 'SET_BG_IMAGE':
      return { ...state, bgImage: action.payload };
    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };
    case 'TOGGLE_POINTS':
      return { ...state, showPoints: !state.showPoints };
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        elements: prev.elements,
        pencilPaths: prev.pencilPaths,
        past: state.past.slice(0, -1),
        future: [{ elements: state.elements, pencilPaths: state.pencilPaths }, ...state.future.slice(0, 49)],
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        elements: next.elements,
        pencilPaths: next.pencilPaths,
        past: [...state.past.slice(-49), { elements: state.elements, pencilPaths: state.pencilPaths }],
        future: state.future.slice(1),
      };
    }
    case 'LOAD_BOARD':
      return { ...initialState, ...action.payload, past: [], future: [] };
    case 'CLEAR_BOARD': {
      const ns = pushHistory(state);
      return { ...ns, elements: [], pencilPaths: [] };
    }
    default:
      return state;
  }
}

// ─── Componente de Post-it no SVG ───────────────────────────────────────────
const PostItElement = ({ el, selected, onSelect, onMove, onDoubleClick, darkBg }) => {
  const isDark = ['#1E2A3A', '#212121'].includes(el.bgColor || '#FFF9C4');
  const textColor = isDark ? '#fff' : '#333';
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    onSelect(el.id);
    setDragging(true);
    dragStart.current = { x: e.clientX - el.x, y: e.clientY - el.y };
    const handleMove = (ev) => {
      if (!dragStart.current) return;
      onMove(el.id, ev.clientX - dragStart.current.x, ev.clientY - dragStart.current.y);
    };
    const handleUp = () => {
      setDragging(false);
      dragStart.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const w = el.width || 180;
  const h = el.height || 120;

  return (
    <g
      transform={`translate(${el.x},${el.y})`}
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(el); }}
    >
      {/* sombra */}
      <rect x={4} y={4} width={w} height={h} rx={3} fill="rgba(0,0,0,0.12)" />
      {/* corpo */}
      <rect
        x={0} y={0} width={w} height={h} rx={3}
        fill={el.bgColor || '#FFF9C4'}
        stroke={selected ? '#1565C0' : 'rgba(0,0,0,0.15)'}
        strokeWidth={selected ? 2 : 1}
      />
      {/* dobra */}
      <polygon
        points={`${w - 16},0 ${w},16 ${w - 16},16`}
        fill="rgba(0,0,0,0.1)"
      />
      {/* título */}
      {el.title && (
        <text
          x={10} y={22}
          fontSize={13} fontWeight={700}
          fill={textColor}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {el.title.length > 20 ? el.title.slice(0, 20) + '…' : el.title}
        </text>
      )}
      {/* conteúdo */}
      {el.content && (
        <foreignObject x={8} y={el.title ? 28 : 10} width={w - 16} height={h - (el.title ? 38 : 20)}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              fontSize: 11, color: textColor, lineHeight: 1.4,
              overflow: 'hidden', wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              userSelect: 'none', pointerEvents: 'none',
            }}
          >
            {el.content}
          </div>
        </foreignObject>
      )}
      {/* tag */}
      {el.tag && (
        <rect x={8} y={h - 18} width={el.tag.length * 7 + 8} height={14} rx={7} fill="rgba(0,0,0,0.15)" />
      )}
      {el.tag && (
        <text x={12} y={h - 8} fontSize={9} fill={textColor} style={{ userSelect: 'none', pointerEvents: 'none' }}>
          {el.tag}
        </text>
      )}
    </g>
  );
};

// ─── Elemento de shape (rect, circle, diamond) ─────────────────────────────
const ShapeElement = ({ el, selected, onSelect, onMove, onDoubleClick }) => {
  const dragStart = useRef(null);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    onSelect(el.id);
    dragStart.current = { x: e.clientX - el.x, y: e.clientY - el.y };
    const handleMove = (ev) => {
      if (!dragStart.current) return;
      onMove(el.id, ev.clientX - dragStart.current.x, ev.clientY - dragStart.current.y);
    };
    const handleUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const w = el.width || 120;
  const h = el.height || 60;
  const stroke = selected ? '#1565C0' : (el.strokeColor || '#555');
  const sw = selected ? 2.5 : (el.strokeWidth || 1.5);

  const renderShape = () => {
    switch (el.type) {
      case SHAPE_TYPES.RECT:
        return <rect x={0} y={0} width={w} height={h} rx={el.rounded ? 8 : 2} fill={el.fill || 'rgba(21,101,192,0.1)'} stroke={stroke} strokeWidth={sw} />;
      case SHAPE_TYPES.CIRCLE:
        return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={el.fill || 'rgba(21,101,192,0.1)'} stroke={stroke} strokeWidth={sw} />;
      case SHAPE_TYPES.DIAMOND:
        return <polygon
          points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`}
          fill={el.fill || 'rgba(21,101,192,0.1)'}
          stroke={stroke} strokeWidth={sw}
        />;
      default:
        return null;
    }
  };

  return (
    <g
      transform={`translate(${el.x},${el.y})`}
      style={{ cursor: 'grab' }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(el); }}
    >
      {renderShape()}
      {el.label && (
        <foreignObject x={4} y={h / 2 - 12} width={w - 8} height={28}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              fontSize: 12, color: el.textColor || '#333', textAlign: 'center',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              userSelect: 'none', pointerEvents: 'none', fontWeight: 500,
            }}
          >
            {el.label}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

// ─── Elemento de texto ────────────────────────────────────────────────────────
const TextElement = ({ el, selected, onSelect, onMove, onDoubleClick }) => {
  const dragStart = useRef(null);
  const handleMouseDown = (e) => {
    e.stopPropagation();
    onSelect(el.id);
    dragStart.current = { x: e.clientX - el.x, y: e.clientY - el.y };
    const handleMove = (ev) => {
      if (!dragStart.current) return;
      onMove(el.id, ev.clientX - dragStart.current.x, ev.clientY - dragStart.current.y);
    };
    const handleUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return (
    <g
      transform={`translate(${el.x},${el.y})`}
      style={{ cursor: 'text' }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(el); }}
    >
      {selected && <rect x={-4} y={-4} width={(el.text?.length || 5) * (el.fontSize || 14) * 0.6 + 8} height={(el.fontSize || 14) + 12} fill="rgba(21,101,192,0.08)" stroke="#1565C0" strokeWidth={1} rx={2} strokeDasharray="4 2" />}
      <text
        x={0} y={el.fontSize || 14}
        fontSize={el.fontSize || 14}
        fontWeight={el.bold ? 700 : 400}
        fontStyle={el.italic ? 'italic' : 'normal'}
        fill={el.color || '#222'}
        style={{ userSelect: 'none' }}
      >
        {el.text || 'Texto'}
      </text>
    </g>
  );
};

// ─── Elemento de seta ──────────────────────────────────────────────────────
const ArrowElement = ({ el, selected, onSelect, onMove }) => {
  const dragStart = useRef(null);
  const handleMouseDown = (e) => {
    e.stopPropagation();
    onSelect(el.id);
    dragStart.current = { x: e.clientX - el.x, y: e.clientY - el.y };
    const handleMove = (ev) => {
      if (!dragStart.current) return;
      onMove(el.id, ev.clientX - dragStart.current.x, ev.clientY - dragStart.current.y);
    };
    const handleUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const dx = el.dx || 120;
  const dy = el.dy || 0;
  const midX = dx / 2;
  const midY = dy / 2;
  const angle = Math.atan2(dy, dx);
  const arrowLen = 12;
  const arrowAngle = 0.4;
  const ax1 = dx - arrowLen * Math.cos(angle - arrowAngle);
  const ay1 = dy - arrowLen * Math.sin(angle - arrowAngle);
  const ax2 = dx - arrowLen * Math.cos(angle + arrowAngle);
  const ay2 = dy - arrowLen * Math.sin(angle + arrowAngle);

  return (
    <g
      transform={`translate(${el.x},${el.y})`}
      style={{ cursor: 'grab' }}
      onMouseDown={handleMouseDown}
    >
      <line
        x1={0} y1={0} x2={dx} y2={dy}
        stroke={selected ? '#1565C0' : (el.color || '#555')}
        strokeWidth={selected ? 2.5 : (el.strokeWidth || 2)}
        strokeDasharray={el.dashed ? '6 4' : undefined}
      />
      <polygon
        points={`${dx},${dy} ${ax1},${ay1} ${ax2},${ay2}`}
        fill={selected ? '#1565C0' : (el.color || '#555')}
      />
      {el.label && (
        <text x={midX} y={midY - 6} fontSize={11} fill={el.color || '#555'} textAnchor="middle" style={{ userSelect: 'none' }}>
          {el.label}
        </text>
      )}
    </g>
  );
};

// ─── Dialog de edição de elemento ───────────────────────────────────────────
const EditElementDialog = ({ open, element, onClose, onSave }) => {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (element) setForm({ ...element });
  }, [element]);

  if (!element) return null;

  const isPostIt = element.type === SHAPE_TYPES.POSTIT;
  const isShape = [SHAPE_TYPES.RECT, SHAPE_TYPES.CIRCLE, SHAPE_TYPES.DIAMOND].includes(element.type);
  const isText = element.type === SHAPE_TYPES.TEXT;
  const isArrow = element.type === SHAPE_TYPES.ARROW;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {isPostIt ? '🗒️ Editar Post-it' : isShape ? '⬛ Editar Forma' : isText ? '📝 Editar Texto' : '→ Editar Seta'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {isPostIt && (
            <>
              <TextField
                label="Título" size="small" fullWidth
                value={form.title || ''}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
              <TextField
                label="Conteúdo" size="small" fullWidth multiline rows={4}
                value={form.content || ''}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                autoFocus
              />
              <TextField
                label="Tag (ex: urgente, ideia)" size="small" fullWidth
                value={form.tag || ''}
                onChange={e => setForm(p => ({ ...p, tag: e.target.value }))}
              />
              <Box>
                <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary' }}>
                  Cor do post-it
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {POSTIT_COLORS.map(c => (
                    <Box
                      key={c}
                      onClick={() => setForm(p => ({ ...p, bgColor: c }))}
                      sx={{
                        width: 28, height: 28, borderRadius: 1, bgcolor: c, cursor: 'pointer',
                        border: form.bgColor === c ? '3px solid #1565C0' : '2px solid rgba(0,0,0,0.15)',
                        transition: 'transform 0.1s',
                        '&:hover': { transform: 'scale(1.15)' },
                      }}
                    />
                  ))}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Largura" size="small" type="number" sx={{ flex: 1 }}
                  value={form.width || 180}
                  onChange={e => setForm(p => ({ ...p, width: parseInt(e.target.value) || 180 }))}
                  inputProps={{ min: 80, max: 400 }}
                />
                <TextField
                  label="Altura" size="small" type="number" sx={{ flex: 1 }}
                  value={form.height || 120}
                  onChange={e => setForm(p => ({ ...p, height: parseInt(e.target.value) || 120 }))}
                  inputProps={{ min: 60, max: 400 }}
                />
              </Box>
            </>
          )}

          {isShape && (
            <>
              <TextField
                label="Rótulo" size="small" fullWidth
                value={form.label || ''}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                autoFocus
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Preenchimento</Typography>
                  <input type="color" value={form.fill || '#D9E8FB'} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }}
                    onChange={e => setForm(p => ({ ...p, fill: e.target.value }))} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Borda</Typography>
                  <input type="color" value={form.strokeColor || '#555555'} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }}
                    onChange={e => setForm(p => ({ ...p, strokeColor: e.target.value }))} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Texto</Typography>
                  <input type="color" value={form.textColor || '#333333'} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }}
                    onChange={e => setForm(p => ({ ...p, textColor: e.target.value }))} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Largura" size="small" type="number" sx={{ flex: 1 }}
                  value={form.width || 120}
                  onChange={e => setForm(p => ({ ...p, width: parseInt(e.target.value) || 120 }))}
                  inputProps={{ min: 40, max: 600 }}
                />
                <TextField label="Altura" size="small" type="number" sx={{ flex: 1 }}
                  value={form.height || 60}
                  onChange={e => setForm(p => ({ ...p, height: parseInt(e.target.value) || 60 }))}
                  inputProps={{ min: 30, max: 400 }}
                />
              </Box>
            </>
          )}

          {isText && (
            <>
              <TextField
                label="Texto" size="small" fullWidth multiline rows={3}
                value={form.text || ''}
                onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                autoFocus
              />
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField label="Tamanho (px)" size="small" type="number" sx={{ flex: 1 }}
                  value={form.fontSize || 14}
                  onChange={e => setForm(p => ({ ...p, fontSize: parseInt(e.target.value) || 14 }))}
                  inputProps={{ min: 8, max: 96 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Cor</Typography>
                  <input type="color" value={form.color || '#222222'} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }}
                    onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={<Switch checked={!!form.bold} onChange={e => setForm(p => ({ ...p, bold: e.target.checked }))} size="small" />}
                  label="Negrito"
                />
                <FormControlLabel
                  control={<Switch checked={!!form.italic} onChange={e => setForm(p => ({ ...p, italic: e.target.checked }))} size="small" />}
                  label="Itálico"
                />
              </Box>
            </>
          )}

          {isArrow && (
            <>
              <TextField
                label="Rótulo da seta" size="small" fullWidth
                value={form.label || ''}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                autoFocus
              />
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Cor</Typography>
                  <input type="color" value={form.color || '#555555'} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }}
                    onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
                </Box>
                <FormControlLabel
                  control={<Switch checked={!!form.dashed} onChange={e => setForm(p => ({ ...p, dashed: e.target.checked }))} size="small" />}
                  label="Tracejada"
                />
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => { onSave(form); onClose(); }}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Post-it Modal de duplo clique (fullscreen centralizado) ─────────────────
const PostItViewModal = ({ element, onClose, onEdit }) => {
  if (!element) return null;
  const isDark = ['#1E2A3A', '#212121'].includes(element.bgColor);
  const txtColor = isDark ? '#fff' : '#333';

  return (
    <Box
      onClick={onClose}
      sx={{
        position: 'fixed', inset: 0, zIndex: 3000,
        bgcolor: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Paper
        onClick={e => e.stopPropagation()}
        elevation={24}
        sx={{
          bgcolor: element.bgColor || '#FFF9C4',
          borderRadius: 3,
          p: 4,
          minWidth: 340,
          maxWidth: 560,
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        }}
      >
        <IconButton
          size="small" onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12, color: txtColor, opacity: 0.6 }}
        >
          <Close />
        </IconButton>

        {element.tag && (
          <Chip label={element.tag} size="small"
            sx={{ mb: 2, bgcolor: 'rgba(0,0,0,0.15)', color: txtColor, fontSize: 11 }}
          />
        )}

        {element.title && (
          <Typography variant="h6" fontWeight={700} sx={{ color: txtColor, mb: 2 }}>
            {element.title}
          </Typography>
        )}

        <Typography
          variant="body1"
          sx={{
            color: txtColor, lineHeight: 1.7, whiteSpace: 'pre-wrap',
            fontSize: 15,
          }}
        >
          {element.content || '(sem conteúdo)'}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="outlined" size="small" startIcon={<Edit />}
            onClick={() => { onClose(); onEdit(element); }}
            sx={{ borderColor: 'rgba(0,0,0,0.25)', color: txtColor }}
          >
            Editar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────
const QuadroVisualPage = () => {
  const [state, dispatch] = useReducer(boardReducer, initialState);
  const svgRef = useRef(null);
  const canvasRef = useRef(null);  // canvas para desenho livre

  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [selectedIds, setSelectedIds] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [viewModalEl, setViewModalEl] = useState(null);

  // Seleção por área
  const [areaSelect, setAreaSelect] = useState(null); // {x,y,w,h}
  const areaStart = useRef(null);

  // Desenho livre
  const [drawColor, setDrawColor] = useState('#E53935');
  const [drawWidth, setDrawWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPath = useRef([]);
  const drawCtx = useRef(null);

  // Bg color picker
  const [bgPickerAnchor, setBgPickerAnchor] = useState(null);
  // Cor da seta/forma atual
  const [shapeColor, setShapeColor] = useState('#1565C0');

  // Construção de seta (dois cliques)
  const [arrowStart, setArrowStart] = useState(null);

  // ── Configurar canvas de desenho ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawCtx.current = ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Redesenhar todos os paths salvos
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.pencilPaths.forEach(path => {
      if (!path.points || path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color || '#E53935';
      ctx.lineWidth = path.width || 3;
      ctx.globalCompositeOperation = path.eraser ? 'destination-out' : 'source-over';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pencilPaths]);

  // ── Teclas de atalho ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          dispatch({ type: 'DELETE_ELEMENT', payload: selectedIds });
          setSelectedIds([]);
        }
      }
      if (e.key === 'Escape') {
        setSelectedIds([]);
        setArrowStart(null);
        setActiveTool(TOOLS.SELECT);
      }
      if (e.key === 'v' && !e.ctrlKey) setActiveTool(TOOLS.SELECT);
      if (e.key === 'h' && !e.ctrlKey) setActiveTool(TOOLS.PAN);
      if (e.key === 'n' && !e.ctrlKey) setActiveTool(TOOLS.POSTIT);
      if (e.key === 'p' && !e.ctrlKey) setActiveTool(TOOLS.DRAW);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedIds]);

  // ── Utilitários de coordenadas ─────────────────────────────────────────
  const svgCoords = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const canvasCoords = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // ── Scroll para zoom ─────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => Math.min(3, Math.max(0.2, z * factor)));
  }, []);

  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Handlers do SVG ────────────────────────────────────────────────────
  const handleSvgMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const { x, y } = svgCoords(e);

    if (activeTool === TOOLS.PAN) {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (activeTool === TOOLS.SELECT) {
      setSelectedIds([]);
      areaStart.current = { x, y };
      setAreaSelect({ x, y, w: 0, h: 0 });
      return;
    }

    if (activeTool === TOOLS.POSTIT) {
      const snap = (v) => Math.round(v / 12) * 12;
      dispatch({
        type: 'ADD_ELEMENT',
        payload: {
          id: genId(), type: SHAPE_TYPES.POSTIT,
          x: snap(x), y: snap(y), width: 180, height: 120,
          bgColor: POSTIT_COLORS[Math.floor(Math.random() * 8)],
          title: '', content: 'Nova nota', tag: '',
        }
      });
      return;
    }

    if (activeTool === TOOLS.RECT) {
      dispatch({
        type: 'ADD_ELEMENT',
        payload: {
          id: genId(), type: SHAPE_TYPES.RECT,
          x, y, width: 120, height: 60,
          fill: 'rgba(21,101,192,0.12)', strokeColor: shapeColor,
          label: 'Processo',
        }
      });
      setActiveTool(TOOLS.SELECT);
      return;
    }

    if (activeTool === TOOLS.CIRCLE) {
      dispatch({
        type: 'ADD_ELEMENT',
        payload: {
          id: genId(), type: SHAPE_TYPES.CIRCLE,
          x, y, width: 80, height: 80,
          fill: 'rgba(21,101,192,0.12)', strokeColor: shapeColor,
          label: '',
        }
      });
      setActiveTool(TOOLS.SELECT);
      return;
    }

    if (activeTool === TOOLS.DIAMOND) {
      dispatch({
        type: 'ADD_ELEMENT',
        payload: {
          id: genId(), type: SHAPE_TYPES.DIAMOND,
          x, y, width: 120, height: 80,
          fill: 'rgba(21,101,192,0.12)', strokeColor: shapeColor,
          label: 'Decisão',
        }
      });
      setActiveTool(TOOLS.SELECT);
      return;
    }

    if (activeTool === TOOLS.TEXT) {
      dispatch({
        type: 'ADD_ELEMENT',
        payload: {
          id: genId(), type: SHAPE_TYPES.TEXT,
          x, y, text: 'Texto', fontSize: 16, color: '#222', bold: false, italic: false,
        }
      });
      setActiveTool(TOOLS.SELECT);
      return;
    }

    if (activeTool === TOOLS.ARROW) {
      if (!arrowStart) {
        setArrowStart({ x, y });
      } else {
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            id: genId(), type: SHAPE_TYPES.ARROW,
            x: arrowStart.x, y: arrowStart.y,
            dx: x - arrowStart.x, dy: y - arrowStart.y,
            color: shapeColor, strokeWidth: 2,
          }
        });
        setArrowStart(null);
        setActiveTool(TOOLS.SELECT);
      }
      return;
    }
  }, [activeTool, svgCoords, pan, shapeColor, arrowStart]);

  const handleSvgMouseMove = useCallback((e) => {
    if (isPanning && panStart.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
      return;
    }

    if (areaStart.current && activeTool === TOOLS.SELECT) {
      const { x, y } = svgCoords(e);
      const sx = areaStart.current.x;
      const sy = areaStart.current.y;
      setAreaSelect({
        x: Math.min(x, sx), y: Math.min(y, sy),
        w: Math.abs(x - sx), h: Math.abs(y - sy),
      });
    }
  }, [isPanning, activeTool, svgCoords]);

  const handleSvgMouseUp = useCallback((e) => {
    setIsPanning(false);
    panStart.current = null;

    if (areaStart.current && areaSelect && areaSelect.w > 4 && areaSelect.h > 4) {
      const sel = state.elements
        .filter(el =>
          el.x >= areaSelect.x && el.x + (el.width || 60) <= areaSelect.x + areaSelect.w &&
          el.y >= areaSelect.y && el.y + (el.height || 40) <= areaSelect.y + areaSelect.h
        )
        .map(el => el.id);
      setSelectedIds(sel);
    }

    areaStart.current = null;
    setAreaSelect(null);
  }, [areaSelect, state.elements]);

  // ── Handlers do canvas (desenho livre) ───────────────────────────────
  const handleCanvasDown = useCallback((e) => {
    if (activeTool !== TOOLS.DRAW && activeTool !== TOOLS.ERASE) return;
    setIsDrawing(true);
    const pt = canvasCoords(e);
    currentPath.current = [pt];
    const ctx = drawCtx.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = activeTool === TOOLS.ERASE ? '#000' : drawColor;
    ctx.lineWidth = activeTool === TOOLS.ERASE ? drawWidth * 4 : drawWidth;
    ctx.globalCompositeOperation = activeTool === TOOLS.ERASE ? 'destination-out' : 'source-over';
    ctx.moveTo(pt.x, pt.y);
  }, [activeTool, canvasCoords, drawColor, drawWidth]);

  const handleCanvasMove = useCallback((e) => {
    if (!isDrawing) return;
    const pt = canvasCoords(e);
    currentPath.current.push(pt);
    const ctx = drawCtx.current;
    if (!ctx) return;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }, [isDrawing, canvasCoords]);

  const handleCanvasUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.current.length > 1) {
      dispatch({
        type: 'ADD_PENCIL_PATH',
        payload: {
          id: genPencilId(),
          points: currentPath.current,
          color: drawColor,
          width: drawWidth,
          eraser: activeTool === TOOLS.ERASE,
        }
      });
    }
    currentPath.current = [];
    const ctx = drawCtx.current;
    if (ctx) ctx.globalCompositeOperation = 'source-over';
  }, [isDrawing, drawColor, drawWidth, activeTool]);

  // ── Mover elemento ───────────────────────────────────────────────────
  const handleMove = useCallback((id, nx, ny) => {
    const snap = (v) => Math.round(v / 4) * 4;
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id, changes: { x: snap(nx), y: snap(ny) } } });
  }, []);

  // ── Duplo clique em elemento ──────────────────────────────────────────
  const handleDoubleClick = useCallback((el) => {
    if (el.type === SHAPE_TYPES.POSTIT) {
      setViewModalEl(el);
    } else {
      setEditingElement(el);
      setEditDialogOpen(true);
    }
  }, []);

  // ── Salvar edição ───────────────────────────────────────────────────
  const handleSaveEdit = useCallback((form) => {
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id: form.id, changes: form } });
  }, []);

  // ── Exportar/importar ────────────────────────────────────────────────
  const handleExport = () => {
    const data = JSON.stringify({
      elements: state.elements,
      pencilPaths: state.pencilPaths,
      bgColor: state.bgColor,
      bgImage: state.bgImage,
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quadro_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Quadro exportado!');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          dispatch({ type: 'LOAD_BOARD', payload: data });
          toast.success('Quadro importado!');
        } catch {
          toast.error('Arquivo inválido');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleBgImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        dispatch({ type: 'SET_BG_IMAGE', payload: ev.target.result });
        toast.success('Imagem de fundo definida!');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleFitScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const darkBg = ['#1E2A3A', '#212121'].includes(state.bgColor);

  const toolGroups = [
    {
      group: 'Navegação',
      tools: [
        { id: TOOLS.SELECT, icon: <SelectAll />, tip: 'Selecionar (V)' },
        { id: TOOLS.PAN, icon: <PanTool />, tip: 'Mover quadro (H)' },
      ]
    },
    {
      group: 'Criar',
      tools: [
        { id: TOOLS.POSTIT, icon: <Note />, tip: 'Post-it (N)' },
        { id: TOOLS.TEXT, icon: <TextFields />, tip: 'Texto' },
        { id: TOOLS.RECT, icon: <CropSquare />, tip: 'Retângulo' },
        { id: TOOLS.CIRCLE, icon: <RadioButtonUnchecked />, tip: 'Círculo/Oval' },
        { id: TOOLS.DIAMOND, icon: <AccountTree />, tip: 'Decisão (Losango)' },
        { id: TOOLS.ARROW, icon: <ArrowRightAlt />, tip: 'Seta (clique início → fim)' },
      ]
    },
    {
      group: 'Desenho',
      tools: [
        { id: TOOLS.DRAW, icon: <Brush />, tip: 'Desenho livre (P)' },
        { id: TOOLS.ERASE, icon: <Close />, tip: 'Borracha' },
      ]
    },
  ];

  const svgWidth = 3600;
  const svgHeight = 2400;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 500, bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>

      {/* ── Barra de ferramentas ─────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', px: 1.5, py: 0.8,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', gap: 0.5, flexWrap: 'wrap', zIndex: 10,
      }}>
        {/* Título */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mr: 1, color: 'primary.main', fontSize: 13, whiteSpace: 'nowrap' }}>
          🖼️ Quadro Visual
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Ferramentas por grupo */}
        {toolGroups.map((group, gi) => (
          <React.Fragment key={gi}>
            <Box sx={{ display: 'flex', gap: 0.3 }}>
              {group.tools.map(t => (
                <Tooltip key={t.id} title={t.tip} placement="bottom">
                  <IconButton
                    size="small"
                    onClick={() => { setActiveTool(t.id); if (t.id !== TOOLS.ARROW) setArrowStart(null); }}
                    sx={{
                      width: 32, height: 32,
                      bgcolor: activeTool === t.id ? 'primary.main' : 'transparent',
                      color: activeTool === t.id ? 'white' : 'text.secondary',
                      borderRadius: 1,
                      '&:hover': { bgcolor: activeTool === t.id ? 'primary.dark' : 'action.hover' },
                    }}
                  >
                    {t.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Box>
            {gi < toolGroups.length - 1 && <Divider orientation="vertical" flexItem sx={{ mx: 0.3 }} />}
          </React.Fragment>
        ))}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Cor para formas */}
        <Tooltip title="Cor das formas/setas">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Circle sx={{ fontSize: 16, color: shapeColor }} />
            <input
              type="color" value={shapeColor}
              onChange={e => setShapeColor(e.target.value)}
              style={{ width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }}
              title="Cor das formas"
            />
          </Box>
        </Tooltip>

        {/* Configurações de desenho */}
        {(activeTool === TOOLS.DRAW || activeTool === TOOLS.ERASE) && (
          <>
            <input
              type="color" value={drawColor}
              onChange={e => setDrawColor(e.target.value)}
              style={{ width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }}
              title="Cor do pincel"
            />
            <Tooltip title={`Espessura: ${drawWidth}px`}>
              <Box sx={{ width: 80 }}>
                <Slider
                  size="small" min={1} max={20} value={drawWidth}
                  onChange={(_, v) => setDrawWidth(v)}
                />
              </Box>
            </Tooltip>
          </>
        )}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Desfazer / Refazer */}
        <Tooltip title="Desfazer (Ctrl+Z)">
          <span>
            <IconButton size="small" onClick={() => dispatch({ type: 'UNDO' })} disabled={state.past.length === 0}
              sx={{ width: 32, height: 32, borderRadius: 1 }}>
              <Undo fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Refazer (Ctrl+Y)">
          <span>
            <IconButton size="small" onClick={() => dispatch({ type: 'REDO' })} disabled={state.future.length === 0}
              sx={{ width: 32, height: 32, borderRadius: 1 }}>
              <Redo fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Zoom */}
        <Tooltip title="Reduzir zoom">
          <IconButton size="small" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} sx={{ width: 28, height: 28 }}>
            <ZoomOut fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'center', fontWeight: 600 }}>
          {Math.round(zoom * 100)}%
        </Typography>
        <Tooltip title="Aumentar zoom">
          <IconButton size="small" onClick={() => setZoom(z => Math.min(3, z + 0.1))} sx={{ width: 28, height: 28 }}>
            <ZoomIn fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Ajustar à tela">
          <IconButton size="small" onClick={handleFitScreen} sx={{ width: 28, height: 28 }}>
            <FitScreen fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Fundo */}
        <Tooltip title="Cor do fundo">
          <IconButton size="small" onClick={(e) => setBgPickerAnchor(e.currentTarget)}
            sx={{ width: 32, height: 32, borderRadius: 1 }}>
            <FormatColorFill fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Imagem de fundo">
          <IconButton size="small" onClick={handleBgImage} sx={{ width: 32, height: 32, borderRadius: 1 }}>
            <Wallpaper fontSize="small" />
          </IconButton>
        </Tooltip>
        {state.bgImage && (
          <Tooltip title="Remover imagem de fundo">
            <IconButton size="small" onClick={() => dispatch({ type: 'SET_BG_IMAGE', payload: null })}
              sx={{ width: 32, height: 32, borderRadius: 1, color: 'error.main' }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Grid */}
        <Tooltip title={state.showGrid ? 'Ocultar grade' : 'Mostrar grade'}>
          <IconButton size="small" onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
            sx={{ width: 32, height: 32, borderRadius: 1, color: state.showGrid ? 'primary.main' : 'text.secondary' }}>
            <GridOn fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Mostrar/ocultar pontos */}
        <Tooltip title={state.showPoints ? 'Ocultar pontos' : 'Mostrar pontos'}>
          <IconButton size="small" onClick={() => dispatch({ type: 'TOGGLE_POINTS' })}
            sx={{ width: 32, height: 32, borderRadius: 1, color: state.showPoints ? 'primary.main' : 'text.secondary' }}>
            {state.showPoints ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />

        {/* Deletar selecionados */}
        {selectedIds.length > 0 && (
          <Tooltip title={`Deletar ${selectedIds.length} item(s) (Del)`}>
            <IconButton size="small" color="error"
              onClick={() => { dispatch({ type: 'DELETE_ELEMENT', payload: selectedIds }); setSelectedIds([]); }}
              sx={{ width: 32, height: 32, borderRadius: 1 }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Importar/Exportar */}
        <Tooltip title="Importar quadro (.json)">
          <IconButton size="small" onClick={handleImport} sx={{ width: 32, height: 32, borderRadius: 1 }}>
            <Upload fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Exportar quadro (.json)">
          <IconButton size="small" onClick={handleExport} sx={{ width: 32, height: 32, borderRadius: 1 }}>
            <Download fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Limpar */}
        <Tooltip title="Limpar tudo">
          <IconButton size="small" color="error"
            onClick={() => { if (window.confirm('Limpar todo o quadro?')) dispatch({ type: 'CLEAR_BOARD' }); }}
            sx={{ width: 32, height: 32, borderRadius: 1 }}>
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Indicador de ferramenta ativa ──────────────────────────────── */}
      {arrowStart && (
        <Box sx={{ bgcolor: 'warning.light', px: 2, py: 0.5, fontSize: 12, color: 'warning.dark' }}>
          🎯 Seta iniciada em ({Math.round(arrowStart.x)}, {Math.round(arrowStart.y)}) — Clique para definir o destino. Pressione Esc para cancelar.
        </Box>
      )}

      {/* ── Área do quadro ───────────────────────────────────────────────── */}
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Canvas de desenho livre — sobreposto, mas com pointer-events apenas no modo desenho */}
        <canvas
          ref={canvasRef}
          width={svgWidth}
          height={svgHeight}
          style={{
            position: 'absolute',
            top: pan.y,
            left: pan.x,
            width: svgWidth * zoom,
            height: svgHeight * zoom,
            zIndex: activeTool === TOOLS.DRAW || activeTool === TOOLS.ERASE ? 20 : -1,
            cursor: activeTool === TOOLS.DRAW ? 'crosshair' : activeTool === TOOLS.ERASE ? 'cell' : 'default',
            pointerEvents: activeTool === TOOLS.DRAW || activeTool === TOOLS.ERASE ? 'auto' : 'none',
            touchAction: 'none',
          }}
          onMouseDown={handleCanvasDown}
          onMouseMove={handleCanvasMove}
          onMouseUp={handleCanvasUp}
          onMouseLeave={handleCanvasUp}
        />

        {/* SVG principal */}
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{
            cursor: activeTool === TOOLS.PAN ? (isPanning ? 'grabbing' : 'grab')
              : activeTool === TOOLS.SELECT ? 'default'
              : activeTool === TOOLS.DRAW || activeTool === TOOLS.ERASE ? 'none'
              : 'crosshair',
            touchAction: 'none',
            position: 'absolute', inset: 0,
          }}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
        >
          <defs>
            {state.showGrid && (
              <pattern id="grid" width={state.gridSize * zoom} height={state.gridSize * zoom} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${state.gridSize * zoom} 0 L 0 0 0 ${state.gridSize * zoom}`}
                  fill="none"
                  stroke={darkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}
                  strokeWidth="0.5"
                />
              </pattern>
            )}
            {/* Imagem de fundo */}
            {state.bgImage && (
              <image id="bgImg" href={state.bgImage} x={0} y={0} width={svgWidth} height={svgHeight} preserveAspectRatio="xMidYMid slice" />
            )}
          </defs>

          {/* Fundo */}
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            <rect x={0} y={0} width={svgWidth} height={svgHeight} fill={state.bgImage ? 'none' : state.bgColor} />
            {state.bgImage && <use href="#bgImg" />}
            {state.showGrid && <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="url(#grid)" />}

            {/* Pontos decorativos */}
            {state.showPoints && !state.showGrid && Array.from({ length: 40 }).map((_, ri) =>
              Array.from({ length: 60 }).map((_, ci) => (
                <circle
                  key={`dot_${ri}_${ci}`}
                  cx={ci * 60 + 30} cy={ri * 60 + 30} r={1.2}
                  fill={darkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                />
              ))
            )}

            {/* Elementos */}
            {state.elements.map(el => {
              const sel = selectedIds.includes(el.id);
              switch (el.type) {
                case SHAPE_TYPES.POSTIT:
                  return <PostItElement key={el.id} el={el} selected={sel}
                    onSelect={id => setSelectedIds([id])}
                    onMove={handleMove}
                    onDoubleClick={handleDoubleClick}
                    darkBg={darkBg}
                  />;
                case SHAPE_TYPES.RECT:
                case SHAPE_TYPES.CIRCLE:
                case SHAPE_TYPES.DIAMOND:
                  return <ShapeElement key={el.id} el={el} selected={sel}
                    onSelect={id => setSelectedIds([id])}
                    onMove={handleMove}
                    onDoubleClick={handleDoubleClick}
                  />;
                case SHAPE_TYPES.TEXT:
                  return <TextElement key={el.id} el={el} selected={sel}
                    onSelect={id => setSelectedIds([id])}
                    onMove={handleMove}
                    onDoubleClick={handleDoubleClick}
                  />;
                case SHAPE_TYPES.ARROW:
                  return <ArrowElement key={el.id} el={el} selected={sel}
                    onSelect={id => setSelectedIds([id])}
                    onMove={handleMove}
                  />;
                default:
                  return null;
              }
            })}

            {/* Seleção por área */}
            {areaSelect && areaSelect.w > 4 && (
              <rect
                x={areaSelect.x} y={areaSelect.y}
                width={areaSelect.w} height={areaSelect.h}
                fill="rgba(21,101,192,0.08)"
                stroke="#1565C0"
                strokeWidth={1 / zoom}
                strokeDasharray={`${4 / zoom} ${2 / zoom}`}
              />
            )}

            {/* Pré-visualização da seta em construção */}
            {arrowStart && (
              <circle cx={arrowStart.x} cy={arrowStart.y} r={5} fill="#FF9800" stroke="white" strokeWidth={2} />
            )}
          </g>
        </svg>
      </Box>

      {/* ── Status bar ─────────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', px: 2, py: 0.5, gap: 2,
        borderTop: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', fontSize: 11, color: 'text.secondary',
      }}>
        <Typography variant="caption">
          {state.elements.length} elemento(s)
        </Typography>
        {selectedIds.length > 0 && (
          <Chip label={`${selectedIds.length} selecionado(s)`} size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption">
          Ctrl+Z desfaz · Delete remove · Duplo-clique edita
        </Typography>
      </Box>

      {/* ── Popover de cor de fundo ───────────────────────────────────── */}
      <Popover
        open={Boolean(bgPickerAnchor)}
        anchorEl={bgPickerAnchor}
        onClose={() => setBgPickerAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 240 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            🎨 Cor do fundo
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {BG_COLORS.map(bg => (
              <Tooltip key={bg.value} title={bg.label}>
                <Box
                  onClick={() => {
                    dispatch({ type: 'SET_BG_COLOR', payload: bg.value });
                    setBgPickerAnchor(null);
                  }}
                  sx={{
                    width: 36, height: 36, borderRadius: 1, bgcolor: bg.value, cursor: 'pointer',
                    border: state.bgColor === bg.value ? '3px solid #1565C0' : '1px solid rgba(0,0,0,0.2)',
                    '&:hover': { transform: 'scale(1.1)' },
                    transition: 'transform 0.1s',
                  }}
                />
              </Tooltip>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">Cor personalizada:</Typography>
          <input
            type="color"
            value={state.bgColor}
            onChange={e => dispatch({ type: 'SET_BG_COLOR', payload: e.target.value })}
            style={{ width: '100%', height: 36, border: 'none', marginTop: 4, cursor: 'pointer' }}
          />
        </Box>
      </Popover>

      {/* ── Dialog de edição ────────────────────────────────────────────── */}
      <EditElementDialog
        open={editDialogOpen}
        element={editingElement}
        onClose={() => { setEditDialogOpen(false); setEditingElement(null); }}
        onSave={handleSaveEdit}
      />

      {/* ── Modal de visualização do Post-it (duplo clique) ─────────────── */}
      {viewModalEl && (
        <PostItViewModal
          element={viewModalEl}
          onClose={() => setViewModalEl(null)}
          onEdit={(el) => {
            setEditingElement(el);
            setEditDialogOpen(true);
          }}
        />
      )}
    </Box>
  );
};

export default QuadroVisualPage;
