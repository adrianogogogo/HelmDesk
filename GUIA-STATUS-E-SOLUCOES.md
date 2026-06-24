# Guia: Alteração de Status & Proposta de Soluções (replicável)

> Como implementar, do zero, o fluxo de **atualização de status do ticket** e de
> **proposta + autorização de soluções em dois níveis** (gestor → diretor),
> exatamente como funciona no RelmDesk. Stack: Node.js/Express + PostgreSQL + React/MUI.
>
> O guia segue a ordem real de dependências: **Banco → Backend → Rotas → API frontend → UI**.

---

## Visão geral do fluxo

```
ATUALIZAR STATUS                          PROPOR SOLUÇÃO (2 níveis)
─────────────────                         ─────────────────────────
Atendente clica "Atualizar Status"        Atendente clica "Propor Solução"
   ↓ escolhe status + "passa a bola"          ↓ escolhe tipo (reparo/troca/...)
PATCH /tickets/:id/status                  POST /tickets/:id/solutions
   ↓                                           ↓ cria registro 'pendente' nível gestor
UPDATE tickets (status_id, ball_owner)     cria tarefa + notificação p/ gestor
INSERT ticket_history (imutável)              ↓
notifica novo dono da bola                 Gestor aprova
emite socket 'ticket_updated'                 ├─ não requer diretor → APROVA (finaliza)
                                              └─ requer diretor → sobe p/ nível diretor
                                           Diretor confirma → finaliza
                                              ↓ _finalizeApproval
                                           avança status do ticket conforme o tipo
                                           cria tarefa de execução
```

Dois conceitos centrais que diferenciam este sistema de um helpdesk comum:

1. **"Bola do ticket" (`ball_owner_id`)** — toda mudança de status pode passar a
   responsabilidade ("a bola") para outro usuário, que recebe notificação.
2. **Histórico imutável (`ticket_history`)** — cada ação vira uma linha de
   histórico. Nada é editado/apagado, só inserido. É a fonte da timeline e da
   gamificação (cada linha = 1 gol).

---

## 1. Banco de dados

### 1.1 `ticket_statuses` — os status fixos do workflow

```sql
CREATE TABLE IF NOT EXISTS ticket_statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#666666',
  sort_order INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT
);

INSERT INTO ticket_statuses (name, slug, color, sort_order, description) VALUES
  ('Novo', 'novo', '#2196F3', 1, 'Ticket recém criado'),
  ('Em Triagem', 'em-triagem', '#FF9800', 2, 'Ticket em análise inicial'),
  ('Aguardando Informações', 'aguardando-informacoes', '#FFC107', 3, 'Aguardando dados do cliente/loja'),
  ('Em Análise', 'em-analise', '#9C27B0', 4, 'Equipe técnica analisando'),
  ('Solução Proposta', 'solucao-proposta', '#00BCD4', 5, 'Solução identificada, aguardando aprovação'),
  ('Em Execução', 'em-execucao', '#FF5722', 6, 'Solução sendo executada'),
  ('Logística/Envio', 'logistica-envio', '#795548', 7, 'Produto em logística/transporte'),
  ('Aguardando Confirmação', 'aguardando-confirmacao', '#607D8B', 8, 'Aguardando confirmação do cliente'),
  ('Resolvido', 'resolvido', '#4CAF50', 9, 'Ticket resolvido'),
  ('Fechado/Arquivado', 'fechado', '#9E9E9E', 10, 'Ticket encerrado');
```

> Os IDs 1–10 são referenciados direto no código (ex.: status 7 = Logística).
> Se for replicar com outros status, mantenha a tabela e ajuste os números mágicos
> no controller (veja `_finalizeApproval`).

### 1.2 `ticket_history` — timeline imutável

```sql
CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  -- status_change, ball_change, note, attachment, task_created,
  -- solution_proposed, solution_approved, solution_rejected,
  -- field_updated, ticket_created, block_updated
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  is_internal BOOLEAN DEFAULT TRUE,   -- false = visível ao cliente
  ball_from_id UUID REFERENCES users(id),
  ball_to_id UUID REFERENCES users(id),
  status_from_id INT REFERENCES ticket_statuses(id),
  status_to_id INT REFERENCES ticket_statuses(id),
  is_goal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id);
```

