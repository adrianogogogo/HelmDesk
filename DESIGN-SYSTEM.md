# DESIGN-SYSTEM.md — Sistema de Design RelmDesk

> **Guia de design definitivo e reutilizável.**
> Extraído do código real do frontend RelmDesk (React + Material UI). Todos os valores hex, tamanhos, espaçamentos e larguras abaixo são **reais**, copiados do código-fonte. Onde algo não está definido no código, está explicitamente marcado como *"não definido no código"* + sugestão.
>
> Objetivo: qualquer pessoa (ou qualquer LLM) que ler este documento deve conseguir reproduzir **exatamente** o mesmo padrão visual em um projeto novo.
>
> 🌐 **REGRA DE IDIOMA:** todo texto visível ao usuário é em **português brasileiro (pt-BR)**. Nunca usar inglês em UI, toasts, validações ou mensagens de erro.

---

## 1. Visão geral & princípios de design

### Personalidade visual
RelmDesk é um **helpdesk corporativo** com estética **limpa, densa em informação e profissional**, ancorada em um **azul corporativo** (`#1565C0`) sobre fundos claros e suaves (`#f0f4f8` / `#f8fafc`). A navegação usa um **azul-marinho escuro em gradiente** (`#0d2137 → #1a3a5c`) que dá peso e identidade. O resultado é "SaaS empresarial confiável": cartões com cantos arredondados, sombras sutis, tabelas densas, chips coloridos para status, e feedback por toasts.

Princípios:
1. **Clareza acima de decoração** — sombras leves, sem gradientes chamativos no conteúdo (gradiente reservado para sidebar, login e portal público).
2. **Densidade de informação** — tabelas `size="small"`, campos `size="small"`, muito conteúdo por tela.
3. **Status por cor** — todo estado (status de ticket, prioridade, marca) vira um `Chip` colorido com fundo a 12–20% de opacidade da cor e texto na cor cheia.
4. **Cantos arredondados consistentes** — botões/inputs 8px, cards 12px, dialogs/login 12–24px.
5. **Feedback imediato** — `react-hot-toast` para sucesso/erro; `CircularProgress` para loading.
6. **pt-BR sempre.**

### Stack tecnológica (versões reais do `frontend/package.json`)

| Tecnologia | Versão | Uso |
|---|---|---|
| React | `^18.3.1` | Biblioteca base |
| React DOM | `^18.3.1` | Render |
| `@mui/material` | `^5.15.20` | **Design system base (MUI v5)** |
| `@mui/icons-material` | `^5.15.20` | Iconografia |
| `@mui/x-date-pickers` | `^7.5.0` | Seletores de data |
| `@emotion/react` / `@emotion/styled` | `^11.11.4` / `^11.11.5` | Engine de estilo do MUI |
| `@reduxjs/toolkit` | `^2.2.5` | Estado global (inclui `uiSlice` com `darkMode`) |
| `react-redux` | `^9.1.2` | Bindings Redux |
| `react-router-dom` | `^6.24.0` | Roteamento |
| `react-hot-toast` | `^2.4.1` | **Toasts de feedback** |
| `recharts` | `^3.8.1` | Gráficos (PieChart no dashboard) |
| `@dnd-kit/core` + `sortable` + `utilities` | `^6.1.0` / `^8.0.0` / `^3.2.2` | Drag-and-drop (Kanban, Quadro) |
| `axios` | `^1.7.2` | HTTP client |
| `date-fns` | `^3.6.0` | Datas (locale `ptBR`) |
| `socket.io-client` | `^4.7.5` | Chat/notificações em tempo real |
| `react-scripts` | `5.0.1` | Build (Create React App) |

> Build: `GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=1536 react-scripts build` (otimizado para VPS de baixa RAM).

---

## 2. Paleta de cores

Fonte primária: `frontend/src/theme/index.js`. Cores adicionais extraídas de `index.css`, `Sidebar.js`, `AuthLayout.js`, páginas.

### 2.1 Modo claro (`lightTheme`)

| Token | Hex | Uso recomendado |
|---|---|---|
| `primary.main` | `#1565C0` | Cor de marca; botões primários, links, números de ticket, avatares, ícone ativo |
| `primary.light` | `#1976d2` | Hover/variações claras do primário |
| `primary.dark` | `#0d47a1` | Pressionado/ênfase |
| `secondary.main` | `#2d3a4a` | Azul-ardósia escuro; elementos secundários |
| `secondary.light` | `#455a64` | Variação clara do secundário |
| `secondary.dark` | `#1a252f` | Variação escura do secundário |
| `background.default` | `#f0f4f8` | Fundo da aplicação (área de conteúdo) |
| `background.paper` | `#ffffff` | Fundo de cards, TopBar, dialogs |
| `success.main` | `#4CAF50` | Sucesso; status "Resolvido"; ponto online |
| `warning.main` | `#FF9800` | Atenção; tickets abertos; alertas |
| `error.main` | `#F44336` | Erro; prioridade urgente; ação "Sair"; badges |
| `info.main` | `#2196F3` | Informação; prioridade normal |
| `text.primary` | *(padrão MUI)* `rgba(0,0,0,0.87)` | Texto principal |
| `text.secondary` | *(padrão MUI)* `rgba(0,0,0,0.6)` | Texto auxiliar/labels |

