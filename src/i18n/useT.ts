/**
 * i18n hook for Diario
 * Based on design/specs/global/general.md: all UI strings via translation mechanism
 * 
 * For MVP, returns English strings directly.
 * Future: integrate with react-i18next or similar for multi-locale support.
 */

type TranslationKey = 
  // App-wide
  | 'app.title'
  
  // Navigation
  | 'navigation.home'
  | 'navigation.catalog'
  | 'navigation.settings'
  | 'navigation.back'
  
  // LogHistory screen
  | 'logHistory.title'
  | 'logHistory.addNew'
  | 'logHistory.openGraphs'
  | 'logHistory.filter'
  | 'logHistory.clearFilter'
  | 'logHistory.clone'
  | 'logHistory.emptyTitle'
  | 'logHistory.emptyMessage'
  | 'logHistory.errorLoading'
  | 'logHistory.retry'
  | 'logHistory.itemsMore'
  | 'logHistory.typeActivity'
  | 'logHistory.typeCondition'
  | 'logHistory.typeOutcome'
  
  // EditEntry screen
  | 'editEntry.titleNew'
  | 'editEntry.titleEdit'
  | 'editEntry.titleClone'
  | 'editEntry.selectType'
  | 'editEntry.selectCategory'
  | 'editEntry.selectItems'
  | 'editEntry.timestamp'
  | 'editEntry.comment'
  | 'editEntry.commentPlaceholder'
  | 'editEntry.quantifiers'
  | 'editEntry.addQuantifier'
  | 'editEntry.save'
  | 'editEntry.cancel'
  | 'editEntry.delete'
  
  // ConfigureCatalog screen
  | 'catalog.title'
  | 'catalog.categories'
  | 'catalog.items'
  | 'catalog.groups'
  | 'catalog.addCategory'
  | 'catalog.addItem'
  | 'catalog.addGroup'
  | 'catalog.editCategory'
  | 'catalog.editItem'
  | 'catalog.editGroup'
  | 'catalog.emptyCategories'
  | 'catalog.emptyItems'
  | 'catalog.emptyGroups'
  
  // Graphs screen
  | 'graphs.title'
  | 'graphs.selectItems'
  | 'graphs.dateRange'
  | 'graphs.generate'
  | 'graphs.save'
  | 'graphs.share'
  | 'graphs.close'
  | 'graphs.emptyGraphs'
  | 'graphs.noItemsSelected'
  
  // Sereus screen
  | 'sereus.title'
  | 'sereus.cadreNodes'
  | 'sereus.guestNodes'
  | 'sereus.addNode'
  | 'sereus.removeNode'
  | 'sereus.scanQR'
  | 'sereus.emptyNodes'
  
  // SelectionList component
  | 'selectionList.filterPlaceholder'
  | 'selectionList.clearFilter'
  | 'selectionList.empty'
  | 'selectionList.emptyFiltered'
  
  // Common
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.add'
  | 'common.back'
  | 'common.close'
  | 'common.confirm'
  | 'common.retry'
  | 'common.loading'
  | 'common.error';

const translations: Record<TranslationKey, string> = {
  // App-wide
  'app.title': 'Diario',
  
  // Navigation
  'navigation.home': 'Home',
  'navigation.catalog': 'Catalog',
  'navigation.settings': 'Settings',
  'navigation.back': 'Back',
  
  // LogHistory screen
  'logHistory.title': 'History',
  'logHistory.addNew': 'Add new entry',
  'logHistory.openGraphs': 'Open graphs',
  'logHistory.filter': 'Filter entries...',
  'logHistory.clearFilter': 'Clear filter',
  'logHistory.clone': 'Clone entry',
  'logHistory.emptyTitle': 'No entries yet',
  'logHistory.emptyMessage': 'Tap + to log your first activity, condition, or outcome',
  'logHistory.errorLoading': 'Failed to load entries',
  'logHistory.retry': 'Retry',
  'logHistory.itemsMore': '+{count} more',
  'logHistory.typeActivity': 'Activity',
  'logHistory.typeCondition': 'Condition',
  'logHistory.typeOutcome': 'Outcome',
  
  // EditEntry screen
  'editEntry.titleNew': 'New Entry',
  'editEntry.titleEdit': 'Edit Entry',
  'editEntry.titleClone': 'Clone Entry',
  'editEntry.selectType': 'Select Type',
  'editEntry.selectCategory': 'Select Category',
  'editEntry.selectItems': 'Select Items',
  'editEntry.timestamp': 'Date & Time',
  'editEntry.comment': 'Comment',
  'editEntry.commentPlaceholder': 'Add a note (optional)...',
  'editEntry.quantifiers': 'Quantifiers',
  'editEntry.addQuantifier': 'Add quantifier',
  'editEntry.save': 'Save',
  'editEntry.cancel': 'Cancel',
  'editEntry.delete': 'Delete',
  
  // ConfigureCatalog screen
  'catalog.title': 'Catalog',
  'catalog.categories': 'Categories',
  'catalog.items': 'Items',
  'catalog.groups': 'Groups',
  'catalog.addCategory': 'Add category',
  'catalog.addItem': 'Add item',
  'catalog.addGroup': 'Add group',
  'catalog.editCategory': 'Edit category',
  'catalog.editItem': 'Edit item',
  'catalog.editGroup': 'Edit group',
  'catalog.emptyCategories': 'No categories yet',
  'catalog.emptyItems': 'No items yet',
  'catalog.emptyGroups': 'No groups yet',
  
  // Graphs screen
  'graphs.title': 'Graphs',
  'graphs.selectItems': 'Select items to graph',
  'graphs.dateRange': 'Date range',
  'graphs.generate': 'Generate graph',
  'graphs.save': 'Save graph',
  'graphs.share': 'Share',
  'graphs.close': 'Close graph',
  'graphs.emptyGraphs': 'No graphs yet',
  'graphs.noItemsSelected': 'Select at least one item to generate a graph',
  
  // Sereus screen
  'sereus.title': 'Sereus',
  'sereus.cadreNodes': 'My Nodes',
  'sereus.guestNodes': 'Guest Nodes',
  'sereus.addNode': 'Add node',
  'sereus.removeNode': 'Remove node',
  'sereus.scanQR': 'Scan QR code',
  'sereus.emptyNodes': 'No nodes yet',
  
  // SelectionList component
  'selectionList.filterPlaceholder': 'Filter...',
  'selectionList.clearFilter': 'Clear filter',
  'selectionList.empty': 'No items',
  'selectionList.emptyFiltered': 'No items match your filter',
  
  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.confirm': 'Confirm',
  'common.retry': 'Retry',
  'common.loading': 'Loading...',
  'common.error': 'Error',
};

/**
 * Translation hook
 * Returns a function that translates keys to localized strings
 * Supports simple interpolation: t('logHistory.itemsMore', { count: 5 }) → "+5 more"
 */
export function useT() {
  return function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = translations[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, String(value));
      });
    }
    
    return text;
  };
}
