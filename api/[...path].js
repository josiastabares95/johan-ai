import proxyRequest from "./_proxy.js";

export default function handler(req, res) {
  const routePath = Array.isArray(req.query.path)
    ? req.query.path.join("/")
    : String(req.query.path || "");

  return proxyRequest(req, res, routePath);
}
