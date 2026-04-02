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
│   ├── setup-vps.sh             ← Setup inicial do VPS
│   └── deploy.sh                ← Deploy após git pull
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
│       │   ├── dashboardController.js
│       │   ├── searchController.js
│       │   ├── taskController.js
│       │   └── ticketController.js
│       ├── middlewares/
│       │   ├── auth.js          ← JWT + RBAC + ticketAccess
│       │   └── upload.js        ← Multer (15MB max)
│       ├── routes/
│       │   ├── auth.js          ← /api/auth/*
│       │   ├── brands.js        ← /api/brands
│       │   ├── chat.js          ← /api/chat/* (internal only)
│       │   ├── clients.js       ← /api/clients
│       │   ├── config.js        ← /api/config/*
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
│       │   ├── tickets.js       ← /api/tickets/*
│       │   └── users.js         ← /api/users
│       ├── services/
│       │   └── socketService.js ← Socket.IO chat + notifications
│       └── utils/               ← Utilitários gerais
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
        │       ├── taskSlice.js
        │       ├── ticketSlice.js
        │       └── uiSlice.js
        ├── services/
        │   ├── api.js           ← Axios + todos os API calls
        │   └── socket.js        ← Socket.IO client
        ├── hooks/               ← Custom hooks (a implementar)
        ├── components/
        │   ├── layout/
        │   │   ├── AuthLayout.js   ← Layout tela de login
        │   │   ├── MainLayout.js   ← Sidebar + TopBar + Outlet
        │   │   ├── Sidebar.js      ← Navegação lateral (RBAC)
        │   │   └── TopBar.js       ← SearchBar + Chat + Notif + User
        │   ├── chat/
        │   │   └── ChatDrawer.js   ← Chat drawer (usuários internos)
        │   ├── common/             ← Componentes reutilizáveis
        │   ├── dashboard/          ← Cards do dashboard
        │   ├── search/
        │   │   └── SearchBar.js    ← Autocomplete de busca
        │   ├── tasks/              ← Componentes Kanban
        │   └── tickets/            ← Componentes do ticket
        └── pages/
            ├── LoginPage.js        ← Seleção de dept + login
            ├── DashboardPage.js    ← KPIs + gráficos + gamificação
            ├── TicketsPage.js      ← Lista de tickets com filtros
            ├── TicketDetailPage.js ← Detalhe completo do ticket
            ├── NewTicketPage.js    ← Criar novo ticket (logado)
            ├── TasksKanbanPage.js  ← Kanban com @dnd-kit
            ├── ProductsPage.js     ← CRUD de produtos
            ├── ClientsPage.js      ← Lista de clientes
            ├── StoresPage.js       ← CRUD de lojas
            ├── UsersPage.js        ← CRUD de usuários + LGPD
            ├── ReportsPage.js      ← Relatórios + CSV export
            ├── ConfigPage.js       ← Configurações do sistema
            ├── SearchPage.js       ← Busca inteligente full-text
            ├── GamificationPage.js ← Futebol da Relm — ranking mensal
            ├── OpenTicketPage.js   ← Abrir ticket sem login (público)
            ├── PublicTicketPage.js ← Alias para OpenTicketPage
            ├── TrackTicketPage.js  ← Acompanhar ticket por token
            └── NotFoundPage.js     ← 404
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
| `tickets` | Ticket principal (até 3 produtos) |
| `ticket_products` | Produtos vinculados ao ticket (max 3) |
| `ticket_statuses` | 10 status fixos do workflow |
| `ticket_history` | Histórico imutável de todas as ações |
| `ticket_solutions` | Soluções propostas (aprovação gestor) |
| `ticket_blocks` | Blocos modulares (faturamento, logística, etc.) |
| `attachments` | Arquivos anexos (≤15MB) |
| `tasks` | Tarefas Kanban vinculadas ou avulsas |
| `goals` | Gols marcados (gamificação) |
| `championship_months` | Campeões mensais |
| `chat_rooms` | Salas de chat |
| `chat_room_members` | Membros de cada sala |
| `chat_messages` | Mensagens do chat |
| `notifications` | Notificações internas |
| `audit_logs` | Logs de auditoria (LGPD) |
| `block_types` | Tipos de bloco configuráveis |
| `product_types` | Tipos de produto |
| `system_configs` | Configurações gerais do sistema |

### Workflow de Status (10 etapas)

```
1. Novo
2. Em triagem
3. Aguardando informações
4. Em análise
5. Solução proposta (requer aprovação do Gestor)
6. Em execução
7. Logística/Envio
8. Aguardando confirmação
9. Resolvido → auto-fecha em 20 dias
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
- `GET /api/auth/departments` — lista departamentos (público)
- `POST /api/auth/login` — login
- `GET /api/auth/me` — usuário atual
- `POST /api/auth/register` — criar usuário (gestor/diretor)
- `POST /api/auth/change-password` — alterar senha

### Tickets
- `GET /api/tickets` — listar com filtros (status, brand, priority, search, page, limit)
- `POST /api/tickets` — criar ticket
- `GET /api/tickets/:id` — detalhe completo
- `PATCH /api/tickets/:id` — editar ticket
- `PATCH /api/tickets/:id/status` — atualizar status + bola + notificação interna
- `POST /api/tickets/:id/products` — adicionar produto (max 3)
- `DELETE /api/tickets/:id/products/:productId` — remover produto
- `POST /api/tickets/:id/solutions` — propor solução
- `PATCH /api/tickets/:id/solutions/:solutionId/approve` — aprovar/rejeitar solução
- `POST /api/tickets/:id/attachments` — upload de arquivos
- `POST /api/tickets/:id/blocks` — adicionar bloco modular
- `PATCH /api/tickets/:id/blocks/:blockId` — atualizar bloco
- `POST /api/tickets/:id/anonymize` — anonimizar ticket (LGPD)
- `GET /api/tickets/meta/statuses` — lista de status

### Busca
- `GET /api/search?q=termo&limit=10` — busca full-text
- `GET /api/search/suggest?q=termo` — sugestões autocomplete

### Tarefas
- `GET /api/tasks?ticket_id=&assigned_to=` — listar tarefas
- `GET /api/tasks/kanban` — tarefas agrupadas por status
- `POST /api/tasks` — criar tarefa
- `PATCH /api/tasks/:id` — atualizar tarefa
- `DELETE /api/tasks/:id` — excluir tarefa
- `GET /api/tasks/:id/whatsapp` — gerar link WhatsApp

### Gamificação
- `GET /api/gamification/ranking?month=&year=` — ranking mensal
- `GET /api/gamification/my-goals?month=&year=` — meus gols
- `GET /api/gamification/championship` — histórico de campeonatos

### Chat (interno only)
- `GET /api/chat/users` — usuários disponíveis
- `GET /api/chat/rooms` — salas do usuário
- `POST /api/chat/rooms` — criar/encontrar sala
- `GET /api/chat/rooms/:roomId/messages` — mensagens

### Dashboard
- `GET /api/dashboard` — KPIs + status + marcas + ranking + tendência

### Público (sem auth)
- `POST /api/public/tickets` — abrir ticket sem login
- `GET /api/public/tickets/:token` — acompanhar ticket
- `GET /api/public/brands` — listar marcas
- `GET /api/public/issue-types` — listar tipos de problema

---

## ⚽ Gamificação — Futebol da Relm

**Regra:** cada atualização de ticket = 1 gol.

- Tabela `goals` registra cada ação com `action_type` (status_update, task_complete, etc.)
- Rankings mensais na `goals` com `month` e `year`
- Histórico de campeões em `championship_months`
- Dashboard exibe ranking dos top 5 em tempo real
- Página `/futebol` exibe tabela completa com gráficos

---

## 💬 Chat Interno

- Apenas usuários com role `atendente`, `gestor`, `diretor`
- Mensagens em tempo real via Socket.IO
- Salas diretas (1-a-1) e em grupo
- Drawer lateral acessível pelo TopBar
- Indicador de online/offline

---

## 🔍 Busca Inteligente

- Busca em: título, descrição, nome do cliente, e-mail, telefone, CPF, nº de série, número do ticket
- Autocomplete com dropdown (sugestões ao digitar ≥ 2 chars)
- Debounce de 300ms
- Página de resultados completos em `/busca`

---

## 🔒 LGPD

- Dados nunca deletados, apenas **anonimizados**
- Campo `is_anonymized` em `users` e `tickets`
- `audit_logs` registra todas as ações sensíveis
- Endpoint `POST /api/tickets/:id/anonymize`
- Endpoint `DELETE /api/users/:id` anonimiza (não deleta)

---

## 📧 E-mail (V2)

- Menu de configurações já existe com templates planejados
- SMTP configurado no `.env` mas envios desativados
- Implementação planejada para V2

---

## 📱 WhatsApp

- Botão abre `https://wa.me/{number}?text={message}` com link direto ao ticket
- Mensagem formatada com número do ticket e link de acesso
- Integração com WhatsApp Business API planejada para V2

---

## 🛠️ Deploy no VPS

### Setup inicial (1x)
```bash
# Conectar ao VPS
ssh root@177.153.39.134

# Clonar repositório
git clone https://github.com/adrianogogogo/HelmDesk.git /home/ubuntu/HelmDesk
cd /home/ubuntu/HelmDesk

# Rodar script de setup
chmod +x scripts/setup-vps.sh
bash scripts/setup-vps.sh
```

### Deploy após atualizações
```bash
ssh root@177.153.39.134
cd /home/ubuntu/HelmDesk
git pull origin main
bash scripts/deploy.sh
```

### URLs de acesso
- **Frontend:** http://177.153.39.134:3000
- **API:** http://177.153.39.134:5000/api/health
- **PM2 status:** `pm2 status`
- **Logs:** `pm2 logs relmdesk-backend`

---

## 🔄 Git Workflow

1. Desenvolvimento em `genspark_ai_developer`
2. PR para `main`
3. No VPS: `git pull origin main && bash scripts/deploy.sh`

---

## 📊 Status da Implementação

### ✅ Completo
- Estrutura do projeto (frontend + backend)
- Schema PostgreSQL completo (migration + seed)
- Backend API (auth, tickets, tasks, search, chat, gamification, dashboard, reports)
- Frontend React com Mantis-inspired UI (MUI + dark mode)
- RBAC completo (5 perfis)
- Chat interno (Socket.IO)
- Busca inteligente com autocomplete
- Kanban drag-and-drop (@dnd-kit)
- Gamificação (Futebol da Relm)
- LGPD (anonimização)
- Portal público de tickets
- Scripts de deploy VPS
- Build frontend sem warnings (ESLint 0 erros)
- VPS com PM2 rodando (backend porta 5000, frontend porta 3000)

### 🔄 Em andamento / Pendente
- Validação funcional end-to-end (login, tickets, fluxos)
- Assets (favicon/logo)
- SSL/HTTPS + domínio personalizado
- E-mail automático (V2)
- WhatsApp Business API (V2)

---

## ⚠️ Problemas Conhecidos & Correções

### Login 500 (corrigido em 2026-04-02)
- **Causa:** `audit_logs` INSERT bloqueava o login em caso de falha; `JWT_SECRET` podia ser undefined
- **Correção:** `audit_logs` agora em try/catch separado (não-crítico); `ecosystem.config.js` inclui todas as env vars explícitas; fallback para JWT_SECRET hardcoded

---

*Última atualização: 2026-04-02*
