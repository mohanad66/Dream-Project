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

/**
 * Resolve a video URL for playback.
 *
 * Videos are uploaded to Cloudinary as raw originals, which are typically NOT
 * fast-start: the `moov` metadata atom sits at the end of the file. Browsers
 * with `preload="metadata"` then refuse to show any frame (black box) because
 * they won't download the whole file. Asking Cloudinary for any derived
 * transform (here `q_auto`) makes it re-encode on demand into a fast-start,
 * streamable MP4, so the first frame renders immediately.
 */
export function resolveVideoUrl(url) {
  const u = resolveMediaUrl(url);
  if (!u || !u.includes("res.cloudinary.com") || !u.includes("/video/upload/")) {
    return u;
  }
  const marker = "/video/upload/";
  const i = u.indexOf(marker) + marker.length;
  if (u.startsWith("q_auto/", i)) return u;
  return u.slice(0, i) + "q_auto/" + u.slice(i);
}