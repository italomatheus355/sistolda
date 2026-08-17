# Plano de Implementação: Evolução das Categorias de Chaves e Acesso Ostensivo

Este plano detalha a reestruturação das categorias de chaves do SISTOLDA e a implementação da regra de autorização dinâmica para a categoria OSTENSIVA com validação rigorosa de migração.

## Validação de Segurança e Migração (OBRIGATÓRIO)
Antes de executar a implementação, os seguintes passos de segurança devem ser seguidos:
1. **Backup Preventivo**: Garantir backup do banco SQLite antes de qualquer alteração estrutural.
2. **Integridade de Dados**: Comparar contagem de registros em `chaves` antes/depois da migração.
3. **Preservação de Vínculos**: Garantir que todas as autorizações em `chave_autorizacoes` permaneçam intactas sem recriação desnecessária.
4. **Testes de Transição de Estado**:
   - `GERAL` → `OSTENSIVA` → `RESTRITA`
   - `GERAL` → `OSTENSIVA` → `SECRETA`
   - `SECRETA` → `OSTENSIVA` → `SECRETA`
   - Em todos os casos, as autorizações individuais devem permanecer disponíveis quando a chave deixar de ser `OSTENSIVA`.
5. **Verificação Pós-Migração**: Executar `typecheck`, `build` e testes de integridade.

## Alterações de Interface
- Atualização dos formulários de cadastro e edição no módulo de Gerenciamento de Chaves para incluir as novas categorias: **SECRETA**, **RESERVADA**, **RESTRITA** e **OSTENSIVA**.
- Manutenção da compatibilidade visual com a categoria legada **GERAL**.

## Alterações de Backend e Banco de Dados
- **Migração de Dados**: Ajuste das restrições de `CHECK` na tabela `chaves` via tabela temporária para aceitar as novas categorias, mantendo suporte a `geral`.
- **Lógica de Autorização Dinâmica**:
  - A autorização para chaves **OSTENSIVA** será concedida dinamicamente a qualquer militar cadastrado, sem criar registros na matriz.
  - Ao retornar para categorias restritivas (**SECRETA**, **RESERVADA**, **RESTRITA**), o sistema deve voltar a utilizar automaticamente a matriz individual pré-existente.
  - Nenhuma autorização nominal será excluída durante a alternância de categorias.

## Detalhes Técnicos
- **Banco de Dados**: Script de migração seguro no `backend/database/connection.js`.
- **Serviço de Autorização**: Atualização da função `verificarAutorizacao` em `backend/services/autorizacaoChaves.js` para priorizar a regra da categoria `OSTENSIVA` antes da busca na matriz.
- **Frontend**: Atualização de tipos em `src/lib/api.ts` e do componente `src/pages/GerenciamentoChaves.tsx`.