### 2.2 Cores auxiliares usadas no código (fora da paleta do tema)

| Hex | Onde aparece | Uso |
|---|---|---|
| `#f8fafc` | `index.css` body, `MuiTableHead` background, Paper de destaque | Fundo neutro muito claro |
| `#9C27B0` | Dashboard (StatCard "Tarefas") | Roxo para categoria tarefas |
| `#9E9E9E` | TicketsPage prioridade "Baixa" | Cinza neutro |
| `#666` | Fallback de cor de status/chip | Cinza fallback |
| `#222` | `index.css` `.chat-bubble-other` texto | Texto escuro em balão de chat |
| `#bbb` / `#888` / `#f1f1f1` | `index.css` scrollbar | Thumb, hover, track |

### 2.3 Gradientes (load-bearing — copiar exatos)

| Local | Gradiente | Arquivo |
|---|---|---|
| **Sidebar** | `linear-gradient(180deg, #0d2137 0%, #1a3a5c 100%)` | `Sidebar.js` |
| **Login (AuthLayout)** | `linear-gradient(135deg, #0d2137 0%, #1565C0 100%)` | `AuthLayout.js` |
| **Portal público (abrir/sucesso ticket)** | `linear-gradient(135deg, #0d2137 0%, #1565C0 100%)` | `OpenTicketPage.js` |
| **Card "Futebol da Relm" (dashboard)** | `linear-gradient(135deg, #0d2137 0%, #1565C0 100%)` | `DashboardPage.js` |

### 2.4 Cores sobre fundo escuro (sidebar / cards em gradiente)

| Valor | Uso |
|---|---|
| `white` | Texto principal, logo, ícone/label ativo |
| `rgba(255,255,255,0.75)` | Label de item de menu inativo |
| `rgba(255,255,255,0.65)` | Ícone de menu inativo |
| `rgba(255,255,255,0.6)` | Texto de rodapé / toggle |
| `rgba(255,255,255,0.2)` / `0.15)` / `0.1)` / `0.05)` | Fundos de chips, item ativo, hover, estados desabilitados |
| `rgba(255,255,255,0.1)` | Cor de `Divider` na sidebar |
| `#4CAF50` | Ponto verde "online" no rodapé da sidebar |

### 2.5 Modo escuro (`darkTheme`)

| Token | Hex | Uso |
|---|---|---|
| `primary.main` | `#42a5f5` | Azul mais claro para contraste em fundo escuro |
| `primary.light` | `#64b5f6` | Variação clara |
| `primary.dark` | `#1976d2` | Variação escura |
| `secondary.main` | `#90caf9` | Azul claro secundário |
| `background.default` | `#0a1929` | Fundo da aplicação (azul quase preto) |
| `background.paper` | `#0d2137` | Cards/superfícies (mesmo tom do topo da sidebar) |

> `success/warning/error/info` **não são redefinidos** no `darkTheme` — herdam os padrões do MUI. *(Sugestão: redefinir para manter consistência com o claro.)*

### 2.6 Cor por opacidade — padrão de chip de status (CONVENÇÃO CHAVE)

Sempre que se exibe um status/prioridade/marca colorido:
```jsx
<Chip
  label={status_name}
  size="small"
  sx={{
    bgcolor: (corDoStatus || '#666') + '20', // fundo a ~12% de opacidade (hex "20")
    color: corDoStatus || '#666',            // texto na cor cheia
    fontWeight: 600,
    fontSize: 11,
  }}
/>
```
Variações de opacidade usadas: `+ '15'` (cards de KPI, marcas), `+ '20'` (chips de status/prioridade, barras de progresso).

---

## 3. Tipografia

Fonte primária: `theme/index.js` + `index.css`.

