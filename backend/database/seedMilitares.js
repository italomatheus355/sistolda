// Lista oficial de militares do SISTOLDA.
// NIPs armazenados apenas com dígitos (sem pontos).
// Usado para reconhecimento automático em retiradas/devoluções.

const MILITARES = [
  ["CF",     "99192632", "RAFAEL PEIXOTO"],
  ["CC",     "02156920", "RODRIGO MARTINS"],
  ["CC",     "05025613", "BRAGAGNOLO"],
  ["CC",     "06023754", "PANDINI"],
  ["CC",     "06023886", "TORRESINI"],
  ["CC",     "07345500", "SHERMAN"],
  ["CC",     "14088614", "FLORÊNCIO"],
  ["CT",     "15091597", "HOFFMANN COELHO"],
  ["1ºTen",  "14027020", "PASSERI"],
  ["1ºTen",  "15012026", "MALDONADO"],
  ["1ºTen",  "15011097", "PEDRO ASSIS"],
  ["2ºTen",  "16010175", "JOSÉ MARCOS"],
  ["2ºTen",  "07138873", "REINALDO"],
  ["SO",     "95112081", "ANTONIO"],
  ["SO",     "96027797", "PEREIRA"],
  ["SO",     "97019488", "MELO"],
  ["SO",     "97114901", "FERREIRA"],
  ["SO",     "96116471", "DA CUNHA"],
  ["SO",     "97113824", "IGOR"],
  ["SO",     "98034359", "AGUIAR"],
  ["SO",     "98035274", "MAFRA"],
  ["SO",     "98029568", "FARNEY"],
  ["SO",     "98029070", "JOSIAS"],
  ["SO",     "98036980", "JONATHAS"],
  ["SO",     "98029355", "RAIOL"],
  ["SO",     "98029533", "BITENCOURT"],
  ["SO",     "98039164", "ARLIX"],
  ["SO",     "98122321", "MARCIO"],
  ["SO",     "98121341", "ALEX SOETH"],
  ["SO",     "99211785", "ALESSANDRO"],
  ["SO",     "99211769", "ALDENEY"],
  ["SO",     "99212803", "ROBISOM"],
  ["SO",     "99211653", "GAIA"],
  ["SO",     "06786766", "DIÊGO"],
  ["SO",     "00038644", "ÁDISON"],
  ["MN",     "19048211", "ITALO"],
  ["MN",     "23045841", "NASCIMENTO"],
  ["MN",     "03082008", "MONTEIRO"],
  ["MN",     "23038748", "HYANDRE"],
  ["MN",     "23042745", "LOPES"],
  ["MN",     "24239020", "ANDRÉ"],
];

function seedMilitares(db) {
  const insert = db.prepare(`
    INSERT INTO militares (nip, nome, posto_graduacao, ativo)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(nip) DO UPDATE SET
      nome = excluded.nome,
      posto_graduacao = excluded.posto_graduacao,
      ativo = 1
  `);
  const tx = db.transaction(() => {
    for (const [posto, nip, nome] of MILITARES) {
      insert.run(nip.replace(/\D/g, ""), nome, posto);
    }
  });
  tx();
  console.log(`[SISTOLDA] Militares sincronizados: ${MILITARES.length}`);
}

module.exports = { MILITARES, seedMilitares };

// Permite executar standalone: `node backend/database/seedMilitares.js`
if (require.main === module) {
  const { db } = require("./connection");
  seedMilitares(db);
}
