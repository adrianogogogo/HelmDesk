# CLAUDE.md — RelmDesk v1 — Documento Vivo de Arquitetura

> **IMPORTANTE**: Este arquivo é a base de leitura para a IA em cada sessão de desenvolvimento.
> Sempre leia este documento antes de qualquer modificação no sistema.
> Atualizado a cada commit relevante.

---

## 📋 Visão Geral do Sistema

**RelmDesk** é um sistema de Helpdesk multimarcas/multiprodutos para a **Relm Bikes**.
- **Stack**: React (frontend) + Node.js/Express (backend) + PostgreSQL
- **Porta Frontend**: 3000
- **Porta Backend (API)**: 5000
- **VPS**: `177.153.39.134` — acesso via `ssh root@177.153.39.134`
- **Git**: https://github.com/adrianogogogo/HelmDesk
- **Branch de dev**: `genspark_ai_developer`

---

## 🏗️ Estrutura de Arquivos

```
/home/user/webapp/  (ou raiz do repo)
├── CLAUDE.md                    ← Este arquivo (leitura obrigatória)
├── assets/                      ← Logos originais
│   ├── favicon.png              ← Ícone do sistema (R azul)
│   ├── logo-color.png           ← Logo colorida (fundo branco/transparente)
│   └── logo-white.png           ← Logo branca (para fundo escuro/dark mode)
│
├── backend/                     ← API Node.js
│   ├── src/
│   │   ├── server.js            ← Entry point — Express + Socket.IO
│   │   ├── config/
│   │   │   └── database.js      ← Pool PostgreSQL
│   │   ├── controllers/
│   │   │   ├── authController.js      ← Login, register, me, change-password
│   │   │   ├── ticketController.js    ← CRUD tickets, status, soluções, LGPD
│   │   │   ├── taskController.js      ← Tarefas Kanban + WhatsApp link
│   │   │   ├── dashboardController.js ← KPIs, ranking, métricas
│   │   │   ├── searchController.js    ← Busca full-text + autocomplete
│   │   │   └── chatController.js      ← Chat interno (rooms, messages)
│   │   ├── routes/
│   │   │   ├── auth.js, tickets.js, tasks.js, search.js
│   │   │   ├── chat.js, dashboard.js, users.js, stores.js
│   │   │   ├── products.js, clients.js, brands.js, issueTypes.js
│   │   │   ├── config.js, notifications.js, gamification.js
│   │   │   ├── reports.js, departments.js
│   │   │   └── public.js        ← Rotas públicas (sem auth)
│   │   ├── middlewares/
│   │   │   ├── auth.js          ← JWT, RBAC, ticketAccess
│   │   │   └── upload.js        ← Multer (15MB, tipos permitidos)
│   │   └── services/
│   │       └── socketService.js ← Socket.IO (chat, online status)
│   ├── migrations/
│   │   ├── 001_initial_schema.sql ← Schema completo PostgreSQL
│   │   ├── run.js               ← Executor de migrations
│   │   └── seed.js              ← Dados iniciais (usuários, produtos)
│   ├── uploads/                 ← Arquivos enviados pelos usuários
│   ├── .env                     ← Variáveis de ambiente (não commitar)
│   └── package.json
│
└── frontend/                    ← React App
    ├── public/
    │   ├── index.html
    │   ├── favicon.png
    │   ├── logo-color.png
    │   └── logo-white.png
    ├── src/
    │   ├── App.js               ← Rotas principais
    │   ├── index.js             ← Entry point React
    │   ├── index.css            ← Estilos globais
    │   ├── theme/index.js       ← Tema MUI (light + dark)
    │   ├── store/               ← Redux Toolkit
    │   │   ├── index.js
    │   │   └── slices/
    │   │       ├── authSlice.js         ← Token, user, isAuthenticated
    │   │       ├── ticketSlice.js       ← Lista e ticket atual
    │   │       ├── taskSlice.js         ← Kanban columns
    │   │       ├── chatSlice.js         ← Rooms, messages, users
    │   │       ├── notificationSlice.js ← Notificações e unread count
    │   │       └── uiSlice.js           ← Sidebar, darkMode, search
    │   ├── services/
    │   │   ├── api.js           ← Axios + todos os endpoints
    │   │   └── socket.js        ← Socket.IO client (chat, eventos)
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── MainLayout.js  ← Layout autenticado (Sidebar + TopBar)
    │   │   │   ├── AuthLayout.js  ← Layout de login (fundo gradiente)
    │   │   │   ├── Sidebar.js     ← Menu lateral (colapsável, RBAC)
    │   │   │   └── TopBar.js      ← Barra superior (busca, notif, chat, user)
    │   │   ├── search/
    │   │   │   └── SearchBar.js   ← Busca com autocomplete (debounce 300ms)
    │   │   └── chat/
    │   │       └── ChatDrawer.js  ← Drawer de chat interno (Socket.IO)
    │   └── pages/
    │       ├── LoginPage.js         ← Login + seletor de departamentos
    │       ├── DashboardPage.js     ← KPIs, gráficos, ranking Futebol
    │       ├── TicketsPage.js       ← Lista de tickets com filtros
    │       ├── TicketDetailPage.js  ← Detalhe completo (abas, régua, pop-up)
    │       ├── NewTicketPage.js     ← Formulário de criação
    │       ├── TasksKanbanPage.js   ← Kanban drag&drop (react-beautiful-dnd)
    │       ├── SearchPage.js        ← Busca full-text avançada
    │       ├── GamificationPage.js  ← Futebol da Relm — pódio + tabela
    │       ├── ProductsPage.js      ← Cadastro de produtos
    │       ├── ClientsPage.js       ← Lista de clientes/lojas
    │       ├── UsersPage.js         ← Gestão de usuários (gestor+)
    │       ├── StoresPage.js        ← Cadastro de lojas
    │       ├── ReportsPage.js       ← Relatórios dinâmicos + CSV
    │       ├── ConfigPage.js        ← Configurações do sistema
    │       ├── OpenTicketPage.js    ← Formulário público (sem login)
    │       ├── TrackTicketPage.js   ← Acompanhamento público (/acompanhar/:token)
    │       └── NotFoundPage.js      ← 404
    └── package.json
```

