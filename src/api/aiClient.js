const API_BASE_URL = "https://johan-ai-backend.onrender.com";

let authToken = localStorage.getItem("johanAuthToken") || "";

export function setAuthToken(token) {
  authToken = token || "";
  if (authToken) {
    localStorage.setItem("johanAuthToken", authToken);
  } else {
    localStorage.removeItem("johanAuthToken");
  }
}

export function getAuthToken() {
  return authToken;
}

async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers
      },
      ...options
    });
  } catch {
    const networkError = new Error("No hay conexion con el backend de Johan AI.");
    networkError.isNetworkError = true;
    throw networkError;
  }

  if (!response.ok) {
    let errorMessage = `El servidor respondio con estado ${response.status}.`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Use the generic status message when the backend does not return JSON.
    }
    const httpError = new Error(errorMessage);
    httpError.status = response.status;
    httpError.isValidationError = response.status >= 400 && response.status < 500;
    throw httpError;
  }

  return response.json();
}

export function registerUser(email, password) {
  return requestJson("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function loginUser(email, password) {
  return requestJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function getHealth() {
  return requestJson("/health");
}

export async function askJohanAI(question, financialData) {
  const data = await requestJson("/ask-ai", {
    method: "POST",
    body: JSON.stringify({
      question,
      financialData
    })
  });

  if (typeof data === "string") {
    return {
      answer: data,
      financialData: null,
      alerts: [],
      autoPlan: null,
      decision: null,
      strategyOptions: null,
      learningProfile: null,
      learningEvent: null
    };
  }

  const isAdvisoryResponse = data.decision === "advice";
  let answerText =
    data.answer ||
    data.response ||
    data.message ||
    "Recibi una respuesta, pero no encontre texto para mostrar.";

  if (typeof answerText === "string" && answerText.trim().startsWith("{")) {
    try {
      const parsedAnswer = JSON.parse(answerText);
      answerText = parsedAnswer.answer || parsedAnswer.questionToUser || answerText;
    } catch {
      // Keep original text when it is not valid JSON.
    }
  }

  return {
    answer: answerText,
    financialData: data.financialData || null,
    alerts: data.alerts || data.financialData?.alerts || [],
    autoPlan: data.autoPlan || null,
    decision: data.decision || null,
    missingFields: data.missingFields || null,
    debtAction: data.debtAction || null,
    strategyOptions: data.strategyOptions || null,
    coachMessage: data.coachMessage || null,
    dailyMission: data.dailyMission || data.financialData?.dailyMission || null,
    pendingAction: isAdvisoryResponse ? null : data.pendingAction || null,
    pendingForm: data.pendingForm || null,
    relevantMemory: data.relevantMemory || [],
    mistakes: data.mistakes || data.financialData?.mistakes || [],
    learningProfile: data.learningProfile || data.financialData?.learningProfile || null,
    learningEvent: data.learningEvent || null,
    financialBrain: data.financialBrain || null,
    dailySummary: data.dailySummary || data.financialBrain?.dailySummary || null,
    preloadedDebt: data.preloadedDebt || null,
    detectedIntent: data.detectedIntent || "unknown",
    intentSource: data.intentSource || "unknown",
    debug: data.debug || null
  };
}

export function updateOnboarding(action, data = {}) {
  return requestJson("/onboarding", {
    method: "POST",
    body: JSON.stringify({ action, data })
  });
}

export function submitFinancialEntry(type, data) {
  return requestJson("/financial-entry", {
    method: "POST",
    body: JSON.stringify({ type, data })
  });
}

export function applyStrategy(optionId) {
  return requestJson("/apply-strategy", {
    method: "POST",
    body: JSON.stringify({ optionId })
  });
}

export function updateMode(mode) {
  return requestJson("/mode", {
    method: "POST",
    body: JSON.stringify({ mode })
  });
}

export function getFinancialState() {
  return requestJson("/financial-state");
}

export function exportData() {
  return requestJson("/export-data");
}

export function resetDemoData(confirm = false) {
  return requestJson("/reset-demo-data", {
    method: "POST",
    body: JSON.stringify({ confirm })
  });
}

export function getTransactions() {
  return requestJson("/transactions");
}

export function getMemory() {
  return requestJson("/memory");
}

export function searchMemory(query) {
  return requestJson("/memory/search", {
    method: "POST",
    body: JSON.stringify({ query })
  });
}

export function deleteMemory(id) {
  return requestJson(`/memory/${id}`, {
    method: "DELETE"
  });
}

export function getLearningProfile() {
  return requestJson("/learning-profile");
}

export function evolveLearning() {
  return requestJson("/learning/evolve", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function confirmLearningChange(changeId) {
  return requestJson("/learning/confirm-change", {
    method: "POST",
    body: JSON.stringify({ changeId })
  });
}

export function getMission() {
  return requestJson("/mission");
}

export function completeMission() {
  return requestJson("/mission/complete", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function confirmPendingAction(actionId, confirm) {
  return requestJson("/confirm-action", {
    method: "POST",
    body: JSON.stringify({ actionId, confirm })
  });
}

export function simulateFuture(days = 30) {
  return requestJson("/simulate", {
    method: "POST",
    body: JSON.stringify({ days })
  });
}

export function editDebt(name, data) {
  return requestJson(`/debt/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deleteDebt(name) {
  return requestJson(`/debt/${encodeURIComponent(name)}`, {
    method: "DELETE"
  });
}

export function getFinancialCalendar() {
  return requestJson("/financial-calendar");
}
