import happyJson from '../../mock/data/configure-catalog.happy.json';
import emptyJson from '../../mock/data/configure-catalog.empty.json';
import errorJson from '../../mock/data/configure-catalog.error.json';

export type CatalogItem = {
  id: string;
  name: string;
  type: string;
  category: string;
};

export type CatalogGroup = {
  id: string;
  name: string;
  itemIds: string[];
};

export type ConfigureCatalogModel = {
  items: CatalogItem[];
  groups: CatalogGroup[];
  error?: string;
};

export type ConfigureCatalogVariant = 'happy' | 'empty' | 'error';

const happyData = happyJson as ConfigureCatalogModel;
const emptyData = emptyJson as ConfigureCatalogModel;
const errorData = errorJson as ConfigureCatalogModel;

export function getConfigureCatalogMock(
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


