import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
if (!existsSync(path.join(root, 'dist/index.html'))) throw new Error('Run npm run build first.');
for (const platform of ['windows', 'android']) {
  const target = path.join(root, 'packaging', platform, 'web');
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(path.join(root, 'dist'), target, { recursive: true });
}
