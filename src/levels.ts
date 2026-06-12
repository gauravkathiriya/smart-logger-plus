/**
 * All available log levels, ordered from most verbose (TRACE) to least (SILENT).
 */
export const LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'SUCCESS', 'WARN', 'ERROR', 'SILENT'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Numeric priority for each log level. Higher = more severe / less verbose.
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  SUCCESS: 3,
  WARN: 4,
  ERROR: 5,
  SILENT: 99,
};

/**
 * Returns true if `candidate` should be shown when `minLevel` is configured.
 */
export function shouldLog(candidate: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[candidate] >= LOG_LEVEL_PRIORITY[minLevel];
}