---

## 🗄️ Banco de Dados (PostgreSQL)

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `departments` | Bikes, Wireless, Componentes, Áudio, Monitoramento |
| `users` | Todos os usuários (cliente, loja, atendente, gestor, diretor) |
| `stores` | Lojas parceiras |
| `brands` | Marcas (Corratec, Goodyear, Selle Italia, 9th Wave) |
| `products` | Catálogo de produtos |
| `product_types` | Tipos de produto |
| `issue_types` | Tipos de problema (Garantia, AT, Troca...) |
| `issue_subtypes` | Subtipos vinculados aos tipos |
| `ticket_statuses` | 10 status do fluxo (Novo → Fechado) |
| `tickets` | Ticket principal (1 ticket → N produtos) |
| `ticket_products` | Produtos vinculados ao ticket (1:N) |
| `ticket_history` | **IMUTÁVEL** — toda ação registrada aqui |
| `ticket_blocks` | Blocos modulares (JSONB) por ticket |
| `ticket_solutions` | Soluções propostas + aprovação gestor |
| `tasks` | Tarefas Kanban (globais ou vinculadas) |
| `attachments` | Arquivos (até 15MB por arquivo) |
| `chat_rooms` | Salas de chat (direct, group) |
| `chat_room_members` | Membros por sala |
| `chat_messages` | Mensagens do chat interno |
| `goals` | Gols do Futebol da Relm (1 ação = 1 gol) |
| `championship_months` | Histórico de campeões mensais |
| `system_configs` | Configurações chave/valor |
| `audit_logs` | Logs LGPD e auditoria |
| `notifications` | Notificações in-app |

### Sequência do Número do Ticket
- Gerado automaticamente via trigger PostgreSQL
- Formato: `REL-BIKES-000001`, `REL-WIRELESS-000001` etc.
- Baseado na sequência `ticket_number_seq`

---

## 🔌 API Endpoints (Resumo)

### Autenticação
- `GET  /api/auth/departments` — lista departamentos (público)
- `POST /api/auth/login` — login com JWT
- `POST /api/auth/register` — criar usuário (gestor+)
- `GET  /api/auth/me` — dados do usuário logado
- `POST /api/auth/change-password`

### Tickets
- `GET    /api/tickets` — lista com filtros + paginação
- `POST   /api/tickets` — criar ticket
- `GET    /api/tickets/:id` — detalhe completo
- `PATCH  /api/tickets/:id` — editar campos
- `PATCH  /api/tickets/:id/status` — **pop-up de atualização** (status + bola + nota)
- `POST   /api/tickets/:id/products` — adicionar produto
- `DELETE /api/tickets/:id/products/:productId`
- `POST   /api/tickets/:id/solutions` — propor solução
- `PATCH  /api/tickets/:id/solutions/:id/approve` — aprovar/reprovar (gestor)
- `POST   /api/tickets/:id/attachments` — upload de arquivos
- `POST   /api/tickets/:id/blocks` — criar bloco modular
- `PATCH  /api/tickets/:id/blocks/:id` — atualizar bloco
- `POST   /api/tickets/:id/anonymize` — LGPD
- `GET    /api/tickets/meta/statuses` — lista de status

### Tarefas
- `GET  /api/tasks` — lista
- `GET  /api/tasks/kanban` — agrupado por coluna Kanban
- `POST /api/tasks` — criar tarefa
- `PATCH /api/tasks/:id` — atualizar / mover coluna
- `GET  /api/tasks/:id/whatsapp` — gera link WhatsApp

### Busca
- `GET /api/search?q=termo` — busca full-text
- `GET /api/search/suggest?q=termo` — sugestões autocomplete

