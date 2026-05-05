import proxyRequest from "./_proxy.js";

const AI_ONBOARDING_START_ANSWER =
  "🔥 Vamos a reconstruir tu estado financiero paso a paso. Primero elige tu objetivo principal.";

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

export default function handler(req, res) {
  const body = getBody(req);
  if (req.method === "POST" && (body.action === "ai_test" || body.mode === "ai_test")) {
    return proxyRequest(req, res, "onboarding", {
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

  return proxyRequest(req, res, "onboarding");
}