A tabela `tickets` precisa ter pelo menos: `status_id INT REFERENCES ticket_statuses(id) DEFAULT 1`
e `ball_owner_id UUID REFERENCES users(id)`.

### 1.3 `ticket_solutions` — base + colunas de autorização em dois níveis

Base:

```sql
CREATE TABLE IF NOT EXISTS ticket_solutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  has_cost BOOLEAN DEFAULT FALSE,
  cost_value DECIMAL(10,2),
  cost_notes TEXT,
  status VARCHAR(30) DEFAULT 'pendente',  -- pendente, aprovado, reprovado
  proposed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Migration de autorização em dois níveis (rode depois da base):

```sql
ALTER TABLE ticket_solutions
  ADD COLUMN IF NOT EXISTS solution_type VARCHAR(30) DEFAULT 'outro';
  -- reparo, troca, reembolso, cortesia, outro

ALTER TABLE ticket_solutions
  ADD COLUMN IF NOT EXISTS requires_director BOOLEAN DEFAULT FALSE;

ALTER TABLE ticket_solutions
  ADD COLUMN IF NOT EXISTS authorization_level VARCHAR(20) DEFAULT 'gestor';
  -- gestor → aguardando gestor | diretor → aguardando diretor | concluido → ambos aprovaram

ALTER TABLE ticket_solutions
  ADD COLUMN IF NOT EXISTS director_approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS director_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS director_rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_solutions_auth_level
  ON ticket_solutions (authorization_level, status);
