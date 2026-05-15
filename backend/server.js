// SISTOLDA - Backend local (Node.js + Express + SQLite)
// Funcionamento 100% offline / rede interna.

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const { initDb } = require("./database/connection");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const { startScheduler } = require("./services/scheduler");

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";

// Inicializa banco SQLite e seed
initDb();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "sistolda-backend", time: new Date().toISOString() });
});

app.use("/api", routes);

app.use(errorHandler);

app.listen(PORT, HOST, () => {
  console.log(`[SISTOLDA] Backend local rodando em http://${HOST}:${PORT}`);
  startScheduler();
});
