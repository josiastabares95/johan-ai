import proxyRequest from "../_proxy.js";

export default function handler(req, res) {
  return proxyRequest(req, res, "auth/login");
}