```

**Os 3 estados de `status`** (`pendente`/`aprovado`/`reprovado`) e os 3 de
`authorization_level` (`gestor`/`diretor`/`concluido`) são o que move toda a UI.

---

## 2. Backend — controller

### 2.1 Atualizar status — `PATCH /tickets/:id/status`

```js
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { status_id, ball_owner_id, note, is_internal = true } = req.body;

    const { rows: ticketRows } = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (!ticketRows.length) return res.status(404).json({ error: 'Ticket não encontrado' });
    const ticket = ticketRows[0];

    const oldStatusId   = ticket.status_id;
    const oldBallOwnerId = ticket.ball_owner_id;
    const newBallOwnerId = ball_owner_id || user.id;   // sem destino → mantém com quem agiu

    await pool.query(
      `UPDATE tickets SET status_id = $1, ball_owner_id = $2, updated_at = NOW() WHERE id = $3`,
      [status_id || oldStatusId, newBallOwnerId, id]
    );

    // Histórico imutável (guarda de/para de status e de bola)
    const { rows: histRows } = await pool.query(`
      INSERT INTO ticket_history
        (ticket_id, user_id, action_type, note, is_internal,
         status_from_id, status_to_id, ball_from_id, ball_to_id)
      VALUES ($1,$2,'status_change',$3,$4,$5,$6,$7,$8) RETURNING id
    `, [id, user.id, note || null, is_internal,
        oldStatusId, status_id || oldStatusId, oldBallOwnerId, newBallOwnerId]);

    await registerGoal(user.id, id, null, 'status_change', histRows[0].id);

    // Notifica o novo dono da bola
    if (newBallOwnerId !== user.id) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_ticket_id)
        VALUES ($1,'Bola do ticket!', $2, 'ticket', $3)
      `, [newBallOwnerId, `Você recebeu a bola do ticket #${ticket.ticket_number}`, id]);
    }

    const io = req.app.get('io');
    if (io) io.emit('ticket_updated', { ticketId: id });

    res.json({ message: 'Status atualizado', ticket_id: id });
  } catch (err) { next(err); }
};
```

Pontos que tornam isto robusto:
- `status_id || oldStatusId` e `ball_owner_id || user.id` → request parcial nunca zera campos.
- O histórico é **sempre** inserido (nunca update), preservando a trilha completa.
- `io.emit('ticket_updated')` faz outras telas abertas recarregarem em tempo real.

### 2.2 Helper de gamificação (opcional, mas usado em todo lugar)

```js
const registerGoal = async (userId, ticketId, taskId, actionType, historyId = null) => {
  const now = new Date();
  await pool.query(`
    INSERT INTO goals (user_id, ticket_id, task_id, history_id, action_type, month, year)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [userId, ticketId, taskId, historyId, actionType, now.getMonth() + 1, now.getFullYear()]);
};
```

Se o projeto destino não tem gamificação, basta remover as chamadas a `registerGoal`.

### 2.3 Propor solução — `POST /tickets/:id/solutions`

```js
const SOLUTION_TYPES_REQUIRE_DIRECTOR = ['troca', 'reembolso']; // sempre exigem diretor
const SOLUTION_TYPE_LABELS = {
  reparo: 'Reparo / Manutenção', troca: 'Troca de Produto',
  reembolso: 'Reembolso', cortesia: 'Cortesia / Bonificação', outro: 'Outro',
};

const addSolution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, solution_type = 'outro', has_cost, cost_value, cost_notes } = req.body;
    const user = req.user;

    if (!description || !description.trim())
      return res.status(400).json({ error: 'Descrição da solução é obrigatória' });

    const requiresDirector = SOLUTION_TYPES_REQUIRE_DIRECTOR.includes(solution_type);

    const { rows } = await pool.query(`
      INSERT INTO ticket_solutions
        (ticket_id, description, solution_type, has_cost, cost_value, cost_notes,
         proposed_by, requires_director, authorization_level)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'gestor')   -- sempre começa aguardando o gestor
      RETURNING *
    `, [id, description, solution_type, has_cost || false, cost_value || null,
        cost_notes || null, user.id, requiresDirector]);
    const solution = rows[0];

    // dados do ticket p/ tarefas/notificações
    const { rows: tRows } = await pool.query(
      'SELECT ticket_number, department_id FROM tickets WHERE id = $1', [id]);
    const ticketNumber = tRows[0]?.ticket_number;
    const deptId = tRows[0]?.department_id || 1;

    // Tarefa automática p/ um gestor aprovar
    const { rows: managers } = await pool.query(
      `SELECT id FROM users WHERE role IN ('gestor','diretor') AND is_active = TRUE AND department_id = $1 LIMIT 1`,
      [deptId]);
    if (managers.length) {
      const typeLabel = SOLUTION_TYPE_LABELS[solution_type] || solution_type;
      const custo = has_cost && cost_value > 0 ? ` | Custo: R$ ${parseFloat(cost_value).toFixed(2)}` : '';
      await pool.query(`
        INSERT INTO tasks (title, description, ticket_id, assigned_to, created_by, status, priority)
        VALUES ($1,$2,$3,$4,$5,'pendente','high')
      `, [`✅ Autorizar solução — ${typeLabel} | Ticket #${ticketNumber}`,
          `Solução proposta: ${description}${custo}`, id, managers[0].id, user.id]);
    }

    // Notifica todos os gestores/diretores do departamento
    const { rows: targets } = await pool.query(
      `SELECT id FROM users WHERE role IN ('gestor','diretor') AND is_active = TRUE AND department_id = $1`,
      [deptId]);
    for (const t of targets) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_ticket_id)
        VALUES ($1,'💡 Nova solução para autorizar',$2,'solution',$3)
      `, [t.id, `Ticket #${ticketNumber}: solução "${SOLUTION_TYPE_LABELS[solution_type]}" aguarda autorização.`, id]);
    }

    await pool.query(`
      INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
      VALUES ($1,$2,'solution_proposed',$3,TRUE)
    `, [id, user.id, `[${SOLUTION_TYPE_LABELS[solution_type]}] ${description}`]);

    await registerGoal(user.id, id, null, 'solution_proposed');
    const io = req.app.get('io'); if (io) io.emit('ticket_updated', { ticketId: id });

    res.status(201).json(solution);
  } catch (err) { next(err); }
};
```

### 2.4 Aprovar / reprovar — `PATCH /tickets/:id/solutions/:solutionId/approve`

A lógica de dois níveis vive aqui. Resumo das transições:

| Estado atual | Quem age | `approved` | Resultado |
|---|---|---|---|
| `pendente` / `gestor` | gestor | `false` | `reprovado` |
| `pendente` / `gestor`, **não** requer diretor | gestor/diretor | `true` | `aprovado` → `_finalizeApproval` |
| `pendente` / `gestor`, **requer** diretor | gestor | `true` | sobe p/ nível `diretor` (não finaliza) |
| `pendente` / `diretor` | diretor | `true` | `aprovado` → `_finalizeApproval` |
| `pendente` / `diretor` | diretor | `false` | `reprovado` |

```js
const approveSolution = async (req, res, next) => {
  try {
    const { id, solutionId } = req.params;
    const { approved, rejection_reason } = req.body;
    const user = req.user;

    if (!['gestor', 'diretor', 'superadmin'].includes(user.role))
      return res.status(403).json({ error: 'Apenas gestores e diretores podem autorizar soluções' });

    const { rows: solRows } = await pool.query(
      'SELECT * FROM ticket_solutions WHERE id = $1 AND ticket_id = $2', [solutionId, id]);
    if (!solRows.length) return res.status(404).json({ error: 'Solução não encontrada' });
    const sol = solRows[0];

    const { rows: tRows } = await pool.query(
      'SELECT ticket_number, department_id FROM tickets WHERE id = $1', [id]);
    const ticketNumber = tRows[0]?.ticket_number;
    const deptId = tRows[0]?.department_id || 1;
    const typeLabel = SOLUTION_TYPE_LABELS[sol.solution_type] || sol.solution_type;

    // ── REPROVAÇÃO (qualquer nível) ──
    if (!approved) {
      await pool.query(`
        UPDATE ticket_solutions
        SET status='reprovado', approved_by=$1, approved_at=NOW(), rejection_reason=$2
        WHERE id=$3
      `, [user.id, rejection_reason || 'Reprovado', solutionId]);
      await pool.query(`
        INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
        VALUES ($1,$2,'solution_rejected',$3,TRUE)
      `, [id, user.id, `[${typeLabel}] Reprovado: ${rejection_reason || '—'}`]);
      const io = req.app.get('io'); if (io) io.emit('ticket_updated', { ticketId: id });
      return res.json({ message: 'Solução reprovada' });
    }

    // ── NÍVEL 1: gestor aprova ──
    if (sol.authorization_level === 'gestor') {
      // requer diretor E quem agiu é só gestor → sobe de nível, NÃO finaliza
      if (sol.requires_director && user.role === 'gestor') {
        await pool.query(`
          UPDATE ticket_solutions
          SET authorization_level='diretor', approved_by=$1, approved_at=NOW()
          WHERE id=$2
        `, [user.id, solutionId]);

        // notifica + cria tarefa p/ diretores
        const { rows: directors } = await pool.query(
          `SELECT id FROM users WHERE role='diretor' AND is_active=TRUE AND department_id=$1`, [deptId]);
        for (const dir of directors) {
          await pool.query(`
            INSERT INTO notifications (user_id, title, message, type, related_ticket_id)
            VALUES ($1,'🔐 Autorização de diretor necessária',$2,'solution',$3)
          `, [dir.id, `Ticket #${ticketNumber}: "${typeLabel}" aprovada pelo gestor, aguarda confirmação.`, id]);
          await pool.query(`
            INSERT INTO tasks (title, description, ticket_id, assigned_to, created_by, status, priority)
            VALUES ($1,$2,$3,$4,$5,'pendente','high')
          `, [`🔐 Confirmar autorização — ${typeLabel} | Ticket #${ticketNumber}`,
              `Gestor ${user.name} aprovou. Aguarda confirmação do diretor.`, id, dir.id, user.id]);
        }
        await pool.query(`
          INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
          VALUES ($1,$2,'solution_approved',$3,TRUE)
        `, [id, user.id, `[${typeLabel}] Aprovado pelo gestor — aguardando diretor`]);
        const io = req.app.get('io'); if (io) io.emit('ticket_updated', { ticketId: id });
        return res.json({ message: 'Aprovada pelo gestor — aguardando diretor', next_level: 'diretor' });
      }
      // não requer diretor (ou diretor aprovando direto) → finaliza
      await _finalizeApproval({ pool, id, solutionId, sol, user, ticketNumber, typeLabel, deptId });
      const io = req.app.get('io'); if (io) io.emit('ticket_updated', { ticketId: id });
      return res.json({ message: 'Solução aprovada e fluxo de execução iniciado' });
    }

    // ── NÍVEL 2: diretor confirma ──
    if (sol.authorization_level === 'diretor') {
      if (!['diretor', 'superadmin'].includes(user.role))
        return res.status(403).json({ error: 'Esta solução requer confirmação do diretor' });
      await pool.query(`
        UPDATE ticket_solutions
        SET director_approved_by=$1, director_approved_at=NOW(), authorization_level='concluido'
        WHERE id=$2
      `, [user.id, solutionId]);
      await _finalizeApproval({ pool, id, solutionId, sol, user, ticketNumber, typeLabel, deptId });
      const io = req.app.get('io'); if (io) io.emit('ticket_updated', { ticketId: id });
      return res.json({ message: 'Solução confirmada pelo diretor — execução iniciada' });
    }

    return res.status(400).json({ error: 'Esta solução já foi processada' });
  } catch (err) { next(err); }
};
```

### 2.5 `_finalizeApproval` — efeito colateral da aprovação final

Marca como `aprovado`, **avança o status do ticket conforme o tipo de solução** e
cria uma tarefa de execução:

```js
async function _finalizeApproval({ pool, id, solutionId, sol, user, ticketNumber, typeLabel, deptId }) {
  await pool.query(`
    UPDATE ticket_solutions
    SET status='aprovado', approved_by=COALESCE(approved_by,$1), approved_at=COALESCE(approved_at,NOW())
    WHERE id=$2
  `, [user.id, solutionId]);

  let newStatusId, taskTitle, taskDesc;
  if (sol.solution_type === 'troca') {
    newStatusId = 7; // Logística/Envio
    taskTitle = `📦 Executar TROCA — Ticket #${ticketNumber}`; taskDesc = sol.description;
  } else if (sol.solution_type === 'reembolso') {
    newStatusId = 6; // Em Execução
    const valor = sol.cost_value ? `R$ ${parseFloat(sol.cost_value).toFixed(2)}` : 'valor a definir';
    taskTitle = `💰 Processar REEMBOLSO — ${valor} | Ticket #${ticketNumber}`; taskDesc = sol.description;
  } else if (sol.solution_type === 'reparo') {
    newStatusId = 6; taskTitle = `🔧 Executar REPARO — Ticket #${ticketNumber}`; taskDesc = sol.description;
  } else if (sol.solution_type === 'cortesia') {
    newStatusId = 6; taskTitle = `🎁 Processar CORTESIA — Ticket #${ticketNumber}`; taskDesc = sol.description;
  } else {
    newStatusId = 6; taskTitle = `⚙️ Executar solução — Ticket #${ticketNumber}`; taskDesc = sol.description;
  }

  if (newStatusId)
    await pool.query('UPDATE tickets SET status_id=$1, updated_at=NOW() WHERE id=$2', [newStatusId, id]);

  const { rows: assignees } = await pool.query(
    `SELECT id FROM users WHERE role IN ('atendente','gestor') AND is_active=TRUE AND department_id=$1 ORDER BY role DESC LIMIT 1`,
    [deptId]);
  if (assignees.length && taskTitle) {
    const priority = ['troca','reembolso'].includes(sol.solution_type) ? 'high' : 'normal';
    await pool.query(`
      INSERT INTO tasks (title, description, ticket_id, assigned_to, created_by, status, priority)
      VALUES ($1,$2,$3,$4,$5,'pendente',$6)
    `, [taskTitle, taskDesc, id, assignees[0].id, user.id, priority]);
  }

  await pool.query(`
    INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
    VALUES ($1,$2,'solution_approved',$3,TRUE)
  `, [id, user.id, `[${typeLabel}] Solução aprovada — execução iniciada`]);
}
```

> **Números mágicos de status (6, 7)**: ajuste-os se seu workflow for diferente.
> Esta é a única parte do controller acoplada aos IDs da tabela `ticket_statuses`.

---

## 3. Rotas & Middleware (RBAC)

```js
// routes/tickets.js
router.use(authenticate);

