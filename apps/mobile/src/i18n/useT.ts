import { useCallback } from 'react';

type Dict = Record<string, string>;

const en: Dict = {
  'app.title': 'Sereus Health',
  'navigation.home': 'Home',
  'navigation.catalog': 'Catalog',
  'navigation.settings': 'Settings',
  'common.loading': 'Loading…',
  'common.search': 'Search…',
  'common.done': 'Done',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.notImplementedTitle': 'Not implemented',
  'common.notImplementedBody': 'This will be generated in a later slice.',
  'logHistory.title': 'History',
  'logHistory.filterPlaceholder': 'Filter entries…',
  'logHistory.emptyTitle': 'Welcome',
  'logHistory.emptyMessage': 'Tap + to log your first activity, condition, or outcome.',
  'logHistory.errorLoading': 'Failed to load history.',
  'logHistory.retry': 'Retry',
  'logHistory.clone': 'Clone',
  'logHistory.itemsMore': '+{count} more',

  'editEntry.titleNew': 'New Entry',
  'editEntry.titleEdit': 'Edit Entry',
  'editEntry.titleClone': 'Clone Entry',
  'editEntry.type': 'Type',
  'editEntry.category': 'Category',
  'editEntry.items': 'Items',
  'editEntry.quantifiers': 'Quantifiers',
  'editEntry.timestamp': 'Timestamp',
  'editEntry.comment': 'Comment',
  'editEntry.commentPlaceholder': 'Add a note (optional)…',
  'editEntry.selectType': 'Select Type',
  'editEntry.selectCategory': 'Select Category',
  'editEntry.selectItems': 'Select Items',
  'editEntry.bundle': 'Bundle',
  'editEntry.add': 'Add Entry',
  'editEntry.save': 'Save',
  'editEntry.clone': 'Clone Entry',
  'editEntry.deleteTitle': 'Delete entry?',
  'editEntry.deleteConfirm': 'This cannot be undone.',
  'editEntry.errorLoading': 'Failed to load entry.',
  'editEntry.errorSaving': 'Failed to save entry.',

  'configureCatalog.title': 'Catalog',
  'configureCatalog.filterPlaceholder': 'Filter…',
  'configureCatalog.items': 'Items',
  'configureCatalog.bundles': 'Bundles',
  'configureCatalog.emptyItemsTitle': 'No items yet',
  'configureCatalog.emptyItemsBody': 'Add your first item to start building your catalog.',
  'configureCatalog.emptyBundlesTitle': 'No bundles yet',
  'configureCatalog.emptyBundlesBody': 'Create a bundle to group items together.',
  'configureCatalog.bundleCount': '{count} items',
  'configureCatalog.errorLoading': 'Failed to load catalog.',
};

export function useT() {
  // Important: return a stable function so components can safely depend on it in useEffect/useMemo.
  return useCallback((key: string, params?: Record<string, string | number>) => {
    const template = en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  }, []);
}


