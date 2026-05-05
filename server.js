import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const stateFilePath = path.join(dataDir, "financial-state.json");
const backupDir = path.join(dataDir, "backups");
const usersFilePath = path.join(dataDir, "users.json");
const userDataDir = path.join(dataDir, "user-data");
const authSecret = process.env.AUTH_SECRET || "johan-ai-local-dev-secret";

const app = express();
const port = process.env.PORT || 3000;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const defaultFinancialState = {
  balance: 0,
  incomeToday: 0,
  expensesToday: 0,
  userInteractionCount: 0,
  debts: [
    { name: "Carro", amount: 9000 },
    { name: "Credit One", amount: 300 }
  ],
  goal: {
    name: "Casa Colombia",
    saved: 0
  },
  mainGoal: {
    name: "Casa Colombia",
    targetAmount: 0,
    savedAmount: 0,
    targetDate: null,
    priority: "high",
    monthlyNeeded: 0,
    weeklyNeeded: 0,
    dailyNeeded: 0
  },
  incomeSources: [],
  profile: {},
  transactions: [],
  conversationMemory: [],
  decisions: [],
  alerts: [],
  mistakes: [],
  allocations: [],
  allocationOverrides: {},
  pendingStrategyOptions: [],
  recurringPayments: [],
  archivedConversations: [],
  achievements: [],
  universalMemory: [],
  priorities: [
    { name: "Renta", level: 1, type: "essential" },
    { name: "Comida básica", level: 2, type: "essential" },
    { name: "Gasolina / transporte", level: 3, type: "essential" },
    { name: "Deudas", level: 4, type: "debt" },
    { name: "Casa Colombia", level: 5, type: "goal" },
    { name: "Gastos opcionales", level: 6, type: "optional" }
  ],
  coachMessages: [],
  dailyMission: null,
  missionStats: {
    xp: 0,
    streak: 0,
    bestStreak: 0,
    badges: []
  },
  pendingActions: [],
  learningProfile: {
    patterns: [],
    preferencesLearned: [],
    badHabitsDetected: [],
    goodHabitsDetected: [],
    strategyAdjustments: [],
    confidence: 0
  },
  mode: "normal",
  userProfile: {
    incomeType: "variable",
    goal: "Casa Colombia",
    riskTolerance: "high",
    avoidSpendingOn: []
  },
  onboarding: {
    status: "not_started",
    completed: false,
    mode: null,
    step: "start",
    awaitingDetails: false,
    detailFor: null,
    answers: {},
    flow: null,
    currentStep: null,
    collected: {},
    futureSteps: [
      "credit_cards",
      "credit_limits",
      "debt_interest",
      "minimum_payments",
      "payment_dates",
      "checking_savings",
      "transportation",
      "insurance",
      "phone_internet",
      "rent_utilities",
      "groceries_food",
      "gas",
      "financed_products",
      "late_payments"
    ]
  }
};

let activeStateFilePath = stateFilePath;
let activeBackupDir = backupDir;
let financialState = loadFinancialState();

const incomeKeywords = [
  "me entraron",
  "gané",
  "gane",
  "recibí",
  "recibi",
  "cobré",
  "cobre",
  "me pagaron"
];

const expenseKeywords = [
  "pagué",
  "pague",
  "gasté",
  "gaste",
  "compré",
  "compre",
  "pago",
  "pagué gasolina",
  "pague gasolina"
];

const spendingDecisionKeywords = ["quiero comprar", "voy a gastar", "puedo gastar"];
const strategyIntentKeywords = [
  "me encontré",
  "me encontre",
  "dinero extra",
  "tengo 100",
  "qué hacemos",
  "que hacemos",
  "qué debería hacer",
  "que deberia hacer",
  "cómo uso esto",
  "como uso esto"
];

const basicExpenseKeywords = [
  "comida",
  "mercado",
  "supermercado",
  "gasolina",
  "renta",
  "alquiler",
  "luz",
  "agua",
  "salud",
  "medicina",
  "transporte",
  "deuda"
];

const memoryCategories = new Set([
  "finance",
  "goal",
  "preference",
  "rule",
  "personal_context",
  "decision",
  "reminder",
  "relationship",
  "work",
  "app_project",
  "other"
]);

const memoryTriggers = [
  "recuerda que",
  "guarda que",
  "ten en cuenta que",
  "mi meta es",
  "mi meta principal es",
  "quiero",
  "no quiero",
  "prefiero",
  "mi esposa",
  "mi trabajo",
  "debo",
  "tengo que pagar",
  "esto es importante"
];

const userIntentKeywords = {
  ADD_DEBT: ["añadir deuda", "agregar deuda", "nueva deuda", "debo", "tengo una deuda"],
  PAY_DEBT: ["pagar tarjeta", "pagar deuda", "quiero pagar", "abonar", "hacer pago"],
  ADVICE: ["necesito consejo", "necesito un consejo", "qué hago", "que hago", "ayúdame", "ayudame", "que me recomiendas"],
  BANK_SETUP: ["conectar banco", "mi banco", "modo lectura", "cuenta bancaria"]
};

const financialFormKeywords = {
  debt: [
    "tengo una deuda nueva",
    "debo dinero",
    "agregue una deuda",
    "agregué una deuda",
    "tengo una tarjeta nueva",
    "saque un prestamo",
    "saqué un préstamo",
    "debo el carro",
    "debo una moto",
    "nueva deuda",
    "agregar deuda",
    "agregar nueva deuda",
    "quiero agregar deuda",
    "quiero agregar nueva deuda",
    "añadir deuda",
    "nueva tarjeta",
    "nuevo prestamo",
    "nuevo préstamo",
    "registrar deuda",
    "meter deuda"
  ],
  edit_debt: [
    "modificar deuda",
    "editar deuda",
    "cambiar deuda",
    "actualizar deuda",
    "modificar oportun",
    "editar oportun",
    "modificar credit",
    "editar credit",
    "cambiar pago minimo",
    "cambiar pago mínimo",
    "cambiar fecha",
    "cambiar monto",
    "corregir deuda",
    "actualizar oportun",
    "actualizar credit"
  ],
  delete_debt: [
    "eliminar deuda",
    "borrar deuda",
    "quitar deuda",
    "eliminar oportun",
    "borrar credit",
    "eliminar credit one",
    "quitar oportun"
  ],
  income: ["tengo ingreso nuevo", "me pagaron", "gane dinero", "gané dinero", "recibi dinero", "recibí dinero", "cobre", "cobré", "deposito", "depósito", "zelle", "efectivo", "agregar ingreso", "nuevo ingreso", "registrar ingreso"],
  expense: ["gaste", "gasté", "compre", "compré", "pague", "pagué", "recibo", "factura", "gasto nuevo", "agregar gasto", "nuevo gasto", "registrar gasto"]
};

const modeInstructions = {
  normal:
    "Modo normal: sé balanceado, claro y práctico. Ayuda a decidir sin sonar extremo.",
  disciplina:
    "Modo disciplina: sé estricto pero realista. Prioriza consistencia, presupuesto y control diario.",
  extremo:
    "Modo extremo: sé directo y agresivo con deuda y ahorro. Evita gastos innecesarios y prioriza decisiones duras."
};

app.use(cors({
  origin: [
    "https://johan-ai.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    console.error("[request] JSON invalido:", error.message);
    return res.status(400).json({ error: "JSON invalido en el body." });
  }
  return next(error);
});

function getUserStatePath(userId) {
  return path.join(userDataDir, `${userId}.json`);
}

function getUserBackupDir(userId) {
  return path.join(userDataDir, "backups", userId);
}

function withStateFile(filePath, backupPath, callback) {
  const previousStateFilePath = activeStateFilePath;
  const previousBackupDir = activeBackupDir;
  activeStateFilePath = filePath;
  activeBackupDir = backupPath;
  try {
    return callback();
  } finally {
    activeStateFilePath = previousStateFilePath;
    activeBackupDir = previousBackupDir;
  }
}

function loadUserFinancialState(userId) {
  return withStateFile(getUserStatePath(userId), getUserBackupDir(userId), () => loadFinancialState());
}

function saveUserFinancialState(userId) {
  return withStateFile(getUserStatePath(userId), getUserBackupDir(userId), () => saveFinancialState());
}

function loadUsers() {
  try {
    if (!fs.existsSync(usersFilePath)) {
      return [];
    }
    const users = JSON.parse(fs.readFileSync(usersFilePath, "utf8"));
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("[auth] No se pudo leer users.json:", error);
    return [];
  }
}

function saveUsers(users) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmpPath = `${usersFilePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(users, null, 2));
  JSON.parse(fs.readFileSync(tmpPath, "utf8"));
  fs.renameSync(tmpPath, usersFilePath);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createToken(userId) {
  const payload = Buffer.from(
    JSON.stringify({ userId, createdAt: Date.now() }),
    "utf8"
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [payload, signature] = token.split(".");
  const expectedSignature = crypto
    .createHmac("sha256", authSecret)
    .update(payload)
    .digest("base64url");

  if (!signature || signature.length !== expectedSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.userId || null;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const userId = verifyToken(token);

  if (!userId) {
    return res.status(401).json({ error: "No autorizado. Inicia sesion de nuevo." });
  }

  const users = loadUsers();
  const user = users.find((item) => item.id === userId);
  if (!user) {
    return res.status(401).json({ error: "Usuario no encontrado." });
  }

  req.user = { id: user.id, email: user.email };
  activeStateFilePath = getUserStatePath(user.id);
  activeBackupDir = getUserBackupDir(user.id);
  financialState = loadFinancialState();
  return next();
}

function loadFinancialState() {
  try {
    if (!fs.existsSync(activeStateFilePath)) {
      return structuredClone(defaultFinancialState);
    }

    const savedState = JSON.parse(fs.readFileSync(activeStateFilePath, "utf8"));
    console.log(`[memory] Estado financiero cargado desde ${activeStateFilePath}`);
    return normalizeFinancialState(savedState);
  } catch (error) {
    console.error("[memory] No se pudo cargar el estado. Usando default:", error);
    return structuredClone(defaultFinancialState);
  }
}

function normalizeFinancialState(state) {
  const safeState = state && typeof state === "object" ? state : {};
  const safeDebts = Array.isArray(safeState.debts)
    ? safeState.debts.map((debt) => ({
        name: String(debt?.name || "Deuda"),
        amount: roundMoney(Number(debt?.amount || 0)),
        ...(debt?.type ? { type: debt.type } : {}),
        ...(debt?.minimumPayment ? { minimumPayment: roundMoney(Number(debt.minimumPayment || 0)) } : {}),
        ...(debt?.frequency ? { frequency: debt.frequency } : {}),
        ...(debt?.dueDate ? { dueDate: debt.dueDate } : {}),
        ...(debt?.apr ? { apr: Number(debt.apr || 0) } : {}),
        ...(debt?.note ? { note: debt.note } : {}),
        ...(debt?.createdAt ? { createdAt: debt.createdAt } : {}),
        ...(debt?.updatedAt ? { updatedAt: debt.updatedAt } : {})
      }))
    : structuredClone(defaultFinancialState.debts);

  return {
    ...structuredClone(defaultFinancialState),
    ...safeState,
    balance: roundMoney(Number(safeState.balance || 0)),
    incomeToday: roundMoney(Number(safeState.incomeToday || 0)),
    expensesToday: roundMoney(Number(safeState.expensesToday || 0)),
    userInteractionCount: Number(safeState.userInteractionCount || 0),
    debts: safeDebts,
    goal: {
      ...defaultFinancialState.goal,
      ...safeState.goal,
      saved: roundMoney(Number(safeState.goal?.saved || 0))
    },
    mainGoal: normalizeMainGoal(safeState.mainGoal || safeState.goal || defaultFinancialState.mainGoal),
    incomeSources: Array.isArray(safeState.incomeSources) ? safeState.incomeSources : [],
    profile: safeState.profile || {},
    transactions: Array.isArray(safeState.transactions) ? safeState.transactions.slice(0, 100) : [],
    conversationMemory: Array.isArray(safeState.conversationMemory)
      ? safeState.conversationMemory.slice(-10)
      : [],
    decisions: Array.isArray(safeState.decisions) ? safeState.decisions.slice(0, 100) : [],
    alerts: dedupeByKey(Array.isArray(safeState.alerts) ? safeState.alerts : [], (alert) =>
      `${alert.type}:${normalizeMemoryText(alert.message)}`
    ).slice(0, 20),
    mistakes: dedupeByKey(Array.isArray(safeState.mistakes) ? safeState.mistakes : [], (mistake) =>
      mistake.type || normalizeMemoryText(mistake.message)
    ).slice(0, 20),
    allocations: Array.isArray(safeState.allocations) ? safeState.allocations.slice(0, 50) : [],
    allocationOverrides: safeState.allocationOverrides || {},
    pendingStrategyOptions: Array.isArray(safeState.pendingStrategyOptions)
      ? safeState.pendingStrategyOptions
      : [],
    recurringPayments: Array.isArray(safeState.recurringPayments) ? safeState.recurringPayments : [],
    archivedConversations: Array.isArray(safeState.archivedConversations)
      ? safeState.archivedConversations
      : [],
    achievements: Array.isArray(safeState.achievements) ? safeState.achievements : [],
    universalMemory: dedupeByKey(
      Array.isArray(safeState.universalMemory) ? safeState.universalMemory : [],
      (memory) => `${memory.category}:${normalizeMemoryText(memory.content)}`
    ).slice(0, 300),
    priorities: Array.isArray(safeState.priorities) ? safeState.priorities : defaultFinancialState.priorities,
    coachMessages: dedupeByKey(
      Array.isArray(safeState.coachMessages) ? safeState.coachMessages : [],
      (coach) => normalizeMemoryText(coach.message)
    ).slice(0, 20),
    dailyMission: safeState.dailyMission || null,
    missionStats: {
      ...defaultFinancialState.missionStats,
      ...safeState.missionStats,
      xp: Number(safeState.missionStats?.xp || 0),
      streak: Number(safeState.missionStats?.streak || 0),
      bestStreak: Number(safeState.missionStats?.bestStreak || 0),
      badges: Array.isArray(safeState.missionStats?.badges) ? safeState.missionStats.badges : []
    },
    pendingActions: dedupeByKey(
      Array.isArray(safeState.pendingActions) ? safeState.pendingActions : [],
      (action) => `${action.intent}:${action.amount}:${normalizeMemoryText(action.sourceMessage)}`
    ).slice(0, 20),
    learningProfile: {
      ...defaultFinancialState.learningProfile,
      ...safeState.learningProfile,
      patterns: Array.isArray(safeState.learningProfile?.patterns)
        ? safeState.learningProfile.patterns
        : [],
      preferencesLearned: Array.isArray(safeState.learningProfile?.preferencesLearned)
        ? safeState.learningProfile.preferencesLearned
        : [],
      badHabitsDetected: Array.isArray(safeState.learningProfile?.badHabitsDetected)
        ? safeState.learningProfile.badHabitsDetected
        : [],
      goodHabitsDetected: Array.isArray(safeState.learningProfile?.goodHabitsDetected)
        ? safeState.learningProfile.goodHabitsDetected
        : [],
      strategyAdjustments: Array.isArray(safeState.learningProfile?.strategyAdjustments)
        ? safeState.learningProfile.strategyAdjustments
        : [],
      confidence: Number(safeState.learningProfile?.confidence || 0)
    },
    mode: ["normal", "disciplina", "extremo"].includes(safeState.mode) ? safeState.mode : "normal",
    userProfile: {
      ...defaultFinancialState.userProfile,
      ...safeState.userProfile,
      avoidSpendingOn: Array.isArray(safeState.userProfile?.avoidSpendingOn)
        ? safeState.userProfile.avoidSpendingOn
        : []
    },
    onboarding: {
      ...defaultFinancialState.onboarding,
      ...safeState.onboarding,
      completed: Boolean(safeState.onboarding?.completed),
      mode: safeState.onboarding?.mode || safeState.onboarding?.flow || null,
      step: safeState.onboarding?.step || safeState.onboarding?.currentStep || "start",
      awaitingDetails: Boolean(safeState.onboarding?.awaitingDetails),
      detailFor: safeState.onboarding?.detailFor || null,
      answers: safeState.onboarding?.answers || safeState.onboarding?.collected || {},
      collected: safeState.onboarding?.collected || {},
      futureSteps: Array.isArray(safeState.onboarding?.futureSteps)
        ? safeState.onboarding.futureSteps
        : defaultFinancialState.onboarding.futureSteps
    }
  };
}

function dedupeByKey(items, getKey) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeMainGoal(goal = {}) {
  const targetAmount = roundMoney(Number(goal.targetAmount || goal.amount || 0));
  const savedAmount = roundMoney(Number(goal.savedAmount || goal.saved || 0));
  const targetDate = goal.targetDate || null;
  const remaining = Math.max(0, targetAmount - savedAmount);
  let dailyNeeded = 0;

  if (targetDate && remaining > 0) {
    const days = Math.max(
      1,
      Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    dailyNeeded = roundMoney(remaining / days);
  }

  return {
    name: goal.name || "Casa Colombia",
    targetAmount,
    savedAmount,
    targetDate,
    priority: goal.priority || "high",
    monthlyNeeded: roundMoney(dailyNeeded * 30),
    weeklyNeeded: roundMoney(dailyNeeded * 7),
    dailyNeeded
  };
}

function pruneBackups() {
  if (!fs.existsSync(activeBackupDir)) {
    return;
  }

  const backups = fs
    .readdirSync(activeBackupDir)
    .filter((file) => file.startsWith("financial-state-") && file.endsWith(".json"))
    .map((file) => ({
      file,
      fullPath: path.join(activeBackupDir, file),
      mtimeMs: fs.statSync(path.join(activeBackupDir, file)).mtimeMs
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  backups.slice(10).forEach((backup) => {
    try {
      fs.unlinkSync(backup.fullPath);
    } catch (error) {
      console.error("[backup] No se pudo eliminar backup antiguo:", error);
    }
  });
}

function createStateBackup() {
  if (!fs.existsSync(activeStateFilePath)) {
    return;
  }

  fs.mkdirSync(activeBackupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(activeBackupDir, `financial-state-${timestamp}.json`);
  fs.copyFileSync(activeStateFilePath, backupPath);
  pruneBackups();
}

function saveFinancialState() {
  try {
    fs.mkdirSync(path.dirname(activeStateFilePath), { recursive: true });
    financialState = normalizeFinancialState(financialState);
    createStateBackup();

    const tmpPath = `${activeStateFilePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(financialState, null, 2));
    JSON.parse(fs.readFileSync(tmpPath, "utf8"));
    fs.renameSync(tmpPath, activeStateFilePath);
    console.log("[memory] Estado financiero guardado");
    return true;
  } catch (error) {
    console.error("[memory] Error guardando estado financiero:", error);
    return false;
  }
}

