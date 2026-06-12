import fs from 'node:fs';
import path from 'node:path';
import { colorize, supportsColor } from './colors.js';
import type { ColorKey } from './colors.js';
import { LOG_LEVEL_PRIORITY, shouldLog } from './levels.js';
import type { LogLevel } from './levels.js';
import type { Logger, LoggerOptions, LogEntry, Timer } from './types.js';

const LEVEL_CONFIG: Record<
  LogLevel,
  { label: string; color: ColorKey; badge: string }
> = {
  TRACE: { label: 'TRACE', color: 'gray', badge: '·' },
  DEBUG: { label: 'DEBUG', color: 'cyan', badge: '◆' },
  INFO: { label: 'INFO', color: 'blue', badge: 'ℹ' },
  SUCCESS: { label: 'SUCCESS', color: 'brightGreen', badge: '✔' },
  WARN: { label: 'WARN', color: 'brightYellow', badge: '⚠' },
  ERROR: { label: 'ERROR', color: 'brightRed', badge: '✖' },
  SILENT: { label: 'SILENT', color: 'gray', badge: ' ' },
};

function formatTimestamp(useColor: boolean): string {
  const ts = new Date().toISOString();
  return useColor ? colorize(ts, 'gray', 'dim') : ts;
}

function formatLevel(level: LogLevel, useColor: boolean): string {
  const { label, color, badge } = LEVEL_CONFIG[level];
  const padded = `${badge} ${label.padEnd(7)}`;
  return useColor ? colorize(padded, color, 'bold') : `[${label}]`;
}

function formatPrefix(prefix: string, useColor: boolean): string {
  return useColor
    ? colorize(`[${prefix}]`, 'brightMagenta', 'bold')
    : `[${prefix}]`;
}

function formatRequestId(requestId: string, useColor: boolean): string {
  return useColor
    ? colorize(`(${requestId})`, 'gray')
    : `(${requestId})`;
}

function serializeMeta(meta: Record<string, unknown>, useColor: boolean): string {
  if (Object.keys(meta).length === 0) return '';
  const text = JSON.stringify(meta);
  return useColor ? colorize(` ${text}`, 'gray', 'dim') : ` ${text}`;
}

function createFileWriter(filePath: string): (line: string) => void {
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  return (line: string) => {
    const clean = line.replace(/\x1b\[[0-9;]*m/g, '');
    fs.appendFileSync(resolved, clean + '\n', 'utf8');
  };
}


export function createLogger(options: LoggerOptions = {}): Logger {
  let currentLevel: LogLevel = options.level ?? 'INFO';
  const useColor = options.noColor ? false : supportsColor();
  const showTimestamp = options.timestamp !== false;
  const jsonMode = options.json ?? false;
  const prefix = options.prefix;
  let requestId = options.requestId;

  const writeToFile = options.file ? createFileWriter(options.file) : null;

  function emit(level: LogLevel, message: string, extra: Record<string, unknown> = {}): void {
    if (!shouldLog(level, currentLevel)) return;

    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      timestamp,
      level,
      message,
      ...(prefix ? { prefix } : {}),
      ...(requestId ? { requestId } : {}),
      ...extra,
    };

    if (jsonMode) {
      const line = JSON.stringify(entry);
      process.stdout.write(line + '\n');
      writeToFile?.(line);
      return;
    }
    const parts: string[] = [];

    if (showTimestamp) {
      parts.push(formatTimestamp(useColor));
    }

    parts.push(formatLevel(level, useColor));

    if (prefix) {
      parts.push(formatPrefix(prefix, useColor));
    }

    if (requestId) {
      parts.push(formatRequestId(requestId, useColor));
    }

    const { timestamp: _ts, level: _lv, message: _msg, prefix: _pfx, requestId: _rid, stack, elapsed, ...rest } = entry;
    const msgText = useColor
      ? colorize(message, level === 'ERROR' ? 'brightRed' : level === 'WARN' ? 'brightYellow' : 'white')
      : message;
    parts.push(msgText);

    if (elapsed !== undefined) {
      const elapsedText = `+${elapsed}ms`;
      parts.push(useColor ? colorize(elapsedText, 'brightCyan', 'bold') : elapsedText);
    }

    if (Object.keys(rest).length > 0) {
      parts.push(serializeMeta(rest, useColor));
    }

    const line = parts.join(' ');
    const output = level === 'ERROR' || level === 'WARN' ? process.stderr : process.stdout;
    output.write(line + '\n');

    if (stack) {
      const stackText = useColor ? colorize(stack, 'gray', 'dim') : stack;
      output.write(stackText + '\n');
      writeToFile?.(stack);
    }

    writeToFile?.(line);
  }

  const logger: Logger = {
    info(message, meta) {
      emit('INFO', message, meta);
    },

    success(message, meta) {
      emit('SUCCESS', message, meta);
    },

    warn(message, meta) {
      emit('WARN', message, meta);
    },

    error(message, errorOrMeta) {
      if (errorOrMeta instanceof Error) {
        const { stack, message: errMsg, ...rest } = errorOrMeta as Error & Record<string, unknown>;
        emit('ERROR', message, {
          error: errMsg,
          stack: stack ?? '',
          ...rest,
        });
      } else {
        emit('ERROR', message, errorOrMeta);
      }
    },

    debug(message, meta) {
      emit('DEBUG', message, meta);
    },

    trace(message, meta) {
      emit('TRACE', message, meta);
    },

    log(level, message, meta) {
      emit(level, message, meta);
    },

    startTimer(): Timer {
      const start = process.hrtime.bigint();

      return {
        elapsed(): number {
          return Number(process.hrtime.bigint() - start) / 1_000_000;
        },
        end(label = 'Operation completed', meta) {
          const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
          emit('INFO', label, { ...meta, elapsed: Math.round(ms) });
        },
      };
    },

    async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
      const timer = logger.startTimer();
      try {
        const result = await fn();
        timer.end(label);
        return result;
      } catch (err) {
        const ms = timer.elapsed();
        emit('ERROR', `${label} failed after ${Math.round(ms)}ms`, {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        throw err;
      }
    },

    child(childOptions) {
      return createLogger({
        level: currentLevel,
        json: jsonMode,
        file: options.file,
        noColor: options.noColor,
        timestamp: options.timestamp,
        requestId,
        ...childOptions,
        prefix: childOptions.prefix,
      });
    },

    withRequestId(id: string): Logger {
      return createLogger({
        level: currentLevel,
        json: jsonMode,
        file: options.file,
        noColor: options.noColor,
        timestamp: options.timestamp,
        prefix,
        requestId: id,
      });
    },

    setLevel(level: LogLevel) {
      if (!Object.prototype.hasOwnProperty.call(LOG_LEVEL_PRIORITY, level)) {
        throw new Error(`Invalid log level: ${level}`);
      }
      currentLevel = level;
    },
  };

  return logger;
}
