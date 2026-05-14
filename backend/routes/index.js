const router = require("express").Router();

const chaves     = require("../controllers/chavesController");
const viaturas   = require("../controllers/viaturasController");
const visitantes = require("../controllers/visitantesController");
const materiais  = require("../controllers/materiaisController");
const pdv        = require("../controllers/pdvController");
const militares  = require("../controllers/militaresController");
const biometrias = require("../controllers/biometriasController");
const recorrentes = require("../controllers/visitantesRecorrentesController");
const civis      = require("../controllers/visitantesCivisController");
const externos   = require("../controllers/militaresExternosController");

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

// Visitantes Recorrentes (militares de outras forças com biometria)
router.get("/visitantes-recorrentes", recorrentes.list);
router.get("/visitantes-recorrentes/cpf/:cpf", recorrentes.getByCpf);
router.get("/visitantes-recorrentes/:id", recorrentes.get);
router.post("/visitantes-recorrentes", recorrentes.create);
router.put("/visitantes-recorrentes/:id", recorrentes.update);
router.put("/visitantes-recorrentes/:id/status", recorrentes.setStatus);

// Visitantes Civis (cadastro permanente)
router.get("/visitantes-civis", civis.list);
router.get("/visitantes-civis/cpf/:cpf", civis.getByCpf);
router.get("/visitantes-civis/rg/:rg", civis.getByRg);
router.get("/visitantes-civis/:id", civis.get);
router.post("/visitantes-civis", civis.create);
router.put("/visitantes-civis/:id", civis.update);

// Militares Externos (cadastro permanente + biometria)
router.get("/militares-externos", externos.list);
router.get("/militares-externos/cpf/:cpf", externos.getByCpf);
router.get("/militares-externos/:id", externos.get);
router.post("/militares-externos", externos.create);
router.put("/militares-externos/:id", externos.update);
router.post("/militares-externos/identificar-biometria", externos.identificarBiometria);

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

// Biometrias
router.get("/biometrias", biometrias.list);
router.get("/biometrias/nip/:nip", biometrias.getByNip);
router.post("/biometrias", biometrias.create);
router.put("/biometrias/:id/status", biometrias.setStatus);
router.delete("/biometrias/:id", biometrias.remove);

module.exports = router;
