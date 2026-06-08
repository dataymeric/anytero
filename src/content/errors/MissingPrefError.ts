import type { AnyteroPref } from '../prefs/anytero-pref';

import { ErrorL10nId, LocalizableError } from './LocalizableError';

const L10N_IDS: Partial<Record<AnyteroPref, ErrorL10nId>> = {};

export class MissingPrefError extends LocalizableError {
  public readonly name = 'MissingPrefError';

  public constructor(pref: AnyteroPref) {
    super(
      `Missing pref: ${pref}`,
      L10N_IDS[pref] || 'anytero-error-missing-pref',
      { l10nArgs: { pref } },
    );
  }
}
