// Filter out obvious placeholders / dev-junk entries so shoppers never see
// test content in the feed, shorts, or trending surfaces.

const JUNK_PATTERNS = [
  /wwwweawa/i,
  /build a web product/i,
  /react\/django portfolio/i,
  /\bdummy\b/i,
  /lorem ipsum/i,
  /\bplaceholder\b/i,
  /\btest product\b/i,
];

const SHORT_JUNK = /^(test|demo|product|item|w)$/i;

export function isJunkText(text) {
  if (typeof text !== "string") return true;
  const t = text.trim();
  if (!t) return true;
  if (JUNK_PATTERNS.some((rx) => rx.test(t))) return true;
  return false;
}

export function isJunkProduct(p) {
  if (!p || typeof p !== "object") return true;
  const name = String(p.name || "").trim();
  if (!name) return true;
  if (isJunkText(name)) return true;
  if (SHORT_JUNK.test(name)) return true;
  // Gibberish names consisting of a single repeated character run (e.g. "wwwweawa")
  if (/(.)\1{2,}/i.test(name)) return true;
  return false;
}

export function cleanProducts(list) {
  return (Array.isArray(list) ? list : []).filter((p) => !isJunkProduct(p));
}

export function cleanFeedItems(list) {
  return (Array.isArray(list) ? list : []).filter((item) => {
    if (!item || typeof item !== "object") return false;
    const isOffer =
      item.offer_type !== undefined ||
      item.discount_percent !== undefined ||
      (item.title && item.product === null);
    if (isOffer) return !isJunkText(item.title);
    return !isJunkProduct(item);
  });
}

export function cleanSellers(list) {
  return (Array.isArray(list) ? list : []).filter(
    (s) => s && !isJunkText(s.business_name),
  );
}