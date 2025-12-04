import happyJson from '../../mock/data/configure-catalog.happy.json';
import emptyJson from '../../mock/data/configure-catalog.empty.json';
import errorJson from '../../mock/data/configure-catalog.error.json';

export type CatalogItem = {
  id: string;
  name: string;
  type: string;
  category: string;
};

export type CatalogBundle = {
  id: string;
  name: string;
  type: string;
  itemIds: string[];
};

export type ConfigureCatalogModel = {
  items: CatalogItem[];
  bundles: CatalogBundle[];
  error?: string;
};

export type ConfigureCatalogVariant = 'happy' | 'empty' | 'error';

const happyData = happyJson as ConfigureCatalogModel;
const emptyData = emptyJson as ConfigureCatalogModel;
const errorData = errorJson as ConfigureCatalogModel;

/**
 * Get catalog configuration
 * 
 * Note: Will eventually use Quereus. Currently uses mock data.
 * 
 * @param variant - Mock variant to use ('happy', 'empty', 'error')
 */
export function getConfigureCatalog(
  variant: ConfigureCatalogVariant = 'happy',
): ConfigureCatalogModel {
  if (variant === 'empty') {
    return emptyData;
  }
  if (variant === 'error') {
    return errorData;
  }
  return happyData;
}


