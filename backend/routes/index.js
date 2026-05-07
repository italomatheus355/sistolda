const router = require("express").Router();

const chaves     = require("../controllers/chavesController");
const viaturas   = require("../controllers/viaturasController");
const visitantes = require("../controllers/visitantesController");
const materiais  = require("../controllers/materiaisController");
const pdv        = require("../controllers/pdvController");
const militares  = require("../controllers/militaresController");

// Chaves
router.get("/chaves", chaves.list);
router.get("/chaves/historico", chaves.historico);
router.post("/chaves/retirada", chaves.retirada);
router.post("/chaves/devolucao", chaves.devolucao);

// Viaturas
router.get("/viaturas", viaturas.list);
router.get("/viaturas/historico", viaturas.historico);
router.post("/viaturas/saida", viaturas.saida);
router.post("/viaturas/retorno", viaturas.retorno);

// Visitantes
router.get("/visitantes", visitantes.list);
router.post("/visitantes", visitantes.create);
router.post("/visitantes/:id/saida", visitantes.saida);

// Materiais
router.get("/materiais", materiais.list);
router.post("/materiais", materiais.create);

// PDV
router.get("/pdv/:data", pdv.get);
router.post("/pdv", pdv.upsert);

// Militares
router.get("/militares", militares.list);
router.get("/militares/:nip", militares.getByNip);
router.post("/militares", militares.create);
router.put("/militares/:nip/biometria", militares.setBiometria);

module.exports = router;
