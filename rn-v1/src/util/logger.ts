/**
 * Centralized logging module for Sereus Health
 * Provides log level control and structured logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

// Configuration - can be changed at runtime
let currentLogLevel: LogLevel = __DEV__ ? 'debug' : 'warn';

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	none: 999,
};

/**
 * Set the global log level
 */
export function setLogLevel(level: LogLevel): void {
	currentLogLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
	return currentLogLevel;
}

function shouldLog(level: LogLevel): boolean {
	return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

function formatMessage(category: string, message: string): string {
	return `[${category}] ${message}`;
}

/**
 * Logger class for a specific category
 */
export class Logger {
	constructor(private category: string) {}

	debug(message: string, ...args: any[]): void {
		if (shouldLog('debug')) {
			console.log(formatMessage(this.category, message), ...args);
		}
	}

	info(message: string, ...args: any[]): void {
		if (shouldLog('info')) {
			console.info(formatMessage(this.category, message), ...args);
		}
	}

	warn(message: string, ...args: any[]): void {
		if (shouldLog('warn')) {
			console.warn(formatMessage(this.category, message), ...args);
		}
	}

	error(message: string, ...args: any[]): void {
		if (shouldLog('error')) {
			console.error(formatMessage(this.category, message), ...args);
		}
	}

	/**
	 * Log SQL query execution (debug level)
	 */
	sql(query: string, params?: any[]): void {
		if (shouldLog('debug')) {
			const formattedQuery = query.replace(/\s+/g, ' ').trim();
			if (params && params.length > 0) {
				console.log(formatMessage(this.category, `SQL: ${formattedQuery}`), 'params:', params);
			} else {
				console.log(formatMessage(this.category, `SQL: ${formattedQuery}`));
			}
		}
	}
}

/**
 * Create a logger for a specific category
 */
export function createLogger(category: string): Logger {
	return new Logger(category);
}

// Export default loggers for common categories
export const dbLogger = createLogger('DB');
export const apiLogger = createLogger('API');
export const uiLogger = createLogger('UI');

