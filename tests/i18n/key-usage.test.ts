/**
 * i18n key-usage guard: every translation key a component actually references
 * must exist in BOTH locale catalogs.
 *
 * This is the dynamic counterpart of the static key lists in
 * tests/mobile-ui/i18n-keys.test.ts and tests/i18n/locale-parity.test.ts:
 * those pin known contracts, this one follows the CODE. If a component calls
 * `t('some.key')` and `some.key` is missing from `bg.json` AND `en.json`, the
 * app renders the raw key to the user (src/i18n/catalog.ts createTranslator:
 * "missing everywhere -> the key itself") — this test fails first.
 *
 * It caught the DEC-018 rename regression: `ScreenStatesPreview` still called
 * `t('common.states_demo')` after the lead moved that copy to
 * `scaffold.states_preview` (see the review report, 2026-10-24).
 *
 * Sources of key references covered:
 *  1. string literals passed to `t(...)` / `translate(...)` in the src tree;
 *  2. key registries: src/i18n/keys.ts, each translationKeys.ts under
 *     src/features, and onboardingSteps.ts (titleKey/bodyKey values).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import bg from '../../src/i18n/locales/bg.json';
import en from '../../src/i18n/locales/en.json';

const catalogs = { bg: bg as Record<string, string>, en: en as Record<string, string> };

const SRC_ROOT = path.join(process.cwd(), 'src');

/** Flat dot-separated translation-key shape (DEC-016 §1). */
const KEY_SHAPE = /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/;

/** Registry files whose `key: 'value'` entries are translation keys. */
const REGISTRY_FILES = [
  'i18n/keys.ts',
  'features/stations/translationKeys.ts',
  'features/onboarding/onboardingSteps.ts',
];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'locales') continue;
      out.push(...listSourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Strip comments so documented examples do not count as usages. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function extractReferencedKeys(file: string, source: string): string[] {
  const keys: string[] = [];
  const isRegistry = REGISTRY_FILES.some((rel) => file.endsWith(rel));

  // 1. Literal arguments of t(...) / translate(locale, key).
  for (const match of source.matchAll(/\b(?:t|translate)\(\s*['"]([^'"]+)['"]/g)) {
    if (KEY_SHAPE.test(match[1])) keys.push(match[1]);
  }
  for (const match of source.matchAll(
    /\btranslate\(\s*['"][a-z]{2}['"]\s*,\s*['"]([^'"]+)['"]/g,
  )) {
    if (KEY_SHAPE.test(match[1])) keys.push(match[1]);
  }

  // 2. Registry entries (`someKey: 'namespace.key'`).
  if (isRegistry) {
    for (const match of source.matchAll(/:\s*['"]([a-z0-9_]+(?:\.[a-z0-9_]+)+)['"]/g)) {
      keys.push(match[1]);
    }
  }
  return keys;
}

function collectUsages(): Map<string, string[]> {
  const usages = new Map<string, string[]>();
  for (const file of listSourceFiles(SRC_ROOT)) {
    const source = stripComments(fs.readFileSync(file, 'utf8'));
    for (const key of extractReferencedKeys(file, source)) {
      const rel = path.relative(process.cwd(), file);
      usages.set(key, [...(usages.get(key) ?? []), rel]);
    }
  }
  return usages;
}

describe('i18n key usage by components (dynamic)', () => {
  const usages = collectUsages();

  it('finds translation-key usages in the source tree (scanner sanity)', () => {
    // A tautological scanner would pass on an empty tree; pin that it sees
    // real usages from real files.
    expect(usages.size).toBeGreaterThan(50);
    expect(usages.get('common.retry')).toContain('src/components/ErrorState.tsx');
  });

  it('has every referenced key in the en catalog', () => {
    const missing = [...usages.entries()]
      .filter(([key]) => !(key in catalogs.en))
      .map(([key, files]) => `${key} (used in ${files.join(', ')})`);
    expect(missing).toEqual([]);
  });

  it('has every referenced key in the bg catalog', () => {
    const missing = [...usages.entries()]
      .filter(([key]) => !(key in catalogs.bg))
      .map(([key, files]) => `${key} (used in ${files.join(', ')})`);
    expect(missing).toEqual([]);
  });

  it('never renders a referenced key as its own fallback (both catalogs)', () => {
    // The visible failure mode of a missing key: the UI shows "a.b.c".
    const untranslatable = [...usages.entries()]
      .filter(([key]) => !(key in catalogs.en) && !(key in catalogs.bg))
      .map(([key]) => key);
    expect(untranslatable).toEqual([]);
  });
});
