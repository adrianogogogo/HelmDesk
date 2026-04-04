# CLAUDE.md — RelmDesk v1 Architecture Reference

> **Este arquivo é o documento vivo do projeto RelmDesk v1.**
> Gerado e mantido por AI. Toda sessão de desenvolvimento deve começar com a leitura deste arquivo.

---

## 🌐 REGRA DE IDIOMA — OBRIGATÓRIA

**TODO o sistema é em PORTUGUÊS BRASILEIRO (pt-BR).**

- Todas as mensagens de erro da API → português
- Todos os textos de UI → português
- Todos os comentários no código → português
- Todos os commits, PRs e respostas do assistente → português
- Labels, placeholders, toasts, alertas → português
- Mensagens de validação → português

> ⚠️ **Nunca use inglês em textos visíveis ao usuário.**
> Erros como `"Invalid credentials"`, `"Email already exists"`, `"Internal Server Error"` devem ser
> `"Credenciais inválidas"`, `"E-mail já cadastrado"`, `"Erro interno do servidor"`.

---

## 📌 Visão Geral

**RelmDesk** é um helpdesk multimarca para a Relm Bikes (futuro: Wireless, Componentes, Áudio, Monitoramento).

| Item | Valor |
|------|-------|
| Repositório | https://github.com/adrianogogogo/HelmDesk |
| Branch de dev | `genspark_ai_developer` |
| VPS | 177.153.39.134 (root@177.153.39.134) |
| Frontend | http://177.153.39.134:3000 |
| Backend API | http://177.153.39.134:5000 |
| DB | PostgreSQL (`relmdesk` database) |
| Status do projeto | **V1 — Em desenvolvimento** |

---

## 🏗️ Estrutura de Arquivos

