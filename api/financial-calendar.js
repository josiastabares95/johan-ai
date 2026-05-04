import proxyRequest from "./_proxy.js";

export default function handler(req, res) {
  return proxyRequest(req, res, "financial-calendar");
}
