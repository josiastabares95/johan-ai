export const mockFinancialData = {
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
  transactions: [],
  conversationMemory: [],
  decisions: [],
  alerts: [],
  mistakes: [],
  allocations: [],
  allocationOverrides: {},
  pendingStrategyOptions: [],
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
    flow: null,
    currentStep: null,
    collected: {},
    futureSteps: []
  }
};