```
HelmDesk/
├── CLAUDE.md                    ← Este arquivo
├── README.md
├── .gitignore
├── ecosystem.config.js          ← PM2 config para VPS
├── assets/                      ← Logos e favicon originais
│   ├── favicon.png
│   ├── logo-color.png
│   └── logo-white.png
├── scripts/
│   ├── setup-vps.sh             ← Setup inicial do VPS (rodar 1x como root)
│   └── deploy.sh                ← Deploy após git pull (rodar a cada atualização)
├── backend/
│   ├── package.json
│   ├── .env                     ← Variáveis de ambiente (NÃO commitar prod)
│   ├── .gitignore
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  ← Schema PostgreSQL completo
│   │   ├── run.js               ← Executa migration
│   │   └── seed.js              ← Dados de seed (admin user, brands)
│   ├── uploads/                 ← Arquivos enviados (≤15MB)
│   └── src/
│       ├── server.js            ← Entrada principal (Express + Socket.IO)
│       ├── config/
│       │   └── database.js      ← Pool PostgreSQL
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── chatController.js
│       │   ├── dashboardController.js   ← JOIN usa t.client_user_id + COALESCE
│       │   ├── searchController.js      ← Full-text; SQL injection corrigido
│       │   ├── taskController.js
│       │   └── ticketController.js      ← addNote em /tickets/:id/notes
│       ├── middlewares/
│       │   ├── auth.js          ← JWT + RBAC + ticketAccess
│       │   └── upload.js        ← Multer (15MB max)
│       ├── routes/
│       │   ├── auth.js          ← /api/auth/*
│       │   ├── brands.js        ← /api/brands
│       │   ├── chat.js          ← /api/chat/* (internal only)
│       │   ├── clients.js       ← /api/clients (list, create, update, search)
│       │   ├── config.js        ← /api/config/* (email, block-types, issue-types)
│       │   ├── dashboard.js     ← /api/dashboard
│       │   ├── departments.js   ← /api/departments
│       │   ├── gamification.js  ← /api/gamification/*
│       │   ├── issueTypes.js    ← /api/issue-types
│       │   ├── notifications.js ← /api/notifications
│       │   ├── products.js      ← /api/products
│       │   ├── public.js        ← /api/public/* (sem auth)
│       │   ├── reports.js       ← /api/reports/*
│       │   ├── search.js        ← /api/search/*
│       │   ├── stores.js        ← /api/stores
│       │   ├── tasks.js         ← /api/tasks/*
│       │   ├── tickets.js       ← /api/tickets/* + /notes
│       │   └── users.js         ← /api/users
│       └── services/
│           ├── emailService.js  ← nodemailer + templates; SMTP via system_configs
│           └── socketService.js ← Socket.IO chat + notifications
└── frontend/
    ├── package.json
    ├── .env                     ← REACT_APP_API_URL, REACT_APP_SOCKET_URL
    ├── public/
    │   ├── index.html
    │   ├── favicon.png
    │   ├── logo-color.png
    │   └── logo-white.png
    └── src/
        ├── index.js             ← Redux Provider + BrowserRouter
        ├── App.js               ← Routes + ProtectedRoute
        ├── App.css / index.css
        ├── theme/
        │   └── index.js         ← lightTheme + darkTheme (MUI)
        ├── store/
        │   ├── index.js         ← configureStore
        │   └── slices/
        │       ├── authSlice.js
        │       ├── chatSlice.js
        │       ├── notificationSlice.js
        │       ├── taskSlice.js         ← moveTask com String() para evitar mismatch
        │       ├── ticketSlice.js
        │       └── uiSlice.js
        ├── services/
        │   ├── api.js           ← Axios + todos os API calls
        │   └── socket.js        ← Socket.IO client
        ├── components/
        │   ├── layout/
        │   │   ├── AuthLayout.js
        │   │   ├── MainLayout.js   ← Espaçador flex (sem paddingLeft)
        │   │   ├── Sidebar.js      ← Box fixo (sem MUI Drawer)
        │   │   └── TopBar.js
        │   ├── chat/
        │   │   └── ChatDrawer.js
        │   ├── common/
        │   ├── dashboard/
        │   ├── search/
        │   │   └── SearchBar.js
        │   ├── tasks/
        │   └── tickets/
        └── pages/
            ├── LoginPage.js
            ├── DashboardPage.js
            ├── TicketsPage.js       ← filtros: status ativo, responsável
            ├── TicketDetailPage.js  ← RejectDialog, NoteDialog, aba Relatório
            ├── NewTicketPage.js     ← busca/cria cliente, produtos do catálogo
            ├── TasksKanbanPage.js   ← @dnd-kit; drag entre colunas; Encerrar tarefa
            ├── ProductsPage.js
            ├── ClientsPage.js       ← botão Adicionar cliente; modal create
            ├── StoresPage.js
            ├── UsersPage.js         ← +55 automático no telefone
            ├── ReportsPage.js
            ├── ConfigPage.js        ← aba SMTP + test; block types; issue types
            ├── SearchPage.js
            ├── GamificationPage.js
            ├── OpenTicketPage.js
            ├── PublicTicketPage.js
            ├── TrackTicketPage.js
            └── NotFoundPage.js
```

---

## 🗄️ Banco de Dados (PostgreSQL)

### Tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `departments` | Bikes (ativo), Wireless, Componentes, Áudio, Monitoramento |
| `users` | Todos os perfis (cliente, loja, atendente, gestor, diretor) |
| `stores` | Lojas parceiras |
| `brands` | Corratec, Goodyear, Selle Italia, 9th Wave |
| `products` | Catálogo de produtos |
| `issue_types` | Tipos de problema (configurável) |
| `issue_subtypes` | Subtipos de problema |
| `tickets` | Ticket principal |
| `ticket_products` | Produtos vinculados ao ticket (max 3) |
| `ticket_statuses` | 10 status fixos do workflow |
| `ticket_history` | Histórico imutável de todas as ações + notas internas |
| `ticket_solutions` | Soluções propostas (aprovação gestor/diretor) |
| `ticket_blocks` | Blocos modulares (faturamento, logística, etc.) |
| `attachments` | Arquivos anexos (≤15MB) |
| `tasks` | Tarefas Kanban vinculadas ou avulsas |
| `goals` | Gols marcados (gamificação) |
| `championship_months` | Campeões mensais |
| `chat_rooms` | Salas de chat |
| `chat_room_members` | Membros de cada sala |
| `chat_messages` | Mensagens do chat |
| `notifications` | Notificações internas |
| `audit_logs` | Logs de auditoria (LGPD) — try/catch não-crítico |
| `block_types` | Tipos de bloco configuráveis |
| `product_types` | Tipos de produto |
| `system_configs` | Configurações gerais (SMTP, company name, etc.) |