| Propriedade | Valor real |
|---|---|
| Família | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (body também inclui `Roboto`) |
| Suavização | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` |

> ⚠️ A fonte **Inter não é importada** via `@font-face`/Google Fonts no código lido — depende da fonte estar no sistema, com fallback para system-ui. *(Sugestão: adicionar `<link>` do Google Fonts para Inter 400/500/600/700 no `public/index.html`.)*

### Pesos (font-weight) por variante (override do tema)

| Variante | Peso |
|---|---|
| `h1` | 700 |
| `h2`–`h6` | 600 |
| Botão (`MuiButton`) | 600 |
| Chip (`MuiChip`) | 500 |
| Cabeçalho de tabela | 600 |

### Hierarquia em uso (tamanhos herdam os defaults do MUI; pesos aplicados via `fontWeight`)

| Variante | Uso típico no código | Peso aplicado |
|---|---|---|
| `h4` | Valor grande em StatCard (KPIs) | `fontWeight={700}` |
| `h5` | Título de página ("Tickets", "Lojas", "Dashboard") | `fontWeight={700}` |
| `h6` | Título de dialog/card de login | `fontWeight={700}` |
| `subtitle1` | Títulos de seção dentro de cards | `fontWeight={600}` |
| `subtitle2` | Cabeçalhos de menus/popovers | `fontWeight={700}` (em popovers) |
| `body2` | Texto padrão de tabelas, descrições, labels | 400 (600/700 quando ênfase) |
| `caption` | Datas, metadados, dicas, rodapés | 400 |

> Convenção: títulos de página = `variant="h5" fontWeight={700}` + subtítulo `variant="body2" color="text.secondary"`.

---

## 4. Espaçamento, grid e layout

### Unidade base
MUI padrão: **`spacing(1) = 8px`**. Não há override de `spacing` no tema → 1 unidade = 8px.
- `p: 2` = 16px, `p: 3` = 24px, `p: 4` = 32px, `gap: 1` = 8px, `gap: 1.5` = 12px, `gap: 2` = 16px.

### Larguras fixas (reais)

| Elemento | Valor | Fonte |
|---|---|---|
| Sidebar expandida | `260px` (`SIDEBAR_WIDTH`) | `Sidebar.js` / `MainLayout.js` |
| Sidebar colapsada | `70px` (`SIDEBAR_COLLAPSED`) | `Sidebar.js` / `MainLayout.js` |
| Transição de largura da sidebar | `width 0.25s ease` | ambos |
| `minHeight` do bloco logo da sidebar | `72px` | `Sidebar.js` |
| Altura mínima de item de menu | `44px` | `Sidebar.js` |
| Card de login (container) | `maxWidth: 480` | `LoginPage.js` |
| Container do portal público | `maxWidth: 720` | `OpenTicketPage.js` |
| Card de sucesso público | `maxWidth: 500` | `OpenTicketPage.js` |
| Dropdown de notificações | `width: 360, maxHeight: 480` | `TopBar.js` |
| Menu do usuário | `minWidth: 220` | `TopBar.js` |
| SearchBar na TopBar | `maxWidth: 480` | `TopBar.js` |
| Campo de busca em listagens | `width: 400` | `StoresPage.js` |

### Padding da área de conteúdo
`MainLayout` envolve o `<Outlet/>` com `p: 3, pt: 2` (24px nas laterais/baixo, 16px no topo).

### Grid
Usa `@mui/material` `Grid` (`container` + `item`) com `spacing={2}` ou `spacing={2.5}`. Padrão de KPIs:
```jsx
<Grid container spacing={2.5}>
  <Grid item xs={12} sm={6} md={3}> ... </Grid>
</Grid>
```

### Breakpoints (padrão MUI v5 — não há override no tema)
`xs: 0`, `sm: 600`, `md: 900`, `lg: 1200`, `xl: 1536` (px).

---

## 5. Elevação, bordas e sombras

### Border-radius (reais)

| Elemento | Valor | Fonte |
|---|---|---|
| Tema base (`shape.borderRadius`) | `8px` | `theme/index.js` |
| Botão | `8px` (override) | `MuiButton` |
| Input/TextField | `8px` (herda `shape`) | tema |
| **Card** | `12px` (override) | `MuiCard` |
| Card de login | `borderRadius: 3` → 24px | `LoginPage.js` |
| Card do portal público | `borderRadius: 3` → 24px | `OpenTicketPage.js` |
| Item de menu da sidebar | `borderRadius: 2` → 16px | `Sidebar.js` |
| Alert (login) | `borderRadius: 2` → 16px | `LoginPage.js` |
| Chip de cargo (sidebar) | `height: 18` (pílula) | `Sidebar.js` |
| Scrollbar thumb | `border-radius: 3px` | `index.css` |
| Balão de chat (eu) | `18px 18px 4px 18px` | `index.css` |
| Balão de chat (outro) | `18px 18px 18px 4px` | `index.css` |

> Atenção: `borderRadius: 2` no `sx` = `2 * 8px = 16px` (MUI multiplica pela unidade base). Já `borderRadius: 12` (no override de Card) é interpretado como **pixels literais** = 12px. Manter essa convenção.

### Sombras (box-shadow reais)

| Elemento | Valor | Fonte |
|---|---|---|
| Card (padrão) | `0 2px 12px rgba(0,0,0,0.06)` | `MuiCard` override |
| Sidebar | `4px 0 20px rgba(0,0,0,0.15)` | `Sidebar.js` |
| Card de login | `0 20px 60px rgba(0,0,0,0.3)` | `LoginPage.js` |
| Card Kanban arrastando | `0 8px 32px rgba(0,0,0,0.2) !important` | `index.css` `.kanban-card-dragging` |
| TopBar | **sem sombra** (`elevation={0}`) + `borderBottom: 1px solid divider` | `TopBar.js` |

### Scrollbar customizada (global, `index.css`)
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #bbb; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #888; }
```
Na sidebar (sobre fundo escuro): thumb `rgba(255,255,255,0.2)`, track `transparent`, largura `4px`.