function getAmount(text) {
  const match = text.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function getAmounts(text) {
  return [...String(text || "").matchAll(/(\d+(\.\d+)?)/g)].map((match) => Number(match[1]));
}

function detectActionConfidence(text) {
  const normalizedText = String(text || "").toLowerCase();
  const amounts = getAmounts(normalizedText);
  const isIncome = incomeKeywords.some((keyword) => normalizedText.includes(keyword));
  const isExpense =
    expenseKeywords.some((keyword) => normalizedText.includes(keyword)) ||
    spendingDecisionKeywords.some((keyword) => normalizedText.includes(keyword));
  let intent = null;
  if (isIncome && !isExpense) intent = "income";
  if (isExpense && !isIncome) intent = "expense";
  const ambiguous = (isIncome && isExpense) || amounts.length > 1 || (!isIncome && !isExpense && amounts.length > 0);
  const confidence =
    !intent || amounts.length === 0 ? 0.45 : ambiguous ? 0.55 : amounts.length === 1 ? 0.9 : 0.6;

  return {
    intent,
    amount: amounts[0] || null,
    confidence
  };
}

function createPendingAction(action) {
  const duplicate = (financialState.pendingActions || []).find(
    (item) =>
      item.intent === action.intent &&
      Number(item.amount || 0) === Number(action.amount || 0) &&
      normalizeMemoryText(item.sourceMessage) === normalizeMemoryText(action.sourceMessage)
  );

  if (duplicate) {
    duplicate.confidence = action.confidence;
    duplicate.createdAt = new Date().toISOString();
    return duplicate;
  }

  const pendingAction = {
    id: crypto.randomUUID(),
    ...action,
    createdAt: new Date().toISOString()
  };
  financialState.pendingActions = [pendingAction, ...(financialState.pendingActions || [])].slice(0, 20);
  return pendingAction;
}

function getDescription(text, amount) {
  return text
    .replace(String(amount), "")
    .replace(
      /me entraron|gané|gane|recibí|recibi|cobré|cobre|me pagaron|pagué|pague|gasté|gaste|compré|compre|pago|quiero comprar|voy a gastar|puedo gastar/gi,
      ""
    )
    .trim();
}

function detectUserIntent(question) {
  const normalizedQuestion = normalizeMemoryText(question);
  const matchIntent = (intent) =>
    userIntentKeywords[intent].some((keyword) =>
      normalizedQuestion.includes(normalizeMemoryText(keyword))
    );

  if (matchIntent("BANK_SETUP")) return "BANK_SETUP";
  if (matchIntent("PAY_DEBT")) return "PAY_DEBT";
  if (matchIntent("ADD_DEBT")) return "ADD_DEBT";
  if (matchIntent("ADVICE")) return "ADVICE";
  return null;
}

function detectPendingFormIntent(question) {
  const normalizedQuestion = normalizeMemoryText(question);
  const matches = (type) =>
    financialFormKeywords[type].some((keyword) =>
      normalizedQuestion.includes(normalizeMemoryText(keyword))
    );

  // Detectar deuda específica por nombre (para editar)
  const debtNames = (financialState.debts || []).map(d => normalizeMemoryText(d.name));
  const mentionsDebtName = debtNames.some(name => name && normalizedQuestion.includes(name));
  const editWords = ["modificar", "editar", "cambiar", "actualizar", "corregir"];
  const deleteWords = ["eliminar", "borrar", "quitar"];
  const hasEditWord = editWords.some(w => normalizedQuestion.includes(w));
  const hasDeleteWord = deleteWords.some(w => normalizedQuestion.includes(w));

  if (matches("delete_debt") || (mentionsDebtName && hasDeleteWord)) return "delete_debt";
  if (matches("edit_debt") || (mentionsDebtName && hasEditWord)) return "edit_debt";
  if (matches("debt")) return "debt";
  if (matches("income")) return "income";
  if (matches("expense")) return "expense";
  return null;
}

function findDebtNameInQuestion(question) {
  const normalizedQuestion = normalizeMemoryText(question);
  return (financialState.debts || []).find(d => {
    const name = normalizeMemoryText(d.name);
    return name && normalizedQuestion.includes(name);
  });
}

function detectAdministrativeAction(question) {
  const text = normalizeMemoryText(question);
  const targetDebt = findDebtNameInQuestion(question);
  if (
    ["eliminar deuda", "borrar deuda", "quitar deuda"].some((phrase) => text.includes(phrase)) ||
    (targetDebt && ["eliminar", "borrar", "quitar"].some((phrase) => text.includes(phrase)))
  ) {
    return { type: "delete_debt", debt: targetDebt || null };
  }
  if (
    ["modificar deuda", "editar deuda", "actualizar deuda", "cambiar pago minimo", "cambiar fecha"].some((phrase) =>
      text.includes(phrase)
    ) ||
    (targetDebt && ["modificar", "editar", "actualizar", "corregir", "cambiar"].some((phrase) => text.includes(phrase)))
  ) {
    return { type: "edit_debt", debt: targetDebt || null };
  }
  if (["agregar deuda", "nueva deuda", "tengo una deuda nueva"].some((phrase) => text.includes(phrase))) {
    return { type: "form", form: "debt" };
  }
  if (["agregar gasto", "gasto nuevo"].some((phrase) => text.includes(phrase))) {
    return { type: "form", form: "expense" };
  }
  if (["agregar ingreso", "ingreso nuevo"].some((phrase) => text.includes(phrase))) {
    return { type: "form", form: "income" };
  }
  return null;
}

const onboardingSteps = [
  "income",
  "credit_cards",
  "debts",
  "vehicle",
  "housing",
  "utilities",
  "food",
  "transport",
  "goals",
  "review"
];

const onboardingQuestions = {
  income: "💰 ¿Cuáles son tus fuentes de ingreso y cuánto ganas aproximadamente por semana o por mes?",
  credit_cards:
    "💳 ¿Tienes tarjetas de crédito? Dime nombre, deuda, límite, pago mínimo, interés y fecha de pago si lo sabes.",
  debts: "🧾 Además de tarjetas, ¿tienes otras deudas?",
  vehicle: "🚗 ¿Tienes carro o moto? ¿Lo debes todavía? ¿Cuánto pagas, cuánto falta y qué día se paga?",
  housing: "🏠 ¿Cuánto pagas de renta o vivienda? ¿Qué día se paga?",
  utilities: "📶 ¿Cuánto pagas de servicios, celular, internet, suscripciones o seguros?",
  food: "🛒 ¿Cuánto gastas normalmente en mercado y comida por semana?",
  transport: "⛽ ¿Cuánto gastas en gasolina o transporte por semana?",
  goals: "🎯 ¿Cuál es tu meta principal? Por defecto Casa Colombia. Dime monto objetivo y fecha ideal si la tienes."
};

function isAiOnboardingStartRequest(question) {
  const rawText = String(question || "").toLowerCase();
  if (rawText.includes("test") && rawText.includes("ia")) {
    return true;
  }
  const text = normalizeMemoryText(question);
  return [
    "hacer test con ia",
    "test con ia",
    "test financiero con ia",
    "test financiero",
    "hacer test",
    "quiero hacer el test financiero con ia paso a paso",
    "hacer el test financiero con ia paso a paso",
    "onboarding con ia"
  ].some((phrase) => text.includes(phrase));
}

function startAiOnboarding() {
  financialState.onboarding = {
    ...financialState.onboarding,
    completed: false,
    mode: "ai_test",
    step: "income",
    awaitingDetails: false,
    detailFor: null,
    answers: financialState.onboarding?.answers || {},
    status: "in_progress",
    updatedAt: new Date().toISOString()
  };
  saveFinancialState();
  return {
    answer:
      "🔥 Perfecto, vamos paso a paso. Primero necesito saber tus ingresos.\n¿Cuáles son tus fuentes de ingreso actualmente?\nEjemplo: trabajo, Instawork, Amazon Flex, efectivo, Zelle, otro.",
    onboarding: financialState.onboarding
  };
}

function buildOnboardingReview() {
  const answers = financialState.onboarding?.answers || {};
  return [
    "🧾 Este es el resumen que tengo hasta ahora:",
    `Ingresos: ${answers.income || "pendiente"}`,
    `Tarjetas: ${answers.credit_cards || "pendiente"}`,
    `Deudas: ${answers.debts || "pendiente"}`,
    `Carro/moto: ${answers.vehicle || "pendiente"}`,
    `Vivienda: ${answers.housing || "pendiente"}`,
    `Servicios: ${answers.utilities || "pendiente"}`,
    `Comida: ${answers.food || "pendiente"}`,
    `Transporte: ${answers.transport || "pendiente"}`,
    `Meta: ${answers.goals || "Casa Colombia"}`,
    "",
    "¿Quieres guardar este perfil financiero?"
  ].join("\n");
}

function handleAiOnboardingAnswer(question) {
  const onboarding = financialState.onboarding || {};
  const currentStep = onboarding.step || "income";
  const cleanAnswer = String(question || "").trim();

  if (onboarding.awaitingDetails && onboarding.detailFor) {
    return saveOnboardingDetailAnswer(onboarding.detailFor, cleanAnswer);
  }

  if (currentStep === "review") {
    return {
      answer: buildOnboardingReview(),
      onboardingReview: true,
      financialData: financialState
    };
  }

  const detailPrompt = getOnboardingDetailPrompt(currentStep, cleanAnswer);
  if (detailPrompt) {
    financialState.onboarding.awaitingDetails = true;
    financialState.onboarding.detailFor = currentStep;
    financialState.onboarding.updatedAt = new Date().toISOString();
    saveFinancialState();
    return {
      answer: detailPrompt,
      onboarding: financialState.onboarding,
      onboardingReview: false,
      quickReplies: []
    };
  }

  financialState.onboarding.answers = {
    ...(financialState.onboarding.answers || {}),
    [currentStep]: cleanAnswer
  };

  const nextStep = onboardingSteps[onboardingSteps.indexOf(currentStep) + 1] || "review";
  financialState.onboarding.step = nextStep;
  financialState.onboarding.updatedAt = new Date().toISOString();

  const answer = nextStep === "review" ? buildOnboardingReview() : onboardingQuestions[nextStep];
  saveFinancialState();

  return {
    answer,
    onboarding: financialState.onboarding,
    onboardingReview: nextStep === "review",
    quickReplies: getOnboardingQuickReplies(nextStep)
  };
}

function saveOnboardingDetailAnswer(step, answer) {
  financialState.onboarding.answers = {
    ...(financialState.onboarding.answers || {}),
    [step]: answer
  };
  financialState.onboarding.awaitingDetails = false;
  financialState.onboarding.detailFor = null;

  const nextStep = onboardingSteps[onboardingSteps.indexOf(step) + 1] || "review";
  financialState.onboarding.step = nextStep;
  financialState.onboarding.updatedAt = new Date().toISOString();

  const response = nextStep === "review" ? buildOnboardingReview() : onboardingQuestions[nextStep];
  saveFinancialState();
  return {
    answer: response,
    onboarding: financialState.onboarding,
    onboardingReview: nextStep === "review",
    quickReplies: getOnboardingQuickReplies(nextStep)
  };
}

function getOnboardingDetailPrompt(step, answer) {
  const text = normalizeMemoryText(answer);
  const raw = String(answer || "").trim().toLowerCase();
  const isYes =
    ["si", "sí", "s", "sa", "yes", "claro", "tengo", "agregar"].includes(text) ||
    (raw.length <= 6 && (raw.startsWith("s") || raw.startsWith("y")));
  const prompts = {
    credit_cards:
      "Perfecto. Agrega los datos de tu tarjeta:\nnombre, deuda, límite, pago mínimo, interés y fecha de pago.",
    debts:
      "Agrega los datos de la deuda:\nnombre, monto, pago mensual/mínimo, frecuencia y fecha.",
    vehicle:
      "Perfecto. Agrega los datos del carro o moto:\nvehículo, monto pendiente, pago mensual, frecuencia y fecha de pago.",
    utilities:
      "Perfecto. Agrega los servicios:\nnombre, monto, frecuencia y fecha aproximada de pago.",
    goals:
      "Perfecto. Describe tu meta:\nnombre, monto objetivo y fecha ideal."
  };

  if (step === "credit_cards" && isYes) return prompts.credit_cards;
  if (step === "debts" && (isYes || text.includes("agregar deuda"))) return prompts.debts;
  if (step === "vehicle" && isYes) return prompts.vehicle;
  if (step === "utilities" && isYes) return prompts.utilities;
  if (step === "goals" && text === "otro") return prompts.goals;
  return null;
}

function getOnboardingQuickReplies(step) {
  const replies = {
    income: ["Trabajo", "Instawork", "Amazon Flex", "Efectivo", "Zelle", "Otro"],
    credit_cards: ["Sí", "No", "No sé"],
    debts: ["Agregar deuda", "No tengo", "Después"],
    vehicle: ["Carro", "Moto", "No tengo", "Después"],
    housing: ["Renta", "Hipoteca", "No pago"],
    utilities: ["Celular", "Internet", "Luz", "Agua", "Suscripciones"],
    food: ["Mercado", "Comida fuera", "Ambos"],
    transport: ["Gasolina", "Transporte público", "No aplica"],
    goals: ["Casa Colombia", "Carro", "Emergencia", "Viaje", "Otro"],
    review: ["Guardar perfil", "Corregir algo", "Completar después"]
  };
  return replies[step] || [];
}

function saveOnboardingProfile() {
  const answers = financialState.onboarding?.answers || {};
  financialState.incomeSources = [{ description: answers.income || "", createdAt: new Date().toISOString() }];
  financialState.recurringPayments = [
    { type: "housing", description: answers.housing || "", createdAt: new Date().toISOString() },
    { type: "utilities", description: answers.utilities || "", createdAt: new Date().toISOString() },
    { type: "food", description: answers.food || "", createdAt: new Date().toISOString() },
    { type: "transport", description: answers.transport || "", createdAt: new Date().toISOString() }
  ].filter((item) => item.description);
  financialState.profile = {
    creditCards: answers.credit_cards || "",
    debts: answers.debts || "",
    vehicle: answers.vehicle || ""
  };
  financialState.mainGoal = normalizeMainGoal({
    ...financialState.mainGoal,
    name: answers.goals || financialState.mainGoal?.name || "Casa Colombia"
  });
  financialState.onboarding.completed = true;
  financialState.onboarding.status = "completed";
  financialState.onboarding.step = "review";
  saveFinancialState();
  return {
    answer:
      "✅ Listo. Ya tengo tu base financiera. Ahora puedo ayudarte a decidir cuánto gastar, qué pagar primero y cómo avanzar hacia Casa Colombia.",
    financialData: financialState
  };
}

function buildPendingFormResponse(formType, question = "") {
  const labels = {
    debt: "deuda",
    income: "ingreso",
    expense: "gasto",
    edit_debt: "edición de deuda",
    delete_debt: "eliminación de deuda"
  };

  if (formType === "edit_debt") {
    const targetDebt = findDebtNameInQuestion(question);
    return {
      intent: "edit_debt_form",
      pendingForm: "edit_debt",
      preloadedDebt: targetDebt || null,
      movement: null,
      answer: targetDebt
        ? `Abrí el formulario para editar ${targetDebt.name}. Los datos actuales están cargados, cambia lo que necesites.`
        : "Abrí el formulario de edición. ¿Qué deuda quieres modificar?"
    };
  }

  if (formType === "delete_debt") {
    const targetDebt = findDebtNameInQuestion(question);
    return {
      intent: "delete_debt_confirm",
      pendingForm: "delete_debt",
      preloadedDebt: targetDebt || null,
      movement: null,
      answer: targetDebt
        ? `¿Confirmas que quieres eliminar la deuda "${targetDebt.name}" de $${targetDebt.amount}?`
        : "¿Qué deuda quieres eliminar?"
    };
  }

  return {
    intent: `${formType}_form`,
    pendingForm: formType,
    movement: null,
    answer: `Perfecto. Abrí el formulario de ${labels[formType]}. Lo guardo solo cuando completes los datos clave.`
  };
}

function buildMissingDebtFieldsResponse() {
  return {
    intent: "ADD_DEBT",
    missingFields: [
      "Nombre de la deuda",
      "Cuánto debes",
      "Pago mínimo o mensual",
      "Fecha de pago"
    ],
    answer:
      "Perfecto. Para agregar esa deuda dime:\n1. Nombre de la deuda\n2. Cuánto debes\n3. Pago mínimo o mensual\n4. Fecha de pago"
  };
}

function parseDebtDetails(question) {
  const rawText = String(question || "");
  const normalizedText = normalizeMemoryText(rawText);
  const amounts = getAmounts(rawText);
  const amount = amounts[0] || null;
  const minimumPayment = amounts[1] || null;
  const nameMatch =
    rawText.match(/(?:del|de la|de el|de)\s+(.+?)(?:\s+pago|\s+mensual|\s+cada|\s+vence|$)/i) ||
    rawText.match(/deuda\s+(?:de\s+)?(.+?)(?:\s+por|\s+de\s+\d|\s+pago|\s+cada|$)/i);
  const name = cleanProfileValue(nameMatch?.[1] || (normalizedText.includes("carro") ? "Carro" : ""));
  const dueMatch = rawText.match(/(?:cada|vence|fecha)\s+(.+)$/i);
  const dueDate = cleanProfileValue(dueMatch?.[1] || "");

  return {
    name,
    amount,
    minimumPayment,
    dueDate
  };
}

function addDebtFromMessage(question) {
  const debtDetails = parseDebtDetails(question);

  if (!debtDetails.name || !debtDetails.amount) {
    return buildMissingDebtFieldsResponse();
  }

  const existingDebt = (financialState.debts || []).find(
    (debt) => normalizeMemoryText(debt.name) === normalizeMemoryText(debtDetails.name)
  );

  const debt = {
    name: debtDetails.name,
    amount: roundMoney(debtDetails.amount),
    minimumPayment: debtDetails.minimumPayment ? roundMoney(debtDetails.minimumPayment) : null,
    dueDate: debtDetails.dueDate || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingDebt) {
    existingDebt.amount = debt.amount;
    existingDebt.minimumPayment = debt.minimumPayment;
    existingDebt.dueDate = debt.dueDate;
    existingDebt.updatedAt = debt.updatedAt;
    debt.name = existingDebt.name;
  } else {
    financialState.debts = [debt, ...(financialState.debts || [])];
  }

  addOrUpdateMemory({
    content: `Deuda ${debt.name}: debe $${debt.amount}${debt.minimumPayment ? `, pago minimo $${debt.minimumPayment}` : ""}${debt.dueDate ? `, fecha ${debt.dueDate}` : ""}`,
    category: "finance",
    importance: 4,
    sourceMessage: question
  });
  analyzeUserPatterns();
  saveFinancialState();

  return {
    intent: "ADD_DEBT",
    debtAction: {
      type: "add_debt",
      debt: debt.name,
      amount: debt.amount,
      minimumPayment: debt.minimumPayment,
      dueDate: debt.dueDate
    },
    answer: `Listo. Guardé la deuda ${debt.name} por $${debt.amount}${debt.minimumPayment ? ` con pago de $${debt.minimumPayment}` : ""}${debt.dueDate ? ` cada ${debt.dueDate}` : ""}.`
  };
}

function findDebtByQuestion(question) {
  const normalizedQuestion = normalizeMemoryText(question);
  return (financialState.debts || []).find((debt) => {
    const normalizedDebt = normalizeMemoryText(debt.name);
    return normalizedDebt && normalizedQuestion.includes(normalizedDebt);
  });
}

function payDebtFromMessage(question) {
  const amount = getAmount(String(question || ""));
  const debt = findDebtByQuestion(question);

  if (!amount || !debt) {
    return {
      intent: "PAY_DEBT",
      missingFields: ["Monto del pago", "Nombre de la deuda"],
      answer: "¿Cuánto quieres pagar y a cuál deuda?"
    };
  }

  const debtBefore = roundMoney(Number(debt.amount || 0));
  if (financialState.balance < amount) {
    return {
      intent: "PAY_DEBT",
      debtAction: {
        type: "pay_debt",
        status: "blocked",
        debt: debt.name,
        payment: amount,
        debtBefore,
        debtRemaining: debtBefore,
        finalBalance: financialState.balance
      },
      answer: `No te alcanza para pagar $${amount} a ${debt.name}. Tu balance actual es $${financialState.balance}.`
    };
  }

  const appliedPayment = roundMoney(Math.min(amount, debtBefore));
  debt.amount = roundMoney(Math.max(0, debtBefore - appliedPayment));
  debt.updatedAt = new Date().toISOString();
  financialState.balance = roundMoney(financialState.balance - appliedPayment);
  financialState.expensesToday = roundMoney(financialState.expensesToday + appliedPayment);
  addTransaction("debt_payment", appliedPayment, `Pago a ${debt.name}`);
  const debtAction = {
    type: "pay_debt",
    status: "applied",
    debt: debt.name,
    payment: appliedPayment,
    debtBefore,
    debtRemaining: debt.amount,
    finalBalance: financialState.balance
  };
  analyzeUserPatterns();
  saveFinancialState();

  return {
    intent: "PAY_DEBT",
    debtAction,
    answer: [
      `Pago aplicado a ${debt.name}.`,
      `Deuda antes: $${debtBefore}.`,
      `Pago aplicado: $${appliedPayment}.`,
      `Deuda restante: $${debt.amount}.`,
      `Balance restante: $${financialState.balance}.`
    ].join("\n")
  };
}

function buildRealAdviceAnswer() {
  const analysis = calculateAnalysis();
  const totalDebt = getTotalDebt();
  const topAlert = (financialState.alerts || [])[0]?.message;
  const topMistake = (financialState.mistakes || [])[0]?.message;
  const diagnosis = [
    `Balance actual: $${financialState.balance}.`,
    `Hoy llevas ingresos por $${financialState.incomeToday} y gastos por $${financialState.expensesToday}.`,
    `Deuda total pendiente: $${totalDebt}.`,
    `Meta ${financialState.goal?.name || "Casa Colombia"}: $${financialState.goal?.saved || 0} guardados.`
  ];
  const impact =
    financialState.balance < 50
      ? "Estás en zona de cuidado: cualquier gasto opcional te puede dejar sin margen."
      : financialState.expensesToday > financialState.incomeToday
        ? "Tu ritmo de gasto hoy va por encima de tus ingresos."
        : totalDebt > 0
          ? "Tu mejor impacto ahora viene de bajar deuda sin descuidar efectivo básico."
          : "Tienes margen para ordenar prioridades antes de gastar.";
  const action =
    totalDebt > 0
      ? "Aparta lo básico del día, evita gastos opcionales y dirige cualquier extra a la deuda más urgente."
      : "Mantén gastos bajos hoy y manda una parte fija a Casa Colombia antes de compras opcionales.";

  return [
    "Diagnóstico:",
    ...diagnosis,
    topAlert ? `Alerta: ${topAlert}.` : null,
    topMistake ? `Error detectado: ${topMistake}.` : null,
    "",
    "Impacto:",
    `${impact} Total ganado histórico: $${roundMoney(analysis.totalIncome)}. Total gastado histórico: $${roundMoney(analysis.totalExpenses)}.`,
    "",
    "Acción recomendada:",
    action
  ]
    .filter(Boolean)
    .join("\n");
}

function processSpecificUserIntent(question, userIntent) {
  if (userIntent === "ADD_DEBT") {
    return addDebtFromMessage(question);
  }

  if (userIntent === "PAY_DEBT") {
    return payDebtFromMessage(question);
  }

  if (userIntent === "ADVICE") {
    return {
      intent: "ADVICE",
      answer: buildRealAdviceAnswer()
    };
  }

  if (userIntent === "BANK_SETUP") {
    return {
      intent: "BANK_SETUP",
      answer:
        "Todavía no tengo tu banco conectado. La forma correcta sería usar Plaid en modo lectura para traer balances y transacciones sin mover dinero. Mientras tanto puedes registrar ingresos, gastos y deudas manualmente aquí. ¿Quieres que iniciemos la fase Plaid Sandbox?"
    };
  }

  return null;
}

function addTransaction(type, amount, description) {
  const transaction = {
    id: Date.now(),
    type,
    amount,
    description: description || (type === "income" ? "Ingreso registrado" : "Gasto registrado"),
    createdAt: new Date().toISOString()
  };

  financialState.transactions = [transaction, ...financialState.transactions].slice(0, 100);
  detectFinancialMistakes();
  analyzeUserPatterns();
  return transaction;
}

function addAlert(message, type) {
  const normalizedMessage = normalizeMemoryText(message);
  const existing = (financialState.alerts || []).find(
    (alert) => alert.type === type && normalizeMemoryText(alert.message) === normalizedMessage
  );
  const now = new Date().toISOString();

  if (existing) {
    existing.createdAt = now;
    financialState.alerts = [
      existing,
      ...(financialState.alerts || []).filter((alert) => alert !== existing)
    ].slice(0, 20);
    return existing;
  }

  financialState.alerts = [
    {
      message,
      type,
      createdAt: now
    },
    ...(financialState.alerts || [])
  ].slice(0, 20);

  return financialState.alerts[0];
}

function addConversationMemory(role, content) {
  if (!isUsefulMemory(content)) {
    return;
  }

  const lastMessage = (financialState.conversationMemory || []).at(-1);
  if (
    lastMessage?.role === role &&
    normalizeMemoryText(lastMessage.content) === normalizeMemoryText(content)
  ) {
    lastMessage.createdAt = new Date().toISOString();
    return;
  }

  financialState.conversationMemory = [
    ...(financialState.conversationMemory || []),
    { role, content, createdAt: new Date().toISOString() }
  ].slice(-10);
}

function addMistake(type, message, severity, evidence) {
  const existing = (financialState.mistakes || []).find((mistake) => mistake.type === type);
  const now = new Date().toISOString();

  if (existing) {
    existing.message = message;
    existing.severity = severity;
    existing.evidence = evidence;
    existing.updatedAt = now;
  } else {
    financialState.mistakes = [
      { id: crypto.randomUUID(), type, message, severity, evidence, createdAt: now, updatedAt: now },
      ...(financialState.mistakes || [])
    ].slice(0, 20);
  }
}

function detectFinancialMistakes() {
  if (financialState.expensesToday > financialState.incomeToday) {
    addMistake(
      "daily_overspending",
      "Estás gastando más de lo que ganas hoy.",
      "high",
      `Gastos $${financialState.expensesToday} vs ingresos $${financialState.incomeToday}`
    );
  }

  if (financialState.balance < 50) {
    addMistake("low_balance_risk", "Tu balance está demasiado bajo.", "high", `Balance $${financialState.balance}`);
  }

  const foodExpenses = (financialState.transactions || []).filter(
    (item) => item.type === "expense" && normalizeMemoryText(item.description).includes("comida")
  );
  if (foodExpenses.length >= 3) {
    addMistake(
      "repeated_food_spending",
      "Hay gasto repetido en comida.",
      "medium",
      `${foodExpenses.length} gastos relacionados con comida`
    );
  }

  const incomes = (financialState.transactions || []).filter((item) => item.type === "income");
  if (incomes.length >= 3 && Number(financialState.goal?.saved || 0) <= 0) {
    addMistake(
      "goal_neglect",
      `No estás avanzando hacia ${financialState.goal?.name || "Casa Colombia"}.`,
      "medium",
      `${incomes.length} ingresos registrados sin ahorro en meta`
    );
  }

  const warned = (financialState.decisions || []).filter((item) =>
    ["warning", "blocked"].includes(item.decision)
  );
  if (warned.length >= 3) {
    addMistake(
      "ignored_warnings",
      "Hay varias advertencias o bloqueos repetidos.",
      "medium",
      `${warned.length} decisiones warning/blocked`
    );
  }

  return financialState.mistakes || [];
}

function generateCoachMessage() {
  if ((financialState.userInteractionCount || 0) % 3 !== 0) {
    return null;
  }

  let message = null;
  if (financialState.balance < 50) {
    message = "Hoy toca cuidar cada dólar. No improvises.";
  } else if (financialState.expensesToday > financialState.incomeToday) {
    message = "Vas rápido con los gastos. Baja el ritmo.";
  } else if (getTotalDebt() > 0) {
    message = "No olvides: deuda primero, comodidad después.";
  } else if (Number(financialState.goal?.saved || 0) > 0) {
    message = "Bien. Hoy sí estás avanzando.";
  }

  if (!message) {
    return null;
  }

  const existing = (financialState.coachMessages || []).find(
    (coach) => normalizeMemoryText(coach.message) === normalizeMemoryText(message)
  );

  if (existing) {
    existing.createdAt = new Date().toISOString();
    financialState.coachMessages = [
      existing,
      ...(financialState.coachMessages || []).filter((coach) => coach !== existing)
    ].slice(0, 20);
    return existing;
  }

  const coachMessage = { id: crypto.randomUUID(), message, createdAt: new Date().toISOString() };
  financialState.coachMessages = [coachMessage, ...(financialState.coachMessages || [])].slice(0, 20);
  return coachMessage;
}

function isMissionFromToday(mission) {
  return mission?.createdAt?.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function legacyGenerateDailyMission() {
  if (isMissionFromToday(financialState.dailyMission)) {
    return financialState.dailyMission;
  }

  const missions = [
    {
      title: "No gastar en comida afuera hoy",
      description: "Si aparece comida por impulso, pregúntame antes de gastar."
    },
    {
      title: "Guardar $20 para Casa Colombia",
      description: "Una victoria pequeña hoy mantiene la meta viva."
    },
    {
      title: "No hacer gastos opcionales hoy",
      description: "Modo defensa: básicos sí, caprichos no."
    },
    {
      title: "Registrar todos los gastos del día",
      description: "Sin registro no hay control."
    }
  ];
  const seed = new Date().getDate() % missions.length;
  financialState.dailyMission = {
    id: crypto.randomUUID(),
    ...missions[seed],
    status: "active",
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  return financialState.dailyMission;
}

function legacyUpdateMissionProgress() {
  const mission = generateDailyMission();
  const title = normalizeMemoryText(mission.title);
  const completed =
    (title.includes("guardar") && Number(financialState.goal?.saved || 0) >= 20) ||
    (title.includes("registrar") && (financialState.transactions || []).length > 0) ||
    (title.includes("no hacer gastos opcionales") &&
      !(financialState.transactions || []).some(
        (item) => item.type === "expense" && !isBasicExpense(item.description)
      )) ||
    (title.includes("comida afuera") &&
      !(financialState.transactions || []).some(
        (item) => item.type === "expense" && normalizeMemoryText(item.description).includes("comida afuera")
      ));

  if (completed && mission.status === "active") {
    mission.status = "completed";
    mission.completedAt = new Date().toISOString();
  }

  return mission;
}

function generateDailyMission() {
  if (isMissionFromToday(financialState.dailyMission)) {
    return financialState.dailyMission;
  }

  applyAutomaticFinancialMode();
  const safeToSpend = calculateSafeToSpendToday();
  const urgentDebt = getUrgentDebt();
  const missions = [
    financialState.balance < 50
      ? {
          title: "Generar ingreso extra hoy",
          description: "Meta express: busca al menos $50 antes de pensar en gastar.",
          target: 50,
          type: "income_boost",
          rewardXp: 40,
          badge: "Modo defensa"
        }
      : null,
    urgentDebt
      ? {
          title: `Preparar pago de ${urgentDebt.name}`,
          description: `Prioridad real: aparta dinero para ${urgentDebt.name} antes de gastos opcionales.`,
          target: Number(urgentDebt.minimumPayment || Math.min(50, urgentDebt.amount || 0)),
          type: "debt_focus",
          rewardXp: 35,
          badge: "Cazador de deuda"
        }
      : null,
    {
      title: `No gastar mas de $${safeToSpend} hoy`,
      description: "Tu reto es moverte con cabeza y no romper el limite seguro.",
      target: safeToSpend,
      type: "spend_limit",
      rewardXp: 25,
      badge: "Control diario"
    },
    {
      title: "Registrar todos los gastos del dia",
      description: "Sin registro no hay control. Hoy todo queda claro.",
      target: 1,
      type: "tracking",
      rewardXp: 20,
      badge: "Ojo financiero"
    },
    {
      title: "Ahorrar para Casa Colombia",
      description: "Manda aunque sea un avance pequeno a la meta grande.",
      target: 20,
      type: "goal_saving",
      rewardXp: 30,
      badge: "Casa Colombia"
    }
  ].filter(Boolean);
  const seed = (new Date().getDate() + (financialState.userInteractionCount || 0)) % missions.length;
  financialState.dailyMission = {
    id: crypto.randomUUID(),
    ...missions[seed],
    status: "active",
    progress: 0,
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  return financialState.dailyMission;
}

function updateMissionProgress() {
  const mission = generateDailyMission();
  const today = new Date().toISOString().slice(0, 10);
  const todayTransactions = (financialState.transactions || []).filter(
    (item) => item.createdAt?.slice(0, 10) === today
  );
  const todayIncome = todayTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const todayExpenses = todayTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const todayDebtPayments = todayTransactions
    .filter((item) => item.type === "debt_payment")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (mission.type === "income_boost") {
    mission.progress = roundMoney(todayIncome);
  } else if (mission.type === "debt_focus") {
    mission.progress = roundMoney(todayDebtPayments);
  } else if (mission.type === "spend_limit") {
    mission.progress = roundMoney(todayExpenses);
    if (todayExpenses > Number(mission.target || 0) && mission.status === "active") {
      mission.status = "failed";
      financialState.missionStats.streak = 0;
    }
  } else if (mission.type === "tracking") {
    mission.progress = todayTransactions.length;
  } else if (mission.type === "goal_saving") {
    mission.progress = roundMoney(Number(financialState.goal?.saved || 0));
  }

  const completed =
    mission.status === "active" &&
    ((mission.type === "spend_limit" && todayExpenses <= Number(mission.target || 0) && todayTransactions.length > 0) ||
      (mission.type !== "spend_limit" && Number(mission.progress || 0) >= Number(mission.target || 1)));

  if (completed) {
    mission.status = "completed";
    mission.completedAt = new Date().toISOString();
    financialState.missionStats.xp = Number(financialState.missionStats.xp || 0) + Number(mission.rewardXp || 20);
    financialState.missionStats.streak = Number(financialState.missionStats.streak || 0) + 1;
    financialState.missionStats.bestStreak = Math.max(
      Number(financialState.missionStats.bestStreak || 0),
      Number(financialState.missionStats.streak || 0)
    );
    if (mission.badge && !(financialState.missionStats.badges || []).includes(mission.badge)) {
      financialState.missionStats.badges = [mission.badge, ...(financialState.missionStats.badges || [])].slice(0, 12);
    }
  }

  return mission;
}

function checkFinancialAlerts() {
  const alertsBefore = financialState.alerts?.length || 0;
  const totalDebt = (financialState.debts || []).reduce(
    (sum, debt) => sum + Number(debt.amount || 0),
    0
  );
  const goalName = financialState.goal?.name || "Casa Colombia";

  if (financialState.expensesToday > financialState.incomeToday) {
    addAlert("Estás gastando más de lo que ganas hoy", "warning");
  }

  if (financialState.balance < 50) {
    addAlert("Tu dinero es bajo, cuidado", "danger");
  }

  if (totalDebt > 0 && financialState.incomeToday > 0) {
    addAlert("Deberías priorizar pagar deudas", "warning");
  }

  if (!financialState.goal?.saved || financialState.goal.saved <= 0) {
    addAlert(`No estás avanzando hacia ${goalName}`, "info");
  }

  const alertsCreated = (financialState.alerts?.length || 0) - alertsBefore;
  if (alertsCreated > 0) {
    console.log(`[alerts] ${alertsCreated} alerta(s) financiera(s) generada(s)`);
  }

  return financialState.alerts || [];
}

function getAllocationStrategy() {
  const strategies = {
    normal: { expenses: 0.5, savings: 0.3, debt: 0.2 },
    disciplina: { expenses: 0.4, savings: 0.3, debt: 0.3 },
    extremo: { expenses: 0.2, savings: 0.3, debt: 0.5 }
  };

  return (
    financialState.allocationOverrides?.[financialState.mode] ||
    strategies[financialState.mode] ||
    strategies.normal
  );
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function getUrgentDebt() {
  const debts = (financialState.debts || [])
    .filter((debt) => Number(debt.amount || 0) > 0)
    .sort((a, b) => {
      const aMinimum = Number(a.minimumPayment || 0);
      const bMinimum = Number(b.minimumPayment || 0);
      if (aMinimum !== bMinimum) return bMinimum - aMinimum;
      return Number(a.amount || 0) - Number(b.amount || 0);
    });

  return debts[0] || null;
}

function calculateSafeToSpendToday() {
  const balance = Number(financialState.balance || 0);
  const incomeToday = Number(financialState.incomeToday || 0);
  const expensesToday = Number(financialState.expensesToday || 0);
  const totalDebt = getTotalDebt();
  const emergencyFloor = totalDebt > 0 ? 50 : 25;
  const dailyMargin = Math.max(0, incomeToday - expensesToday);
  const balanceMargin = Math.max(0, balance - emergencyFloor);
  const capByMode = financialState.mode === "extremo" ? 0.1 : financialState.mode === "disciplina" ? 0.2 : 0.35;

  if (balance < emergencyFloor || expensesToday > incomeToday) {
    return 0;
  }

  return roundMoney(Math.min(balanceMargin, dailyMargin || balanceMargin, balance * capByMode));
}

function calculateAutomaticFinancialMode() {
  const balance = Number(financialState.balance || 0);
  const totalDebt = getTotalDebt();
  const expensesToday = Number(financialState.expensesToday || 0);
  const incomeToday = Number(financialState.incomeToday || 0);
  const hasHighRiskMistake = (financialState.mistakes || []).some((mistake) => mistake.severity === "high");

  if (balance < 50 || expensesToday > incomeToday || hasHighRiskMistake) {
    return "extremo";
  }

  if (totalDebt > 0 || balance < 200) {
    return "disciplina";
  }

  return "normal";
}

function applyAutomaticFinancialMode() {
  const mode = calculateAutomaticFinancialMode();
  financialState.mode = mode;
  return mode;
}

function getPrimaryAlert() {
  return (
    (financialState.alerts || []).find((alert) => alert.type === "danger") ||
    (financialState.alerts || []).find((alert) => alert.type === "warning") ||
    (financialState.alerts || [])[0] ||
    null
  );
}

function buildDailySummary() {
  applyAutomaticFinancialMode();
  const safeToSpend = calculateSafeToSpendToday();
  const urgentDebt = getUrgentDebt();
  const primaryAlert = getPrimaryAlert();
  financialState.mainGoal = normalizeMainGoal(financialState.mainGoal || financialState.goal);
  const mainGoal = financialState.mainGoal;
  const goalRemaining = roundMoney(Math.max(0, Number(mainGoal.targetAmount || 0) - Number(mainGoal.savedAmount || 0)));

  return {
    greeting: `Hey Johan, hoy estas en modo ${financialState.mode}.`,
    balance: roundMoney(Number(financialState.balance || 0)),
    mode: financialState.mode,
    safeToSpend,
    urgentDebt,
    dailyMission: financialState.dailyMission || null,
    goal: financialState.goal || defaultFinancialState.goal,
    mainGoal,
    goalRemaining,
    primaryAlert,
    suggestions:
      safeToSpend <= 0
        ? ["No hagas gastos opcionales", "Revisa deuda urgente", "Busca ingreso extra hoy"]
        : ["Mantente bajo el dinero seguro", "Registra cada gasto", "Separa algo para Casa Colombia"]
  };
}

function isFinancialBrainQuestion(question) {
  const text = normalizeMemoryText(question);
  const phrases = [
    "gastar hoy",
    "puedo gastar",
    "cuanto puedo gastar",
    "pagar primero",
    "pago primero",
    "que pago primero",
    "fecha de pago",
    "proximo pago",
    "pagos atrasados",
    "voy bien",
    "resumen",
    "cuanto necesito hacer",
    "cuanto hice",
    "cuanto gaste",
    "en que gaste",
    "recibo",
    "evidencia",
    "foto",
    "casa colombia"
  ];

  return phrases.some((phrase) => text.includes(phrase));
}

function getTransactionsForQuestion(question) {
  const text = normalizeMemoryText(question);
  const transactions = financialState.transactions || [];
  if (text.includes("hoy")) {
    const today = new Date().toISOString().slice(0, 10);
    return transactions.filter((transaction) => transaction.createdAt?.slice(0, 10) === today);
  }

  return transactions.slice(0, 20);
}

function buildFinancialBrainResponse(question, state, processed = {}) {
  applyAutomaticFinancialMode();
  const text = normalizeMemoryText(question);
  const safeToSpend = calculateSafeToSpendToday();
  const totalDebt = getTotalDebt();
  const urgentDebt = getUrgentDebt();
  const goalName = state.goal?.name || "Casa Colombia";
  const mainGoal = normalizeMainGoal(state.mainGoal || state.goal);
  const goalRemaining = roundMoney(Math.max(0, Number(mainGoal.targetAmount || 0) - Number(mainGoal.savedAmount || 0)));
  const primaryAlert = getPrimaryAlert();
  const transactions = getTransactionsForQuestion(question);
  const spentInScope = transactions
    .filter((transaction) => ["expense", "debt_payment"].includes(transaction.type))
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const earnedInScope = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const riskLevel =
    state.balance < 50 || state.expensesToday > state.incomeToday
      ? "high"
      : totalDebt > 0 || safeToSpend < 20
        ? "medium"
        : "low";

  let answer = "";
  let decision = "advice";
  const actions = [];
  const quickReplies = ["Que pago primero?", "Cuanto puedo gastar hoy?", "Resumen de hoy"];

  if (text.includes("puedo gastar") || text.includes("gastar hoy") || text.includes("cuanto puedo gastar")) {
    decision = safeToSpend > 0 ? "approved" : "blocked";
    answer =
      safeToSpend > 0
        ? `Si, pero con limite: hoy tu dinero seguro para gastar es $${safeToSpend}. No pases de ahi.`
        : "Hoy no conviene gastar. Tu dinero seguro para gastos opcionales es $0.";
    actions.push(
      safeToSpend > 0
        ? `Mantente por debajo de $${safeToSpend}.`
        : "Congela gastos opcionales hasta mejorar balance o cubrir deuda."
    );
  } else if (text.includes("cuanto tiempo") || text.includes("cuando termino") || text.includes("en cuanto pago") || text.includes("terminar en")) {
    const debt = findDebtByQuestion(question) || urgentDebt;
    if (debt) {
      const amountOverride = getAmount(question);
      const estimate = estimateDebtPayoff(debt, amountOverride || debt.minimumPayment);
      answer = `💳 Si pagas $${estimate.paymentPerPeriod} a ${debt.name}, tardas aproximadamente ${estimate.periodsRemaining} ${estimate.periodLabel}. Total estimado: $${estimate.totalEstimatedPaid}.`;
      if (estimate.interestEstimated > 0) {
        answer += ` ⏳ Interes aproximado: $${estimate.interestEstimated}.`;
      }
      actions.push(`Subir el pago a $${roundMoney(estimate.paymentPerPeriod * 2)} puede recortar bastante el tiempo.`);
    } else {
      answer = "No encontre esa deuda. Dime el nombre exacto y el pago mensual que quieres probar.";
      actions.push("Ejemplo: en cuanto pago Credit One si pago 80 mensual.");
    }
  } else if (text.includes("pagar primero") || text.includes("pago primero") || text.includes("que pago primero") || text.includes("deuda")) {
    answer = urgentDebt
      ? `Yo pagaria primero ${urgentDebt.name}. Debes $${roundMoney(Number(urgentDebt.amount || 0))}${urgentDebt.minimumPayment ? ` y el minimo es $${urgentDebt.minimumPayment}` : ""}.`
      : "Ahora mismo no veo una deuda activa para priorizar.";
    actions.push("Primero sobrevive el dia, luego cubre pagos atrasados/proximos y despues baja deuda.");
    if (urgentDebt) actions.push(`Separa dinero para ${urgentDebt.name} antes de cualquier gasto opcional.`);
  } else if (text.includes("fecha de pago") || text.includes("proximo pago") || text.includes("pagos atrasados")) {
    const debtsWithDates = (state.debts || []).filter((debt) => Number(debt.amount || 0) > 0);
    answer = debtsWithDates.length
      ? `Tus pagos visibles: ${debtsWithDates
          .map((debt) => `${debt.name}: $${roundMoney(Number(debt.amount || 0))}${debt.dueDate ? `, fecha ${debt.dueDate}` : ", sin fecha guardada"}`)
          .join(" | ")}.`
      : "No tengo pagos activos con fecha guardada.";
    actions.push("Si falta una fecha, dime la fecha de pago y la guardo en memoria.");
  } else if (text.includes("cuanto gaste") || text.includes("en que gaste") || text.includes("cuanto hice")) {
    const topItems = transactions
      .slice(0, 5)
      .map((transaction) => `${transaction.description}: $${roundMoney(Number(transaction.amount || 0))}`)
      .join(" | ");
    answer = `En el periodo que puedo ver aqui: hiciste $${roundMoney(earnedInScope)} y gastaste $${roundMoney(spentInScope)}.${topItems ? ` Movimientos: ${topItems}.` : ""}`;
    actions.push("Si quieres una fecha exacta, escribe el dia o mes y lo filtramos mas fino.");
  } else if (text.includes("cuanto necesito hacer")) {
    const minimumTarget = urgentDebt?.minimumPayment || (financialState.balance < 50 ? 50 - financialState.balance : 0);
    const needed = roundMoney(Math.max(0, Number(minimumTarget || 0)));
    answer =
      needed > 0
        ? `Hoy necesitas hacer al menos $${needed} para respirar mejor y cubrir la prioridad inmediata.`
        : "Hoy no veo un minimo urgente nuevo. Si puedes producir extra, mandalo a deuda o Casa Colombia.";
    actions.push(urgentDebt ? `Primero cubre ${urgentDebt.name}.` : "Mantente por encima del colchon minimo.");
  } else if (text.includes("resumen") || text.includes("voy bien") || text.includes("casa colombia")) {
    answer = `Resumen rapido: balance $${roundMoney(state.balance)}, ingresos hoy $${roundMoney(state.incomeToday)}, gastos hoy $${roundMoney(state.expensesToday)}, deuda total $${roundMoney(totalDebt)} y ${goalName} va en $${roundMoney(state.goal?.saved || 0)}.`;
    actions.push(safeToSpend <= 0 ? "Hoy prioridad: no gastar y buscar ingreso extra." : `Puedes moverte con cuidado hasta $${safeToSpend}.`);
    if (urgentDebt) actions.push(`Deuda mas urgente: ${urgentDebt.name}.`);
  } else if (text.includes("recibo") || text.includes("evidencia") || text.includes("foto")) {
    answer = "Todavia no tengo recibos o fotos conectados en esta vista. Puedo guardar la nota del gasto y luego enlazamos evidencia cuando agreguemos archivos.";
    actions.push("Por ahora escribe: pague X en Y con recibo pendiente.");
  } else {
    answer = "Te leo como pregunta financiera, pero necesito una pieza mas: dime si quieres decidir gasto, deuda, meta o resumen.";
    quickReplies.push("Decision de gasto", "Meta Casa Colombia");
  }

  const why = [
    `Balance: $${roundMoney(state.balance || 0)}.`,
    `Ingresos hoy: $${roundMoney(state.incomeToday || 0)}.`,
    `Gastos hoy: $${roundMoney(state.expensesToday || 0)}.`,
    totalDebt > 0 ? `Deudas activas: $${roundMoney(totalDebt)}.` : "Sin deuda activa registrada.",
    primaryAlert ? `Alerta principal: ${primaryAlert.message}.` : null
  ]
    .filter(Boolean)
    .join(" ");

  const goalLine =
    mainGoal.targetAmount > 0
      ? `🎯 Objetivo ${mainGoal.name}: faltan $${goalRemaining}. Hoy deberias acercarte con $${mainGoal.dailyNeeded || 0}, esta semana $${mainGoal.weeklyNeeded || 0}.`
      : `🎯 Objetivo principal: ${mainGoal.name}. Define un monto objetivo para calcular el ritmo exacto.`;

  return {
    answer: `${answer}\n\n${goalLine}\n\nPor que: ${why}`,
    decision,
    riskLevel,
    safeToSpend,
    why,
    actions,
    quickReplies,
    dailySummary: buildDailySummary(),
    relevantMemory: processed.relevantMemory || searchMemory(question, 5)
  };
}

function estimateDebtPayoff(debt, customPayment = null) {
  const amount = Math.max(0, Number(debt?.amount || 0));
  const payment = Math.max(0, Number(customPayment || debt?.minimumPayment || 0));
  const frequency = debt?.frequency || "mensual";
  const periodLabel = frequency === "semanal" ? "semanas" : frequency === "quincenal" ? "quincenas" : "meses";
  const apr = Number(debt?.apr || 0);

  if (!amount || !payment) {
    return {
      debt: debt?.name || "Deuda",
      paymentPerPeriod: payment,
      periodsRemaining: null,
      periodLabel,
      totalEstimatedPaid: amount,
      interestEstimated: 0,
      payoffDate: null,
      message: "Falta monto o pago minimo para calcular el tiempo."
    };
  }

  let balance = amount;
  let periods = 0;
  let totalPaid = 0;
  const monthlyRate = apr > 0 ? apr / 100 / 12 : 0;
  const periodRate = frequency === "semanal" ? monthlyRate / 4.345 : frequency === "quincenal" ? monthlyRate / 2 : monthlyRate;

  while (balance > 0 && periods < 600) {
    const interest = balance * periodRate;
    balance = roundMoney(balance + interest);
    const applied = Math.min(payment, balance);
    balance = roundMoney(balance - applied);
    totalPaid = roundMoney(totalPaid + applied);
    periods += 1;

    if (applied <= interest && periodRate > 0) {
      break;
    }
  }

  const daysPerPeriod = frequency === "semanal" ? 7 : frequency === "quincenal" ? 14 : 30;
  const payoffDate = new Date(Date.now() + periods * daysPerPeriod * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return {
    debt: debt?.name || "Deuda",
    paymentPerPeriod: roundMoney(payment),
    periodsRemaining: periods,
    periodLabel,
    totalEstimatedPaid: roundMoney(totalPaid),
    interestEstimated: roundMoney(Math.max(0, totalPaid - amount)),
    payoffDate,
    message: `Si pagas $${roundMoney(payment)} por periodo, terminas en aproximadamente ${periods} ${periodLabel}.`
  };
}

function validateFinancialEntry(type, payload) {
  const errors = [];
  if (type === "debt") {
    if (!payload.name) errors.push("Nombre de deuda");
    if (!Number(payload.amount || 0)) errors.push("Monto total");
    if (!Number(payload.minimumPayment || 0)) errors.push("Pago minimo");
    if (!payload.frequency) errors.push("Frecuencia");
    if (!payload.dueDate) errors.push("Fecha del proximo pago");
  }
  if (type === "income") {
    if (!Number(payload.amount || 0)) errors.push("Monto");
    if (!payload.source) errors.push("Fuente");
    if (!payload.date) errors.push("Fecha");
  }
  if (type === "expense") {
    if (!Number(payload.amount || 0)) errors.push("Monto");
    if (!payload.category) errors.push("Categoria");
    if (!payload.date) errors.push("Fecha");
    if (!payload.paymentMethod) errors.push("Metodo de pago");
  }
  return errors;
}

function applyFinancialEntry(type, payload = {}) {
  const now = new Date().toISOString();
  const errors = validateFinancialEntry(type, payload);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (type === "debt") {
    const existingDebt = payload.id
      ? (financialState.debts || []).find((debt) => debt.id === payload.id || debt.name === payload.id)
      : null;
    const debt = {
      id: existingDebt?.id || crypto.randomUUID(),
      name: String(payload.name).trim(),
      type: payload.type || payload.debtType || "Otro",
      amount: roundMoney(Number(payload.amount || 0)),
      minimumPayment: roundMoney(Number(payload.minimumPayment || 0)),
      frequency: payload.frequency,
      dueDate: payload.dueDate,
      apr: payload.apr ? Number(payload.apr) : null,
      note: payload.note || "",
      createdAt: existingDebt?.createdAt || now,
      updatedAt: now
    };
    financialState.debts = existingDebt
      ? (financialState.debts || []).map((item) => (item === existingDebt ? debt : item))
      : [debt, ...(financialState.debts || [])];
    addOrUpdateMemory({
      content: `Deuda ${debt.name}: $${debt.amount}, pago ${debt.minimumPayment}, frecuencia ${debt.frequency}, fecha ${debt.dueDate}`,
      category: "finance",
      importance: 4,
      sourceMessage: "Formulario deuda"
    });
    const payoffEstimate = estimateDebtPayoff(debt);
    return {
      ok: true,
      debt,
      payoffEstimate,
      answer: `💳 Deuda guardada: ${debt.name}. Si pagas $${debt.minimumPayment} ${debt.frequency}, terminas en aprox. ${payoffEstimate.periodsRemaining} ${payoffEstimate.periodLabel}.`
    };
  }

  if (type === "income") {
    const amount = roundMoney(Number(payload.amount || 0));
    financialState.balance = roundMoney(Number(financialState.balance || 0) + amount);
    financialState.incomeToday = roundMoney(Number(financialState.incomeToday || 0) + amount);
    const transaction = addTransaction("income", amount, payload.source || "Ingreso");
    transaction.date = payload.date;
    transaction.recurring = normalizeMemoryText(payload.recurring) === "si" || payload.recurring === true;
    transaction.note = payload.note || "";
    return { ok: true, transaction, answer: `💰 Ingreso guardado: $${amount} de ${payload.source}.` };
  }

  if (type === "expense") {
    const amount = roundMoney(Number(payload.amount || 0));
    financialState.balance = roundMoney(Number(financialState.balance || 0) - amount);
    financialState.expensesToday = roundMoney(Number(financialState.expensesToday || 0) + amount);
    const transaction = addTransaction("expense", amount, payload.category || "Gasto");
    transaction.date = payload.date;
    transaction.paymentMethod = payload.paymentMethod;
    transaction.receipt = payload.receipt || "";
    transaction.note = payload.note || "";
    return { ok: true, transaction, answer: `💸 Gasto guardado: $${amount} en ${payload.category}.` };
  }

  return { ok: false, errors: ["Tipo de formulario invalido"] };
}

function buildFinancialCalendar() {
  const today = new Date().toISOString().slice(0, 10);
  const events = [];
  (financialState.debts || []).forEach((debt) => {
    if (debt.dueDate) {
      events.push({
        id: `debt-${debt.id || debt.name}`,
        title: `💳 ${debt.name}: pago mínimo $${debt.minimumPayment || 0}`,
        type: "debt_payment",
        date: debt.dueDate,
        amount: Number(debt.minimumPayment || 0),
        status: debt.dueDate < today ? "late" : "upcoming",
        relatedId: debt.id || debt.name,
        description: `Deuda total $${debt.amount || 0}`
      });
    }
    const estimate = estimateDebtPayoff(debt);
    if (estimate.payoffDate) {
      events.push({
        id: `payoff-${debt.id || debt.name}`,
        title: `⏳ ${debt.name} estimado libre de deuda`,
        type: "payoff_estimate",
        date: estimate.payoffDate,
        amount: 0,
        status: "estimated",
        relatedId: debt.id || debt.name,
        description: estimate.message
      });
    }
  });
  (financialState.transactions || []).slice(0, 50).forEach((transaction) => {
    events.push({
      id: `tx-${transaction.id}`,
      title: `${transaction.type === "income" ? "💰" : "🧾"} ${transaction.description}`,
      type: transaction.type === "income" ? "income" : "expense",
      date: transaction.date || transaction.createdAt?.slice(0, 10),
      amount: transaction.amount,
      status: "completed",
      relatedId: transaction.id,
      description: transaction.note || transaction.description
    });
  });
  if (financialState.mainGoal?.targetDate) {
    events.push({
      id: "main-goal",
      title: `🎯 ${financialState.mainGoal.name}: revisión de meta`,
      type: "goal",
      date: financialState.mainGoal.targetDate,
      amount: financialState.mainGoal.targetAmount,
      status: "upcoming",
      relatedId: "mainGoal",
      description: `Faltan $${Math.max(0, financialState.mainGoal.targetAmount - financialState.mainGoal.savedAmount)}`
    });
  }
  (financialState.alerts || []).slice(0, 5).forEach((alert, index) => {
    events.push({
      id: `alert-${index}`,
      title: `⚠️ ${alert.message}`,
      type: "alert",
      date: alert.createdAt?.slice(0, 10) || today,
      amount: 0,
      status: "upcoming",
      relatedId: null,
      description: alert.type
    });
  });
  return { events: events.filter((event) => event.date).sort((a, b) => a.date.localeCompare(b.date)) };
}

function reduceFirstActiveDebt(amount) {
  let remaining = amount;
  let paidDebtName = null;

  financialState.debts = (financialState.debts || []).map((debt) => {
    if (remaining <= 0 || Number(debt.amount || 0) <= 0) {
      return debt;
    }

    const debtAmount = Number(debt.amount || 0);
    const payment = Math.min(debtAmount, remaining);
    remaining = roundMoney(remaining - payment);
    paidDebtName = paidDebtName || debt.name;

    return {
      ...debt,
      amount: roundMoney(debtAmount - payment)
    };
  });

  return {
    appliedToDebt: roundMoney(amount - remaining),
    unpaidAllocation: remaining,
    paidDebtName
  };
}

function formatMoney(value) {
  return `$${roundMoney(value)}`;
}

function buildAutoPlanText(income, distribution) {
  return [
    `De los ${formatMoney(income)}:`,
    `- ${formatMoney(distribution.expenses)} para gastos`,
    `- ${formatMoney(distribution.savings)} para ${financialState.goal?.name || "Casa Colombia"}`,
    `- ${formatMoney(distribution.debt)} para deuda`
  ].join("\n");
}

function autoAllocateMoney(amount) {
  const strategy = getAllocationStrategy();
  const distribution = {
    expenses: roundMoney(amount * strategy.expenses),
    savings: roundMoney(amount * strategy.savings),
    debt: roundMoney(amount * strategy.debt)
  };

  financialState.goal.saved = roundMoney(Number(financialState.goal.saved || 0) + distribution.savings);
  const debtResult = reduceFirstActiveDebt(distribution.debt);

  const allocation = {
    income: amount,
    distribution,
    mode: financialState.mode,
    debtPayment: debtResult.appliedToDebt,
    debtTarget: debtResult.paidDebtName,
    createdAt: new Date().toISOString()
  };

  financialState.allocations = [allocation, ...(financialState.allocations || [])].slice(0, 50);
  console.log(
    `[allocation] ${financialState.mode}: gastos ${distribution.expenses}, ahorro ${distribution.savings}, deuda ${distribution.debt}`
  );

  return {
    ...allocation,
    message: buildAutoPlanText(amount, distribution)
  };
}

function isBasicExpense(description) {
  const normalizedDescription = String(description || "").toLowerCase();
  const priorityMatch = (financialState.priorities || []).find((priority) =>
    normalizedDescription.includes(normalizeMemoryText(priority.name).split(" ")[0])
  );
  return (
    priorityMatch?.type === "essential" ||
    priorityMatch?.type === "debt" ||
    basicExpenseKeywords.some((keyword) => normalizedDescription.includes(keyword))
  );
}

function getTotalDebt() {
  return (financialState.debts || []).reduce(
    (sum, debt) => sum + Number(debt.amount || 0),
    0
  );
}

function evaluateSpendingDecision(amount, description) {
  const totalDebt = getTotalDebt();
  const newBalance = roundMoney(financialState.balance - amount);
  const relevantRule = findRelevantSpendingRule(description);
  const impact = {
    newBalance,
    effectOnGoal:
      financialState.goal?.saved > 0
        ? `Reduce tu margen para seguir avanzando hacia ${financialState.goal.name}`
        : `Puede retrasar el inicio de tu meta ${financialState.goal?.name || "Casa Colombia"}`,
    effectOnDebt:
      totalDebt > 0
        ? `Mantienes ${formatMoney(totalDebt)} en deuda pendiente`
        : "No afecta deuda pendiente"
  };

  if (financialState.balance < amount) {
    return {
      decision: "blocked",
      reason: "no tienes suficiente dinero",
      impact
    };
  }

  if (financialState.mode === "extremo" && !isBasicExpense(description)) {
    return {
      decision: "blocked",
      reason: "gasto innecesario en modo extremo",
      impact
    };
  }

  if (financialState.expensesToday > financialState.incomeToday) {
    return {
      decision: "warning",
      reason: "ya estás gastando más de lo que ganas",
      impact
    };
  }

  if (relevantRule) {
    return {
      decision: "warning",
      reason: `recuerda tu regla: ${relevantRule.content}`,
      impact
    };
  }

  if ((financialState.goal?.saved || 0) <= 0 || amount > financialState.balance * 0.25) {
    return {
      decision: "warning",
      reason: "este gasto puede afectar tu avance hacia la meta",
      impact
    };
  }

  return {
    decision: "approved",
    reason: "gasto aprobado dentro de tu situación actual",
    impact
  };
}

function recordDecision(decision, amount, description) {
  if (!decision) {
    return;
  }

  financialState.decisions = [
    {
      id: crypto.randomUUID(),
      decision: decision.decision,
      reason: decision.reason,
      amount,
      description,
      createdAt: new Date().toISOString()
    },
    ...(financialState.decisions || [])
  ].slice(0, 100);
  if (["blocked", "warning"].includes(decision.decision)) {
    detectFinancialMistakes();
    analyzeUserPatterns();
  }
}

function detectStrategicIntent(text) {
  const normalizedText = String(text || "").toLowerCase();
  return strategyIntentKeywords.some((keyword) => normalizedText.includes(keyword));
}

function generateStrategyOptions(amount, state, mode) {
  const goalName = state.goal?.name || "Casa Colombia";
  const totalDebt = getTotalDebt();
  const baseBalance = Number(state.balance || 0);
  const safeAmount = roundMoney(Number(amount || 0));

  const createOption = (id, title, description, savings, debt) => ({
    id,
    title,
    description,
    amount: safeAmount,
    distribution: {
      savings: roundMoney(savings),
      debt: roundMoney(Math.min(debt, totalDebt)),
      expenses: roundMoney(Math.max(0, safeAmount - savings - debt))
    },
    impact: {
      newBalance: roundMoney(baseBalance + safeAmount - savings - debt),
      goalProgress: roundMoney(Number(state.goal?.saved || 0) + savings),
      debtReduction: roundMoney(Math.min(debt, totalDebt))
    },
    mode
  });

  return [
    createOption(
      "conservador",
      "Opción 1: Conservador",
      `Guardar todo en ${goalName}. Es la ruta más tranquila si quieres avanzar en tu meta.`,
      safeAmount,
      0
    ),
    createOption(
      "balanceado",
      "Opción 2: Balanceado",
      `Dividir el dinero entre ${goalName} y deuda. Mantiene avance sin ignorar presión financiera.`,
      safeAmount * 0.5,
      safeAmount * 0.5
    ),
    createOption(
      "agresivo",
      "Opción 3: Agresivo",
      "Usar todo para deuda. Es la jugada más fuerte si quieres bajar obligaciones rápido.",
      0,
      safeAmount
    )
  ];
}

function applyStrategyOption(optionId) {
  const option = (financialState.pendingStrategyOptions || []).find((item) => item.id === optionId);

  if (!option) {
    return null;
  }

  financialState.incomeToday += option.amount;
  financialState.goal.saved = roundMoney(
    Number(financialState.goal.saved || 0) + option.distribution.savings
  );
  const debtResult = reduceFirstActiveDebt(option.distribution.debt);
  financialState.balance = option.impact.newBalance;

  addTransaction("income", option.amount, `Estrategia aplicada: ${option.title}`);
  financialState.allocations = [
    {
      income: option.amount,
      distribution: {
        expenses: option.distribution.expenses,
        savings: option.distribution.savings,
        debt: option.distribution.debt
      },
      mode: financialState.mode,
      debtPayment: debtResult.appliedToDebt,
      debtTarget: debtResult.paidDebtName,
      strategy: option.id,
      createdAt: new Date().toISOString()
    },
    ...(financialState.allocations || [])
  ].slice(0, 50);
  financialState.pendingStrategyOptions = [];
  analyzeUserPatterns();
  const alerts = checkFinancialAlerts();
  saveFinancialState();

  console.log(`[strategy] Aplicada opción ${option.id} por ${option.amount}`);

  return {
    appliedOption: option,
    financialData: financialState,
    alerts
  };
}

function upsertLearningPattern(patternData) {
  const now = new Date().toISOString();
  const normalizedPattern = normalizeMemoryText(patternData.pattern);
  const existing = (financialState.learningProfile.patterns || []).find(
    (item) => normalizeMemoryText(item.pattern) === normalizedPattern
  );

  if (existing) {
    existing.evidence = patternData.evidence;
    existing.confidence = Math.max(existing.confidence, patternData.confidence);
    existing.updatedAt = now;
    return existing;
  }

  const pattern = {
    id: crypto.randomUUID(),
    pattern: patternData.pattern,
    category: patternData.category,
    evidence: patternData.evidence,
    confidence: patternData.confidence,
    createdAt: now,
    updatedAt: now
  };

  financialState.learningProfile.patterns = [
    pattern,
    ...(financialState.learningProfile.patterns || [])
  ].slice(0, 100);
  return pattern;
}

function setLearningListItem(listName, value) {
  const current = financialState.learningProfile[listName] || [];
  if (!current.includes(value)) {
    financialState.learningProfile[listName] = [value, ...current].slice(0, 20);
  }
}

function analyzeUserPatterns() {
  const transactions = financialState.transactions || [];
  const expenses = transactions.filter((item) => item.type === "expense");
  const incomes = transactions.filter((item) => item.type === "income");
  const decisions = financialState.decisions || [];
  const allocations = financialState.allocations || [];

  const foodExpenses = expenses.filter((item) =>
    normalizeMemoryText(item.description).includes("comida")
  );
  if (foodExpenses.length >= 3) {
    const total = foodExpenses.reduce((sum, item) => sum + item.amount, 0);
    upsertLearningPattern({
      pattern: "gasto frecuente en comida",
      category: "bad_habit",
      evidence: `${foodExpenses.length} gastos en comida por $${roundMoney(total)}`,
      confidence: Math.min(0.95, 0.45 + foodExpenses.length * 0.12)
    });
    setLearningListItem("badHabitsDetected", "gasto frecuente en comida");
  }

  if (incomes.length >= 2) {
    const uniqueIncomeAmounts = new Set(incomes.map((item) => item.amount));
    if (uniqueIncomeAmounts.size > 1) {
      upsertLearningPattern({
        pattern: "recibe ingresos variables",
        category: "income",
        evidence: `${uniqueIncomeAmounts.size} montos de ingreso distintos registrados`,
        confidence: 0.72
      });
      setLearningListItem("preferencesLearned", "ingresos variables");
    }
  }

  const savingsFirst = allocations.filter(
    (item) => Number(item.distribution?.savings || 0) >= Number(item.distribution?.debt || 0)
  );
  if (savingsFirst.length >= 2) {
    upsertLearningPattern({
      pattern: "elige ahorro sobre deuda",
      category: "preference",
      evidence: `${savingsFirst.length} asignaciones favorecen ahorro`,
      confidence: 0.68
    });
    setLearningListItem("preferencesLearned", "prefiere avanzar Casa Colombia");
  }

  const blockedOrWarning = decisions.filter((item) => ["blocked", "warning"].includes(item.decision));
  if (blockedOrWarning.length >= 2) {
    upsertLearningPattern({
      pattern: "pregunta antes de gastar",
      category: "good_habit",
      evidence: `${blockedOrWarning.length} decisiones evaluadas antes de gastar`,
      confidence: 0.76
    });
    setLearningListItem("goodHabitsDetected", "pregunta antes de gastar");
  }

  const blockedCount = decisions.filter((item) => item.decision === "blocked").length;
  if (blockedCount >= 2) {
    upsertLearningPattern({
      pattern: "riesgo de gastos impulsivos bloqueados",
      category: "bad_habit",
      evidence: `${blockedCount} gastos bloqueados por Johan AI`,
      confidence: 0.78
    });
    setLearningListItem("badHabitsDetected", "intentos de gasto impulsivo");
  }

  const memoryRules = (financialState.universalMemory || []).filter((memory) => memory.category === "rule");
  if (memoryRules.length > 0) {
    setLearningListItem("preferencesLearned", "usa reglas personales para controlar gastos");
  }

  const totalSignals =
    transactions.length +
    decisions.length +
    allocations.length +
    (financialState.universalMemory || []).length;
  financialState.learningProfile.confidence = Math.min(0.95, roundMoney(totalSignals / 25));
  return financialState.learningProfile;
}

function createSuggestedChange({ suggestedChange, reason, percentages = null }) {
  const existing = (financialState.learningProfile.strategyAdjustments || []).find(
    (item) => item.suggestedChange === suggestedChange && item.status !== "confirmed"
  );

  if (existing) {
    existing.reason = reason;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const change = {
    id: crypto.randomUUID(),
    requiresConfirmation: true,
    suggestedChange,
    reason,
    percentages,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  financialState.learningProfile.strategyAdjustments = [
    change,
    ...(financialState.learningProfile.strategyAdjustments || [])
  ].slice(0, 20);
  return change;
}

function evolveRecommendations() {
  const profile = analyzeUserPatterns();
  const recommendations = [];
  const hasFoodPattern = profile.patterns.some((item) => item.pattern === "gasto frecuente en comida");
  const prefersSavings = profile.patterns.some((item) => item.pattern === "elige ahorro sobre deuda");
  const variableIncome = profile.patterns.some((item) => item.pattern === "recibe ingresos variables");

  if (hasFoodPattern) {
    recommendations.push({
      requiresConfirmation: false,
      suggestedChange: "advertir antes sobre comida afuera",
      reason: "Detecté gasto frecuente en comida; conviene avisarte antes de repetirlo."
    });
    recommendations.push(
      createSuggestedChange({
        suggestedChange: "bajar límite de gastos diarios",
        reason: "Hay varios gastos repetidos en comida; reducir el margen diario puede proteger tu balance.",
        percentages: null
      })
    );
  }

  if (prefersSavings) {
    recommendations.push({
      requiresConfirmation: false,
      suggestedChange: "priorizar Casa Colombia si hay dinero extra",
      reason: "Tus asignaciones recientes muestran preferencia por avanzar en la meta."
    });
  }

  if (variableIncome) {
    recommendations.push({
      requiresConfirmation: false,
      suggestedChange: "sugerir ahorro automático",
      reason: "Con ingresos variables, guardar apenas entra dinero reduce riesgo."
    });
  }

  const debtTotal = getTotalDebt();
  if (debtTotal > 0 && financialState.incomeToday > 0) {
    recommendations.push(
      createSuggestedChange({
        suggestedChange: "aumentar porcentaje a deuda en modo disciplina",
        reason: "Tienes deuda activa e ingresos recientes; más presión a deuda puede acelerar estabilidad.",
        percentages: { expenses: 0.35, savings: 0.25, debt: 0.4 }
      })
    );
  }

  saveFinancialState();
  return {
    learningProfile: financialState.learningProfile,
    recommendations
  };
}

function confirmLearningChange(changeId) {
  const change = (financialState.learningProfile.strategyAdjustments || []).find(
    (item) => item.id === changeId
  );

  if (!change || change.status === "confirmed") {
    return null;
  }

  if (change.percentages) {
    financialState.allocationOverrides.disciplina = change.percentages;
  }

  change.status = "confirmed";
  change.updatedAt = new Date().toISOString();
  saveFinancialState();
  return change;
}

function parseFinancialMessage(text) {
  const rawText = String(text || "");
  const normalizedText = rawText.toLowerCase();
  const amount = getAmount(normalizedText);

  if (!amount || !Number.isFinite(amount)) {
    return null;
  }

  const isIncome = incomeKeywords.some((keyword) => normalizedText.includes(keyword));
  const wantsSpendingDecision = spendingDecisionKeywords.some((keyword) =>
    normalizedText.includes(keyword)
  );
  const isExpense =
    expenseKeywords.some((keyword) => normalizedText.includes(keyword)) || wantsSpendingDecision;
  const description = getDescription(rawText, amount);

  if (isIncome) {
    financialState.balance += amount;
    financialState.incomeToday += amount;
    const autoPlan = autoAllocateMoney(amount);
    const transaction = addTransaction("income", amount, description);
    console.log(`[finance] Ingreso detectado: +${amount} (${transaction.description})`);
    return { type: "income", amount, description, autoPlan };
  }

  if (isExpense) {
    const decision = evaluateSpendingDecision(amount, description);
    recordDecision(decision, amount, description);

    if (decision.decision === "blocked") {
      console.log(`[decision] Gasto bloqueado: ${amount} (${decision.reason})`);
      return { type: "expense", amount, description, decision, blocked: true };
    }

    financialState.balance -= amount;
    financialState.expensesToday += amount;
    const transaction = addTransaction("expense", amount, description);
    console.log(
      `[finance] Gasto ${decision.decision}: -${amount} (${transaction.description})`
    );
    return { type: "expense", amount, description, decision };
  }

  return null;
}

function parseModeMessage(text) {
  const normalizedText = String(text || "").toLowerCase();

  if (normalizedText.includes("modo disciplina")) {
    financialState.mode = "disciplina";
    console.log("[mode] Cambiado a modo disciplina");
    return "disciplina";
  }

  if (normalizedText.includes("modo extremo")) {
    financialState.mode = "extremo";
    console.log("[mode] Cambiado a modo extremo");
    return "extremo";
  }

  if (normalizedText.includes("modo normal")) {
    financialState.mode = "normal";
    console.log("[mode] Cambiado a modo normal");
    return "normal";
  }

  return null;
}

function parseUserProfileMessage(text) {
  const rawText = String(text || "").trim();
  const normalizedText = rawText.toLowerCase();
  let changed = false;

  const goalPatterns = [/quiero ahorrar para\s+(.+)/i, /mi meta es\s+(.+)/i];
  for (const pattern of goalPatterns) {
    const match = rawText.match(pattern);
    if (match?.[1]) {
      const goal = cleanProfileValue(match[1]);
      financialState.userProfile.goal = goal;
      financialState.goal.name = goal;
      changed = true;
      console.log(`[profile] Meta actualizada: ${goal}`);
      break;
    }
  }

  const avoidMatch = rawText.match(/no quiero gastar en\s+(.+)/i);
  if (avoidMatch?.[1]) {
    const avoidItem = cleanProfileValue(avoidMatch[1]);
    if (!financialState.userProfile.avoidSpendingOn.includes(avoidItem)) {
      financialState.userProfile.avoidSpendingOn.push(avoidItem);
    }
    changed = true;
    console.log(`[profile] Evitar gasto en: ${avoidItem}`);
  }

  if (normalizedText.includes("ingreso fijo")) {
    financialState.userProfile.incomeType = "fixed";
    changed = true;
  }

  if (normalizedText.includes("ingreso variable")) {
    financialState.userProfile.incomeType = "variable";
    changed = true;
  }

  return changed;
}

function cleanProfileValue(value) {
  return value.replace(/[.!?]+$/g, "").trim();
}

function detectGeneralIntent(text) {
  const normalizedText = normalizeMemoryText(text);
  const rawText = String(text || "");

  if (["hola", "hey", "buenas", "que tal", "qué tal"].some((item) => normalizedText.includes(normalizeMemoryText(item)))) {
    return "greeting";
  }

  if (
    [
      "necesito un consejo",
      "aconsejame",
      "qué hago",
      "que hago",
      "ayúdame",
      "ayudame"
    ].some((item) => normalizedText.includes(normalizeMemoryText(item)))
  ) {
    return "advice";
  }

  if (
    ["estoy preocupado", "me da miedo", "estoy estresado", "no sé qué hacer", "no se que hacer"].some(
      (item) => normalizedText.includes(normalizeMemoryText(item))
    )
  ) {
    return "emotional";
  }

  if (rawText.includes("?")) {
    return "general_question";
  }

  return null;
}

function normalizeMemoryText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulMemory(text) {
  const normalizedText = normalizeMemoryText(text);
  const junk = new Set(["hola", "ok", "listo", "jaja", "gracias", "si", "no"]);
  return normalizedText.length > 8 && !junk.has(normalizedText);
}

function inferMemoryCategory(content) {
  const text = normalizeMemoryText(content);

  if (text.includes("esposa") || text.includes("familia") || text.includes("colombia")) {
    return text.includes("dinero") || text.includes("pagar") || text.includes("mandar")
      ? "relationship"
      : "relationship";
  }

  if (text.includes("trabajo") || text.includes("instawork") || text.includes("amazon flex")) {
    return "work";
  }

  if (text.includes("meta") || text.includes("ahorrar") || text.includes("casa")) {
    return "goal";
  }

  if (text.includes("no quiero") || text.includes("debo") || text.includes("tengo que")) {
    return "rule";
  }

  if (text.includes("prefiero") || text.includes("quiero")) {
    return "preference";
  }

  if (text.includes("pagar") || text.includes("deuda") || text.includes("dinero")) {
    return "finance";
  }

  return "other";
}

function inferMemoryImportance(content) {
  const text = normalizeMemoryText(content);

  if (
    text.includes("importante") ||
    text.includes("esposa") ||
    text.includes("debo") ||
    text.includes("tengo que pagar") ||
    text.includes("meta principal")
  ) {
    return 5;
  }

  if (text.includes("no quiero") || text.includes("prefiero") || text.includes("meta")) {
    return 4;
  }

  return 3;
}

function stripMemoryTrigger(text) {
  let content = String(text || "").trim();
  for (const trigger of memoryTriggers) {
    const pattern = new RegExp(`^${trigger}\\s*`, "i");
    content = content.replace(pattern, "");
  }
  return cleanProfileValue(content);
}

function addOrUpdateMemory({ content, category, importance = 3, sourceMessage = content }) {
  const cleanContent = cleanProfileValue(content);

  if (!isUsefulMemory(cleanContent)) {
    return null;
  }

  const safeCategory = memoryCategories.has(category) ? category : "other";
  const normalizedContent = normalizeMemoryText(cleanContent);
  const now = new Date().toISOString();
  const existing = (financialState.universalMemory || []).find((memory) => {
    const normalizedMemory = normalizeMemoryText(memory.content);
    return normalizedMemory.includes(normalizedContent) || normalizedContent.includes(normalizedMemory);
  });

  if (existing) {
    existing.content = cleanContent;
    existing.category = safeCategory;
    existing.importance = Math.max(Number(existing.importance || 1), Number(importance || 1));
    existing.sourceMessage = sourceMessage;
    existing.updatedAt = now;
    console.log(`[memory] Memoria actualizada: ${cleanContent}`);
    return existing;
  }

  const memory = {
    id: crypto.randomUUID(),
    content: cleanContent,
    category: safeCategory,
    importance,
    sourceMessage,
    createdAt: now,
    updatedAt: now
  };

  financialState.universalMemory = [memory, ...(financialState.universalMemory || [])].slice(0, 300);
  console.log(`[memory] Nueva memoria (${safeCategory}): ${cleanContent}`);
  if (importance >= 4) {
    analyzeUserPatterns();
  }
  return memory;
}

function extractUniversalMemory(text) {
  const rawText = String(text || "").trim();
  const normalizedText = normalizeMemoryText(rawText);
  const hasTrigger = memoryTriggers.some((trigger) => normalizedText.includes(normalizeMemoryText(trigger)));

  if (!hasTrigger || !isUsefulMemory(rawText)) {
    return [];
  }

  const content = stripMemoryTrigger(rawText);
  const memory = addOrUpdateMemory({
    content,
    category: inferMemoryCategory(rawText),
    importance: inferMemoryImportance(rawText),
    sourceMessage: rawText
  });

  return memory ? [memory] : [];
}

function searchMemory(query, limit = 10) {
  const terms = normalizeMemoryText(query).split(" ").filter(Boolean);

  if (terms.length === 0) {
    return (financialState.universalMemory || []).slice(0, limit);
  }

  return (financialState.universalMemory || [])
    .map((memory) => {
      const searchable = normalizeMemoryText(`${memory.content} ${memory.category}`);
      const score =
        terms.reduce((sum, term) => sum + (searchable.includes(term) ? 1 : 0), 0) +
        Number(memory.importance || 0) * 0.1;
      return { memory, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.memory);
}

function findRelevantSpendingRule(description) {
  const normalizedDescription = normalizeMemoryText(description);

  return (financialState.universalMemory || []).find((memory) => {
    if (!["rule", "preference"].includes(memory.category)) {
      return false;
    }

    const content = normalizeMemoryText(`${memory.content} ${memory.sourceMessage || ""}`);
    if (
      memory.category !== "rule" &&
      !content.includes("no quiero") &&
      !content.includes("evitar") &&
      !content.includes("no gastar")
    ) {
      return false;
    }

    return normalizedDescription
      .split(" ")
      .filter((word) => word.length > 3)
      .some((word) => content.includes(word));
  });
}

function processMessage(question) {
  const mode = parseModeMessage(question);
  const profileChanged = parseUserProfileMessage(question);
  const extractedMemory = extractUniversalMemory(question);
  const generalIntent = detectGeneralIntent(question);
  const pendingForm = detectPendingFormIntent(question);
  if (pendingForm) {
    return {
      mode,
      profileChanged,
      extractedMemory,
      generalIntent,
      ...buildPendingFormResponse(pendingForm, question)
    };
  }
  const userIntent = detectUserIntent(question);
  const specificIntentResult = processSpecificUserIntent(question, userIntent);
  if (specificIntentResult) {
    return {
      mode,
      profileChanged,
      extractedMemory,
      generalIntent,
      movement: null,
      ...specificIntentResult
    };
  }
  const isStrategy = detectStrategicIntent(question);
  const amount = getAmount(String(question || "").toLowerCase());
  const actionConfidence = detectActionConfidence(question);

  if (isStrategy) {
    const strategyOptions = generateStrategyOptions(amount || 0, financialState, financialState.mode);
    financialState.pendingStrategyOptions = strategyOptions;
    saveFinancialState();
    console.log(`[strategy] Opciones generadas para ${amount || 0}`);
    return {
      intent: "strategy",
      mode,
      profileChanged,
      extractedMemory,
      generalIntent,
      movement: null,
      strategyOptions,
      amount: amount || 0
    };
  }

  if (actionConfidence.confidence < 0.7 && (actionConfidence.intent || getAmounts(question).length > 0)) {
    const pendingAction = createPendingAction({
      intent: actionConfidence.intent || "unknown",
      amount: actionConfidence.amount,
      confidence: actionConfidence.confidence,
      sourceMessage: question
    });

    return {
      intent: "pending_action",
      mode,
      profileChanged,
      extractedMemory,
      generalIntent,
      movement: null,
      pendingAction,
      actionConfidence
    };
  }

  const movement = parseFinancialMessage(question);

  return { intent: generalIntent, mode, profileChanged, extractedMemory, movement };
}

function calculateAnalysis() {
  const transactions = financialState.transactions || [];
  const incomeTransactions = transactions.filter((transaction) => transaction.type === "income");
  const expenseTransactions = transactions.filter((transaction) =>
    ["expense", "debt_payment"].includes(transaction.type)
  );
  const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpenses = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const uniqueExpenseDays = new Set(
    expenseTransactions.map((transaction) => transaction.createdAt.slice(0, 10))
  );
  const dailyAverageExpense =
    expenseTransactions.length > 0
      ? totalExpenses / Math.max(uniqueExpenseDays.size, 1)
      : 0;

  return {
    totalIncome,
    totalExpenses,
    balance: financialState.balance,
    dailyAverageExpense,
    mostCommonExpense: getMostCommonExpense(expenseTransactions)
  };
}

function getMostCommonExpense(expenseTransactions) {
  if (expenseTransactions.length === 0) {
    return null;
  }

  const counts = expenseTransactions.reduce((acc, transaction) => {
    const key = transaction.description || "Gasto sin descripción";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function simulateFuture(days) {
  const safeDays = Math.max(1, Math.min(Number(days) || 30, 365));
  const transactions = financialState.transactions || [];
  const incomeTransactions = transactions.filter((transaction) => transaction.type === "income");
  const expenseTransactions = transactions.filter((transaction) =>
    ["expense", "debt_payment"].includes(transaction.type)
  );
  const firstTransactionDate = transactions.at(-1)?.createdAt;
  const elapsedDays = firstTransactionDate
    ? Math.max(
        1,
        Math.ceil((Date.now() - new Date(firstTransactionDate).getTime()) / (1000 * 60 * 60 * 24))
      )
    : 1;
  const averageDailyIncome =
    incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0) / elapsedDays;
  const averageDailyExpense =
    expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0) / elapsedDays;
  const projectedBalance =
    financialState.balance + (averageDailyIncome - averageDailyExpense) * safeDays;
  const projectedSavings = Math.max(0, projectedBalance);
  const warning =
    projectedBalance < 0
      ? "Riesgo: con este ritmo, tu balance puede quedar negativo."
      : averageDailyExpense > averageDailyIncome
        ? "Atención: tus gastos diarios superan tus ingresos diarios."
        : "Proyección estable si mantienes este ritmo.";

  return {
    days: safeDays,
    averageDailyIncome,
    averageDailyExpense,
    projectedBalance,
    projectedSavings,
    warning
  };
}

function buildFallbackAnswer(question, processed) {
  if (processed.answer) {
    return processed.answer;
  }

  if (processed.intent === "pending_action") {
    const amountText = processed.pendingAction.amount ? ` de $${processed.pendingAction.amount}` : "";
    const intentText =
      processed.pendingAction.intent === "income"
        ? "un ingreso"
        : processed.pendingAction.intent === "expense"
          ? "un gasto"
          : "una accion financiera";
    return `Creo que hablas de ${intentText}${amountText}, pero no estoy totalmente seguro. ¿Lo registro?`;
  }

  if (processed.intent === "strategy") {
    return "Tienes dinero extra. No lo voy a mover automáticamente: te propongo tres caminos y tú eliges cuál aplicar.";
  }

  if (processed.mode) {
    return `Modo ${processed.mode} activado. Ajustaré mis respuestas financieras con esa personalidad.`;
  }

  if (processed.profileChanged) {
    return `Perfil actualizado. Tu meta principal ahora es ${financialState.userProfile.goal}.`;
  }

  if (processed.movement?.type === "income") {
    return `Perfecto. Registré un ingreso de $${processed.movement.amount}. Balance actual: $${financialState.balance}.`;
  }

  if (processed.movement?.type === "expense") {
    if (processed.movement.blocked) {
      return `Bloqueado: ${processed.movement.decision.reason}. Si haces esto, te quedas con $${processed.movement.decision.impact.newBalance}.`;
    }

    if (processed.movement.decision?.decision === "warning") {
      return `Advertencia: ${processed.movement.decision.reason}. Registré el gasto, pero si haces esto te quedas con $${processed.movement.decision.impact.newBalance}.`;
    }

    return `Listo. Registré un gasto de $${processed.movement.amount}. Balance actual: $${financialState.balance}.`;
  }

  return buildGeneralFallbackAnswer(question, processed);
}

function buildContextSummary() {
  const totalDebt = getTotalDebt();
  const topAlert = financialState.alerts?.[0]?.message;
  const topPattern = financialState.learningProfile?.patterns?.[0]?.pattern;
  const relevantMemory = searchMemory("Colombia comida deuda meta", 3)
    .map((memory) => memory.content)
    .join("; ");

  return {
    totalDebt,
    topAlert,
    topPattern,
    relevantMemory
  };
}

function buildAdviceFallback() {
  const context = buildContextSummary();
  const steps = [
    `1. Mira tu balance actual: $${financialState.balance}. No tomes decisiones grandes por encima de ese número.`,
    `2. Hoy vas en ingresos $${financialState.incomeToday} y gastos $${financialState.expensesToday}. Si vas a gastar, que sea básico o estratégico.`,
    `3. Tienes deuda pendiente de $${context.totalDebt}. Si entra dinero extra, yo priorizaría deuda y Casa Colombia antes que compras impulsivas.`
  ];

  if (context.topPattern) {
    steps.push(`Patrón detectado: ${context.topPattern}. Úsalo como señal, no como culpa.`);
  }

  if (context.relevantMemory) {
    steps.push(`También tengo presente esto: ${context.relevantMemory}.`);
  }

  return steps.join("\n");
}

function buildGeneralFallbackAnswer(question, processed) {
  const normalizedQuestion = normalizeMemoryText(question);
  if (
    normalizedQuestion.includes("guardo") &&
    (financialState.pendingStrategyOptions || []).length > 0
  ) {
    const option = financialState.pendingStrategyOptions.find((item) => item.id === "conservador");
    return `Sí, guardar esos $${option.amount} es la opción más tranquila. Subirías Casa Colombia a $${option.impact.goalProgress} y no tocarías deuda ni gastos. Si quieres máxima paz mental, aplica la opción conservadora.`;
  }

  if (processed.intent === "greeting") {
    return "Hola Johan. Estoy listo. Dime qué pasó o qué decisión quieres revisar hoy.";
  }

  if (processed.intent === "advice") {
    return `Te doy un consejo directo:\n${buildAdviceFallback()}`;
  }

  if (processed.intent === "emotional") {
    return `Entiendo. Vamos a ordenar esto sin pánico.\n${buildAdviceFallback()}`;
  }

  if (processed.intent === "general_question") {
    return `Buena pregunta. Con lo que veo ahora, este sería mi enfoque:\n${buildAdviceFallback()}\n\nSi quieres, dime el monto exacto o la decisión concreta y la evaluamos antes de mover dinero.`;
  }

  return "No tengo suficiente detalle. ¿Esto es un gasto, una deuda nueva o un pago?";
}

async function askOpenAI(question, processed) {
  if (processed.answer) {
    return processed.answer;
  }

  if (!openai) {
    return buildFallbackAnswer(question, processed);
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "Eres Johan AI, un asesor financiero personal estricto, humano y protector.",
          "RESPONDE SIEMPRE SOLO EN JSON VALIDO. No uses markdown, no uses texto antes o despues del JSON.",
          "El JSON debe tener esta forma minima: {\"answer\":\"string\",\"intent\":\"string\",\"diagnosis\":\"string\",\"recommendedAction\":\"string\",\"needsMoreInfo\":boolean,\"questionToUser\":\"string|null\",\"riskLevel\":\"low|medium|high\",\"decision\":object|null}.",
          "No des respuestas genericas. Prohibido responder frases como 'Estoy contigo', 'Puedo registrar ingresos', 'Dime si quieres revisar' o equivalentes.",
          "Si el usuario pide consejo, usa balance, ingresos, gastos, deudas, meta, alertas, errores y memoria para dar un diagnostico real y una accion concreta.",
          "Si falta informacion, pregunta una sola cosa util y especifica en questionToUser.",
          "Si existe decision en el contexto, debes respetarla y resumir su impacto. No contradigas decisiones blocked/warning/approved.",
          "No inventes datos financieros que no esten en el contexto.",
          "Eres Johan AI, un asistente financiero y personal inteligente. No respondas como robot. No digas 'recibí tu mensaje' salvo que estés confirmando una acción real. Si el usuario saluda, saluda natural. Si pide consejo, analiza su estado financiero y da pasos concretos. Si no hay datos suficientes, pregunta una sola cosa útil. Habla como coach financiero humano, directo y estratégico.",
          "Eres Johan AI, un asistente financiero y personal con memoria universal. Usa la memoria del usuario para responder con contexto. No seas robótico. Sé estratégico, directo, humano y realista. Si una memoria cambia o contradice una anterior, prioriza la más reciente.",
          "Eres Johan AI, una IA financiera y personal que aprende de patrones del usuario. Puedes adaptar recomendaciones según hábitos reales. No cambies reglas críticas sin confirmación explícita. Sé humano, estratégico, directo y protector. Si detectas un patrón negativo, dilo con honestidad. Si detectas mejora, refuérzala.",
          "Analizas datos, tomas decisiones, simulas escenarios y respondes en español.",
          "Habla como un asesor financiero humano. No seas robótico. Explica opciones. Puedes opinar. Sé claro, directo y útil.",
          modeInstructions[financialState.mode] || modeInstructions.normal
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({
          question,
          financialData: financialState,
          relevantMemory: processed.relevantMemory || [],
          conversationMemory: processed.conversationMemory || [],
          learningProfile: financialState.learningProfile,
          priorities: financialState.priorities,
          mistakes: financialState.mistakes,
          dailyMission: financialState.dailyMission,
          strategyOptions: processed.strategyOptions || null,
          userProfile: financialState.userProfile,
          mode: financialState.mode,
          alerts: financialState.alerts,
          generalIntent: processed.intent,
          decision: {
            spendingDecision: processed.movement?.decision || null,
            debtAction: processed.debtAction || null,
            pendingAction: processed.pendingAction || null,
            missingFields: processed.missingFields || null,
            strategyOptions: processed.strategyOptions || null
          },
          analysis: calculateAnalysis()
        })
      }
    ]
  });

  return completion.choices[0]?.message?.content || buildFallbackAnswer(question, processed);
}

async function detectIntentWithAI(question) {
  const allowedIntents = new Set([
    "expense",
    "income",
    "debt_payment",
    "advice",
    "strategy",
    "goal",
    "unknown"
  ]);

  if (!openai) {
    return "unknown";
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Clasifica la intención financiera del usuario.\nOpciones válidas:\nexpense = quiere registrar o evaluar un gasto\nincome = quiere registrar ingreso\ndebt_payment = pregunta o decide sobre pagar deuda\nadvice = pide consejo financiero general\nstrategy = pide plan, prioridad, distribución o modo de acción\ngoal = pregunta sobre meta Casa Colombia, ahorro o futuro financiero\nunknown = no se puede clasificar\n\nResponde SOLO con una palabra exacta de la lista."
        },
        {
          role: "user",
          content: String(question || "")
        }
      ]
    });

    const detectedIntent = completion.choices[0]?.message?.content?.toLowerCase().trim();
    return allowedIntents.has(detectedIntent) ? detectedIntent : "unknown";
  } catch (error) {
    console.error("[intent-ai] Error clasificando intención:", error);
    return "unknown";
  }
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/auth/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Email invalido." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "La contrasena debe tener al menos 6 caracteres." });
    }

    const users = loadUsers();
    if (users.some((user) => user.email === email)) {
      return res.status(409).json({ error: "Ese email ya tiene cuenta." });
    }

    const user = {
      id: crypto.randomUUID(),
      email,
      passwordHash: await bcrypt.hash(password, 12),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);

    financialState = normalizeFinancialState(structuredClone(defaultFinancialState));
    saveUserFinancialState(user.id);

    const token = createToken(user.id);
    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email },
      financialData: financialState
    });
  } catch (error) {
    console.error("[auth] Error registrando usuario:", error);
    return res.status(500).json({ error: "No se pudo crear la cuenta." });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const users = loadUsers();
    const user = users.find((item) => item.email === email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Email o contrasena incorrectos." });
    }

    const token = createToken(user.id);
    financialState = loadUserFinancialState(user.id);

    return res.json({
      token,
      user: { id: user.id, email: user.email },
      financialData: financialState
    });
  } catch (error) {
    console.error("[auth] Error iniciando sesion:", error);
    return res.status(500).json({ error: "No se pudo iniciar sesion." });
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email y password requeridos"
    });
  }

  const user = {
    email,
    name: "Johan",
    id: "user-1"
  };

  return res.json({
    user,
    financialData: financialState
  });
});

