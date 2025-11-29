// Minimal translation hook for Diario.
// For now this is a simple key → English string map so that UI components
// do not hard-code literals. Later this can be swapped for a full i18n library.

import { useMemo } from 'react';

const en = {
  'logHistory.header.title': 'History',
  'logHistory.empty.title': 'No entries yet',
  'logHistory.empty.body':
    'Start by adding your first activity, condition, or outcome so Diario can help you spot patterns over time.',
  'logHistory.empty.cta': 'Add first entry',
  'logHistory.row.cloneHint': 'Tap to clone this entry',
  'logHistory.header.add': '+', // icon-like label; may later be replaced by a real icon
} as const;

type TranslationKey = keyof typeof en;

export function useT() {
  return useMemo(
    () =>
      (key: TranslationKey): string => {
        return en[key] ?? key;
      },
    [],
  );
}


