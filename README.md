# RelmDesk v1

Sistema de Helpdesk multimarcas para a **Relm Bikes** (Corratec, Goodyear, Selle Italia, 9th Wave).

## Stack
- **Frontend**: React + MUI (Mantis-inspired) + Redux Toolkit
- **Backend**: Node.js + Express + Socket.IO  
- **Banco**: PostgreSQL
- **Tempo real**: Socket.IO (chat interno)

## Acesso
- Frontend: `http://177.153.39.134:3000`
- Backend API: `http://177.153.39.134:5000`
- Ticket público: `http://177.153.39.134:3000/abrir-ticket`
- Acompanhar: `http://177.153.39.134:3000/acompanhar/:token`

## Usuários default
- `admin@relmbikes.com.br` / `Admin@2024!` (Diretor)
- `gestor@relmbikes.com.br` / `Admin@2024!` (Gestor)
- `atendente@relmbikes.com.br` / `Admin@2024!` (Atendente)
- `loja@demo.com.br` / `Loja@2024!` (Loja)

## Setup Backend
```bash
cd backend
npm install
cp .env.production .env  # editar senhas
node migrations/run.js
node migrations/seed.js
npm start
```

## Setup Frontend
```bash
cd frontend
npm install
npm start
```

## Documentação completa
Ver [CLAUDE.md](./CLAUDE.md)
