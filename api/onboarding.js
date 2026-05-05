import proxyRequest from "./_proxy.js";

const AI_ONBOARDING_START_ANSWER =
  "🔥 Perfecto, vamos paso a paso. Primero necesito saber tus ingresos.\n¿Cuáles son tus fuentes de ingreso actualmente?\nEjemplo: trabajo, Instawork, Amazon Flex, efectivo, Zelle, otro.";

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
        quickReplies: ["Trabajo", "Instawork", "Amazon Flex", "Efectivo"],
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