// IMPORTANTE: /meta/statuses ANTES de /:id, senão "meta" cai no parâmetro dinâmico
router.get('/meta/statuses', async (req, res, next) => {
  const { rows } = await pool.query('SELECT * FROM ticket_statuses ORDER BY sort_order');
  res.json(rows);
});

router.patch('/:id/status', ticketAccess, internalOnly, updateStatus);
router.post('/:id/solutions', ticketAccess, internalOnly, addSolution);
router.patch('/:id/solutions/:solutionId/approve', ticketAccess, authorize('gestor', 'diretor'), approveSolution);
```

Middlewares relevantes:

```js
// Somente equipe interna (não cliente/loja) pode mudar status / propor solução
const INTERNAL_ROLES = ['atendente', 'gestor', 'diretor', 'superadmin'];
const internalOnly = (req, res, next) => {
  if (!req.user || !INTERNAL_ROLES.includes(req.user.role))
    return res.status(403).json({ error: 'Acesso restrito a usuários internos' });
  next();
};

// Restringe a papéis específicos; superadmin sempre passa
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
  if (req.user.role === 'superadmin') return next();
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: 'Acesso não permitido' });
  next();
};
```

> Regra de ouro: **mudar status e propor solução** = `internalOnly`.
> **Aprovar solução** = `authorize('gestor','diretor')`. O backend é a fonte de
> verdade do RBAC; a UI só esconde botões por conveniência.

---

## 4. Camada de API no frontend (`services/api.js`)

```js
export const ticketAPI = {
  updateStatus:    (id, data)             => api.patch(`/tickets/${id}/status`, data),
  addSolution:     (id, data)             => api.post(`/tickets/${id}/solutions`, data),
  approveSolution: (id, solutionId, data) => api.patch(`/tickets/${id}/solutions/${solutionId}/approve`, data),
  addNote:         (id, data)             => api.post(`/tickets/${id}/notes`, data),
  getStatuses:     ()                     => api.get('/tickets/meta/statuses'),
  getById:         (id)                   => api.get(`/tickets/${id}`),
};
```

O `GET /tickets/:id` deve retornar o ticket **com `solutions` e `history` embutidos**
(JOINs), para a tela montar tudo numa requisição.

---

## 5. Frontend — UI (React + MUI)

### 5.1 Constantes compartilhadas com o backend

```jsx
const SOLUTION_TYPES = [
  { value: 'reparo',    label: '🔧 Reparo / Manutenção',   requiresDirector: false },
  { value: 'troca',     label: '🔄 Troca de Produto',       requiresDirector: true  },
  { value: 'reembolso', label: '💰 Reembolso',              requiresDirector: true  },
  { value: 'cortesia',  label: '🎁 Cortesia / Bonificação', requiresDirector: false },
  { value: 'outro',     label: '📋 Outro',                  requiresDirector: false },
];
```

> Mantenha `requiresDirector` **sincronizado** com `SOLUTION_TYPES_REQUIRE_DIRECTOR`
> do backend. A UI usa só para mostrar o aviso "requer diretor"; quem decide é o backend.

### 5.2 Dialog de Atualizar Status

Campos: `Select` de status, `Select` "passar a bola para" (lista de usuários internos),
`TextField` de nota e `Switch` interna/pública. No submit:

```jsx
await ticketAPI.updateStatus(ticket.id, {
  status_id, ball_owner_id, note, is_internal   // ball_owner_id vazio = mantém comigo
});
toast.success('Status atualizado!');
onSuccess();   // recarrega o ticket
```

### 5.3 Dialog de Propor Solução

```jsx
const [form, setForm] = useState({
  description: '', solution_type: 'reparo', has_cost: false, cost_value: '', cost_notes: ''
});
const requiresDirector = SOLUTION_TYPES.find(t => t.value === form.solution_type)?.requiresDirector;

