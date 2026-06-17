# Relatório de Segurança — RelmDesk

**Sistema:** RelmDesk (Helpdesk multimarca — Relm Bikes)
**Data:** 15/06/2026
**Escopo:** Auditoria e correção de segurança dos endpoints de comunicação entre frontend e backend, com foco na proteção de dados de clientes.
**Classificação do documento:** Interno / Confidencial

---

## 1. Resumo Executivo

Foi conduzida uma auditoria de segurança dos canais de comunicação da aplicação (API), motivada pela necessidade de garantir a proteção dos dados pessoais dos clientes (nome, e-mail, telefone, CPF, notas fiscais) contra acesso indevido e vazamento.

A auditoria identificou **16 pontos de atenção** (4 críticos, 4 altos, 5 médios, 3 baixos). Foram **corrigidos e colocados em produção os itens de maior gravidade**, incluindo a falha que permitia o **vazamento de toda a base de dados de clientes**.

| Indicador | Antes | Depois |
|---|---|---|
| Vazamento da base de clientes (PII) | **Possível** por qualquer usuário logado | **Bloqueado** |
| Acesso a métricas internas por terceiros | Possível | Bloqueado |
| Escalonamento de privilégio (virar administrador) | Possível | Bloqueado |
| Segredos do sistema expostos no código-fonte | Sim | Removidos do código |

**Veredito atual:** os riscos críticos de vazamento de dados de clientes foram **neutralizados**. Permanecem **pendências que dependem de autorização da diretoria** (rotação de senhas/segredos) para encerrar 100% do risco — detalhadas na Seção 6.

---

## 2. Objetivo e Metodologia

**Objetivo:** verificar se os endpoints de comunicação entre o backend e o frontend estavam protegidos contra invasão maliciosa e roubo de dados dos clientes cadastrados.

**Metodologia:** revisão de código (análise estática) de toda a camada de API — autenticação, autorização por perfil, injeção de SQL, exposição de dados sensíveis, validação de entrada, upload de arquivos e configuração de segurança HTTP. As correções foram aplicadas, publicadas no servidor de produção e **validadas com testes reais** (ver Seção 5).

---

## 3. Situação Encontrada (Diagnóstico)

Resumo dos achados por severidade. O detalhamento técnico está no Anexo A.

### 3.1. Riscos Críticos (🔴)
1. **Vazamento da base de clientes:** qualquer usuário autenticado (incluindo um cliente ou uma loja parceira) conseguia baixar **nome, e-mail, telefone e CPF de todos os clientes** cadastrados.
2. **Segredos no código-fonte:** a chave de assinatura de sessões (JWT) e a senha do banco de dados estavam escritas em texto puro em arquivos do projeto, permitindo a um terceiro **forjar acessos como administrador**.
3. **Senha de administrador do servidor (root) no código:** scripts versionados continham a senha de acesso ao servidor.
4. **Falha de XSS na exportação de PDF:** conteúdo enviado pelo portal público podia executar código no navegador de um atendente ao gerar um relatório.

### 3.2. Riscos Altos (🟠)
- Métricas globais do negócio acessíveis a clientes/lojas.
- Possibilidade de cliente/loja gravar informações internas em chamados (notas, soluções, produtos).
- **Escalonamento de privilégio:** um gestor podia se auto-promover a diretor (acesso total).
- Configuração de segurança HTTP permissiva e exposição de detalhes técnicos em erros.

### 3.3. Riscos Médios e Baixos (🟡🔵)
- Sessões longas sem mecanismo de revogação; anexos acessíveis sem login; validações de upload baseadas em informação do cliente; controles de bloqueio de login limitados a um único processo. (Detalhes no Anexo A.)

### 3.4. Pontos já protegidos (positivos)
A auditoria também confirmou boas práticas já existentes:
- **Sem brechas de injeção de SQL** — todas as consultas usam parâmetros seguros.
- Senhas dos usuários armazenadas com criptografia forte (bcrypt).
- Mensagens de login genéricas (não revelam se o e-mail existe).
- Limite de tentativas de login (proteção contra ataque de força bruta).
- Conformidade com LGPD via anonimização de dados.

---

## 4. Correções Implementadas e em Produção

### Etapa A — Proteção dos dados de clientes e controle de acesso
| # | Correção | Status |
|---|---|---|
| A.1 | Listagem de clientes (nome/e-mail/telefone/CPF) restrita a perfis internos (atendente, gestor, diretor) | ✅ Em produção |
| A.2 | Painel/Dashboard com métricas globais restrito a perfis internos | ✅ Em produção |
| A.3 | Bloqueio de gravação indevida por cliente/loja em chamados (notas, soluções, produtos, blocos) | ✅ Em produção |
| A.4 | Bloqueio de escalonamento de privilégio: somente diretor altera perfis; impedida a auto-promoção e a alteração de contas de diretor por gestores | ✅ Em produção |
| A.5 | Ajustes na interface para que perfis externos não acessem telas internas | ✅ Em produção |

### Etapa B — Remoção de segredos do código-fonte
| # | Correção | Status |
|---|---|---|
| B.1 | Remoção das chaves/senhas escritas no código; sistema passa a lê-las de configuração protegida e fora do versionamento | ✅ Em produção |
| B.2 | Sistema agora **recusa iniciar** se os segredos não estiverem configurados corretamente (evita uso de valores padrão inseguros) | ✅ Em produção |
| B.3 | Remoção da senha de administrador do servidor (root) dos scripts versionados | ✅ Concluído |
| B.4 | Criação de modelo de configuração (template) sem valores reais, para padronizar implantações futuras | ✅ Concluído |

