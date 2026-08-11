const router = require("express").Router();

const chaves      = require("../controllers/chavesController");
const viaturas    = require("../controllers/viaturasController");
const visitantes  = require("../controllers/visitantesController");
const materiais   = require("../controllers/materiaisController");
const pdv         = require("../controllers/pdvController");
const militares   = require("../controllers/militaresController");
const biometrias  = require("../controllers/biometriasController");
const recorrentes = require("../controllers/visitantesRecorrentesController");
const civis       = require("../controllers/visitantesCivisController");
const externos    = require("../controllers/militaresExternosController");
const relatorios  = require("../controllers/relatoriosController");
const operacao    = require("../controllers/operacaoController");
const auth        = require("../controllers/authController");
const users       = require("../controllers/usersController");
const dashboard   = require("../controllers/dashboardController");
const pessoas     = require("../controllers/pessoasController");
const chaveAut    = require("../controllers/chaveAutorizacoesController");
const backups     = require("../controllers/backupsController");


const { requireUser, requireRole } = require("../middleware/auth");

// ============ AUTH (público) ============
router.post("/auth/login", auth.login);

// A partir daqui, exige JWT válido
router.use(requireUser);

router.get("/auth/me", auth.me);
router.post("/auth/refresh", auth.refresh);
router.post("/auth/logout", auth.logout);

// Perfis definitivos: admin | seg_org (administrativos) | tolda (operacional)
const RW  = ["admin", "seg_org", "tolda"];
const ALL = ["admin", "seg_org", "tolda"];
const ADM = ["admin", "seg_org"];


// Chaves
router.get("/chaves", requireRole(...ALL), chaves.list);
router.get("/chaves/historico", requireRole(...ALL), chaves.historico);
router.post("/chaves/retirada", requireRole(...RW), chaves.retirada);
router.post("/chaves/devolucao", requireRole(...RW), chaves.devolucao);

// Gerenciamento de autorizações das chaves (Administração)
router.get("/chaves-autorizacoes", requireRole(...ADM), chaveAut.matriz);
router.post("/chaves-autorizacoes", requireRole(...ADM), chaveAut.adicionar);
router.delete("/chaves-autorizacoes/:id", requireRole(...ADM), chaveAut.remover);
router.put("/chaves-config/:numero", requireRole(...ADM), chaveAut.atualizarChave);


// Viaturas
router.get("/viaturas", requireRole(...ALL), viaturas.list);
router.get("/viaturas/historico", requireRole(...ALL), viaturas.historico);
router.post("/viaturas/saida", requireRole(...RW), viaturas.saida);
router.post("/viaturas/retorno", requireRole(...RW), viaturas.retorno);

// Visitantes
router.get("/visitantes", requireRole(...ALL), visitantes.list);
router.post("/visitantes", requireRole(...RW), visitantes.create);
router.post("/visitantes/:id/saida", requireRole(...RW), visitantes.saida);
router.post("/visitantes/entrada-manual", requireRole(...RW), visitantes.entradaManual);

// Recorrentes / Civis / Externos
router.get("/visitantes-recorrentes", requireRole(...ALL), recorrentes.list);
router.get("/visitantes-recorrentes/cpf/:cpf", requireRole(...ALL), recorrentes.getByCpf);
router.get("/visitantes-recorrentes/:id", requireRole(...ALL), recorrentes.get);
router.post("/visitantes-recorrentes", requireRole(...RW), recorrentes.create);
router.put("/visitantes-recorrentes/:id", requireRole(...RW), recorrentes.update);
router.put("/visitantes-recorrentes/:id/status", requireRole(...RW), recorrentes.setStatus);

router.get("/visitantes-civis", requireRole(...ALL), civis.list);
router.get("/visitantes-civis/cpf/:cpf", requireRole(...ALL), civis.getByCpf);
router.get("/visitantes-civis/rg/:rg", requireRole(...ALL), civis.getByRg);
router.get("/visitantes-civis/:id", requireRole(...ALL), civis.get);
router.post("/visitantes-civis", requireRole(...RW), civis.create);
router.put("/visitantes-civis/:id", requireRole(...RW), civis.update);

router.get("/militares-externos", requireRole(...ALL), externos.list);
router.get("/militares-externos/cpf/:cpf", requireRole(...ALL), externos.getByCpf);
router.get("/militares-externos/:id", requireRole(...ALL), externos.get);
router.post("/militares-externos", requireRole(...RW), externos.create);
router.put("/militares-externos/:id", requireRole(...RW), externos.update);
router.post("/militares-externos/identificar-biometria", requireRole(...RW), externos.identificarBiometria);

// Materiais
router.get("/materiais", requireRole(...ALL), materiais.list);
router.post("/materiais", requireRole(...RW), materiais.create);

// PDV
router.get("/pdv/:data", requireRole(...ALL), pdv.get);
router.post("/pdv", requireRole(...RW), pdv.upsert);

// Militares
router.get("/militares", requireRole(...ALL), militares.list);
router.get("/militares/:nip", requireRole(...ALL), militares.getByNip);
router.post("/militares", requireRole(...ADM), militares.create);
router.put("/militares/:nip/biometria", requireRole(...ADM), militares.setBiometria);

// Biometrias (legado, ainda exposto para módulo admin)
router.get("/biometrias", requireRole(...ADM), biometrias.list);
router.get("/biometrias/nip/:nip", requireRole(...ADM), biometrias.getByNip);
router.post("/biometrias", requireRole(...ADM), biometrias.create);
router.put("/biometrias/:id/status", requireRole(...ADM), biometrias.setStatus);
router.delete("/biometrias/:id", requireRole(...ADM), biometrias.remove);

// Relatórios
router.post("/relatorios/gerar", requireRole(...ADM), relatorios.gerarHoje);
router.post("/relatorios/gerar/:data", requireRole(...ADM), relatorios.gerarData);

// Backups já produzidos — somente leitura (listar / visualizar / baixar)
router.get("/backups", requireRole(...ADM), backups.list);
router.get("/backups/arquivo", requireRole(...ADM), backups.download);

// Operação unificada — biometria por NIP
router.post("/operacao/autenticar-biometria", requireRole(...RW), operacao.autenticarBiometria);
router.get("/operacao/auditoria", requireRole(...ADM), operacao.listAuditoria);

// Dashboard
router.get("/dashboard/resumo", requireRole(...ALL), dashboard.resumo);

// Usuários (somente admin/informatica)
router.get("/users", requireRole(...ADM), users.list);
router.post("/users", requireRole(...ADM), users.create);
router.put("/users/:id", requireRole(...ADM), users.update);
router.post("/users/:id/reset-password", requireRole(...ADM), users.resetPassword);
router.delete("/users/:id", requireRole(...ADM), users.remove);

// Cadastramento de Pessoas — leitura/criação por operadores; alterações/exclusão por admin
router.get("/pessoas", requireRole(...ALL), pessoas.list);
router.get("/pessoas/:id", requireRole(...ALL), pessoas.get);
router.post("/pessoas", requireRole(...RW), pessoas.create);
router.put("/pessoas/:id", requireRole(...ADM), pessoas.update);
router.delete("/pessoas/:id", requireRole(...ADM), pessoas.remove);

module.exports = router;