---

## 6. Componentes

Todos baseados em MUI v5. Overrides globais ficam em `theme/index.js`.

### 6.1 Botões (`MuiButton`)
**Override global:** `textTransform: 'none'` (sem CAIXA ALTA), `fontWeight: 600`, `borderRadius: 8`.

| Variante | Uso |
|---|---|
| `variant="contained"` | Ação primária (Novo Ticket, Salvar, Entrar, Aplicar filtro) |
| `variant="outlined"` | Ação secundária (Adicionar produto, Cancelar destacado, Abrir outro ticket) |
| `variant="text"` | Ação terciária (Limpar filtros, Ver todos, Cancelar em dialog) |
| `color="error"` | Ações destrutivas / "Sair" / "Limpar filtros" |

Padrões observados:
- Botão de página: `<Button variant="contained" startIcon={<Add />}>Novo Ticket</Button>`
- Botão de submit grande (login/público): `size="large"`, `sx={{ py: 1.5, fontSize: 15, fontWeight: 700, borderRadius: 2 }}`
- Loading dentro de botão: `{loading ? <CircularProgress size={22} color="inherit" /> : 'Entrar'}`

### 6.2 Campos de texto (`TextField`)
- **Padrão quase universal:** `size="small"` e `fullWidth` em formulários/filtros.
- Label flutuante padrão MUI; obrigatórios marcam `*` no label e/ou `required`.
- Senha com toggle de visibilidade:
```jsx
<TextField
  type={showPassword ? 'text' : 'password'} size="small" fullWidth
  InputProps={{ endAdornment: (
    <InputAdornment position="end">
      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
      </IconButton>
    </InputAdornment>
  )}}
/>
```
- Busca com ícone à esquerda: `InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small"/></InputAdornment> }}`.
- Validação inline (erro + helper): `error={...}` + `helperText={...}` (ex.: contador "(12/50)" em descrição obrigatória).
- Multiline: `multiline rows={4}`.
- `Select` sempre dentro de `<FormControl fullWidth size="small">` com `<InputLabel>` + `<MenuItem value="">Todos/Todas/Selecione...</MenuItem>` como opção vazia.

### 6.3 Cards (`MuiCard`)
**Override global:** `borderRadius: 12`, `boxShadow: 0 2px 12px rgba(0,0,0,0.06)`.
- Conteúdo sempre em `<CardContent>`; padding ajustado por caso (`p: 2`, `p: 2.5`, `py: 2`, `p: 4` no login).
- Card de seção em dashboard usa `sx={{ height: '100%' }}` para alinhar alturas no Grid.
- StatCard (KPI) — padrão reutilizável:
```jsx
<Card>
  <CardContent sx={{ p: 2.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
        <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </Box>
      <Box sx={{ bgcolor: color + '15', borderRadius: 2, p: 1.2, color }}>{icon}</Box>
    </Box>
  </CardContent>
</Card>
```

### 6.4 Tabelas (`Table`)
**Override global do cabeçalho:** `.MuiTableCell-head { fontWeight: 600; background: #f8fafc }`.
- Tabela sempre dentro de um `<Card>` (sem `CardContent` quando ocupa a largura toda).
- `size="small"` na maioria das listas.
- Linha clicável: `<TableRow hover sx={{ cursor: 'pointer' }} onClick={...}>`.
- Célula com ação interna (botão) usa `onClick={e => e.stopPropagation()}` para não disparar a navegação da linha.
- Número de ticket: `variant="body2" color="primary.main" fontWeight={700}` precedido de `#`.
- Texto longo truncado: `sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}`.
- Paginação:
```jsx
<TablePagination
  component="div" count={total} page={page} rowsPerPage={rowsPerPage}
  rowsPerPageOptions={[10, 20, 50, 100]}
  labelRowsPerPage="por página"
  labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
/>
```

### 6.5 Chips / Badges
- **Override global Chip:** `fontWeight: 500`.
- Chip de status/prioridade: `size="small"`, `fontWeight: 600`, `fontSize: 11`, fundo `cor + '20'`, texto na cor (ver §2.6).
- Chip pequeno informativo (sidebar/cargo): `height: 18, fontSize: 10`, `'& .MuiChip-label': { px: 1 }`.
- **Badge** (notificações/chat): `<Badge badgeContent={n} color="error" max={99}>`. Passar `null`/`0` esconde.