app.use(authMiddleware);

app.get("/financial-state", (req, res) => {
  applyAutomaticFinancialMode();
  res.json(financialState);
});

app.post("/onboarding", (req, res) => {
  try {
    const { action, mode, data = {} } = req.body || {};
    if (mode === "ai_test" || action === "ai_test") {
      const result = startAiOnboarding();
      return res.json({ ...result, financialData: financialState });
    }
    if (action === "save_profile") {
      return res.json(saveOnboardingProfile());
    }
    if (action === "complete_later") {
      financialState.onboarding.status = "paused";
      financialState.onboarding.completed = false;
      saveFinancialState();
      return res.json({
        answer: "Perfecto, lo dejamos para después. No guardé conclusiones incompletas.",
        financialData: financialState,
        onboarding: financialState.onboarding
      });
    }
    financialState.onboarding = {
      ...financialState.onboarding,
      mode: action === "manual" ? "manual" : financialState.onboarding?.mode || null,
      flow: action || financialState.onboarding?.flow || null,
      completed: action === "skip" ? true : Boolean(data.completed ?? financialState.onboarding?.completed),
      status: action === "skip" ? "skipped" : action || financialState.onboarding?.status || "in_progress",
      collected: {
        ...(financialState.onboarding?.collected || {}),
        ...data
      },
      updatedAt: new Date().toISOString()
    };
    saveFinancialState();
    return res.json({ financialData: financialState, onboarding: financialState.onboarding });
  } catch (error) {
    console.error("[onboarding] Error:", error);
    return res.status(500).json({ error: "No se pudo actualizar onboarding.", financialData: financialState });
  }
});