### Workflow de Status (10 etapas)

```
1.  Novo
2.  Em triagem
3.  Aguardando informações
4.  Em análise
5.  Solução proposta (requer aprovação do Gestor)
6.  Em execução
7.  Logística/Envio
8.  Aguardando confirmação
9.  Resolvido → auto-fecha em 20 dias
10. Fechado/Arquivado (automático)
```

---

## 🔐 RBAC (Perfis e Permissões)

| Perfil | Acesso |
|--------|--------|
| `cliente` | Vê apenas seus próprios tickets |
| `loja` | Vê tickets da sua loja |
| `atendente` | Vê todos os tickets, transiciona status livremente |
| `gestor` | Tudo do atendente + aprova soluções + gerencia usuários |
| `diretor` | Super-admin, todos os departamentos |

---

## 🔌 API Endpoints

### Auth
- `GET  /api/auth/departments` — lista departamentos (público)
- `POST /api/auth/login` — login
- `GET  /api/auth/me` — usuário atual
- `POST /api/auth/register` — criar usuário (alias legado)
- `POST /api/auth/change-password` — alterar senha

### Usuários
- `GET    /api/users` — listar (gestor/diretor)
- `POST   /api/users` — criar (gestor/diretor)
- `PATCH  /api/users/:id` — atualizar (suporta troca de senha com bcrypt)
- `DELETE /api/users/:id` — anonimizar (LGPD, apenas diretor)

### Clientes
- `GET   /api/clients?search=` — listar/buscar clientes
- `POST  /api/clients` — criar cliente
- `PATCH /api/clients/:id` — atualizar cliente

### Tickets
- `GET    /api/tickets` — listar com filtros:
  - `status_id`, `brand_id`, `assigned_to`, `priority`, `search`, `page`, `limit`
  - `exclude_status_ids` — ex.: `"9,10"` para exibir apenas tickets ativos
- `POST   /api/tickets` — criar ticket
- `GET    /api/tickets/:id` — detalhe completo
- `PATCH  /api/tickets/:id` — editar ticket
- `PATCH  /api/tickets/:id/status` — atualizar status + bola + notificação
- `POST   /api/tickets/:id/products` — adicionar produto (max 3)
- `DELETE /api/tickets/:id/products/:productId` — remover produto
- `POST   /api/tickets/:id/solutions` — propor solução
- `PATCH  /api/tickets/:id/solutions/:solutionId/approve` — aprovar/rejeitar
- `POST   /api/tickets/:id/notes` — adicionar nota interna/pública ao histórico
- `POST   /api/tickets/:id/attachments` — upload de arquivos
- `POST   /api/tickets/:id/blocks` — adicionar bloco modular
- `PATCH  /api/tickets/:id/blocks/:blockId` — atualizar bloco
- `POST   /api/tickets/:id/anonymize` — anonimizar (LGPD)
- `GET    /api/tickets/meta/statuses` — lista de status

### Tarefas
- `GET    /api/tasks` — listar (filtros: ticket_id, assigned_to)
- `GET    /api/tasks/kanban` — agrupadas por status
- `POST   /api/tasks` — criar tarefa
- `PATCH  /api/tasks/:id` — atualizar tarefa (inclui `status` para drag-and-drop)
- `DELETE /api/tasks/:id` — excluir tarefa
- `GET    /api/tasks/:id/whatsapp` — gerar link WhatsApp

