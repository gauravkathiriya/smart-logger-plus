import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../src/logger.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function captureStdout(fn: () => void): string {
  const chunks: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: string | Uint8Array) => {
    chunks.push(chunk.toString());
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = original;
  }
  return chunks.join('');
}

function captureStderr(fn: () => void): string {
  const chunks: string[] = [];
  const original = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk: string | Uint8Array) => {
    chunks.push(chunk.toString());
    return true;
  };
  try {
    fn();
  } finally {
    process.stderr.write = original;
  }
  return chunks.join('');
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('createLogger – basic levels', () => {
  it('outputs an INFO message', () => {
    const logger = createLogger({ noColor: true, level: 'TRACE' });
    const out = captureStdout(() => logger.info('hello info'));
    expect(out).toContain('INFO');
    expect(out).toContain('hello info');
  });

  it('outputs a SUCCESS message', () => {
    const logger = createLogger({ noColor: true, level: 'TRACE' });
    const out = captureStdout(() => logger.success('all good'));
    expect(out).toContain('SUCCESS');
    expect(out).toContain('all good');
  });

  it('outputs a WARN message to stderr', () => {
    const logger = createLogger({ noColor: true, level: 'TRACE' });
    const err = captureStderr(() => logger.warn('be careful'));
    expect(err).toContain('WARN');
    expect(err).toContain('be careful');
  });

  it('outputs an ERROR message to stderr', () => {
    const logger = createLogger({ noColor: true, level: 'TRACE' });
    const err = captureStderr(() => logger.error('something broke'));
    expect(err).toContain('ERROR');
    expect(err).toContain('something broke');
  });

  it('outputs a DEBUG message', () => {
    const logger = createLogger({ noColor: true, level: 'DEBUG' });
    const out = captureStdout(() => logger.debug('debugging'));
    expect(out).toContain('DEBUG');
    expect(out).toContain('debugging');
  });

  it('outputs a TRACE message', () => {
    const logger = createLogger({ noColor: true, level: 'TRACE' });
    const out = captureStdout(() => logger.trace('tracing'));
    expect(out).toContain('TRACE');
    expect(out).toContain('tracing');
  });
});

describe('createLogger – level filtering', () => {
  it('suppresses messages below the configured level', () => {
    const logger = createLogger({ noColor: true, level: 'WARN' });
    const out = captureStdout(() => {
      logger.info('should be hidden');
      logger.debug('also hidden');
    });
    expect(out).toBe('');
  });

  it('allows messages at and above the configured level', () => {
    const logger = createLogger({ noColor: true, level: 'WARN' });
    const err = captureStderr(() => logger.warn('visible'));
    expect(err).toContain('visible');
  });

  it('setLevel changes the minimum level at runtime', () => {
    const logger = createLogger({ noColor: true, level: 'ERROR' });
    let out = captureStdout(() => logger.info('hidden'));
    expect(out).toBe('');

    logger.setLevel('INFO');
    out = captureStdout(() => logger.info('now visible'));
    expect(out).toContain('now visible');
  });

  it('SILENT level suppresses all output', () => {
    const logger = createLogger({ noColor: true, level: 'SILENT' });
    const out = captureStdout(() => {
      logger.info('nope');
      logger.debug('nope');
    });
    const err = captureStderr(() => {
      logger.error('nope');
      logger.warn('nope');
    });
    expect(out).toBe('');
    expect(err).toBe('');
  });
});

