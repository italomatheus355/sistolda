const router = require("express").Router();

const militares  = require("../controllers/militaresController");
const chaves     = require("../controllers/chavesController");
const viaturas   = require("../controllers/viaturasController");
const visitantes = require("../controllers/visitantesController");
const materiais  = require("../controllers/materiaisController");
const pdv        = require("../controllers/pdvController");

// Militares
router.get ("/militares", militares.list);
router.post("/militares", militares.create);
router.get ("/militares/biometria/:biometria_id", militares.getByBiometria);

// Chaves
router.get ("/chaves",            chaves.list);
router.post("/retirada-chave",    chaves.retirada);
router.post("/devolucao-chave",   chaves.devolucao);
router.get ("/historico-chaves",  chaves.historico);

// Viaturas
router.get ("/viaturas",            viaturas.list);
router.post("/saida-viatura",       viaturas.saida);
router.post("/retorno-viatura",     viaturas.retorno);
router.get ("/historico-viaturas",  viaturas.historico);

// Visitantes
router.get ("/visitantes",       visitantes.list);
router.post("/visitante",        visitantes.create);
router.post("/visitante/:id/saida", visitantes.saida);

// Materiais
router.get ("/materiais", materiais.list);
router.post("/material",  materiais.create);

// PDV
router.get ("/pdv", pdv.list);
router.post("/pdv", pdv.upsert);

module.exports = router;
