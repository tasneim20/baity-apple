/**
 * governorateUtils.ts
 * ──────────────────────────────────────────────────────────────────────
 * Unified governorate normalization utility.
 *
 * Problem solved:
 *   - Admin CSV properties store governorate as English ID: "amman", "zarqa" …
 *   - User-added properties store the Arabic name: "عمان", "الزرقاء" …
 *   - This mismatch caused filtering, map counts, and recommendations
 *     to silently exclude user-added properties.
 *
 * Solution:
 *   normalizeGov() maps every known Arabic/English variant → canonical
 *   English ID ("amman", "zarqa", …).
 *   sameGov(a, b) returns true when two governorate strings refer to
 *   the same governorate regardless of spelling or language.
 * ──────────────────────────────────────────────────────────────────────
 */

/** Canonical English ID for every known Arabic / English variant. */
const GOV_CANONICAL: Record<string, string> = {
  // ── Amman ───────────────────────────────────────────────────────────
  amman: "amman",
  "عمان": "amman",
  "عمّان": "amman",     // with shadda
  "عمّان": "amman",     // alternative encoding
  Amman: "amman",
  amman: "amman",

  // ── Zarqa ───────────────────────────────────────────────────────────
  zarqa: "zarqa",
  "الزرقاء": "zarqa",
  Zarqa: "zarqa",

  // ── Irbid ───────────────────────────────────────────────────────────
  irbid: "irbid",
  "إربد": "irbid",
  "اربد": "irbid",       // without hamza (common typo)
  Irbid: "irbid",

  // ── Aqaba ───────────────────────────────────────────────────────────
  aqaba: "aqaba",
  "العقبة": "aqaba",
  Aqaba: "aqaba",

  // ── Mafraq ──────────────────────────────────────────────────────────
  mafraq: "mafraq",
  "المفرق": "mafraq",
  Mafraq: "mafraq",

  // ── Balqa ───���───────────────────────────────────────────────────────
  balqa: "balqa",
  "البلقاء": "balqa",
  Balqa: "balqa",

  // ── Karak ───────────────────────────────────────────────────────────
  karak: "karak",
  "الكرك": "karak",
  Karak: "karak",

  // ── Madaba ──────────────────────────────────────────────────────────
  madaba: "madaba",
  "مادبا": "madaba",     // no hamza (used in mockData)
  "مأدبا": "madaba",     // with hamza (used in server / SimilarProperties)
  Madaba: "madaba",

  // ── Jerash ──────────────────────────────────────────────────────────
  jerash: "jerash",
  "جرش": "jerash",
  Jerash: "jerash",

  // ── Ajloun ──────────────────────────────────────────────────────────
  ajloun: "ajloun",
  "عجلون": "ajloun",
  Ajloun: "ajloun",

  // ── Ma'an ───────────────────────────────────────────────────────────
  maan: "maan",
  "معان": "maan",
  "Ma'an": "maan",
  "Maan": "maan",

  // ── Tafilah ─────────────────────────────────────────────────────────
  tafilah: "tafilah",
  "الطفيلة": "tafilah",
  "الطفيله": "tafilah",   // alternate spelling
  Tafilah: "tafilah",
  Tafileh: "tafilah",
};

/** Strip Arabic tashkeel (diacritics) for fuzzy matching. */
function stripDiacritics(text: string): string {
  return text.normalize("NFC").replace(/[\u064B-\u065F\u0670]/g, "");
}

/**
 * Normalize a governorate string → canonical English ID.
 * Falls back to the lower-cased, diacritic-stripped input when
 * no mapping is found (future-proofing against new values).
 */
export function normalizeGov(gov: string | undefined | null): string {
  if (!gov) return "";
  const trimmed = gov.trim();

  // 1. Direct lookup (handles the vast majority of cases)
  if (GOV_CANONICAL[trimmed] !== undefined) return GOV_CANONICAL[trimmed];

  // 2. Stripped-diacritics lookup
  const stripped = stripDiacritics(trimmed);
  if (GOV_CANONICAL[stripped] !== undefined) return GOV_CANONICAL[stripped];

  // 3. Case-insensitive English lookup
  const lower = stripped.toLowerCase();
  if (GOV_CANONICAL[lower] !== undefined) return GOV_CANONICAL[lower];

  // 4. Fallback: return lower-cased stripped version
  return lower;
}

/**
 * Returns true when two governorate strings refer to the same governorate,
 * regardless of language (Arabic / English) or spelling variant.
 */
export function sameGov(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;                        // fast path
  return normalizeGov(a) === normalizeGov(b);
}

/**
 * Count properties per governorate from an arbitrary array.
 * Returns a map of canonical governorate ID → count.
 */
export function countPropertiesByGov(properties: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of properties) {
    if (!p?.governorate) continue;
    const id = normalizeGov(p.governorate);
    if (id) counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

/**
 * Returns the count of properties for a single governorate ID.
 * Convenience wrapper around countPropertiesByGov.
 */
export function countForGov(properties: any[], govId: string): number {
  const counts = countPropertiesByGov(properties);
  return counts[govId] || 0;
}

/**
 * Resolve the best available date field from a property object.
 * The server stores `createdAt` (camelCase) but some old records
 * or mock data may use `created_at` (snake_case).
 */
export function getPropertyDate(p: any): number {
  const raw = p?.createdAt || p?.created_at || p?.submittedAt || p?.approvedAt || null;
  if (!raw) return 0;
  const ts = new Date(raw).getTime();
  return isNaN(ts) ? 0 : ts;
}