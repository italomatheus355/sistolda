# SISTOLDA - Backend Local

Backend 100% local, sem dependências de cloud.

## Stack
- Node.js
- Express
- SQLite (better-sqlite3)

## Como rodar
```bash
cd backend
npm install
npm run dev
```

Servidor sobe em `http://0.0.0.0:3001` (acessível na rede interna).

## Estrutura
```
backend/
├── server.js
├── package.json
├── database/
│   ├── connection.js
│   └── schema.sql
├── routes/
│   └── index.js
├── controllers/
├── models/
└── middleware/
    └── errorHandler.js
```

## Endpoints principais
- `GET  /api/health`
- `GET  /api/chaves`
- `POST /api/chaves/retirada`
- `POST /api/chaves/devolucao`
- `GET  /api/chaves/historico`
- `GET  /api/viaturas`
- `POST /api/viaturas/saida`
- `POST /api/viaturas/retorno`
- `GET  /api/visitantes` / `POST /api/visitantes`
- `GET  /api/materiais`  / `POST /api/materiais`
- `GET  /api/pdv/:data`  / `POST /api/pdv`
- `GET  /api/militares`  / `POST /api/militares`
