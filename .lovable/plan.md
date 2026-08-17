# Plano de Implementação: Evolução das Categorias de Chaves e Acesso Ostensivo

Este plano detalha a reestruturação das categorias de chaves do SISTOLDA e a implementação da regra de autorização dinâmica para a categoria OSTENSIVA.

## Alterações de Interface
- Atualização dos formulários de cadastro e edição no módulo de Gerenciamento de Chaves para incluir as novas categorias: **SECRETA**, **RESERVADA**, **RESTRITA** e **OSTENSIVA**.
- Manutenção da compatibilidade visual com a categoria legada **GERAL**.

## Alterações de Backend e Banco de Dados
- **Migração de Dados**: Ajuste das restrições de `CHECK` na tabela `chaves` para aceitar as novas categorias, mantendo suporte a `geral`.
- **Lógica de Autorização**:
  - Modificação do serviço de autorização para que chaves marcadas como **OSTENSIVA** concedam acesso automático a qualquer militar identificado.
  - As categorias **SECRETA**, **RESERVADA** e **RESTRITA** continuarão utilizando a matriz de autorizações nominais/individuais existente.
  - Garantia de que a transição de uma chave para **OSTENSIVA** (e vice-versa) não destrua os dados da matriz de autorização.

## Detalhes Técnicos
- **Banco de Dados**: Criação de uma tabela temporária para migrar `chaves` devido à limitação do SQLite em alterar `CHECK constraints`.
- **Serviço de Autorização**: Atualização da função `verificarAutorizacao` em `backend/services/autorizacaoChaves.js` para priorizar a categoria da chave antes de consultar a matriz.
- **Frontend**: Atualização dos tipos e interfaces em `src/lib/api.ts` e `src/pages/GerenciamentoChaves.tsx`.

## Segurança e Integridade
- Preservação total das autorizações nominais existentes.
- Garantia de que o RBAC e outros módulos permaneçam inalterados.
