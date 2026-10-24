/**
 * Text normalization for station search (addbeforerelease.txt section 8:
 * "Cyrillic and Latin search both work (incl. mixed input)").
 *
 * Matching must be:
 * - case-insensitive (Cyrillic and Latin),
 * - diacritic-insensitive for Latin input ("Dëmo" matches "Demo"),
 * - script-tolerant: Latin input may match Cyrillic names and vice versa.
 *
 * Strategy: for every piece of text we build TWO normalized forms:
 *   1. the plain normalized form (lowercased, diacritics stripped, spaces
 *      collapsed), and
 *   2. a Latin-transliterated form (Cyrillic -> Latin, deterministic
 *      Bulgarian transliteration; Latin text passes through unchanged).
 * A query token matches if it (or its transliteration) is a substring of
 * either form. This makes "sofiya"/"софия" style input work in both
 * directions while staying deterministic and dependency-free.
 *
 * The transliteration is search-quality only (e.g. "q"/"w" have no Cyrillic
 * equivalent and pass through). It never rewrites displayed text.
 */

const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Bulgarian Cyrillic -> Latin transliteration (search index only).
 * Multi-character mappings are applied before single ones (replace by
 * regex alternation, longest first).
 */
const CYRILLIC_TO_LATIN: readonly (readonly [RegExp, string])[] = [
  [/щ/g, 'sht'],
  [/ь/g, 'y'],
  [/ъ/g, 'a'],
  [/ю/g, 'yu'],
  [/я/g, 'ya'],
  [/ж/g, 'zh'],
  [/ч/g, 'ch'],
  [/ш/g, 'sh'],
  [/ц/g, 'ts'],
  [/а/g, 'a'],
  [/б/g, 'b'],
  [/в/g, 'v'],
  [/г/g, 'g'],
  [/д/g, 'd'],
  [/е/g, 'e'],
  [/з/g, 'z'],
  [/и/g, 'i'],
  [/й/g, 'y'],
  [/к/g, 'k'],
  [/л/g, 'l'],
  [/м/g, 'm'],
  [/н/g, 'n'],
  [/о/g, 'o'],
  [/п/g, 'p'],
  [/р/g, 'r'],
  [/с/g, 's'],
  [/т/g, 't'],
  [/у/g, 'u'],
  [/ф/g, 'f'],
  [/х/g, 'h'],
  [/ѝ/g, 'i'],
];

/** Lowercase, strip Latin diacritics, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministic Bulgarian Cyrillic -> Latin transliteration, applied to
 * already-normalized text. Latin/other characters pass through unchanged.
 */
export function transliterateToLatin(normalized: string): string {
  let out = normalized;
  for (const [pattern, replacement] of CYRILLIC_TO_LATIN) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Both searchable forms of a piece of text. */
export interface SearchForms {
  /** Normalized original (lowercase, diacritics stripped). */
  normalized: string;
  /** Latin transliteration of the normalized form. */
  latin: string;
}

export function toSearchForms(input: string): SearchForms {
  const normalized = normalizeText(input);
  return { normalized, latin: transliterateToLatin(normalized) };
}

/**
 * Token match: the normalized token OR its transliteration must occur in
 * either haystack form. Empty tokens match everything (they are dropped by
 * the caller).
 */
export function tokenMatches(haystack: SearchForms, token: SearchForms): boolean {
  const candidates = new Set<string>([token.normalized, token.latin]);
  for (const candidate of candidates) {
    if (candidate.length === 0) continue;
    if (haystack.normalized.includes(candidate)) return true;
    if (haystack.latin.includes(candidate)) return true;
  }
  return false;
}