app.post("/financial-entry", (req, res) => {
  try {
    const { type, data = {} } = req.body || {};
    const result = applyFinancialEntry(type, data);
    if (!result.ok) {
      return res.status(400).json({
        error: `Falta ${result.errors.join(" y ")}`,
        missingFields: result.errors,
        financialData: financialState
      });
    }

    checkFinancialAlerts();
    detectFinancialMistakes();
    updateMissionProgress();
    analyzeUserPatterns();
    saveFinancialState();

    return res.json({
      ...result,
      financialData: financialState,
      alerts: financialState.alerts || [],
      mistakes: financialState.mistakes || [],
      dailyMission: financialState.dailyMission,
      dailySummary: buildDailySummary()
    });
  } catch (error) {
    console.error("[financial-entry] Error:", error);
    return res.status(500).json({ error: "No se pudo guardar el dato financiero.", financialData: financialState });
  }
});

app.delete("/debts/:id", (req, res) => {
  const id = req.params.id;
  const before = financialState.debts?.length || 0;
  financialState.debts = (financialState.debts || []).filter(
    (debt) => debt.id !== id && normalizeMemoryText(debt.name) !== normalizeMemoryText(id)
  );
  if ((financialState.debts?.length || 0) === before) {
    return res.status(404).json({ error: "Deuda no encontrada.", financialData: financialState });
  }
  saveFinancialState();
  return res.json({ ok: true, financialData: financialState, dailySummary: buildDailySummary() });
});

