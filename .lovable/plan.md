## Reestruturação do módulo Visitantes — Cadastro único + Identificação automática

### Objetivo
Separar **cadastro permanente** de **registro de acesso**, permitindo identificação rápida por CPF/RG (civis) ou biometria/CPF (militares de outras forças), mantendo todo o sistema atual funcionando.

---

### 1. Banco de dados (SQLite — `backend/database/`)

Criar duas tabelas novas e adaptar a tabela de acessos:

**`visitantes_civis`** (cadastro permanente)
- id, nome, cpf (UNIQUE), rg, telefone, empresa, observacoes, created_at

**`militares_externos`** (cadastro permanente)
- id, nome, cpf (UNIQUE), posto_graduacao, forca_militar, telefone, biometria_template, biometria_leituras, created_at

**`visitantes` (tabela existente — registro de acesso)**
Já possui as colunas necessárias via migration anterior. Adicionar:
- `civil_id` INTEGER (referência opcional a `visitantes_civis`)
- `militar_externo_id` INTEGER (referência opcional a `militares_externos`)
- `forca_militar` TEXT
- `posto_graduacao` TEXT
- `origem_identificacao` TEXT (`manual` | `cpf` | `rg` | `biometria`)

A tabela `visitantes_recorrentes` criada anteriormente fica como **deprecated/legada** — não removida (compatibilidade), mas substituída pela nova estrutura mais clara.

Migrations seguras com `ALTER TABLE … ADD COLUMN` e `CREATE TABLE IF NOT EXISTS`. Nenhum dado existente é perdido.

---

### 2. Backend (Node.js + Express)

Novos models + controllers + rotas:

- `visitantesCivisModel.js` / controller — CRUD + `getByCpf`, `getByRg`
- `militaresExternosModel.js` / controller — CRUD + `getByCpf`, `identifyByBiometria`
- Atualizar `visitantesModel.create` para aceitar `civil_id` / `militar_externo_id` / `origem_identificacao`

Novas rotas REST:
```
GET    /api/visitantes-civis
GET    /api/visitantes-civis/cpf/:cpf
GET    /api/visitantes-civis/rg/:rg
POST   /api/visitantes-civis

GET    /api/militares-externos
GET    /api/militares-externos/cpf/:cpf
POST   /api/militares-externos
POST   /api/militares-externos/identificar-biometria
```

---

### 3. Frontend — `src/pages/Visitantes.tsx`

Mantém uma única aba "Visitantes" (sem dividir em sub-abas). Reorganiza ações no topo:

1. **Registrar entrada** (modal com 3 modos):
   - **Civil** → digita CPF ou RG → sistema busca cadastro → preenche automaticamente → confirma destino/militar responsável → registra acesso. Se CPF não existir, oferece "Cadastrar novo civil" inline.
   - **Militar externo** → digita CPF → idem. Se não existir, abre cadastro inline.
   - **Visitante avulso** (modo legado) → fluxo manual atual preservado.

2. **Acesso por Biometria** (botão destacado):
   - Abre modal "leitor biométrico" → simula leitura → identifica militar externo → registra acesso automaticamente → exibe **modal grande de confirmação**:
     ```
     ✓ ACESSO CONFIRMADO
     [Posto] [Nome]
     [Força Militar]
     [Horário]
     ```

3. **Cadastros** (gestão):
   - Botão "Cadastrar civil" → modal com nome, CPF, RG, telefone, empresa, observações
   - Botão "Cadastrar militar externo" → modal com nome, força, posto, CPF, telefone + captura biométrica (5 leituras)

4. **Histórico** (tabela atual mantida) — adicionar coluna "Origem" mostrando como foi identificado (`CPF`, `Biometria`, `Manual`).

API client (`src/lib/api.ts`) ganha tipos `ApiVisitanteCivil`, `ApiMilitarExterno` e métodos correspondentes.

---

### 4. Compatibilidade

- Tabela `visitantes_recorrentes` permanece (dados anteriores intactos).
- Tabela `visitantes` mantém todas as colunas atuais.
- Fluxo "visitante comum" original continua disponível como "Visitante avulso".
- Nenhum outro módulo (Chaves, Viaturas, Material, Dashboard, Biometria, Escala) é tocado.
- Auth, PM2, layout militar escuro, cores e rotas inalterados.

---

### Arquivos a criar/editar

**Backend (criar):**
- `backend/models/visitantesCivisModel.js`
- `backend/models/militaresExternosModel.js`
- `backend/controllers/visitantesCivisController.js`
- `backend/controllers/militaresExternosController.js`

**Backend (editar):**
- `backend/database/schema.sql` — novas tabelas
- `backend/database/connection.js` — migration ALTER TABLE em `visitantes`
- `backend/models/visitantesModel.js` — aceitar novos campos
- `backend/routes/index.js` — novas rotas

**Frontend (editar):**
- `src/lib/api.ts` — novos tipos e métodos
- `src/pages/Visitantes.tsx` — nova UI com 3 modos + biometria + cadastros