### Dashboard
- `GET /api/dashboard` — KPIs + status + marcas + ranking + tendência

### Config
- `GET   /api/config/block-types` — tipos de bloco
- `POST  /api/config/block-types` — criar tipo de bloco (gestor/diretor)
- `PATCH /api/config/block-types/:id` — atualizar tipo de bloco
- `GET   /api/config` — configurações gerais (gestor/diretor)
- `PATCH /api/config/:key` — salvar config
- `POST  /api/config/issue-types` — criar tipo de problema
- `GET   /api/config/email` — obter config SMTP (gestor/diretor)
- `POST  /api/config/email` — salvar config SMTP
- `POST  /api/config/email/test` — enviar e-mail de teste

### Busca
- `GET /api/search?q=&limit=` — busca full-text
- `GET /api/search/suggest?q=` — autocomplete

### Gamificação
- `GET /api/gamification/ranking` — ranking mensal
- `GET /api/gamification/my-goals` — meus gols
- `GET /api/gamification/championship` — histórico

### Chat (interno only)
- `GET  /api/chat/users` — usuários disponíveis
- `GET  /api/chat/rooms` — salas do usuário
- `POST /api/chat/rooms` — criar/encontrar sala
- `GET  /api/chat/rooms/:roomId/messages` — mensagens

### Público (sem auth)
- `POST /api/public/tickets` — abrir ticket
- `GET  /api/public/tickets/:token` — acompanhar ticket
- `GET  /api/public/brands` — listar marcas
- `GET  /api/public/issue-types` — listar tipos de problema

---

## ⚽ Gamificação — Futebol da Relm

- Cada atualização de ticket = 1 gol
- Tabela `goals`: `action_type`, `month`, `year`
- Rankings mensais; histórico de campeões em `championship_months`
- Dashboard exibe top 5 em tempo real
- Página `/futebol` com tabela completa e gráficos

---

## 💬 Chat Interno

- Apenas roles `atendente`, `gestor`, `diretor`
- Tempo real via Socket.IO
- Salas 1-a-1 e em grupo
- Drawer lateral pelo TopBar
- Indicador online/offline

---

## 🔍 Busca Inteligente

- Campos: título, descrição, nome do cliente, e-mail, telefone, CPF, nº série, número do ticket
- Autocomplete com debounce 300ms (≥ 2 chars)
- Página de resultados em `/busca`
- SQL injection corrigido (parâmetros posicionais)

---

## 🔒 LGPD

- Dados nunca deletados — apenas **anonimizados**
- `is_anonymized` em `users` e `tickets`
- `audit_logs` registra ações sensíveis (try/catch não-crítico)
- `POST /api/tickets/:id/anonymize`
- `DELETE /api/users/:id` anonimiza (não deleta)

---

## 📧 E-mail (SMTP)

- Serviço: `backend/src/services/emailService.js` (nodemailer)
- Config SMTP salva em `system_configs` (chaves: `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_from`)
- Aba "E-mail" em ConfigPage com todos os campos + botão "Testar Envio"
- Templates: `ticketCreated`, `statusUpdated`, `solutionProposed`
- Variáveis de ambiente de fallback em `backend/.env` (SMTP_HOST, SMTP_PORT, etc.)

---

## 📱 WhatsApp

- Botão abre `https://wa.me/{número}?text={mensagem}` com link ao ticket
- Mensagem formatada com número do ticket
- Integração com WhatsApp Business API planejada para V2

---

## 🃏 Kanban de Tarefas

- Biblioteca: `@dnd-kit/core` + `@dnd-kit/sortable`
- Colunas: `pendente`, `em_andamento`, `concluida`
- Cada coluna tem `useDroppable` + `SortableContext`
- `rectIntersection` como algoritmo de colisão
- **Bug corrigido:** IDs do banco são `number`; dnd-kit sempre usa `string`.
  Solução: `String(task.id)` em `useSortable`, `SortableContext items`, e nas comparações de `findColByTaskId` e `moveTask`
