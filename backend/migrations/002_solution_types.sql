-- ============================================================
-- RelmDesk v1 - Migration 002: Tipos de Solução e Autorização em Dois Níveis
-- ============================================================
-- Adiciona:
--   - solution_type: tipo da solução (reparo, troca, reembolso, cortesia, outro)
--   - requires_director: flag para soluções que precisam de aprovação do diretor
--   - director_approved_by / director_approved_at / director_rejection_reason
--   - authorization_level: nível atual de autorização (gestor / diretor)
-- ============================================================

-- 1. Adicionar coluna solution_type
ALTER TABLE ticket_solutions
  ADD COLUMN IF NOT EXISTS solution_type VARCHAR(30) DEFAULT 'outro';
  -- valores: reparo, troca, reembolso, cortesia, outro

-- 2. Flag indicando que a solução exige aprovação do diretor (ex.: troca/reembolso)
ALTER TABLE ticket_solutions
  ADD COLUMN IF NOT EXISTS requires_director BOOLEAN DEFAULT FALSE;

-- 3. Nível atual de autorização para acompanhar o fluxo
ALTER TABLE ticket_solutions
  ADD COLUMN IF NOT EXISTS authorization_level VARCHAR(20) DEFAULT 'gestor';
  -- gestor  → aguardando gestor aprovar
  -- diretor → gestor aprovou, aguardando diretor confirmar
  -- concluido → ambos aprovaram

-- 4. Campos de aprovação do diretor
ALTER TABLE ticket_solutions
  ADD COLUMN IF NOT EXISTS director_approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS director_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS director_rejection_reason TEXT;

-- 5. Regra de negócio: troca e reembolso sempre requerem aprovação do diretor
-- (será aplicada no controller, não via constraint de DB)

-- 6. Índice para buscar soluções pendentes por nível
CREATE INDEX IF NOT EXISTS idx_solutions_auth_level
  ON ticket_solutions (authorization_level, status);