### Chat
- `GET  /api/chat/users` — usuários internos para chat
- `GET  /api/chat/rooms` — salas do usuário
- `POST /api/chat/rooms` — criar/encontrar sala
- `GET  /api/chat/rooms/:id/messages` — mensagens

### Público (sem auth)
- `POST /api/public/tickets` — cliente abre ticket sem login
- `GET  /api/public/tickets/:token` — acompanhar ticket por token
- `GET  /api/public/brands` — marcas disponíveis
- `GET  /api/public/issue-types` — tipos de problema

### Dashboard / Gamificação / Relatórios
- `GET /api/dashboard` — KPIs completos
- `GET /api/gamification/ranking?month=&year=` — tabela Futebol
- `GET /api/gamification/my-goals` — gols do usuário atual
- `GET /api/reports/tickets?format=csv` — relatório tickets

---

## 👥 Perfis e Visibilidade

| Perfil | Tickets visíveis | Pode criar | Pode mudar status | Pode aprovar soluções | Chat interno |
|--------|-----------------|------------|-------------------|-----------------------|--------------|
| cliente | Só os seus | Via URL pública | Não | Não | Não |
| loja | Da sua loja | Sim (logado) | Não | Não | Não |
| atendente | Todos | Sim | Sim (livre) | Não | Sim |
| gestor | Todos | Sim | Sim (livre) | **Sim** | Sim |
| diretor | Todos | Sim | Sim (livre) | **Sim** | Sim |

---

## ⚽ Futebol da Relm — Regras de Gol

Cada ação registrada no `ticket_history` = 1 gol para o usuário que a realizou.
- Ticket criado = 1 gol
- Status atualizado = 1 gol
- Tarefa concluída = 1 gol
- Solução proposta = 1 gol
- Qualquer campo atualizado = 1 gol

Campeonato mensal: ranking por mês/ano. Pódio visual no dashboard e página dedicada.

---

## 🔒 LGPD

- **Nunca excluir** dados — apenas anonimizar
- `is_anonymized = TRUE` em `tickets`, `users`, `ticket_products`
- Dados anonimizados: nome → "ANONIMIZADO", email → uuid@anon.com, CPF/serial/NF → "ANONIMIZADO"
- Todos os acessos de dados sensíveis são registrados em `audit_logs`
- Consentimento registrado em `users.lgpd_consent_at`

---

## 📡 Socket.IO (Tempo Real)

Eventos:
- `authenticate` → cliente envia userId após conectar
- `send_message` / `new_message` → chat em tempo real
- `user_typing` / `user_stop_typing` → indicador de digitação
- `user_online` → status de presença
- `ticket_updated` → atualiza notificações no frontend

---

## 🛠️ Infraestrutura VPS

```bash
# Acesso
ssh root@177.153.39.134

# Serviços
# Backend:  http://177.153.39.134:5000
# Frontend: http://177.153.39.134:3000

# Banco PostgreSQL
# DB: relmdesk
# User: relmdesk_user
# Pass: (ver .env na VPS)

# Deploy manual (guiado pela IA)
cd /var/www/relmdesk  # (diretório na VPS - a confirmar)
git pull origin main
cd backend && npm install && node migrations/run.js
cd ../frontend && npm install && npm run build
pm2 restart all
```

---

## 🚀 Usuários Default (Seed)

| E-mail | Senha | Perfil |
|--------|-------|--------|
| admin@relmbikes.com.br | Admin@2024! | Diretor |
| gestor@relmbikes.com.br | Admin@2024! | Gestor |
| atendente@relmbikes.com.br | Admin@2024! | Atendente |
| loja@demo.com.br | Loja@2024! | Loja |

---

## 📝 Histórico de Commits

### feat: initial RelmDesk v1 complete implementation
- Banco PostgreSQL: schema completo com 20+ tabelas, triggers, índices
- Backend Node.js: 15+ rotas, autenticação JWT/RBAC, Socket.IO
- Frontend React: 15+ páginas, Mantis-inspired MUI theme, Redux Toolkit
- Funcionalidades: tickets ricos (1:N produtos), Kanban, chat interno, busca full-text
- Gamificação: Futebol da Relm (gols por ação, campeonato mensal)
- LGPD: anonimização, audit logs
- Público: abrir ticket sem login (/abrir-ticket), acompanhar (/acompanhar/:token)
- WhatsApp: links com mensagem personalizada e link direto ao ticket
- Dashboard: KPIs, gráficos Recharts, ranking, tickets recentes

---

## ⚠️ V2 — Funcionalidades Planejadas

- [ ] E-mails automáticos (menu já previsto, `email_enabled: false`)
- [ ] API WhatsApp Business (hoje: link `wa.me`)
- [ ] Domínio/SSL (hoje: acesso por IP)
- [ ] Departamentos adicionais (Wireless, Componentes, Áudio, Monitoramento)
- [ ] Portal do cliente com login dedicado
- [ ] Notificações push

---

*Última atualização: 2026-04-02 — RelmDesk v1 inicial*