// mostra <Alert severity="warning"> quando requiresDirector
await ticketAPI.addSolution(ticketId, {
  ...form,
  cost_value: form.has_cost ? parseFloat(form.cost_value) || 0 : null,
});
```

### 5.4 Lista de soluções + botões de autorização

Para cada solução, derive os flags de permissão a partir do estado + papel do usuário:

```jsx
const isAwaitingGestor   = sol.status === 'pendente' && sol.authorization_level === 'gestor';
const isAwaitingDirector = sol.status === 'pendente' && sol.authorization_level === 'diretor';
const canActAsGestor     = isAwaitingGestor   && ['gestor','diretor','superadmin'].includes(user?.role);
const canActAsDirector   = isAwaitingDirector && ['diretor','superadmin'].includes(user?.role);
```

- `canActAsGestor` → botão **"Aprovar"** (label muda p/ "Aprovar (enviar ao Diretor)"
  se `sol.requires_director`) + **"Reprovar"**.
- `canActAsDirector` → botão **"Confirmar e Autorizar Execução"** + **"Reprovar"**.

Handler único trata os dois níveis pela resposta do backend:

```jsx
const handleApproveSolution = async (solutionId, approved, reason) => {
  const { data } = await ticketAPI.approveSolution(id, solutionId, { approved, rejection_reason: reason });
  if (approved)
    toast.success(data.next_level === 'diretor'
      ? '✅ Aprovado! Aguardando confirmação do diretor.'
      : '✅ Solução aprovada — execução iniciada!');
  else
    toast.success('❌ Solução reprovada');
  loadTicket();
};
```

> **Reprovação:** use um `<Dialog>` dedicado com `disableRestoreFocus` para coletar o
> motivo — **não** use `window.prompt()` (causa warning de `aria-hidden` no MUI).

### 5.5 Régua de status e timeline (opcionais, mas é o visual do sistema)

- **StatusRuler**: barra horizontal com um segmento por status; pinta os passados,
  destaca o atual (`s.id === currentStatusId`, `s.id < currentStatusId`).
- **Histórico**: renderize `ticket.history` em ordem cronológica, mostrando o
  `action_type` (com ícone), o de/para de status (`status_from_name → status_to_name`),
  a passagem de bola (`ball_to_name`) e a nota.

---

## 6. Checklist de replicação

1. [ ] Criar `ticket_statuses` + seed dos status; garantir `tickets.status_id` e `tickets.ball_owner_id`.
2. [ ] Criar `ticket_history` (+ índice por `ticket_id`).
3. [ ] Criar `ticket_solutions` base + migration de dois níveis.
4. [ ] (Opcional) Tabelas `notifications`, `tasks`, `goals` — ou remover as chamadas.
5. [ ] Controller: `updateStatus`, `addSolution`, `approveSolution`, `_finalizeApproval`, `registerGoal`.
6. [ ] Ajustar os **IDs de status mágicos** (6, 7) em `_finalizeApproval` ao seu workflow.
7. [ ] Rotas com `internalOnly` (status/propor) e `authorize('gestor','diretor')` (aprovar); `/meta/statuses` antes de `/:id`.
8. [ ] `ticketAPI` no frontend; `GET /tickets/:id` retornando `solutions` + `history`.
9. [ ] Dialogs: Atualizar Status, Propor Solução, Reprovar (com motivo).
10. [ ] Lista de soluções com flags `canActAsGestor` / `canActAsDirector`.
11. [ ] Manter `SOLUTION_TYPES` (frontend) e `SOLUTION_TYPES_REQUIRE_DIRECTOR` (backend) sincronizados.

---

## 7. Armadilhas conhecidas

| Sintoma | Causa | Correção |
|---|---|---|
| `/meta/statuses` retorna 404 | rota definida depois de `/:id` | mover `/meta/statuses` para antes de `/:id` |
| Loja/cliente consegue mudar status | faltou `internalOnly` na rota | adicionar middleware `internalOnly` |
| Warning `aria-hidden` ao reprovar | uso de `window.prompt()` | `<Dialog disableRestoreFocus>` dedicado |
| Status volta a zerar em update parcial | sobrescrever com `undefined` | usar `status_id \|\| oldStatusId` |
| Solução "requer diretor" finaliza no gestor | faltou checar `user.role === 'gestor'` | só sobe de nível se quem aprovou é gestor; diretor aprovando direto finaliza |
| Outra aba não atualiza | sem evento socket | `io.emit('ticket_updated', { ticketId })` após cada mutação |

---

*Referência viva: ver `backend/src/controllers/ticketController.js`, `backend/src/routes/tickets.js`,
`backend/migrations/002_solution_types.sql` e `frontend/src/pages/TicketDetailPage.js` no RelmDesk.*
