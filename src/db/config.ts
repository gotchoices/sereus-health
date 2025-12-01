/**
 * Database Configuration
 * 
 * Feature flags for database implementation
 */

/**
 * USE_QUEREUS: Toggle between Quereus SQL engine and Appeus mock data
 * 
 * Set to false: Use Appeus mock data system (mock/data/*.json via src/data/* adapters)
 *               - Fully React Native compatible
 *               - No crypto dependencies required
 *               - Uses existing mock/data/log-history.*.json and edit-entry-stats.*.json
 * 
 * Set to true:  Use Quereus SQL engine (src/db/logEntries.ts, src/db/stats.ts)
 *               - Requires crypto polyfills (react-native-quick-crypto) for RN
 *               - Full SQL database with schema from design/specs/api/schema.md
 *               - Ready for Sereus integration
 * 
 * DEFAULT: false (mock data)
 */
export const USE_QUEREUS = false;

