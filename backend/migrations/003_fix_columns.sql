-- ============================================================
-- Migration 003: Correções e colunas faltantes
-- ============================================================

-- Garantir que tickets tem client_cpf (pode ter sido criada antes da coluna existir)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_cpf VARCHAR(14);

-- Garantir que tasks tem ticket_id com ON DELETE SET NULL (pode ter FK restrita)
-- (já deve existir, mas garante)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMP;

-- Índice para busca full-text mais rápida
CREATE INDEX IF NOT EXISTS idx_tickets_client_name  ON tickets USING gin(to_tsvector('portuguese', COALESCE(client_name,'')));
CREATE INDEX IF NOT EXISTS idx_tickets_title        ON tickets USING gin(to_tsvector('portuguese', COALESCE(title,'')));
CREATE INDEX IF NOT EXISTS idx_tickets_ball_owner   ON tickets(ball_owner_id);
