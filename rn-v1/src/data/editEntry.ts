import { getVariant } from '../mock';
import happyJson from '../../mock/data/edit-entry.happy.json';
import errorJson from '../../mock/data/edit-entry.error.json';

export type EditEntryQuantifier = {
  label: string;
  value: number;
  units?: string;
};

export type EditEntryModel = {
  id: string | null;
  mode: 'new' | 'edit' | 'clone';
  type: string;
  title: string;
  timestamp: string; // ISO UTC
  comment: string;
  quantifiers: EditEntryQuantifier[];
};

export type EditEntryVariant = 'happy' | 'error';

const happyData = happyJson as EditEntryModel;
const errorData = errorJson as EditEntryModel;

/**
 * Get edit entry data
 * 
 * Note: Will eventually use Quereus. Currently uses mock data.
 * Variant is determined internally from deep link context.
 * 
 * @param mode - Entry mode ('new', 'edit', 'clone')
 * @param entryId - ID of entry to edit/clone (ignored for 'new')
 */
export function getEditEntry(
  mode: 'new' | 'edit' | 'clone' = 'new',
  _entryId?: string,
): EditEntryModel {
  const variant = getVariant();
  if (variant === 'error') {
    return { ...errorData, mode };
  }
  if (mode === 'new') {
    return {
      id: null,
      mode: 'new',
      type: '',
      title: '',
      timestamp: new Date().toISOString(),
      comment: '',
      quantifiers: [],
    };
  }
  return { ...happyData, mode };
}


