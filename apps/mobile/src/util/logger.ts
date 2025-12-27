export type Logger = {
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  sql: (query: string, params?: unknown[]) => void;
};

export function createLogger(scope: string): Logger {
  const prefix = `[${scope}]`;
  return {
    info: (...args) => console.log(prefix, ...args),
    debug: (...args) => console.log(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
    sql: (query, params) => console.log(prefix, 'SQL:', query.trim(), params ?? []),
  };
}


