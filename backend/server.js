// SISTOLDA — Servidor backend local (offline / rede interna)
// Node.js + Express + SQLite (better-sqlite3)

const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");

require("./database/connection"); // inicializa o SQLite e aplica o schema
const routes = require("./routes");

const app  = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0"; // permite acesso pela rede interna

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "SISTOLDA backend", time: new Date().toISOString() })
);

app.use("/api", routes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Erro interno" });
});

app.listen(PORT, HOST, () => {
  console.log(`\n🟢 SISTOLDA backend rodando em http://${HOST}:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
