export const BACKEND_URL = "https://johan-ai-backend.onrender.com";

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

export default async function proxyRequest(req, res, routePath, options = {}) {
  try {
    const headers = {
      "Content-Type": req.headers["content-type"] || "application/json"
    };

    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    if (req.headers.cookie) {
      headers.Cookie = req.headers.cookie;
    }

    const hasBody = !["GET", "HEAD"].includes(req.method);
    const body = hasBody
      ? options.bodyOverride !== undefined
        ? JSON.stringify(options.bodyOverride)
        : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {})
      : undefined;

    const response = await fetch(buildTargetUrl(req, routePath), {
      method: req.method,
      headers,
      body
    });

    const contentType = response.headers.get("content-type") || "";
    const setCookieHeaders =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie")].filter(Boolean);

    if (setCookieHeaders.length > 0) {
      res.setHeader("Set-Cookie", setCookieHeaders);
    }

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    res.status(response.status);

    if (contentType.includes("application/json")) {
      const json = await response.json();
      return res.json(options.transformJson ? options.transformJson(json) : json);
    }

    return res.send(await response.text());
  } catch (error) {
    console.error("[vercel-api-proxy] Error:", error);
    return res.status(500).json({
      error: "No se pudo conectar con el backend de Johan AI."
    });
  }
}
