const Chaves = require("../models/chavesModel");
const Militares = require("../models/militaresModel");
const Pessoas = require("../models/pessoasModel");
const { verificarAutorizacao } = require("../services/autorizacaoChaves");

exports.list = (_req, res) => res.json(Chaves.list());
exports.historico = (_req, res) => res.json(Chaves.historico());

exports.retirada = (req, res, next) => {
  try {
    const { chave_id, militar, nip, cabo } = req.body;
    const chave = Chaves.getById(chave_id);
    if (!chave) return res.status(404).json({ error: "Chave não encontrada" });
    if (chave.status === "emprestada") return res.status(400).json({ error: "Chave já está emprestada" });

    // Controle de autorização — também no fluxo manual/legado.
    const pessoa = (nip && (Pessoas.getByIdentificador(String(nip).replace(/\D/g, "")) || Militares.getByNip(String(nip).replace(/\D/g, "")))) || null;
    const check = verificarAutorizacao(
      chave,
      {
        nip: nip || null,
        nome: pessoa ? pessoa.nome : militar,
        posto: pessoa ? pessoa.posto_graduacao || null : null,
        tipo: pessoa?.tipo || "marinha",
      },
      { caboServico: cabo || null },
    );
    if (!check.autorizado) {
      return res.status(403).json({
        error: "MILITAR NÃO AUTORIZADO",
        code: "NAO_AUTORIZADO",
        chave: { id: chave.id, numero: chave.numero, nome: chave.nome },
        descricao: `${militar || "Militar"} não possui autorização para retirar a chave Nº ${String(chave.numero).padStart(2, "0")} — ${chave.nome}.`,
      });
    }

    const id = Chaves.retirar({ chave, militar, nip, cabo });
    res.status(201).json({ id, ok: true });
  } catch (e) { next(e); }
};

exports.devolucao = (req, res, next) => {
  try {
    const { chave_id, cabo } = req.body;
    const id = Chaves.devolver({ chave_id, cabo });
    res.json({ id, ok: true });
  } catch (e) { next(e); }
};