- Botão **"Encerrar tarefa"** (ícone ✅) em cada card move direto para `concluida`
- Barra de prioridade colorida, destaque de prazo vencido/hoje
- `DragOverlay` para visual durante o arraste

---

## 🛠️ Deploy no VPS

### Setup inicial (executar 1x como root)
```bash
ssh root@177.153.39.134
git clone https://github.com/adrianogogogo/HelmDesk.git /home/ubuntu/HelmDesk
cd /home/ubuntu/HelmDesk
bash scripts/setup-vps.sh
bash scripts/deploy.sh
```

### Deploy após atualizações (comando completo)
```bash
ssh root@177.153.39.134
cd /home/ubuntu/HelmDesk
git pull origin main
bash scripts/deploy.sh
```

> O script `deploy.sh` faz tudo automaticamente:
> swap → git pull → npm install backend → migrations → npm install frontend → build React → pm2 reload → health check

### Monitoramento
```bash
pm2 status                          # estado dos serviços
pm2 logs relmdesk-backend           # logs em tempo real
pm2 logs relmdesk-backend --err     # apenas erros
pm2 logs relmdesk-backend --lines 50  # últimas 50 linhas
```

### URLs de acesso
- **Frontend:** http://177.153.39.134:3000
- **API health:** http://177.153.39.134:5000/api/health
- **PM2 status:** `pm2 status`

### Credenciais padrão (após seed)
| E-mail | Senha | Perfil |
|--------|-------|--------|
| admin@relmbikes.com.br | Admin@2024! | Diretor |
| gestor@relmbikes.com.br | Admin@2024! | Gestor |
| atendente@relmbikes.com.br | Admin@2024! | Atendente |
| loja@demo.com.br | Loja@2024! | Loja |

---

## 🔄 Git Workflow

1. Desenvolvimento em `genspark_ai_developer`
2. PR → `main`
3. No VPS: `git pull origin main && bash scripts/deploy.sh`

### Regra de commit
- **Após QUALQUER mudança de código:** `git add -A && git commit -m "tipo: descrição"`
- **Antes do PR:** `git fetch origin main && git rebase origin/main`
- **Squash:** `git reset --soft HEAD~N && git commit -m "mensagem abrangente"`
- **Push:** `git push -f origin genspark_ai_developer`

---

## 📊 Status da Implementação

### ✅ Completo e funcionando

**Infraestrutura**
- Estrutura full-stack (Node.js + React + PostgreSQL)
- Schema PostgreSQL completo + migrations + seed
- RBAC com 5 perfis (cliente, loja, atendente, gestor, diretor)
- Scripts de deploy VPS (`setup-vps.sh` + `deploy.sh`)
- PM2 + swap automático para build em VPS de baixo RAM
- ESLint: 0 erros, 0 warnings

**Backend**
- Auth (JWT, 7d, bcrypt, audit_logs não-crítico)
- Tickets (CRUD, status, soluções, produtos, blocos, anexos, notas, LGPD)
- Filtros avançados: `exclude_status_ids` (ativos), `assigned_to` (responsável)
- Dashboard com `COALESCE(u.name, t.client_name)` via `t.client_user_id`
- Tarefas Kanban (CRUD, drag-and-drop, WhatsApp, `completed_at` automático)
- Clientes (list, create, update, search)
- E-mail SMTP (nodemailer, templates, endpoint de teste)
- Chat Socket.IO (salas, mensagens, online/offline)
- Busca full-text (SQL injection corrigido)
- Gamificação (gols, ranking mensal, campeões)
- Notificações internas