### 6.6 Diálogos / Modais (`Dialog`)
- Padrão: `<Dialog open={...} onClose={...} maxWidth="xs|sm" fullWidth>`.
- `<DialogTitle>` com `fontWeight: 700` (e às vezes emoji ou ícone: `<CheckCircle color="success"/>`).
- `<DialogContent>` com campos em `Box` flex coluna `gap: 2, pt: 1` ou `Grid container spacing={2} sx={{ pt: 1 }}`.
- `<DialogActions sx={{ px: 3, pb: 2 }}>` com Cancelar (text) à esquerda + ação primária (contained) à direita.
- Erro dentro do dialog: `<Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>`.

### 6.7 Tooltips
`<Tooltip title="...">` em ícones e botões de ação; na sidebar colapsada mostra o label do item: `placement="right"`.

### 6.8 Alerts (`Alert`)
- Severidades em uso: `error`, `warning`, `success`.
- `sx={{ borderRadius: 2 }}` quando precisa casar com o card (login/portal).
- Pode receber `icon` custom (`<LockClock/>`).

### 6.9 Avatares
`<Avatar sx={{ width: 32–36, height: 32–36, bgcolor: '#1565C0', fontSize: 13–14 }}>{inicial}</Avatar>`. Inicial = `user.name.charAt(0).toUpperCase()`. Em fundos escuros, `bgcolor: 'rgba(255,255,255,0.2)'`.

### 6.10 Toasts (`react-hot-toast`)
Config global em `index.js`:
```jsx
<Toaster
  position="top-right"
  toastOptions={{ duration: 4000, style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' } }}
/>
```
Uso: `toast.success('Senha alterada com sucesso!')`, `toast.error('Erro ao salvar loja')`. Toast de chat (custom): fundo `#1565C0` / `#1565C0` azul, texto branco, 4s. **Sempre em pt-BR, frequentemente com emoji** (`👋`, `💬`, `✅`).

### 6.11 Indicadores de progresso
- Loading de página: `<Box sx={{ display:'flex', justifyContent:'center', mt: 8 }}><CircularProgress /></Box>`.
- Loading em linha de tabela: `<CircularProgress size={32}/>` em célula com `colSpan` e `textAlign: 'center', py: 4`.
- Barra de progresso de status (dashboard): `<LinearProgress variant="determinate" sx={{ height: 4, borderRadius: 2, bgcolor: cor+'20', '& .MuiLinearProgress-bar': { bgcolor: cor } }}/>`.

---

## 7. Padrões de layout de página

### 7.1 Anatomia de uma página interna (padrão recorrente)
```jsx
<Box>
  {/* 1. Header: título + subtítulo à esquerda, ação primária à direita */}
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
    <Box>
      <Typography variant="h5" fontWeight={700}>Tickets</Typography>
      <Typography variant="body2" color="text.secondary">{total} ticket(s) encontrado(s)</Typography>
    </Box>
    <Button variant="contained" startIcon={<Add />} onClick={...}>Novo Ticket</Button>
  </Box>

  {/* 2. (Opcional) Card de filtros / barra de busca */}
  <Card sx={{ mb: 2 }}><CardContent sx={{ py: 2 }}> ...filtros em Grid... </CardContent></Card>

  {/* 3. Card com tabela */}
  <Card>
    <Table> ...TableHead / TableBody... </Table>
    <TablePagination ... />
  </Card>

  {/* 4. Dialogs de criação/edição (montados no fim do componente) */}
  <Dialog ...>...</Dialog>
</Box>
```

### 7.2 Layout autenticado (`MainLayout`)
Estrutura **crítica** (não usar MUI `Drawer`):
```jsx
<Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
  <Sidebar />                                   {/* position: fixed, fora do fluxo */}
  <Box sx={{ width: sidebarWidth, flexShrink: 0, transition: 'width 0.25s ease' }} /> {/* ESPAÇADOR invisível que reserva o espaço */}
  <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0, overflow: 'hidden' }}>
    <TopBar />                                   {/* position: sticky, elevation 0 */}
    <Box sx={{ flexGrow: 1, p: 3, pt: 2 }}><Outlet /></Box>
  </Box>
  <ChatDrawer />
</Box>
```
> **Regra histórica (não quebrar):** a sidebar é `position: fixed` e o espaço dela é reservado por um **Box espaçador flex** (`width = sidebarWidth, flexShrink: 0`), **NÃO** por `paddingLeft` no conteúdo nem por MUI `Drawer`. Isso evita o bug de sobreposição já corrigido no projeto.

