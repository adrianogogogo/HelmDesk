// Fonte única de verdade dos perfis (papéis) do sistema.
// superadmin é o topo: tem acesso total (superconjunto do diretor) e poderes exclusivos
// (conceder o próprio status de superadmin e excluir usuários/lojas).

const VALID_ROLES = ['cliente', 'loja', 'atendente', 'gestor', 'diretor', 'superadmin'];

// Perfis internos (equipe) — enxergam todos os tickets e telas administrativas.
const INTERNAL_ROLES = ['atendente', 'gestor', 'diretor', 'superadmin'];

// Perfis de gestão — aprovam soluções, gerenciam usuários/lojas/config.
const MANAGER_ROLES = ['gestor', 'diretor', 'superadmin'];

const isInternal = (role) => INTERNAL_ROLES.includes(role);
const isManager = (role) => MANAGER_ROLES.includes(role);
const isSuperadmin = (role) => role === 'superadmin';

module.exports = {
  VALID_ROLES,
  INTERNAL_ROLES,
  MANAGER_ROLES,
  isInternal,
  isManager,
  isSuperadmin,
};