app.get("/financial-calendar", (req, res) => {
  res.json(buildFinancialCalendar());
});

app.get("/export-data", (req, res) => {
  res.setHeader("Content-Disposition", "attachment; filename=\"johan-ai-financial-state.json\"");
  res.json({
    exportedAt: new Date().toISOString(),
    financialState
  });
});

app.post("/reset-demo-data", (req, res) => {
  try {
    if (req.body?.confirm !== true) {
      return res.status(400).json({
        success: false,
        error: "Para resetear datos demo envia { confirm: true }.",
        financialData: financialState
      });
    }

    const preserved = {
      mode: financialState.mode,
      universalMemory: financialState.universalMemory || [],
      userProfile: financialState.userProfile || defaultFinancialState.userProfile,
      priorities: financialState.priorities || defaultFinancialState.priorities,
      learningProfile: financialState.learningProfile || defaultFinancialState.learningProfile
    };

    financialState = normalizeFinancialState({
      ...structuredClone(defaultFinancialState),
      ...preserved
    });
    saveFinancialState();

    return res.json({
      success: true,
      message: "Datos demo reseteados. Memoria, perfil y modo se conservaron.",
      financialData: financialState
    });
  } catch (error) {
    console.error("[reset-demo-data] Error:", error);
    return res.status(500).json({
      success: false,
      error: "No se pudo resetear la data demo.",
      financialData: financialState
    });
  }
});