### 7.3 Layout público / autenticação
- **AuthLayout (login):** `minHeight: 100vh` + gradiente `135deg #0d2137 → #1565C0`, conteúdo centralizado (flex center). Card central com logo acima, chips de departamento, formulário.
- **Portal público (OpenTicketPage):** mesmo gradiente, container `maxWidth: 720` centralizado, logo branca/colorida no topo, `<Card borderRadius: 3>` com seções separadas por `<Divider sx={{ my: 3 }}>` e títulos `subtitle1 fontWeight 600` com emoji (`📋 Dados do problema`, `👤 Seus dados`, `🚴 Produto(s)`). Tela de sucesso = card centralizado com emoji grande `✅`, `Alert severity="success"` e botões de acompanhamento.

---

## 8. Navegação (Sidebar & TopBar)

### 8.1 Sidebar (`components/layout/Sidebar.js`)
- **Container:** `Box position: fixed`, `width` animada (260 ↔ 70px), `height: 100vh`, gradiente vertical, `color: white`, `zIndex: 1200`, sombra `4px 0 20px rgba(0,0,0,0.15)`.
- **Topo:** logo (`/logo-white.png` expandida, `/favicon.png` colapsada) + botão toggle (`ChevronLeft`/`ChevronRight`).
- **Bloco de usuário (só expandida):** Avatar (inicial) + nome (`body2 fontWeight 600`, com ellipsis) + Chip de cargo translúcido.
- **Itens de menu:** lista com `borderRadius: 2`, `minHeight: 44`. Ativo: `bgcolor: rgba(255,255,255,0.15)`, ícone/label brancos `fontWeight 600`. Inativo: ícone `rgba(255,255,255,0.65)`, label `rgba(255,255,255,0.75)` `fontWeight 400`. Hover: `rgba(255,255,255,0.1)`.
- **Dividers** entre grupos: `borderColor: rgba(255,255,255,0.1)`.
- **Badge** no item Chat: `<Badge badgeContent={chatUnread} color="error" max={99}>`.
- **Rodapé (só expandida):** ponto verde `#4CAF50` + `Bikes — v1`.
- **RBAC:** cada item tem `roles: [...]`; filtra por `user.role`. Perfis: `cliente, loja, atendente, gestor, diretor, superadmin`.

Menu (ordem real): Dashboard, Tickets, Tarefas, Chat, Quadro Visual, Busca · *(divider)* · Produtos, Clientes, Lojas, Usuários · *(divider)* · Futebol da Relm, Relatórios, Configurações.

### 8.2 TopBar (`components/layout/TopBar.js`)
- `<AppBar position="sticky" elevation={0}>` com `bgcolor: background.paper`, `borderBottom: 1px solid divider`, `color: text.primary`.
- Conteúdo (esq→dir): `SearchBar` (maxWidth 480) · espaçador flex · toggle dark mode (`Brightness4/7`) · Chat (badge, só perfis internos) · Notificações (badge) · Avatar do usuário (abre Menu).
- **Menu do usuário:** nome + e-mail + chip de cargo, "Meu Perfil", "Alterar Senha", "Sair" (`color: error.main`).
- **Dropdown de notificações:** `width 360, maxHeight 480`; cabeçalho "🔔 Notificações (N novas)" + "Marcar todas como lidas"; itens com ícone `ConfirmationNumber`, não lidas com fundo `rgba(21,101,192,0.05)` + ponto azul `primary.main`; empty state com `CheckCircle` cinza + "Nenhuma notificação".

---

## 9. Iconografia

- **Biblioteca:** `@mui/icons-material` (v5).
- **Convenção de tamanho:** ícones de ação em `fontSize="small"` ou dentro de `IconButton size="small"`. Ícones de menu em tamanho padrão.
- Ícones recorrentes: `Dashboard, ConfirmationNumber, Assignment, Inventory2, People, BarChart, Settings, Search, SportsScore, Store, Group, Forum, GridView, Add, Edit, Refresh, OpenInNew, FilterList, FilterAlt, Notifications, Chat, Brightness4/7, Logout, Person, Lock, CheckCircle, ContentCopy, DeleteOutline, Visibility/VisibilityOff, ChevronLeft/Right`.
- **Emojis** complementam ícones em títulos e toasts (`⚽ 🚴 📋 👤 🔒 ✅ 👋 💬 🟢 🥇🥈🥉`). Uso intencional e em pt-BR.

---

## 10. Estados de UI

| Estado | Padrão |
|---|---|
| **Loading página** | `<CircularProgress />` centralizado com `mt: 8` |
| **Loading tabela** | linha única com `colSpan`, `<CircularProgress size={32}/>`, `py: 4` centralizado |
| **Loading botão** | `<CircularProgress size={18–22} color="inherit"/>` substituindo o texto, `disabled` |
| **Vazio (tabela)** | linha com `<Typography color="text.secondary">Nenhum ticket encontrado</Typography>` |
| **Vazio (lista/popover)** | ícone cinza (`CheckCircle`/`text.disabled`) + texto secundário centralizado |
| **Erro (form)** | `<Alert severity="error">` no topo do formulário/dialog; mensagem vinda de `err.response?.data?.error` com fallback pt-BR |
| **Erro (ação)** | `toast.error('...')` |
| **Sucesso** | `toast.success('...')` (frequentemente com emoji) |
| **Aviso** | `<Alert severity="warning">` (ex.: sessão expirada, anotar credenciais) |

