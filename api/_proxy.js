const BACKEND_URL = "https://johan-ai-backend.onrender.com";

function buildTargetUrl(req, routePath) {
  const query = new URLSearchParams();
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (key === "path") return;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value !== undefined) {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  return `${BACKEND_URL}/${routePath}${queryString ? `?${queryString}` : ""}`;
}

export default async function proxyRequest(req, res, routePath) {
  try {
    const headers = {
      "Content-Type": req.headers["content-type"] || "application/json"
    };

    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const hasBody = !["GET", "HEAD"].includes(req.method);
    const response = await fetch(buildTargetUrl(req, routePath), {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body || {}) : undefined
    });

    const contentType = response.headers.get("content-type") || "";
    res.status(response.status);

    if (contentType.includes("application/json")) {
      return res.json(await response.json());
    }

    return res.send(await response.text());
  } catch (error) {
    console.error("[vercel-api-proxy] Error:", error);
    return res.status(500).json({
      error: "No se pudo conectar con el backend de Johan AI."
    });
  }
}
