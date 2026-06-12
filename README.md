# logger-plus

> A simple, modern, and feature-rich logging utility for Node.js applications — with colors, timers, JSON mode, file logging, child loggers, and full TypeScript support.

[![npm version](https://img.shields.io/npm/v/logger-plus.svg?style=flat-square)](https://www.npmjs.com/package/logger-plus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square)](https://www.typescriptlang.org/)
[![ESM + CJS](https://img.shields.io/badge/module-ESM%20%2B%20CJS-orange?style=flat-square)]()

---

## Features

| Feature | Description |
|---|---|
| 🎨 **Colored output** | Beautiful ANSI-colored terminal logs with icons |
| 🕒 **Timestamps** | ISO-8601 timestamps on every log line |
| 🔇 **Level filtering** | `TRACE → DEBUG → INFO → SUCCESS → WARN → ERROR → SILENT` |
| 📦 **JSON mode** | Newline-delimited JSON for log aggregators (Datadog, Loki, etc.) |
| 📁 **File logging** | Append logs to a file with ANSI codes automatically stripped |
| 🆔 **Request ID tracking** | Attach a correlation ID to every log entry |
| 👶 **Child loggers** | Scoped loggers with their own prefix |
| ⏱️ **Timers** | `startTimer()` + `timer.end()` or the `measure()` helper |
| 💥 **Error traces** | Pass an `Error` object to `logger.error()` to log its stack |
| 🔷 **Full TypeScript** | Shipped with `.d.ts` types for ESM and CJS |
| 📦 **Dual format** | Works with `import` (ESM) and `require()` (CJS) |

---

## Installation

```bash
npm install logger-plus
# or
pnpm add logger-plus
# or
yarn add logger-plus
```

> **Requires Node.js 18 or higher.**

---

## Quick Start

```ts
import { createLogger } from 'logger-plus';

const logger = createLogger();

logger.info('Application started');
logger.success('User created successfully');
logger.warn('Memory usage is high');
logger.error('Database connection failed');
logger.debug('Query executed in 12ms');
logger.trace('Entering function handleRequest');
```

**Console output:**

```
2026-01-15T10:23:45.123Z  ℹ INFO     Application started
2026-01-15T10:23:45.124Z  ✔ SUCCESS  User created successfully
2026-01-15T10:23:45.125Z  ⚠ WARN     Memory usage is high
2026-01-15T10:23:45.126Z  ✖ ERROR    Database connection failed
2026-01-15T10:23:45.127Z  ◆ DEBUG    Query executed in 12ms
2026-01-15T10:23:45.128Z  · TRACE    Entering function handleRequest
```

---

## API Reference

### `createLogger(options?)`

Creates a new logger instance.

```ts
import { createLogger } from 'logger-plus';

const logger = createLogger({
  level: 'DEBUG',       // minimum log level (default: 'INFO')
  json: false,          // JSON mode (default: false)
  file: './logs/app.log', // log to a file (default: none)
  prefix: 'APP',        // prefix shown on every line (default: none)
  requestId: 'req-001', // correlation ID (default: none)
  noColor: false,       // disable ANSI colors (default: auto-detect)
  timestamp: true,      // show timestamps (default: true)
});
```

---

### Log Methods

All log methods accept an optional `meta` object of key/value pairs that are appended to the output.

```ts
logger.info('Server listening', { port: 3000, host: 'localhost' });
logger.success('Payment processed', { amount: 99.99, currency: 'USD' });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('Request failed', { statusCode: 500 });
logger.debug('Cache miss', { key: 'user:42' });
logger.trace('Entering middleware');
```

#### `logger.error(message, error)` — Error with stack trace

Pass an `Error` object as the second argument to capture its stack trace:

```ts
try {
  await db.connect();
} catch (err) {
  logger.error('Database connection failed', err as Error);
}
```

---

### Timers

#### `logger.startTimer()`

Returns a `Timer` object.

```ts
const timer = logger.startTimer();

await fetchUsers();

timer.end('Users fetched');
// → 2026-01-15T10:23:45.123Z  ℹ INFO     Users fetched +142ms
```

#### `timer.elapsed()`

Returns elapsed milliseconds without stopping the timer.

```ts
const timer = logger.startTimer();
// ... do work ...
console.log(`Elapsed so far: ${timer.elapsed()}ms`);
timer.end('Done');
```

#### `logger.measure(label, fn)`

Convenience wrapper that times an async function and logs the result:

```ts
const users = await logger.measure('Fetch users', () => db.findAll(User));
// Automatically logs duration on success, or logs the error on failure
```

---

### Child Loggers

```ts
const apiLogger = logger.child({ prefix: 'API' });
const dbLogger = logger.child({ prefix: 'DB', level: 'WARN' });

apiLogger.info('Server started on :3000');
// → 2026-01-15T10:23:45.123Z  ℹ INFO     [API] Server started on :3000

dbLogger.warn('Slow query detected');
// → 2026-01-15T10:23:45.124Z  ⚠ WARN     [DB] Slow query detected
```

---

### Request ID Tracking

```ts
// Option A: pass at creation time
const logger = createLogger({ requestId: 'req-abc-123' });

// Option B: derive a scoped logger per-request
app.use((req, res, next) => {
  req.logger = logger.withRequestId(req.headers['x-request-id'] ?? crypto.randomUUID());
  next();
});

req.logger.info('Processing request');
// → 2026-01-15T10:23:45.123Z  ℹ INFO     (req-abc-123) Processing request
```

---

### JSON Mode

Great for production environments and log aggregators:

```ts
const logger = createLogger({ json: true });

logger.info('Server started', { port: 3000 });
```

**Output (one line per log):**

```json
{"timestamp":"2026-01-15T10:23:45.123Z","level":"INFO","message":"Server started","port":3000}
```

---

### File Logging

Logs are **always** written to the console *and* appended to the file. ANSI color codes are automatically stripped from file output.

```ts
const logger = createLogger({
  file: './logs/app.log',
});

logger.info('This goes to console and file');
```

Parent directories are created automatically if they don't exist.

---

### Level Filtering

```ts
const logger = createLogger({ level: 'WARN' });

logger.debug('Hidden');   // ← suppressed
logger.info('Hidden');    // ← suppressed
logger.warn('Visible');   // ← shown
logger.error('Visible');  // ← shown

// Change level at runtime
logger.setLevel('DEBUG');
logger.debug('Now visible');
```

**Available levels** (lowest → highest severity):

```
TRACE  DEBUG  INFO  SUCCESS  WARN  ERROR  SILENT
```

Setting the level to `SILENT` suppresses all output.

---

### `log()` — Generic Method

```ts
logger.log('DEBUG', 'Custom level log', { custom: true });
```

---

## TypeScript

Full TypeScript support is included out of the box.

```ts
import { createLogger, Logger, LoggerOptions, LogLevel } from 'logger-plus';

function setupLogger(options: LoggerOptions): Logger {
  return createLogger(options);
}

const level: LogLevel = 'INFO';
```

---

## CommonJS

```js
// CommonJS
const { createLogger } = require('logger-plus');

const logger = createLogger();
logger.info('Works with CJS too!');
```

---

## Configuration Reference

| Option | Type | Default | Description |
|---|---|---|---|
| `level` | `LogLevel` | `'INFO'` | Minimum level to emit |
| `json` | `boolean` | `false` | Emit NDJSON instead of pretty output |
| `file` | `string` | `undefined` | Path to append logs to |
| `prefix` | `string` | `undefined` | Label prepended to every log |
| `requestId` | `string` | `undefined` | Correlation ID on every entry |
| `noColor` | `boolean` | auto | Disable ANSI colors |
| `timestamp` | `boolean` | `true` | Show ISO-8601 timestamps |

---

## License

MIT © [Gaurav Kathiriya](https://github.com/gauravkathiriya)