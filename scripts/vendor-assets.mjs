// Copies the on-device OCR engine (Tesseract worker, WebAssembly core and the
// English model) from node_modules into public/vendor, so OCR runs offline in
// the web, Windows and Android builds. The copies are generated, not tracked.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'public', 'vendor', 'tesseract');
mkdirSync(out, { recursive: true });
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
];
for (const [from, to] of files) {
  const source = path.join(root, from);
  if (!existsSync(source)) throw new Error(`Missing ${from}; run npm ci.`);
  copyFileSync(source, path.join(out, to));
}
console.log(`OCR engine copied to ${path.relative(root, out)}`);
