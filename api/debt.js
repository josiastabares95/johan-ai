import proxyRequest from "./_proxy.js";

export default function handler(req, res) {
  const name = req.query?.name || req.body?.name || "";
  return proxyRequest(req, res, `debt/${encodeURIComponent(name)}`);
}
