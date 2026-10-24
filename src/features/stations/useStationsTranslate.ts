/**
 * Translation bridge: adapts the shared i18n module (src/i18n, owned by the
 * i18n-a11y agent) to this feature's `Translate` contract.
 *
 * This is the ONLY file in the stations feature that imports '../../i18n',
 * by design: if the shared module is missing or its API differs, exactly
 * one file needs attention and everything else (models, fixtures, tests)
 * keeps working. Contract assumed: `useTranslation()` returns `{ t }` where
 * `t(key, params?) => string` (react-i18next-compatible shape).
 */

import { useTranslation } from '../../i18n';

import type { Translate } from './types';

export function useStationsTranslate(): Translate {
  const { t } = useTranslation();
  return (key, params) => t(key, params);
}
