// SISTOLDA — Endpoint unificado de autenticação por NIP (Keyboard Wedge).
// O leitor biométrico envia o NIP autenticado + ENTER. O SISTOLDA apenas
// localiza o militar, executa a regra de negócio e registra auditoria.

const Militares = require("../models/militaresModel");
const Pessoas = require("../models/pessoasModel");
const Chaves = require("../models/chavesModel");
const Visitantes = require("../models/visitantesModel");
const Materiais = require("../models/materiaisModel");
const Viaturas = require("../models/viaturasModel");
const { logAuditoria, listAuditoria } = require("../services/auditService");

function onlyDigits(v) { return String(v || "").replace(/\D/g, ""); }

function resolverIdentidade(nip) {
  const militar = Militares.getByNip(nip);
  if (militar) {
    const posto = (militar.posto_graduacao || "").trim();
    return { nomeFmt: posto ? `${posto} ${militar.nome}` : militar.nome, origem: "militares" };
  }
  const pessoa = Pessoas.getByIdentificador(nip);
  if (pessoa) {
    const prefixo = pessoa.tipo === "marinha" ? "MB"
      : pessoa.tipo === "exercito" ? "EB"
      : "Sr(a).";
    return { nomeFmt: `${prefixo} ${pessoa.nome}`, origem: `pessoas:${pessoa.tipo}` };
  }
  return null;
}

