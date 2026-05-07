# SISTOLDA — Backend Local

Backend 100% local, offline, para uso em rede interna militar/corporativa.

## Stack
- Node.js + Express
- SQLite (via `better-sqlite3`)
- Sem cloud, sem Supabase, sem Firebase, sem APIs externas

## Como rodar (Cursor / VSCode)

```bash
cd backend
npm install
npm run dev      # com auto-reload
# ou
npm start
```

Servidor sobe em: `http://localhost:3001`

O banco SQLite é criado automaticamente em: `backend/database/sistolda.db`

## Estrutura

```
backend/
├── server.js              # Entrypoint Express
├── database/
│   ├── connection.js      # Conexão e inicialização do SQLite
│   ├── schema.sql         # DDL de todas as tabelas
│   └── sistolda.db        # Arquivo SQLite (gerado automaticamente)
├── models/                # Acesso a dados (uma classe por tabela)
├── controllers/           # Regras de negócio
└── routes/                # Definição de rotas Express
```

## Rotas iniciais

### Chaves
- `GET  /api/chaves`
- `POST /api/retirada-chave`           `{ chave_id, militar_id, recebido_por }`
- `POST /api/devolucao-chave`          `{ chave_id, militar_id, recebido_por }`
- `GET  /api/historico-chaves`

### Viaturas
- `GET  /api/viaturas`
- `POST /api/saida-viatura`            `{ viatura_id, militar_id, destino, km_saida }`
- `POST /api/retorno-viatura`          `{ historico_id, km_retorno }`
- `GET  /api/historico-viaturas`

### Visitantes
- `POST /api/visitante`
- `GET  /api/visitantes`

### Materiais
- `POST /api/material`
- `GET  /api/materiais`

### PDV (Plano Diário de Voo)
- `POST /api/pdv`
- `GET  /api/pdv`

### Militares
- `GET  /api/militares`
- `POST /api/militares`

## Biometria (preparação)

A tabela `militares` possui o campo `biometria_id` (TEXT, único, nullable). Quando o leitor biométrico estiver integrado, basta gravar o identificador retornado pelo dispositivo nesse campo e usar o endpoint:

- `GET /api/militares/biometria/:biometria_id`

para resolver automaticamente o militar a partir do leitor.

## Integração com o frontend

O frontend atual (React + Vite) **não foi alterado**. Quando quiser conectá-lo, basta substituir as chamadas a `localDb` por `fetch("http://localhost:3001/api/...")`.