> Toda mensagem (loading, vazio, erro, sucesso) é em **pt-BR**.

---

## 11. Modo escuro

- **Estado:** `uiSlice.darkMode` (Redux, inicial `false`). Toggle via `toggleDarkMode()` no ícone da TopBar.
- **Aplicação:** em `App.js`, `const theme = darkMode ? darkTheme : lightTheme;` dentro de `<ThemeProvider>` + `<CssBaseline/>`.
- **Diferenças de paleta (ver §2.5):** primário mais claro (`#42a5f5`), fundos azul-escuro (`#0a1929` / `#0d2137`).
- **Persistência:** *não definido no código* — `darkMode` não é persistido em localStorage. *(Sugestão: persistir a preferência.)*

---

## 12. Acessibilidade & i18n

- **Idioma:** **TODO texto visível é pt-BR** — regra inviolável do projeto. Erros traduzidos (`"Credenciais inválidas"`, não `"Invalid credentials"`).
- **Datas:** formatadas com `date-fns` + locale `ptBR` (`format(data, "dd/MM 'às' HH:mm", { locale: ptBR })`).
- **Contraste:** texto branco sobre gradiente escuro; primário `#1565C0` sobre branco (contraste forte). Estados inativos usam opacidade (atenção: `rgba(255,255,255,0.35)` em chips desabilitados pode ficar abaixo do mínimo WCAG — *revisar*).
- **Foco:** `IconButton`/`Button` mantêm foco nativo do MUI; dialogs usam foco gerenciado do MUI (projeto já corrigiu warning de `aria-hidden` usando Dialog dedicado com `disableRestoreFocus`).
- **Tooltips** fornecem rótulo textual a ícones sem texto.
- **`autoComplete`** correto em campos de login/senha (`email`, `current-password`, `new-password`).

---

## 13. Instruções para a IA replicar este design

> Regras **imperativas e checáveis**. Siga todas ao reproduzir o padrão RelmDesk em um projeto novo.

1. **SEMPRE** use **React 18 + MUI v5** (`@mui/material` ^5) com `@emotion`. Estado global com **Redux Toolkit**; feedback com **react-hot-toast**; datas com **date-fns + locale ptBR**.
2. **SEMPRE** crie dois temas com `createTheme` — `lightTheme` e `darkTheme` — e alterne via `darkMode` do Redux dentro de `<ThemeProvider><CssBaseline/>`.
3. **SEMPRE** use exatamente a paleta: primário `#1565C0` (claro) / `#42a5f5` (escuro); fundo claro `#f0f4f8` / paper `#ffffff`; sucesso `#4CAF50`, aviso `#FF9800`, erro `#F44336`, info `#2196F3`.
4. **SEMPRE** use a família de fonte `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Títulos `h1` = peso 700; `h2`–`h6` = 600.
5. **`shape.borderRadius = 8`.** Botões = 8px e `textTransform: 'none'` + `fontWeight 600`. **Cards = 12px** com sombra `0 2px 12px rgba(0,0,0,0.06)`. Login/portal cards = `borderRadius: 3` (24px).
6. **Cabeçalho de tabela:** `fontWeight 600`, fundo `#f8fafc`. Chip override: `fontWeight 500`.
7. **Sidebar = `Box position: fixed`** com gradiente `linear-gradient(180deg, #0d2137 0%, #1a3a5c 100%)`, largura 260px (expandida) / 70px (colapsada), transição `width 0.25s ease`, `zIndex 1200`. **NUNCA** use MUI `Drawer`.
8. **Reserve o espaço da sidebar com um Box espaçador flex** (`width: sidebarWidth, flexShrink: 0`), **NÃO** com `paddingLeft` no conteúdo.
9. **TopBar = `AppBar position="sticky" elevation={0}`**, fundo `background.paper`, `borderBottom: 1px solid divider`, texto `text.primary`. Sem sombra.
10. **Login e portal público** usam gradiente `linear-gradient(135deg, #0d2137 0%, #1565C0 100%)` com cartão branco centralizado.
11. **Status/prioridade/marca = `Chip size="small"`** com `bgcolor: cor + '20'`, `color: cor`, `fontWeight 600`, `fontSize 11`. (Em cards de KPI use `+ '15'`.)
12. **Cabeçalho de página** = `Typography variant="h5" fontWeight={700}` + subtítulo `body2 color="text.secondary"` à esquerda; ação primária `Button variant="contained" startIcon={<Add/>}` à direita.
13. **Formulários:** `TextField`/`Select` sempre `size="small"` + `fullWidth`; selects dentro de `FormControl` com `InputLabel`; opção vazia "Todos/Selecione...".
14. **Dialogs:** `maxWidth="xs|sm" fullWidth`; `DialogTitle fontWeight 700`; `DialogActions sx={{ px: 3, pb: 2 }}` com Cancelar (text) + ação (contained); erros via `<Alert severity="error">` no topo.
15. **Loading:** `CircularProgress` (centralizado na página, em linha de tabela, ou dentro de botão `color="inherit"`). Botão fica `disabled` durante loading.
16. **Feedback:** use `react-hot-toast` (`position="top-right"`, `duration 4000`, fonte Inter 14px) para sucesso/erro. Erros de API: `err.response?.data?.error` com fallback pt-BR.
17. **Iconografia:** `@mui/icons-material`; ícones de ação `fontSize="small"` / `IconButton size="small"`; tooltips em ícones sem texto.
18. **Espaçamento:** unidade base 8px (MUI). Área de conteúdo `p: 3, pt: 2`. Grids com `spacing={2}`–`2.5}`.
19. **RBAC na navegação:** filtre itens de menu por `roles` do usuário (`cliente, loja, atendente, gestor, diretor, superadmin`).
20. **NUNCA use inglês em texto de UI.** Toasts, labels, validações, erros, empty states — tudo em **pt-BR**, frequentemente com emoji onde já é convenção (`✅`, `⚽`, `👋`).

