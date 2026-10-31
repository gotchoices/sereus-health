/**
 * Bulk writes (catalog import, backup restore) run with the health strand in online mode when the
 * cadre is reachable: offline mode queues each transaction and sends them one at a time, which is
 * several times slower per transaction and leaves later saves waiting behind the import
 * (see CadreService.withStrandOnline). A no-op wrapper on the mock and legacy backends.
 */
import { USE_OPTIMYSTIC } from '../db/config';

export function withBulkWrite<T>(fn: () => Promise<T>): Promise<T> {
  if (!USE_OPTIMYSTIC) return fn();
  const { cadreService } = require('../services/CadreService') as {
    cadreService: { withStrandOnline<R>(f: () => Promise<R>): Promise<R> };
  };
  return cadreService.withStrandOnline(fn);
}
