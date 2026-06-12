import type { LogLevel } from './levels.js';

export interface Timer {
  /**
   * Stops the timer and logs elapsed time.
   * @param label  Optional label shown in the log message.
   * @param meta   Optional extra metadata appended to the log.
   */
  end(label?: string, meta?: Record<string, unknown>): void;

  /**
   * Returns elapsed milliseconds without stopping the timer.
   */
  elapsed(): number;
}

export interface LoggerOptions {
  /**
   * Minimum log level to emit. Defaults to `"INFO"`.
   * Messages below this level are silently dropped.
   */
  level?: LogLevel;

  /**
   * Emit logs as newline-delimited JSON (NDJSON). Useful for log aggregators.
   * Defaults to `false`.
   */
  json?: boolean;

  /**
   * Path to an output file. When set, logs are appended to this file in
   * addition to the console. Directories are created automatically.
   */
  file?: string;

  /**
   * A string prefix shown on every log line, e.g. `"[API]"`.
   */
  prefix?: string;

  /**
   * A fixed request / correlation ID attached to every log entry.
   * Useful for tracing a single request across multiple services.
   */
  requestId?: string;

  /**
   * Disable ANSI color output. Defaults to `false` (auto-detect from TTY).
   */
  noColor?: boolean;

  /**
   * Show timestamps on every log line. Defaults to `true`.
   */
  timestamp?: boolean;
}

// ─── Log Entry ───────────────────────────────────────────────────────────────

export interface LogEntry {
  /** ISO-8601 timestamp */
  timestamp: string;
  level: LogLevel;
  message: string;
  prefix?: string;
  requestId?: string;
  /** Elapsed ms for timer logs */
  elapsed?: number;
  /** Serialised stack trace, present when an Error was passed */
  stack?: string;
  /** Any extra key/value metadata the caller passed */
  [key: string]: unknown;
}

// ─── Logger Interface ─────────────────────────────────────────────────────────

export interface Logger {
  /** Log at INFO level */
  info(message: string, meta?: Record<string, unknown>): void;

  /** Log at SUCCESS level (bright green) */
  success(message: string, meta?: Record<string, unknown>): void;

  /** Log at WARN level */
  warn(message: string, meta?: Record<string, unknown>): void;

  /** Log at ERROR level. Accepts an optional Error object for stack traces. */
  error(message: string, errorOrMeta?: Error | Record<string, unknown>): void;

  /** Log at DEBUG level */
  debug(message: string, meta?: Record<string, unknown>): void;

  /** Log at TRACE level */
  trace(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a raw message at any level.
   */
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;

  /**
   * Start a high-resolution timer. Call `timer.end()` to log elapsed time.
   */
  startTimer(): Timer;

  /**
   * Convenience wrapper: measure how long an async function takes and log it.
   * @returns The resolved value of the promise.
   */
  measure<T>(label: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Create a child logger that inherits configuration but adds a prefix.
   */
  child(options: Partial<LoggerOptions> & { prefix: string }): Logger;

  /**
   * Attach a request / correlation ID to every subsequent log entry.
   */
  withRequestId(requestId: string): Logger;

  /**
   * Update the logger's minimum log level at runtime.
   */
  setLevel(level: LogLevel): void;
}
