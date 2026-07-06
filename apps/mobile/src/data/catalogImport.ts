/**
 * Catalog import adapter — the three onboarding sources (story 01-exploring):
 *   1. sereus.org  — fetch the published catalog index + a chosen catalog
 *   2. device file — OS file picker → read → parse
 *   3. (parse/preview/commit are shared by all sources)
 *
 * Catalogs are FETCHED, not bundled (design/specs/mobile/global/general.md).
 */
import { pick, types as pickerTypes, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import yaml from 'js-yaml';
import {
  importCanonicalCatalog,
  getTypeCount,
  type CanonicalCatalog,
  type CatalogImportResult,
} from '../db/catalog';
import { createLogger } from '../util/logger';

const logger = createLogger('CatalogImport');

/** Single source of truth for published catalogs (general.md). */
export const CATALOG_BASE_URL = 'https://sereus.org/health/catalogs';

export interface CatalogIndexEntry {
  id: string;
  name: string;
  description: string;
  file: string;
  types: number;
  categories: number;
  items: number;
  bytes: number;
}

export type { CanonicalCatalog, CatalogImportResult };
export { getTypeCount };

/** Parse a canonical catalog from YAML or JSON text. */
export function parseCatalog(text: string, filename?: string): CanonicalCatalog {
  const looksJson = (filename ?? '').toLowerCase().endsWith('.json') || text.trimStart().startsWith('{');
  let data: unknown;
  try {
    data = looksJson ? JSON.parse(text) : (yaml.load(text) as unknown);
  } catch (e) {
    throw new Error(`Could not read the file (${e instanceof Error ? e.message : String(e)}).`);
  }
  if (!data || typeof data !== 'object' || !(data as CanonicalCatalog).catalog) {
    throw new Error('That file is not a Sereus Health catalog (missing "catalog").');
  }
  return data as CanonicalCatalog;
}

/** Fetch the list of published catalogs (Minimal / Small / Medium / Large). */
export async function fetchCatalogIndex(): Promise<CatalogIndexEntry[]> {
  const res = await fetch(`${CATALOG_BASE_URL}/index.json`);
  if (!res.ok) throw new Error(`Couldn't reach sereus.org (status ${res.status}).`);
  const data = (await res.json()) as { catalogs?: CatalogIndexEntry[] };
  return data.catalogs ?? [];
}

/** Fetch and parse one published catalog by its index `file`. */
export async function fetchCatalog(file: string): Promise<CanonicalCatalog> {
  const res = await fetch(`${CATALOG_BASE_URL}/${file}`);
  if (!res.ok) throw new Error(`Couldn't download the catalog (status ${res.status}).`);
  return parseCatalog(await res.text(), file);
}

/**
 * Open the OS file picker and parse the chosen catalog file.
 * Returns null if the user cancels.
 */
export async function pickAndParseCatalogFile(): Promise<CanonicalCatalog | null> {
  try {
    const result = await pick({
      type: [pickerTypes.plainText, 'text/yaml', 'application/x-yaml', 'application/json', pickerTypes.allFiles],
      mode: 'import',
    });
    const file = result[0];
    if (!file?.uri) throw new Error('File not available.');
    const content = await RNFS.readFile(file.uri, 'utf8');
    return parseCatalog(content, file.name ?? file.uri);
  } catch (err) {
    if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
      logger.debug('User cancelled catalog file picker');
      return null;
    }
    throw err;
  }
}

/** Dry-run: compute add/skip counts for preview-before-commit. */
export function previewCatalogImport(cat: CanonicalCatalog): Promise<CatalogImportResult> {
  return importCanonicalCatalog(cat, { dryRun: true });
}

/** Commit the import (transactional). */
export function commitCatalogImport(cat: CanonicalCatalog): Promise<CatalogImportResult> {
  return importCanonicalCatalog(cat, { dryRun: false });
}
