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
  'logHistory.header.catalog': 'Catalog',
  'logHistory.header.graphs': 'Graphs',
  'logHistory.header.sereus': 'Sereus',
  'logHistory.filter.placeholder': 'Filter by type or title…',
  'editEntry.header.new': 'New entry',
  'editEntry.header.edit': 'Edit entry',
  'editEntry.header.clone': 'Clone entry',
  'editEntry.label.type': 'Type',
  'editEntry.label.title': 'Title',
  'editEntry.label.timestamp': 'Time',
  'editEntry.label.comment': 'Comment',
  'editEntry.label.quantifiers': 'Quantifiers',
  'editEntry.placeholder.type': 'Activity, Condition, Outcome…',
  'editEntry.placeholder.title': 'Short description (e.g., Breakfast)',
  'editEntry.placeholder.comment': 'Anything you want to remember about this entry…',
  'editEntry.button.cancel': 'Cancel',
  'editEntry.button.save': 'Save',
  'configureCatalog.header.title': 'Catalog',
  'configureCatalog.help.items':
    'Add and manage the items and groups you will use when logging your activities.',
  'configureCatalog.empty.items': 'No items yet. Start by adding some.',
  'configureCatalog.label.groupsContainingSelection': 'Groups containing all selected items',
  'graphs.header.title': 'Graphs',
  'graphs.body.placeholder':
    'This is where you will be able to create and view graphs of selected items over time.',
  'sereus.header.title': 'Sereus connections',
  'sereus.body.placeholder':
    'This is where you will be able to view and manage your Sereus cadre and guest nodes.',
  'navigation.backToHistory': 'Back to history',
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


