/**
 * Development-only sample data.
 *
 * This is intentionally small but makes Phase 1 testing easier by populating items.
 */
import type { Database } from '@quereus/quereus';
import { createLogger } from '../util/logger';
import { newUuid } from '../util/id';

const logger = createLogger('DB Samples');

export async function applySampleData(db: Database): Promise<void> {
  logger.info('Applying sample data...');

  // Create a few items under existing seeded categories.
  const sampleItems: Array<{ categoryId: string; name: string }> = [
    { categoryId: 'cat-exercise', name: 'Walk' },
    { categoryId: 'cat-exercise', name: 'Run' },
    { categoryId: 'cat-eating', name: 'Coffee' },
    { categoryId: 'cat-stress', name: 'Work Stress' },
    { categoryId: 'cat-pain', name: 'Headache' },
  ];

  for (const it of sampleItems) {
    await db.exec('INSERT INTO items (id, category_id, name, description) VALUES (?, ?, ?, ?)', [
      newUuid(),
      it.categoryId,
      it.name,
      null,
    ]);
  }
}


