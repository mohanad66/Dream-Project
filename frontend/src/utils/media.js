import api from "../services/api";

// The Media storage lives on the API origin. DRF returns relative paths
// (e.g. "/media/products/x.jpg") when the serializer context has no request,
// which would 404 on the Vercel origin. Resolve any relative path to an
// absolute URL pointing at the API.
const API_ORIGIN = (() => {
  try {
    return new URL(api.defaults.baseURL).origin;
  } catch {
    return "https://legislative-lynelle-idk1321-fdbb6c71.koyeb.app";
  }
})();

export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  const t = url.trim();
  if (!t) return "";
  if (/^(https?:)?\/\//.test(t) || t.startsWith("data:") || t.startsWith("blob:")) {
    return t;
  }
  return API_ORIGIN + (t.startsWith("/") ? t : `/${t}`);
}