app.post("/mode", (req, res) => {
  const { mode } = req.body || {};
  const validModes = ["normal", "disciplina", "extremo"];

  if (!validModes.includes(mode)) {
    return res.status(400).json({
      success: false,
      error: "Modo inválido. Usa normal, disciplina o extremo.",
      financialData: financialState
    });
  }

  financialState.mode = mode;
  saveFinancialState();
  console.log(`[mode] Cambiado por endpoint a ${mode}`);

  return res.json({
    success: true,
    mode,
    financialData: financialState
  });
});

app.get("/transactions", (req, res) => {
  res.json((financialState.transactions || []).slice(0, 20));
});

app.get("/analysis", (req, res) => {
  res.json(calculateAnalysis());
});

app.get("/memory", (req, res) => {
  res.json(financialState.universalMemory || []);
});

app.post("/memory", (req, res) => {
  try {
    const { content, category = "other", importance = 3 } = req.body || {};
    const memory = addOrUpdateMemory({
      content,
      category,
      importance,
      sourceMessage: content
    });

    if (!memory) {
      return res.status(400).json({ error: "La memoria no tiene información útil." });
    }

    saveFinancialState();
    return res.status(201).json({ memory, universalMemory: financialState.universalMemory });
  } catch (error) {
    console.error("[memory] Error agregando memoria:", error);
    return res.status(500).json({ error: "No se pudo agregar la memoria." });
  }
});

