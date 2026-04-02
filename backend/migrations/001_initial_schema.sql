-- ============================================================
-- RelmDesk v1 - Full Database Schema
-- PostgreSQL
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  is_v1 BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO departments (name, slug, description, is_active, is_v1, sort_order) VALUES
  ('Bikes', 'bikes', 'Divisão Bikes - Corratec, Goodyear, Selle Italia, 9th Wave', TRUE, TRUE, 1),
  ('Wireless', 'wireless', 'Divisão Wireless (em breve)', FALSE, FALSE, 2),
  ('Componentes', 'componentes', 'Divisão Componentes (em breve)', FALSE, FALSE, 3),
  ('Áudio', 'audio', 'Divisão Áudio (em breve)', FALSE, FALSE, 4),
  ('Monitoramento', 'monitoramento', 'Divisão Monitoramento (em breve)', FALSE, FALSE, 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(30) NOT NULL DEFAULT 'cliente',
  -- roles: cliente, loja, atendente, gestor, diretor
  department_id INT REFERENCES departments(id),
  store_id UUID, -- filled if role = 'loja'
  phone VARCHAR(20),
  cpf VARCHAR(14),
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url VARCHAR(500),
  -- LGPD
  lgpd_consent BOOLEAN DEFAULT FALSE,
  lgpd_consent_at TIMESTAMP,
  is_anonymized BOOLEAN DEFAULT FALSE,
  anonymized_at TIMESTAMP,
  -- Chat
  last_seen_at TIMESTAMP,
  is_online BOOLEAN DEFAULT FALSE,
  -- Tokens
  refresh_token TEXT,
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- STORES (Lojas)
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  cnpj VARCHAR(20),
  email VARCHAR(200),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  is_active BOOLEAN DEFAULT TRUE,
  department_id INT REFERENCES departments(id) DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add FK store_id in users
ALTER TABLE users ADD CONSTRAINT fk_user_store 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- ============================================================
-- BRANDS
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  department_id INT REFERENCES departments(id) DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  logo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO brands (name, slug, department_id) VALUES
  ('Corratec', 'corratec', 1),
  ('Goodyear', 'goodyear', 1),
  ('Selle Italia', 'selle-italia', 1),
  ('9th Wave', '9th-wave', 1)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PRODUCT TYPES (Configurável)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INT REFERENCES departments(id) DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO product_types (name, department_id) VALUES
  ('Bicicleta', 1), ('Pneu', 1), ('Selim', 1), ('Acessório', 1), ('Peça', 1)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  brand_id INT REFERENCES brands(id),
  product_type_id INT REFERENCES product_types(id),
  sku VARCHAR(100),
  model VARCHAR(200),
  year INT,
  system_id VARCHAR(100),
  korp_id VARCHAR(100),
  department_id INT REFERENCES departments(id) DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ISSUE TYPES & SUBTYPES (Configurável)
-- ============================================================
CREATE TABLE IF NOT EXISTS issue_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INT REFERENCES departments(id) DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issue_subtypes (
  id SERIAL PRIMARY KEY,
  issue_type_id INT REFERENCES issue_types(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO issue_types (name, department_id, sort_order) VALUES
  ('Garantia', 1, 1), ('Assistência Técnica', 1, 2), ('Troca', 1, 3),
  ('Defeito de Fabricação', 1, 4), ('Dúvida Técnica', 1, 5), ('Recall', 1, 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TICKET STATUS (Sistema)
-- ============================================================
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
  ('Resolvido', 'resolvido', '#4CAF50', 9, 'Ticket resolvido - 20 dias observação'),
  ('Fechado/Arquivado', 'fechado', '#9E9E9E', 10, 'Ticket arquivado')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(20) NOT NULL UNIQUE, -- REL-BIKES-000001
  title VARCHAR(300) NOT NULL,
  description TEXT,
  department_id INT REFERENCES departments(id) DEFAULT 1,
  status_id INT REFERENCES ticket_statuses(id) DEFAULT 1,
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  brand_id INT REFERENCES brands(id),
  issue_type_id INT REFERENCES issue_types(id),
  issue_subtype_id INT REFERENCES issue_subtypes(id),

  -- Parties
  created_by UUID REFERENCES users(id),
  store_id UUID REFERENCES stores(id),
  client_name VARCHAR(200), -- for non-logged clients
  client_email VARCHAR(200),
  client_phone VARCHAR(20),
  client_cpf VARCHAR(14),
  client_user_id UUID REFERENCES users(id), -- if client has account

  -- Ball (Bola do Ticket - Futebol da Relm)
  ball_owner_id UUID REFERENCES users(id),

  -- Assignment
  assigned_to UUID REFERENCES users(id),

  -- Resolution
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  auto_close_at TIMESTAMP, -- resolved_at + 20 days

  -- LGPD
  is_anonymized BOOLEAN DEFAULT FALSE,
  anonymized_at TIMESTAMP,

  -- Public token (for non-logged client access)
  public_token VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sequence for ticket number
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

-- ============================================================
-- TICKET PRODUCTS (1:N)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  -- Manual fields (if product not in DB)
  product_name VARCHAR(200),
  brand_name VARCHAR(100),
  serial_number VARCHAR(200),
  invoice_number VARCHAR(100),
  purchase_date DATE,
  notes TEXT,
  -- LGPD anonimization
  is_anonymized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TICKET HISTORY (Imutável)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  -- types: status_change, ball_change, note, attachment, task_created,
  --        solution_proposed, solution_approved, solution_rejected,
  --        field_updated, ticket_created, block_updated
  old_value TEXT,
  new_value TEXT,
  note TEXT, -- internal notification text
  is_internal BOOLEAN DEFAULT TRUE, -- false = visible to client
  -- Ball tracking
  ball_from_id UUID REFERENCES users(id),
  ball_to_id UUID REFERENCES users(id),
  -- Status tracking
  status_from_id INT REFERENCES ticket_statuses(id),
  status_to_id INT REFERENCES ticket_statuses(id),
  -- Gamification goal
  is_goal BOOLEAN DEFAULT TRUE, -- every history entry = 1 gol
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TICKET BLOCKS (Blocos Modulares)
-- ============================================================
CREATE TABLE IF NOT EXISTS block_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- system blocks can't be deleted
  department_id INT REFERENCES departments(id) DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO block_types (name, slug, description, is_system, sort_order) VALUES
  ('Solução Proposta', 'solucao-proposta', 'Bloco de soluções propostas e aprovação', TRUE, 1),
  ('Faturamento', 'faturamento', 'Instruções de faturamento ao cliente', TRUE, 2),
  ('Logística', 'logistica', 'Informações de envio e logística', TRUE, 3),
  ('Técnico', 'tecnico', 'Notas técnicas internas', FALSE, 4),
  ('Compra', 'compra', 'Informações de compra de peças', FALSE, 5)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS ticket_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  block_type_id INT REFERENCES block_types(id),
  content JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SOLUTIONS (Soluções dentro do bloco)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_solutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  has_cost BOOLEAN DEFAULT FALSE,
  cost_value DECIMAL(10,2),
  cost_notes TEXT,
  status VARCHAR(30) DEFAULT 'pendente', -- pendente, aprovado, reprovado
  proposed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TASKS (Tarefas Kanban)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL, -- optional link
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  status VARCHAR(30) DEFAULT 'pendente', -- pendente, em_andamento, concluida
  priority VARCHAR(20) DEFAULT 'normal',
  department_id INT REFERENCES departments(id) DEFAULT 1,
  -- Kanban position
  sort_order INT DEFAULT 0,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  -- WhatsApp reminder
  whatsapp_sent_at TIMESTAMP,
  -- Ball
  passes_ball BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  filename VARCHAR(300) NOT NULL,
  original_name VARCHAR(300) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CHAT MESSAGES (Internal only)
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200),
  type VARCHAR(20) DEFAULT 'direct', -- direct, group
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP,
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- text, system
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- GAMIFICATION - Futebol da Relm
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  history_id UUID REFERENCES ticket_history(id) ON DELETE SET NULL,
  action_type VARCHAR(50),
  month INT NOT NULL, -- 1-12
  year INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS championship_months (
  id SERIAL PRIMARY KEY,
  month INT NOT NULL,
  year INT NOT NULL,
  department_id INT REFERENCES departments(id) DEFAULT 1,
  is_closed BOOLEAN DEFAULT FALSE,
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(month, year, department_id)
);

-- ============================================================
-- SYSTEM CONFIGURATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_configs (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO system_configs (key, value, description, category) VALUES
  ('email_enabled', 'false', 'Enable email notifications (V2)', 'email'),
  ('auto_close_days', '20', 'Days to auto-close resolved tickets', 'tickets'),
  ('app_url', 'http://177.153.39.134:3000', 'Application base URL', 'general'),
  ('company_name', 'Relm Bikes', 'Company name', 'general'),
  ('whatsapp_message_template', 'Olá! Você tem uma tarefa pendente no RelmDesk: *{task_title}*. Acesse seu ticket aqui: {link}', 'WhatsApp message template', 'whatsapp')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- AUDIT LOGS (LGPD)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info', -- info, warning, success, task, ticket
  related_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status_id);
CREATE INDEX IF NOT EXISTS idx_tickets_department ON tickets(department_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_ball ON tickets(ball_owner_id);
CREATE INDEX IF NOT EXISTS idx_tickets_store ON tickets(store_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client_user ON tickets(client_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_public_token ON tickets(public_token);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_user ON ticket_history(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ticket ON tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_goals_user_month ON goals(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_tickets_search ON tickets USING GIN(
  to_tsvector('portuguese', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(client_name, '') || ' ' || 
    COALESCE(client_email, '') || ' ' || 
    COALESCE(client_phone, '') || ' ' ||
    COALESCE(ticket_number, '')
  )
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  dept_slug VARCHAR(20);
  seq_num INT;
BEGIN
  SELECT slug INTO dept_slug FROM departments WHERE id = NEW.department_id;
  seq_num := nextval('ticket_number_seq');
  NEW.ticket_number := 'REL-' || UPPER(dept_slug) || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_ticket_number BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Auto-set resolved/closed date
CREATE OR REPLACE FUNCTION handle_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Set resolved_at when status changes to 'resolvido' (id=9)
  IF NEW.status_id = 9 AND OLD.status_id != 9 THEN
    NEW.resolved_at = NOW();
    NEW.auto_close_at = NOW() + INTERVAL '20 days';
  END IF;
  -- Set closed_at when status changes to 'fechado' (id=10)
  IF NEW.status_id = 10 AND OLD.status_id != 10 THEN
    NEW.closed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ticket_status_dates BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION handle_ticket_status_change();