describe('createLogger – timestamps', () => {
  it('includes an ISO timestamp by default', () => {
    const logger = createLogger({ noColor: true });
    const out = captureStdout(() => logger.info('ts test'));
    expect(out).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('omits timestamps when timestamp:false', () => {
    const logger = createLogger({ noColor: true, timestamp: false });
    const out = captureStdout(() => logger.info('no ts'));
    expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe('createLogger – JSON mode', () => {
  it('emits valid JSON lines', () => {
    const logger = createLogger({ json: true });
    const out = captureStdout(() => logger.info('json test'));
    const parsed = JSON.parse(out.trim());
    expect(parsed.level).toBe('INFO');
    expect(parsed.message).toBe('json test');
    expect(parsed.timestamp).toBeTruthy();
  });

  it('includes extra metadata in JSON output', () => {
    const logger = createLogger({ json: true });
    const out = captureStdout(() => logger.info('with meta', { userId: 42 }));
    const parsed = JSON.parse(out.trim());
    expect(parsed.userId).toBe(42);
  });
});

describe('createLogger – prefix', () => {
  it('prepends the prefix to every log line', () => {
    const logger = createLogger({ noColor: true, prefix: 'SERVER' });
    const out = captureStdout(() => logger.info('started'));
    expect(out).toContain('[SERVER]');
  });
});

describe('createLogger – requestId', () => {
  it('includes requestId in pretty output', () => {
    const logger = createLogger({ noColor: true, requestId: 'req-123' });
    const out = captureStdout(() => logger.info('request log'));
    expect(out).toContain('req-123');
  });

  it('includes requestId in JSON output', () => {
    const logger = createLogger({ json: true, requestId: 'req-456' });
    const out = captureStdout(() => logger.info('json request'));
    const parsed = JSON.parse(out.trim());
    expect(parsed.requestId).toBe('req-456');
  });

  it('withRequestId creates a logger with attached request ID', () => {
    const logger = createLogger({ noColor: true });
    const reqLogger = logger.withRequestId('req-789');
    const out = captureStdout(() => reqLogger.info('scoped'));
    expect(out).toContain('req-789');
  });
});

describe('createLogger – child loggers', () => {
  it('child logger has its own prefix', () => {
    const parent = createLogger({ noColor: true });
    const child = parent.child({ prefix: 'CHILD' });
    const out = captureStdout(() => child.info('from child'));
    expect(out).toContain('[CHILD]');
    expect(out).toContain('from child');
  });

  it('child logger inherits parent level', () => {
    const parent = createLogger({ noColor: true, level: 'WARN' });
    const child = parent.child({ prefix: 'CHILD' });
    const out = captureStdout(() => child.info('should not appear'));
    expect(out).toBe('');
  });
});

describe('createLogger – error with stack trace', () => {
  it('logs the error message and stack when an Error is passed', () => {
    const logger = createLogger({ noColor: true });
    const err = new Error('boom');
    const stderr = captureStderr(() => logger.error('caught error', err));
    expect(stderr).toContain('caught error');
    expect(stderr).toContain('boom');
  });

  it('includes stack in JSON mode when an Error is passed', () => {
    const logger = createLogger({ json: true });
    const err = new Error('json error');
    const out = captureStdout(() => logger.error('json err log', err));
    const parsed = JSON.parse(out.trim());
    expect(parsed.error).toBe('json error');
    expect(parsed.stack).toContain('Error: json error');
  });
});

describe('createLogger – timer', () => {
  it('timer.end() logs the label and elapsed time', async () => {
    const logger = createLogger({ noColor: true });
    const timer = logger.startTimer();
    await new Promise((r) => setTimeout(r, 10));
    const out = captureStdout(() => timer.end('fetch done'));
    expect(out).toContain('fetch done');
    expect(out).toMatch(/\+\d+ms/);
  });

  it('timer.elapsed() returns a positive number', async () => {
    const logger = createLogger({ noColor: true });
    const timer = logger.startTimer();
    await new Promise((r) => setTimeout(r, 5));
    expect(timer.elapsed()).toBeGreaterThan(0);
  });
});

describe('createLogger – measure', () => {
  it('resolves the value returned by fn', async () => {
    const logger = createLogger({ noColor: true });
    const result = await logger.measure('compute', async () => 42);
    expect(result).toBe(42);
  });

  it('re-throws errors from fn', async () => {
    const logger = createLogger({ noColor: true });
    await expect(
      logger.measure('fail', async () => {
        throw new Error('measure error');
      })
    ).rejects.toThrow('measure error');
  });
});

describe('createLogger – file logging', () => {
  let tmpDir: string;
  let logFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-plus-test-'));
    logFile = path.join(tmpDir, 'sub', 'app.log');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the log file and writes to it', () => {
    const logger = createLogger({ noColor: true, file: logFile });
    logger.info('file log test');
    expect(fs.existsSync(logFile)).toBe(true);
    const content = fs.readFileSync(logFile, 'utf8');
    expect(content).toContain('file log test');
  });

  it('creates parent directories automatically', () => {
    const nested = path.join(tmpDir, 'a', 'b', 'c', 'deep.log');
    const logger = createLogger({ noColor: true, file: nested });
    logger.info('nested');
    expect(fs.existsSync(nested)).toBe(true);
  });

  it('strips ANSI codes in file output', () => {
    const logger = createLogger({ file: logFile }); // color enabled
    logger.info('colored message');
    const content = fs.readFileSync(logFile, 'utf8');
    expect(content).not.toMatch(/\x1b\[/);
  });

  it('writes JSON lines to the file in json mode', () => {
    const logger = createLogger({ json: true, file: logFile });
    logger.info('json file');
    const content = fs.readFileSync(logFile, 'utf8');
    const parsed = JSON.parse(content.trim());
    expect(parsed.message).toBe('json file');
  });
});

describe('createLogger – log() generic method', () => {
  it('dispatches to the correct output stream', () => {
    const logger = createLogger({ noColor: true, level: 'TRACE' });
    const out = captureStdout(() => logger.log('DEBUG', 'generic debug'));
    expect(out).toContain('generic debug');
  });
});
