/**
 * Post-build script: renames all .js files in dist/cjs to .cjs
 * and updates internal require() calls accordingly.
 * Also copies a .d.cts file alongside the .d.ts for dual CJS/ESM types.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cjsDir = path.resolve(__dirname, '../dist/cjs');
const typesDir = path.resolve(__dirname, '../dist/types');

if (!fs.existsSync(cjsDir)) {
  console.log('[fix-cjs] No dist/cjs directory found, skipping.');
  process.exit(0);
}

// 1. Rename .js → .cjs and update internal require calls
const jsFiles = fs
  .readdirSync(cjsDir, { recursive: true })
  .filter((f) => typeof f === 'string' && f.endsWith('.js'))
  .map((f) => path.join(cjsDir, f));

for (const file of jsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  // Fix require('./foo.js') → require('./foo.cjs')
  content = content.replace(/require\((['"])([^'"]+)\.js\1\)/g, "require($1$2.cjs$1)");
  const newPath = file.replace(/\.js$/, '.cjs');
  fs.writeFileSync(newPath, content, 'utf8');
  fs.unlinkSync(file);
}

// 2. Copy .d.ts → .d.cts so CJS consumers get proper types
if (fs.existsSync(typesDir)) {
  const dtsFiles = fs
    .readdirSync(typesDir, { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.d.ts'))
    .map((f) => path.join(typesDir, f));

  for (const file of dtsFiles) {
    const dcts = file.replace(/\.d\.ts$/, '.d.cts');
    fs.copyFileSync(file, dcts);
  }
}

console.log('[fix-cjs] ✔ CJS output fixed successfully.');
