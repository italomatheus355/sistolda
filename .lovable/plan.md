# Etapa Final — Segurança, Autenticação e Controle de Acesso

Escopo grande, dividido em 8 frentes. A biometria centralizada já está pronta e **não será alterada** — apenas reforçada como padrão único.

---

## 1. Autenticação JWT (backend + frontend)

**Backend (`backend/`):**
- Adicionar dependências: `jsonwebtoken`, `bcryptjs`.
- Novo controller `authController.js`:
  - `POST /api/auth/login` — valida usuário/senha (bcrypt), retorna `{ token, user }`.
  - `POST /api/auth/refresh` — renova token enquanto houver atividade.
  - `POST /api/auth/logout` — invalida (lista negra em memória + auditoria).
  - `GET /api/auth/me` — retorna usuário atual.
- Substituir `middleware/auth.js` por validação JWT (`requireUser`, `requireRole`).
- Secret JWT via env (`SISTOLDA_JWT_SECRET`) com fallback seguro.
- Expiração configurável (`SISTOLDA_JWT_TTL`, default 8h).

**Frontend (`src/`):**
- `useAuth` passa a chamar `/api/auth/login` em vez de `localDb`.
- Token guardado em `localStorage` (`sistolda:token`).
- Interceptor em `src/lib/api.ts` injeta `Authorization: Bearer <token>` e trata 401 → logout + toast "Sessão expirada".
- Auto-refresh quando faltarem <15min para expirar e houver atividade (mousemove/click).

---

## 2. Perfis de acesso (RBAC)

Roles consolidadas: `admin`, `operador`, `consulta`, `informatica`.

- Migration SQLite: ampliar `users.role` CHECK e migrar roles existentes (`operacoes`→`operador`, `segorg`→`operador`, `servico`→`consulta`).
- Matriz de permissões em `backend/middleware/permissions.js` mapeando rota → roles permitidos.
- Aplicar `requireRole(...)` em cada rota de `backend/routes/index.js`.
- Frontend: helper `can(action)` em `useAuth`; `AppSidebar` e botões de ação (criar/editar/excluir) ocultados conforme perfil.

---

## 3. Auditoria avançada

Migration ampliando `logs_auditoria`:
```sql
ALTER TABLE logs_auditoria ADD COLUMN usuario TEXT;
ALTER TABLE logs_auditoria ADD COLUMN perfil TEXT;
ALTER TABLE logs_auditoria ADD COLUMN ip TEXT;
ALTER TABLE logs_auditoria ADD COLUMN estacao TEXT;
ALTER TABLE logs_auditoria ADD COLUMN user_agent TEXT;
```

- Helper `logAuditoria` recebe `req` e extrai IP (`req.ip`), `x-estacao` header, `user-agent`, `req.user`.
- Middleware global registra auditoria em rotas críticas (POST/PUT/DELETE).
- Atualizar `operacaoController` para enriquecer logs com usuário operador.
- Nova página `src/pages/Auditoria.tsx` (admin/informatica) com filtros por data/módulo/usuário/NIP.

---

## 4. Integração biométrica unificada

Garantir que **Visitantes, Materiais e Viaturas** usem `BiometricCapture` + `/api/operacao/autenticar-biometria`:
- Estender `operacaoController.autenticarBiometria` para `modulo: "materiais"` (entrega/recebimento, suporta múltiplos itens em uma leitura) e `modulo: "viaturas"` (saída/retorno).
- Refatorar `src/pages/MaterialPage.tsx` e `src/pages/Viaturas.tsx` para usar `BiometricCapture` + `AuthConfirm` (mesmo padrão do `Chaves.tsx`).
- Remover quaisquer fluxos paralelos que ainda pedem NIP manual.

---

## 5. Estabilidade do SQLite

Em `backend/database/connection.js`, após abrir conexão:
```js
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");
```
- Job no `scheduler.js` rodando `PRAGMA integrity_check` diariamente (03:00) e gravando resultado em `logs_auditoria`.

---

## 6. Dashboard operacional

Refatorar `src/pages/Dashboard.tsx` com:
- Cards: visitantes do dia/mês, chaves retiradas/pendentes, materiais emprestados, viaturas em uso.
- Listas: últimas 10 operações e últimos 10 acessos biométricos.
- Novo endpoint `GET /api/dashboard/resumo` agregando os contadores em SQLite.
- Refetch automático a cada 30s via React Query.

---

## 7. Gerenciamento de usuários

Refatorar `src/pages/Usuarios.tsx` (admin only):
- CRUD via novas rotas `GET/POST/PUT/DELETE /api/users` (substituem `localDb`).
- Ações: criar, editar, redefinir senha, bloquear/desbloquear, alterar perfil.
- Coluna `bloqueado INTEGER DEFAULT 0` em `users`; login rejeita bloqueados.
- Senhas sempre armazenadas com `bcrypt.hash` (rounds=10). Migration faz hash das senhas existentes em texto puro no primeiro start.

---

## 8. Backups e relatórios

Sem mudanças funcionais — infra existente preservada. Apenas confirmar estrutura final:
```
backup_sistolda/
  DB/
  LOGS/
  RELATORIOS/
    DIARIO/
    MENSAL/
```
- Ajustar `scheduler.js` para também gerar relatório mensal (último dia do mês 23:50) em `RELATORIOS/MENSAL/`.
- Job diário de backup do `.db` (cópia segura via `db.backup()`) para `backup_sistolda/DB/YYYY-MM-DD.db`.
- Job diário copiando `logs_auditoria` para `backup_sistolda/LOGS/YYYY-MM-DD.json`.

---

## Detalhes técnicos

**Novas dependências backend:** `jsonwebtoken`, `bcryptjs`.

**Variáveis de ambiente novas (opcionais, com defaults):**
- `SISTOLDA_JWT_SECRET`
- `SISTOLDA_JWT_TTL` (ex: `8h`)
- `SISTOLDA_BACKUP_DIR` (default: rede já configurada)

**Migrations seguras** (idempotentes, via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` simulado por try/catch — SQLite não suporta nativamente).

**Compatibilidade:**
- Frontend continua React 18 + Vite + Tailwind.
- Backend continua Node + Express + better-sqlite3.
- Nenhuma dependência pesada adicionada; tudo síncrono e leve.
- Biometria preservada integralmente.

**Ordem de implementação:**
1. Migrations + pragmas SQLite + bcrypt nas senhas existentes.
2. JWT backend + middleware + rotas auth.
3. Frontend useAuth + interceptor + tratamento 401.
4. RBAC backend + ocultação frontend.
5. Auditoria expandida.
6. Unificação biométrica em Materiais/Viaturas.
7. Dashboard + endpoint resumo.
8. Tela de Usuários CRUD.
9. Backups DB/LOGS + relatório mensal.

Após aprovação, implemento todas as frentes em sequência.
