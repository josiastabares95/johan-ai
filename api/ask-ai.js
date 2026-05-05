import proxyRequest from "./_proxy.js";

const AI_ONBOARDING_START_ANSWER =
  "🔥 Vamos a reconstruir tu estado financiero paso a paso. Primero elige tu objetivo principal.";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body || {};
}

function isAiOnboardingStartRequest(question) {
  const rawText = String(question || "").toLowerCase();
  const text = normalizeText(question);
  return (
    (rawText.includes("test") && rawText.includes("ia")) ||
    ["hacer test", "test financiero", "test con ia", "hacer test con ia", "test financiero con ia", "reconstruir mi estado financiero", "reconstruir estado financiero"].some((phrase) =>
      text.includes(phrase)
    )
  );
}

export default function handler(req, res) {
  const body = getBody(req);
  if (req.method === "POST" && isAiOnboardingStartRequest(body.question)) {
    return proxyRequest(req, res, "onboarding", {
      bodyOverride: { action: "ai_test", mode: "ai_test", data: {} },
      transformJson: (json) => ({
        ...json,
        answer: AI_ONBOARDING_START_ANSWER,
        onboardingReview: false,
        quickReplies: ["Comprar casa", "Comprar carro", "Salir de deudas", "Fondo de emergencia"],
        decision: "onboarding",
        pendingAction: null,
        pendingForm: null,
        detectedIntent: "onboarding_start",
        intentSource: "vercel_onboarding_start"
      })
    });
  }

  return proxyRequest(req, res, "ask-ai");
}
