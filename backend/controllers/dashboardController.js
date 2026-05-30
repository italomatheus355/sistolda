const { db } = require("../database/connection");

exports.resumo = (_req, res) => {
  const hoje = new Date().toISOString().slice(0, 10);
  const mes  = hoje.slice(0, 7);
  const q = (sql, ...p) => db.prepare(sql).get(...p)?.c ?? 0;

  const data = {
    visitantes_hoje:  q(`SELECT COUNT(*) AS c FROM visitantes WHERE substr(hora_entrada,1,10) = ?`, hoje),
    visitantes_mes:   q(`SELECT COUNT(*) AS c FROM visitantes WHERE substr(hora_entrada,1,7) = ?`, mes),
    visitantes_ativos:q(`SELECT COUNT(*) AS c FROM visitantes WHERE hora_saida IS NULL`),
    chaves_retiradas: q(`SELECT COUNT(*) AS c FROM chaves WHERE status = 'emprestada'`),
    chaves_pendentes_dia: q(`SELECT COUNT(*) AS c FROM retiradas_chaves WHERE status='em_uso' AND substr(data_retirada,1,10) = ?`, hoje),
    materiais_dia:    q(`SELECT COUNT(*) AS c FROM materiais WHERE substr(data_registro,1,10) = ?`, hoje),
    viaturas_em_uso:  q(`SELECT COUNT(*) AS c FROM viaturas WHERE status = 'em_uso'`),
    ultimas_operacoes: db.prepare(`
      SELECT id, timestamp, modulo, acao, nome, nip, descricao
      FROM logs_auditoria
      WHERE modulo IN ('chaves','visitantes','materiais','viaturas')
      ORDER BY id DESC LIMIT 10
    `).all(),
    ultimos_biometricos: db.prepare(`
      SELECT id, timestamp, modulo, acao, nome, nip, descricao
      FROM logs_auditoria
      WHERE nip IS NOT NULL AND nip <> ''
      ORDER BY id DESC LIMIT 10
    `).all(),
  };
  res.json(data);
};
