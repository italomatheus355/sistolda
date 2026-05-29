// SISTOLDA — Endpoint unificado de autenticação por NIP (Keyboard Wedge).
// O leitor biométrico envia o NIP autenticado + ENTER. O SISTOLDA apenas
// localiza o militar, executa a regra de negócio e registra auditoria.

const { db } = require("../database/connection");
const Militares = require("../models/militaresModel");
const Chaves = require("../models/chavesModel");
const Visitantes = require("../models/visitantesModel");

function onlyDigits(v) { return String(v || "").replace(/\D/g, ""); }

function logAuditoria({ modulo, acao, nip, nome, descricao }) {
  try {
    db.prepare(`
      INSERT INTO logs_auditoria (modulo, acao, nip, nome, descricao)
      VALUES (?,?,?,?,?)
    `).run(modulo, acao, nip || null, nome || null, descricao || null);
  } catch (e) {
    console.error("[auditoria] falha ao registrar:", e.message);
  }
}

exports.autenticarBiometria = (req, res, next) => {
  try {
    const { nip: nipRaw, modulo, acao, itens, cabo, payload } = req.body || {};
    const nip = onlyDigits(nipRaw);
    if (!nip) return res.status(400).json({ error: "NIP não informado." });

    const militar = Militares.getByNip(nip);
    if (!militar) {
      logAuditoria({ modulo, acao, nip, nome: null, descricao: "Tentativa com NIP não cadastrado." });
      return res.status(404).json({ error: "Militar não cadastrado." });
    }

    const posto = (militar.posto_graduacao || "").trim();
    const nomeFmt = posto ? `${posto} ${militar.nome}` : militar.nome;
    const caboOp = (cabo || "").trim() || null;

    let descricao = "";

    if (modulo === "chaves") {
      const ids = Array.isArray(itens) ? itens.map(Number).filter(Boolean) : [];
      if (ids.length === 0) return res.status(400).json({ error: "Nenhuma chave selecionada." });

      if (acao === "retirada") {
        const retiradas = [];
        for (const chave_id of ids) {
          const chave = Chaves.getById(chave_id);
          if (!chave) return res.status(404).json({ error: `Chave ${chave_id} não encontrada.` });
          if (chave.status === "emprestada") {
            return res.status(400).json({ error: `Chave Nº ${chave.numero} já está emprestada.` });
          }
          Chaves.retirar({ chave, militar: nomeFmt, nip, cabo: caboOp });
          retiradas.push(chave);
        }
        const nums = retiradas.map((c) => String(c.numero).padStart(2, "0")).join(", ");
        descricao = `${nomeFmt} (NIP ${nip}) retirou ${retiradas.length === 1 ? "a chave" : "as chaves"} ${nums}.`;
        logAuditoria({ modulo, acao, nip, nome: nomeFmt, descricao });
        return res.json({
          success: true, nip, nome: nomeFmt,
          descricao, chaves: retiradas.map((c) => ({ id: c.id, numero: c.numero, nome: c.nome })),
        });
      }

      if (acao === "devolucao") {
        const devolvidas = [];
        for (const chave_id of ids) {
          const chave = Chaves.getById(chave_id);
          if (!chave) return res.status(404).json({ error: `Chave ${chave_id} não encontrada.` });
          Chaves.devolver({ chave_id, cabo: caboOp });
          devolvidas.push(chave);
        }
        const nums = devolvidas.map((c) => String(c.numero).padStart(2, "0")).join(", ");
        descricao = `${nomeFmt} (NIP ${nip}) devolveu ${devolvidas.length === 1 ? "a chave" : "as chaves"} ${nums}.`;
        logAuditoria({ modulo, acao, nip, nome: nomeFmt, descricao });
        return res.json({
          success: true, nip, nome: nomeFmt,
          descricao, chaves: devolvidas.map((c) => ({ id: c.id, numero: c.numero, nome: c.nome })),
        });
      }

      return res.status(400).json({ error: `Ação inválida para chaves: ${acao}` });
    }

    if (modulo === "visitantes") {
      if (acao === "entrada") {
        const p = payload || {};
        const id = Visitantes.create({
          nome: nomeFmt,
          documento: nip,
          militar_responsavel: p.militar_responsavel || "—",
          local_destino: p.local_destino || "—",
          observacoes: p.observacoes || null,
          cabo_registro: caboOp,
          telefone: p.telefone || null,
          posto_graduacao: posto || null,
          forca_militar: p.forca_militar || null,
          tipo: "militar_externo",
          origem_identificacao: "biometria",
        });
        descricao = `${nomeFmt} (NIP ${nip}) registrou entrada no módulo de visitantes.`;
        logAuditoria({ modulo, acao, nip, nome: nomeFmt, descricao });
        return res.json({ success: true, nip, nome: nomeFmt, id, descricao });
      }
      if (acao === "saida") {
        const visitanteId = Number((itens || [])[0]);
        if (!visitanteId) return res.status(400).json({ error: "Visitante não informado." });
        Visitantes.registrarSaida(visitanteId);
        descricao = `${nomeFmt} (NIP ${nip}) registrou saída no módulo de visitantes.`;
        logAuditoria({ modulo, acao, nip, nome: nomeFmt, descricao });
        return res.json({ success: true, nip, nome: nomeFmt, descricao });
      }
      return res.status(400).json({ error: `Ação inválida para visitantes: ${acao}` });
    }

    // Módulos genéricos (materiais, viaturas, administracao): apenas identifica + audita.
    descricao = `${nomeFmt} (NIP ${nip}) autenticou no módulo ${modulo || "—"} (${acao || "—"}).`;
    logAuditoria({ modulo: modulo || "geral", acao: acao || "autenticar", nip, nome: nomeFmt, descricao });
    return res.json({ success: true, nip, nome: nomeFmt, descricao });
  } catch (e) { next(e); }
};

exports.listAuditoria = (_req, res) => {
  const rows = db.prepare("SELECT * FROM logs_auditoria ORDER BY id DESC LIMIT 500").all();
  res.json(rows);
};