app.delete("/memory/:id", (req, res) => {
  const before = financialState.universalMemory?.length || 0;
  financialState.universalMemory = (financialState.universalMemory || []).filter(
    (memory) => memory.id !== req.params.id
  );

  if ((financialState.universalMemory?.length || 0) === before) {
    return res.status(404).json({ error: "Memoria no encontrada." });
  }

  saveFinancialState();
  return res.json({ ok: true, universalMemory: financialState.universalMemory });
});

app.post("/memory/search", (req, res) => {
  const { query = "" } = req.body || {};
  res.json(searchMemory(query));
});

app.get("/learning-profile", (req, res) => {
  res.json(financialState.learningProfile);
});

app.post("/learning/evolve", (req, res) => {
  try {
    res.json(evolveRecommendations());
  } catch (error) {
    console.error("[learning] Error evolucionando recomendaciones:", error);
    res.status(500).json({ error: "No se pudo analizar la evolución." });
  }
});

app.post("/learning/confirm-change", (req, res) => {
  try {
    const { changeId } = req.body || {};
    const confirmedChange = confirmLearningChange(changeId);

    if (!confirmedChange) {
      return res.status(404).json({ error: "Cambio no encontrado." });
    }

    return res.json({
      confirmedChange,
      financialData: financialState,
      learningProfile: financialState.learningProfile
    });
  } catch (error) {
    console.error("[learning] Error confirmando cambio:", error);
    return res.status(500).json({ error: "No se pudo confirmar el cambio." });
  }
});

