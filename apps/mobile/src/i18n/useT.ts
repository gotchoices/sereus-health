type Dict = Record<string, string>;

const en: Dict = {
  'app.title': 'Sereus Health',
  'navigation.home': 'Home',
  'navigation.catalog': 'Catalog',
  'navigation.settings': 'Settings',
  'logHistory.title': 'History',
  'logHistory.filterPlaceholder': 'Filter entries…',
  'logHistory.emptyTitle': 'Welcome',
  'logHistory.emptyMessage': 'Tap + to log your first activity, condition, or outcome.',
  'logHistory.errorLoading': 'Failed to load history.',
  'logHistory.retry': 'Retry',
  'logHistory.clone': 'Clone',
  'logHistory.itemsMore': '+{count} more',
};

export function useT() {
  return (key: string, params?: Record<string, string | number>) => {
    const template = en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  };
}