**Frontend**
- Layout corrigido: Sidebar = Box fixo; MainLayout = espaçador flex
- TopBar: busca, chat, notificações, usuário, dark mode
- TicketsPage: filtro "Ativos" (ToggleButton), filtro por responsável
- TicketDetailPage: RejectDialog, NoteDialog, aba Relatório (copy), StatusRuler
- NewTicketPage: busca/cria cliente inline, produtos do catálogo (Autocomplete)
- Kanban: drag entre colunas ✅, botão "Encerrar tarefa", barra de prioridade, prazo colorido
- ClientsPage: botão "Adicionar Cliente" com dialog
- UsersPage: `+55` automático no telefone onBlur
- ConfigPage: aba SMTP com campos + botão "Testar Envio"
- Portal público: abrir/acompanhar ticket sem login

### 🔄 Pendente / V2
- SSL/HTTPS + domínio personalizado
- Validação end-to-end em produção (pós-deploy VPS)
- Envio automático de e-mail por evento (criação de ticket, mudança de status)
- WhatsApp Business API
- Assets (favicon/logo personalizados)

---

## ⚠️ Problemas Conhecidos & Correções

### Login 500 (corrigido 2026-04-02)
- **Causa:** `audit_logs` INSERT bloqueava login em caso de falha; `JWT_SECRET` undefined
- **Correção:** `audit_logs` em try/catch separado; `ecosystem.config.js` com todas as env vars; fallback JWT_SECRET

### Layout sidebar sobreposto (corrigido 2026-04-02)
- **Causa:** MUI `Drawer variant="permanent"` cria wrapper flex + Paper position:fixed; wrapper consumia espaço extra
- **Correção:** Substituído por `<Box sx={{ position: 'fixed' }}>` sem Drawer MUI

### TopBar sobrepondo sidebar (corrigido 2026-04-02)
- **Causa:** `MainLayout` usava `paddingLeft: sidebarWidth` no Box principal
- **Correção:** Espaçador flexível invisível (`<Box width={sidebarWidth} flexShrink={0}`) reserva o espaço no fluxo flex

### Dashboard 500 /api/dashboard (corrigido 2026-04-03)
- **Causa:** JOIN na tabela `users` usava coluna inexistente `t.client_id`
- **Correção:** `dashboardController.js` usa `t.client_user_id` + `COALESCE(u.name, t.client_name)`

### aria-hidden warning (corrigido 2026-04-03)
- **Causa:** `window.prompt()` causava foco em elemento com ancestral `aria-hidden`
- **Correção:** `RejectDialog` dedicado com `disableRestoreFocus`

### Drag-and-drop Kanban sem efeito entre colunas (corrigido 2026-04-04)
- **Causa:** IDs do banco são `number`; dnd-kit passa `active.id` como `string`; comparação estrita `===` falhava silenciosamente
- **Correção:** `String(task.id)` em `useSortable({ id })`, `SortableContext items`, `findColByTaskId`, `handleDragStart` e `moveTask` reducer

---

## 📋 Changelog

| Data | Commit | Descrição |
|------|--------|-----------|
| 2026-04-02 | `603f0f1` | Corrigir layout sidebar (Box fixo) |
| 2026-04-02 | `0bed4b3` | Corrigir login 500 + pt-BR mensagens |
| 2026-04-02 | `534fba0` | ESLint 0 warnings |
| 2026-04-02 | `31ffdab` | UX: ClientsPage, NewTicketPage, TicketDetailPage + pt-BR |
| 2026-04-02 | `dd5a25e` | Layout espaçador flex; TopBar corrigido |
| 2026-04-03 | `b7b692e` | Bugfix: Kanban whatsapp_url, Gamificação RechartsTooltip |
| 2026-04-03 | `615188b` | Melhorias V1: TopBar, fluxo autorização troca/reembolso, segurança |
| 2026-04-03 | (PR #3) | Fix dashboard 500 (client_user_id) + RejectDialog (aria-hidden) |
| 2026-04-03 | (PR #4) | Beta: filtros tickets, NoteDialog, Kanban redesign, RelatórioEmail, +55, ClientsPage, SMTP |
| 2026-04-04 | (PR #5) | Fix drag-and-drop Kanban (mismatch number/string ID) + botão Encerrar tarefa |

---

*Última atualização: 2026-04-04*