### Trecho reutilizável de `createTheme` (tokens reais)
```js
import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: '#1565C0', light: '#1976d2', dark: '#0d47a1' },
    secondary: { main: '#2d3a4a', light: '#455a64', dark: '#1a252f' },
    background:{ default: '#f0f4f8', paper: '#ffffff' },
    success:   { main: '#4CAF50' },
    warning:   { main: '#FF9800' },
    error:     { main: '#F44336' },
    info:      { main: '#2196F3' },
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 700 }, h2: { fontWeight: 600 }, h3: { fontWeight: 600 },
    h4: { fontWeight: 600 }, h5: { fontWeight: 600 }, h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 } } },
    MuiCard:   { styleOverrides: { root: { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } } },
    MuiPaper:  { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableHead: { styleOverrides: { root: { '& .MuiTableCell-head': { fontWeight: 600, background: '#f8fafc' } } } },
    MuiChip:   { styleOverrides: { root: { fontWeight: 500 } } },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#42a5f5', light: '#64b5f6', dark: '#1976d2' },
    secondary: { main: '#90caf9' },
    background:{ default: '#0a1929', paper: '#0d2137' },
  },
  typography: { fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiCard:   { styleOverrides: { root: { borderRadius: 12 } } },
  },
});
```

### Tokens-chave de layout (constantes)
```js
const SIDEBAR_WIDTH = 260;        // px (expandida)
const SIDEBAR_COLLAPSED = 70;     // px (colapsada)
const SIDEBAR_GRADIENT = 'linear-gradient(180deg, #0d2137 0%, #1a3a5c 100%)';
const AUTH_GRADIENT    = 'linear-gradient(135deg, #0d2137 0%, #1565C0 100%)';
const CONTENT_PADDING  = { p: 3, pt: 2 };
```

### Checklist de conformidade
- [ ] Tema MUI com a paleta exata (primário `#1565C0`), `shape.borderRadius: 8`, override de Card 12px.
- [ ] Fonte Inter aplicada (e importada via Google Fonts — *ver §3*).
- [ ] Sidebar `Box` fixo com gradiente 260/70px + espaçador flex (sem `Drawer`, sem `paddingLeft`).
- [ ] TopBar `AppBar sticky elevation={0}` com `borderBottom`.
- [ ] Login + portal público com gradiente `135deg #0d2137 → #1565C0` e cartão central.
- [ ] Chips de status com `cor + '20'` de fundo e `cor` de texto.
- [ ] Cabeçalhos de página `h5 700` + subtítulo + ação contained à direita.
- [ ] Tabelas em Card, `size="small"`, head `#f8fafc`, paginação em pt-BR.
- [ ] Dialogs `maxWidth xs/sm`, ações `px:3 pb:2`, erro via Alert.
- [ ] Feedback via react-hot-toast (top-right, 4s, Inter 14px).
- [ ] Dark mode via Redux `uiSlice.darkMode` + ThemeProvider.
- [ ] **100% dos textos em pt-BR.**

---

*Documento gerado a partir do código real do frontend RelmDesk. Fontes primárias: `frontend/src/theme/index.js`, `index.css`, `components/layout/*`, `pages/LoginPage.js`, `pages/DashboardPage.js`, `pages/TicketsPage.js`, `pages/StoresPage.js`, `pages/OpenTicketPage.js`, `index.js`, `App.js`, `store/slices/uiSlice.js`, `package.json`.*