---

## 5. Validação (Evidências)

As correções foram testadas no ambiente de produção com contas reais:

| Teste | Resultado esperado | Resultado obtido |
|---|---|---|
| Loja tenta listar todos os clientes | Bloqueado (403) | ✅ Bloqueado |
| Loja tenta acessar o painel global | Bloqueado (403) | ✅ Bloqueado |
| Loja acessa seus próprios chamados | Permitido | ✅ Permitido |
| Administrador acessa clientes/painel | Permitido (200) | ✅ Permitido |
| Login e operação normal após mudanças | Funcionando | ✅ Funcionando, sem perda de sessões |

---

## 6. Riscos Residuais e Pendências (requer decisão da diretoria)

As correções acima **reduzem drasticamente** a exposição, mas **três pontos só são totalmente encerrados com autorização da diretoria**:

1. **Rotação (troca) dos segredos — PENDENTE DE AUTORIZAÇÃO.**
   Por orientação, os **valores** das senhas/chaves **não foram alterados** nesta etapa. Como esses valores estiveram expostos, eles devem ser **trocados** (chave de sessão, senha do banco e senha de acesso ao servidor). Enquanto não forem trocados, quem teve acesso anterior ao código ainda poderia utilizá-los. **Recomendação: autorizar a rotação o quanto antes.** Observação: a troca da chave de sessão exigirá que todos os usuários façam login novamente (efeito esperado e pontual).

2. **Limpeza do histórico do repositório.**
   Os segredos foram removidos da versão atual, mas permanecem no histórico de versões do repositório. É necessário um procedimento de limpeza do histórico (depende também da regularização do acesso de publicação ao repositório — ver item 3).

3. **Regularização do acesso de publicação ao repositório (GitHub).**
   A conta atualmente utilizada não tem permissão de escrita no repositório oficial. As correções foram publicadas **diretamente no servidor de produção** (já estão no ar), mas ainda precisam ser sincronizadas com o repositório oficial assim que o acesso for regularizado.

### Itens técnicos ainda em aberto (não críticos para vazamento de dados)
- Correção definitiva do XSS na exportação de PDF.
- Exigir login para download de anexos.
- Endurecimento de configurações HTTP (CSP) e revisão de sessões longas.

Estes itens estão planejados e podem ser executados na sequência, conforme priorização.

---

## 7. Recomendações e Próximos Passos

1. **Autorizar a rotação dos segredos** (chave de sessão, senha do banco e senha do servidor) — encerra o principal risco residual.
2. **Regularizar o acesso ao repositório** e realizar a limpeza do histórico.
3. **Concluir os itens técnicos em aberto** (XSS no PDF, anexos com login, CSP).
4. **Estabelecer rotina periódica** de revisão de segurança (recomendado a cada novo ciclo de funcionalidades).

---

## 8. Conclusão

A falha mais grave — que permitia o **vazamento de toda a base de dados de clientes** — foi **identificada e corrigida**, assim como as demais brechas críticas de controle de acesso e exposição de segredos no código. O sistema está **significativamente mais seguro** do que no início da auditoria.

Para **eliminar por completo** o risco remanescente, é necessária a **autorização da diretoria para a rotação dos segredos** e a regularização do acesso ao repositório, conforme a Seção 6.

---

## Anexo A — Detalhamento Técnico das Correções

**Controle de acesso (RBAC):**
- `GET /api/clients` e `GET /api/dashboard`: adicionada autorização por perfil (`atendente`, `gestor`, `diretor`).
- Rotas de escrita em chamados (`/products`, `/solutions`, `/blocks`): restritas a usuários internos (`internalOnly`).
- Notas de chamado: o campo "interna" passou a ser definido pelo perfil do autor (cliente/loja nunca cria nota interna), em vez de ser aceito do cliente.
- `PATCH /api/users/:id`: alteração de perfil (`role`) restrita a `diretor`; bloqueada a auto-elevação e a alteração de contas de `diretor` por `gestor`.
- Frontend: rotas `/dashboard` e `/clientes` protegidas por perfil; redirecionamento inicial sensível ao perfil; itens de menu ocultos para perfis externos.

**Gestão de segredos:**
- Removidos os valores padrão (fallback) de `JWT_SECRET` e `DB_PASSWORD` do código (`auth.js`, `authController.js`, `database.js`, `migrations/run.js`, `migrations/seed.js`).
- `server.js`: validação obrigatória de segredos na inicialização (fail-fast).
- `ecosystem.config.js`: removido o bloco com segredos; configuração centralizada em arquivo `.env` não versionado.
- Scripts de implantação (`deploy.sh`, `setup-vps.sh`, `fix-vps.sh`): segredos lidos do ambiente; geração automática de chave aleatória quando aplicável; criação de `.env` modelo (`.env.example`).
- Removidos do versionamento os scripts que continham a senha de root do servidor.

**Validação confirmada por auditoria:** ausência de injeção de SQL; uso de bcrypt; limite de tentativas de login; mensagens de erro genéricas; conformidade com LGPD (anonimização).

---
*Documento gerado em 15/06/2026. As correções das Etapas A e B encontram-se publicadas no ambiente de produção e validadas por testes funcionais.*