exports.autenticarBiometria = (req, res, next) => {
  try {
    const { nip: nipRaw, modulo, acao, itens, cabo, payload } = req.body || {};
    const nip = onlyDigits(nipRaw);
    if (!nip) return res.status(400).json({ error: "NIP não informado." });

    const ident = resolverIdentidade(nip);
    if (!ident) {
      logAuditoria(req, { modulo, acao, nip, descricao: "Tentativa com identificador não cadastrado." });
      return res.status(404).json({ error: "Identificador não cadastrado." });
    }
    const nomeFmt = ident.nomeFmt;
    const caboOp = (cabo || "").trim() || null;
    let descricao = "";

    // ========== CHAVES ==========
    if (modulo === "chaves") {
      const ids = Array.isArray(itens) ? itens.map(Number).filter(Boolean) : [];
      if (ids.length === 0) return res.status(400).json({ error: "Nenhuma chave selecionada." });

      if (acao === "retirada") {
        const r = [];
        for (const chave_id of ids) {
          const chave = Chaves.getById(chave_id);
          if (!chave) return res.status(404).json({ error: `Chave ${chave_id} não encontrada.` });
          if (chave.status === "emprestada") return res.status(400).json({ error: `Chave Nº ${chave.numero} já está emprestada.` });
          Chaves.retirar({ chave, militar: nomeFmt, nip, cabo: caboOp });
          r.push(chave);
        }
        const nums = r.map((c) => String(c.numero).padStart(2, "0")).join(", ");
        descricao = `${nomeFmt} (NIP ${nip}) retirou ${r.length === 1 ? "a chave" : "as chaves"} ${nums}.`;
        logAuditoria(req, { modulo, acao, nip, nome: nomeFmt, descricao });
        return res.json({ success: true, nip, nome: nomeFmt, descricao, chaves: r.map((c) => ({ id: c.id, numero: c.numero, nome: c.nome })) });
      }

      if (acao === "devolucao") {
        const r = [];
        for (const chave_id of ids) {
          const chave = Chaves.getById(chave_id);
          if (!chave) return res.status(404).json({ error: `Chave ${chave_id} não encontrada.` });
          Chaves.devolver({ chave_id, cabo: caboOp });
          r.push(chave);
        }
        const nums = r.map((c) => String(c.numero).padStart(2, "0")).join(", ");
        descricao = `${nomeFmt} (NIP ${nip}) devolveu ${r.length === 1 ? "a chave" : "as chaves"} ${nums}.`;
        logAuditoria(req, { modulo, acao, nip, nome: nomeFmt, descricao });
        return res.json({ success: true, nip, nome: nomeFmt, descricao, chaves: r.map((c) => ({ id: c.id, numero: c.numero, nome: c.nome })) });
      }
      return res.status(400).json({ error: `Ação inválida para chaves: ${acao}` });
    }

    // ========== VISITANTES ==========
    if (modulo === "visitantes") {
      if (acao === "entrada") {
        const p = payload || {};
        const id = Visitantes.create({
          nome: nomeFmt, documento: nip,
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
        logAuditoria(req, { modulo, acao, nip, nome: nomeFmt, descricao });
        return res.json({ success: true, nip, nome: nomeFmt, id, descricao });
      }
      if (acao === "saida") {
        const visitanteId = Number((itens || [])[0]);
        if (!visitanteId) return res.status(400).json({ error: "Visitante não informado." });
        Visitantes.registrarSaida(visitanteId);
        descricao = `${nomeFmt} (NIP ${nip}) registrou saída no módulo de visitantes.`;
        logAuditoria(req, { modulo, acao, nip, nome: nomeFmt, descricao });
        return res.json({ success: true, nip, nome: nomeFmt, descricao });
      }
      return res.status(400).json({ error: `Ação inválida para visitantes: ${acao}` });
    }

    // ========== MATERIAIS (suporta múltiplos em uma leitura) ==========
    if (modulo === "materiais") {
      const lista = Array.isArray(payload?.materiais) && payload.materiais.length
        ? payload.materiais
        : (payload?.nome_material ? [payload] : []);
      if (!lista.length) return res.status(400).json({ error: "Nenhum material informado." });
      const ids = [];
      for (const m of lista) {
        const id = Materiais.create({
          nome_material: m.nome_material || m.nome || "—",
          militar: nomeFmt, nip,
          destino: m.destino || payload?.destino || "—",
          cabo_registro: caboOp,
        });
        ids.push(id);
      }
      const nomes = lista.map((m) => m.nome_material || m.nome).join(", ");
      descricao = `${nomeFmt} (NIP ${nip}) registrou ${ids.length} material(is): ${nomes}.`;
      logAuditoria(req, { modulo, acao: acao || "registro", nip, nome: nomeFmt, descricao });
      return res.json({ success: true, nip, nome: nomeFmt, descricao, ids });
    }

    // ========== VIATURAS ==========
    if (modulo === "viaturas") {
      const p = payload || {};
      if (acao === "saida") {
        const viatura_id = Number((itens || [])[0] || p.viatura_id);
        const viatura = Viaturas.getById(viatura_id);
        if (!viatura) return res.status(404).json({ error: "Viatura não encontrada." });
        if (viatura.status !== "disponivel") return res.status(400).json({ error: "Viatura indisponível." });
        const id = Viaturas.saida({ viatura, motorista: nomeFmt, nip, destino: p.destino || "—", cabo: caboOp });
        descricao = `${nomeFmt} (NIP ${nip}) saiu com a viatura ${viatura.prefixo} para ${p.destino || "—"}.`;
        logAuditoria(req, { modulo, acao, nip, nome: nomeFmt, descricao });
        return res.json({ success: true, nip, nome: nomeFmt, descricao, id });
      }
      if (acao === "retorno") {
        const viatura_id = Number((itens || [])[0] || p.viatura_id);
        Viaturas.retorno({ viatura_id, km_retorno: Number(p.km_retorno || 0), autonomia: p.autonomia || null, cabo: caboOp });
        const viatura = Viaturas.getById(viatura_id);
        descricao = `${nomeFmt} (NIP ${nip}) retornou a viatura ${viatura?.prefixo || viatura_id} (KM ${p.km_retorno || "—"}).`;
        logAuditoria(req, { modulo, acao, nip, nome: nomeFmt, descricao });
        return res.json({ success: true, nip, nome: nomeFmt, descricao });
      }
      return res.status(400).json({ error: `Ação inválida para viaturas: ${acao}` });
    }

    // Genérico
    descricao = `${nomeFmt} (NIP ${nip}) autenticou no módulo ${modulo || "—"} (${acao || "—"}).`;
    logAuditoria(req, { modulo: modulo || "geral", acao: acao || "autenticar", nip, nome: nomeFmt, descricao });
    return res.json({ success: true, nip, nome: nomeFmt, descricao });
  } catch (e) { next(e); }
};

exports.listAuditoria = (req, res) => {
  const { modulo, usuario, nip, dataIni, dataFim, limit } = req.query;
  res.json(listAuditoria({ modulo, usuario, nip, dataIni, dataFim, limit }));
};