app.get("/mission", (req, res) => {
  res.json(generateDailyMission());
});

app.post("/mission/complete", (req, res) => {
  const mission = generateDailyMission();
  mission.status = "completed";
  mission.completedAt = new Date().toISOString();
  saveFinancialState();
  res.json({ dailyMission: mission, financialData: financialState });
});

app.post("/simulate", (req, res) => {
  try {
    res.json(simulateFuture(req.body?.days));
  } catch (error) {
    console.error("[simulate] Error:", error);
    res.status(500).json({ error: "No se pudo simular el futuro." });
  }
});

app.post("/apply-strategy", (req, res) => {
  try {
    const { optionId } = req.body || {};
    const result = applyStrategyOption(optionId);

    if (!result) {
      return res.status(404).json({
        error: "No encontré esa opción estratégica pendiente.",
        financialData: financialState
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("[strategy] Error aplicando estrategia:", error);
    return res.status(500).json({
      error: "No se pudo aplicar la estrategia.",
      financialData: financialState
    });
  }
});

app.post("/confirm-action", (req, res) => {
  try {
    const { actionId, confirm } = req.body || {};
    const action = (financialState.pendingActions || []).find((item) => item.id === actionId);

    if (!action) {
      return res.status(404).json({
        error: "Acción pendiente no encontrada.",
        validationError: true,
        financialData: financialState
      });
    }

    const hasValidActionData =
      ["income", "expense"].includes(action.intent) && Number(action.amount) > 0;

    if (confirm && !hasValidActionData) {
      return res.status(400).json({
        error: "La accion pendiente no tiene datos suficientes para confirmarse.",
        validationError: true,
        financialData: financialState
      });
    }

    financialState.pendingActions = (financialState.pendingActions || []).filter(
      (item) => item.id !== actionId
    );

    if (!confirm) {
      saveFinancialState();
      return res.json({ cancelled: true, financialData: financialState });
    }

    let movement = null;
    if (action.intent === "income" && action.amount) {
      movement = parseFinancialMessage(`me entraron ${action.amount}`);
    } else if (action.intent === "expense" && action.amount) {
      movement = parseFinancialMessage(`pague ${action.sourceMessage} ${action.amount}`);
    } else {
      saveFinancialState();
      return res.status(400).json({
        error: "La accion pendiente no tiene suficiente informacion para aplicarse.",
        financialData: financialState
      });
    }

    const alerts = checkFinancialAlerts();
    const mistakes = detectFinancialMistakes();
    const dailyMission = updateMissionProgress();
    analyzeUserPatterns();
    saveFinancialState();

    return res.json({
      confirmed: true,
      movement,
      financialData: financialState,
      alerts,
      mistakes,
      dailyMission
    });
  } catch (error) {
    console.error("[confirm-action] Error:", error);
    return res.status(500).json({ error: "No se pudo confirmar la acción.", financialData: financialState });
  }
});

app.post("/ask-ai", async (req, res) => {
  try {
    const { question = "" } = req.body || {};
    financialState.userInteractionCount = Number(financialState.userInteractionCount || 0) + 1;
    addConversationMemory("user", question);

    if (
      isAiOnboardingStartRequest(question) &&
      !(financialState.onboarding?.mode === "ai_test" && financialState.onboarding.completed === false)
    ) {
      const result = startAiOnboarding();
      addConversationMemory("assistant", result.answer);
      return res.json({
        answer: result.answer,
        financialData: financialState,
        onboarding: financialState.onboarding,
        onboardingReview: false,
        quickReplies: ["Trabajo", "Amazon Flex", "Instawork", "Efectivo"],
        decision: "onboarding",
        pendingAction: null,
        pendingForm: null,
        detectedIntent: "onboarding_start",
        intentSource: "onboarding"
      });
    }

    if (financialState.onboarding?.mode === "ai_test" && financialState.onboarding.completed === false) {
      const onboardingResult = handleAiOnboardingAnswer(question);
      addConversationMemory("assistant", onboardingResult.answer);
      return res.json({
        answer: onboardingResult.answer,
        financialData: financialState,
        onboarding: financialState.onboarding,
        onboardingReview: onboardingResult.onboardingReview || false,
        quickReplies: onboardingResult.quickReplies || ["Sí", "No", "No sé", "Después"],
        decision: "onboarding",
        pendingAction: null,
        pendingForm: null,
        detectedIntent: "onboarding",
        intentSource: "onboarding"
      });
    }

    generateDailyMission();
    applyAutomaticFinancialMode();

    const adminAction = detectAdministrativeAction(question);
    if (adminAction) {
      const answer =
        adminAction.type === "delete_debt"
          ? "Antes de borrar una deuda necesito confirmación. Abre la deuda en el panel y toca Eliminar."
          : adminAction.type === "edit_debt"
            ? "Abrí el formulario para modificar esa deuda. Actualiza los datos y guarda."
            : "Abrí el formulario correcto. Lo guardo solo cuando completes los datos clave.";
      return res.json({
        answer,
        financialData: financialState,
        decision: "admin_action",
        pendingAction: null,
        pendingForm: adminAction.form || (adminAction.type === "edit_debt" ? "debt" : null),
        formData: adminAction.debt || null,
        detectedIntent: adminAction.type,
        intentSource: "admin_action"
      });
    }

    if (isFinancialBrainQuestion(question)) {
      const relevantMemory = searchMemory(question, 8);
      const brainResponse = buildFinancialBrainResponse(question, financialState, {
        intent: "financial_brain",
        relevantMemory,
        conversationMemory: financialState.conversationMemory || []
      });
      const alerts = checkFinancialAlerts();
      const mistakes = detectFinancialMistakes();
      const dailyMission = updateMissionProgress();
      const coachMessage = generateCoachMessage();

      addConversationMemory("assistant", brainResponse.answer);
      saveFinancialState();

      return res.json({
        answer: brainResponse.answer,
        financialData: financialState,
        alerts,
        autoPlan: null,
        decision: brainResponse.decision,
        riskLevel: brainResponse.riskLevel,
        safeToSpend: brainResponse.safeToSpend,
        why: brainResponse.why,
        actions: brainResponse.actions,
        quickReplies: brainResponse.quickReplies,
        financialBrain: brainResponse,
        dailySummary: brainResponse.dailySummary,
        coachMessage,
        dailyMission,
        pendingAction: null,
        relevantMemory,
        mistakes,
        learningProfile: financialState.learningProfile,
        learningEvent: financialState.learningProfile.patterns?.[0] || null,
        detectedIntent: "financial_brain",
        intentSource: "financial_brain",
        debug: "FINANCIAL_BRAIN_ACTIVE"
      });
    }

    const processed = processMessage(question);

    let aiDetectedIntent = null;

    // Forzar fallback IA si intent no es válido
    if (!processed.intent || processed.intent === "unknown" || processed.intent === "pending_action") {
      aiDetectedIntent = await detectIntentWithAI(question);
    }

    // CLAVE: FORZAR SIEMPRE SI IA detecta algo
    if (aiDetectedIntent && aiDetectedIntent !== "unknown") {
      processed.intent = aiDetectedIntent;
    }

    // Asegurar valor mínimo
    if (!processed.intent) {
      processed.intent = "unknown";
    }

    processed.intentSource = aiDetectedIntent ? "ai_fallback" : "local_parser";

    // BLOQUE PRIORITARIO
    const advisoryIntents = ["debt_payment", "advice", "strategy", "goal"];

    if (advisoryIntents.includes(processed.intent)) {
      console.log("ADVISORY FLOW EJECUTADO:", processed.intent);

      const answer = await askOpenAI(question, {
        ...processed,
        intent: processed.intent
      });

      addConversationMemory("assistant", answer);
      saveFinancialState();

      return res.json({
        answer,
        financialData: financialState,
        decision: "advice",
        pendingAction: null,
        dailySummary: buildDailySummary(),
        detectedIntent: processed.intent,
        intentSource: processed.intentSource,
        debug: "ADVISORY_FLOW_ACTIVE"
      });
    }

    if (processed.intent === "unknown") {
      const answer = openai
        ? await askOpenAI(question, {
            ...processed,
            intent: processed.intent
          })
        : JSON.stringify({
            answer: "No tengo suficiente contexto para clasificar esto como acción financiera.",
            intent: "unknown",
            diagnosis: "La intención no es clara.",
            recommendedAction: "Dime si estás hablando de ingreso, gasto, pago de deuda, meta o consejo.",
            needsMoreInfo: true,
            questionToUser: "¿Esto es ingreso, gasto, pago de deuda, meta o consejo?",
            riskLevel: "low",
            decision: null
          });

      addConversationMemory("assistant", answer);
      saveFinancialState();

      return res.json({
        answer,
        financialData: financialState,
        decision: "advice",
        pendingAction: null,
        dailySummary: buildDailySummary(),
        detectedIntent: processed.intent,
        intentSource: processed.intentSource
      });
    }

    processed.relevantMemory = searchMemory(question, 8);
    processed.conversationMemory = financialState.conversationMemory || [];
    const alerts = processed.intent === "strategy" ? financialState.alerts || [] : checkFinancialAlerts();
    const autoPlan = processed.movement?.autoPlan || null;
    const decision = processed.movement?.decision || null;
    const missingFields = processed.missingFields || null;
    const debtAction = processed.debtAction || null;
    const mistakes = detectFinancialMistakes();
    const dailyMission = updateMissionProgress();
    const coachMessage = generateCoachMessage();
    const pendingAction = processed.pendingAction || null;
    const pendingForm = processed.pendingForm || null;

    if (processed.intent !== "strategy") {
      saveFinancialState();
    }
    const answer = await askOpenAI(question, processed);
    addConversationMemory("assistant", answer);
    saveFinancialState();

    res.json({
      answer,
      financialData: financialState,
      alerts,
      autoPlan,
      decision,
      missingFields,
      debtAction,
      strategyOptions: processed.strategyOptions || null,
      coachMessage,
      dailyMission,
      pendingAction,
      pendingForm,
      preloadedDebt: processed.preloadedDebt || null,
      relevantMemory: processed.relevantMemory,
      mistakes,
      learningProfile: financialState.learningProfile,
      learningEvent: financialState.learningProfile.patterns?.[0] || null,
      dailySummary: buildDailySummary(),
      intentSource: processed.intentSource,
      detectedIntent: processed.intent || "unknown"
    });
  } catch (error) {
    console.error("[ask-ai] Error:", error);
    res.status(500).json({
      answer: "Ocurrió un error procesando tu mensaje.",
      financialData: financialState,
      alerts: financialState.alerts || [],
      autoPlan: null,
      decision: null,
      missingFields: null,
      debtAction: null,
      strategyOptions: null,
      coachMessage: null,
      dailyMission: financialState.dailyMission,
      pendingAction: null,
      relevantMemory: [],
      mistakes: financialState.mistakes || [],
      learningProfile: financialState.learningProfile,
      learningEvent: null,
      intentSource: "local_parser",
      detectedIntent: "unknown"
    });
  }
});

app.put("/debt/:name", (req, res) => {
  try {
    const debtName = decodeURIComponent(req.params.name);
    const updates = req.body || {};
    const debt = (financialState.debts || []).find(
      (d) => normalizeMemoryText(d.name) === normalizeMemoryText(debtName)
    );

    if (!debt) {
      return res.status(404).json({ error: "Deuda no encontrada." });
    }

    if (updates.name) debt.name = String(updates.name).trim();
    if (updates.amount !== undefined) debt.amount = roundMoney(Number(updates.amount || 0));
    if (updates.minimumPayment !== undefined) debt.minimumPayment = roundMoney(Number(updates.minimumPayment || 0));
    if (updates.frequency) debt.frequency = updates.frequency;
    if (updates.dueDate) debt.dueDate = updates.dueDate;
    if (updates.apr !== undefined) debt.apr = Number(updates.apr || 0);
    if (updates.note !== undefined) debt.note = updates.note;
    if (updates.type) debt.type = updates.type;
    debt.updatedAt = new Date().toISOString();

    saveFinancialState();
    return res.json({ ok: true, debt, financialData: financialState });
  } catch (error) {
    console.error("[debt] Error editando deuda:", error);
    return res.status(500).json({ error: "No se pudo editar la deuda." });
  }
});

app.delete("/debt/:name", (req, res) => {
  try {
    const debtName = decodeURIComponent(req.params.name);
    const before = (financialState.debts || []).length;
    financialState.debts = (financialState.debts || []).filter(
      (d) => normalizeMemoryText(d.name) !== normalizeMemoryText(debtName)
    );

    if (financialState.debts.length === before) {
      return res.status(404).json({ error: "Deuda no encontrada." });
    }

    saveFinancialState();
    return res.json({ ok: true, financialData: financialState });
  } catch (error) {
    console.error("[debt] Error eliminando deuda:", error);
    return res.status(500).json({ error: "No se pudo eliminar la deuda." });
  }
});

app.get("/financial-calendar", (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const upcomingPayments = (financialState.debts || [])
      .filter(d => Number(d.amount || 0) > 0 && d.dueDate)
      .map(d => ({
        name: d.name,
        amount: d.minimumPayment || d.amount,
        dueDate: d.dueDate,
        type: "debt",
        overdue: d.dueDate < todayStr
      }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const recurringExpenses = (financialState.recurringPayments || []).map(r => ({
      name: r.name || r.description,
      amount: r.amount,
      frequency: r.frequency,
      type: "recurring"
    }));

    const goalProgress = financialState.goal ? {
      name: financialState.goal.name || "Casa Colombia",
      saved: financialState.goal.saved || 0,
      target: financialState.goal.target || 0,
      dailyNeeded: financialState.goal.dailyNeeded || null
    } : null;

    const debtPayoffDates = (financialState.debts || [])
      .filter(d => Number(d.amount || 0) > 0 && d.minimumPayment)
      .map(d => ({
        name: d.name,
        ...estimateDebtPayoff(d)
      }));

    return res.json({
      today: todayStr,
      upcomingPayments,
      recurringExpenses,
      goalProgress,
      debtPayoffDates,
      alerts: financialState.alerts || [],
      dailyMission: financialState.dailyMission || null
    });
  } catch (error) {
    console.error("[calendar] Error:", error);
    return res.status(500).json({ error: "No se pudo cargar el calendario." });
  }
});


app.listen(port, () => {
  console.log(`Johan AI backend escuchando en http://localhost:${port}`);
});
