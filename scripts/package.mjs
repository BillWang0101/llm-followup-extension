// Package dist/ into a versioned zip at dist-zip/.
// Run after `npm run build`.
import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const distDir = join(root, 'dist');
const outDir = join(root, 'dist-zip');
const outFile = join(outDir, `${pkg.name}-v${pkg.version}.zip`);

try {
  await stat(distDir);
} catch {
  console.error('✗ dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const zip = new JSZip();

async function addDir(absDir) {
  const entries = await readdir(absDir, { withFileTypes: true });
  for (const e of entries) {
    const abs = join(absDir, e.name);
    const rel = relative(distDir, abs).split('\\').join('/');
    if (e.isDirectory()) {
      await addDir(abs);
    } else if (e.isFile()) {
      const buf = await readFile(abs);
      zip.file(rel, buf);
    }
  }
}

await addDir(distDir);

const content = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});
await writeFile(outFile, content);

const kb = (content.length / 1024).toFixed(1);
console.log(`✓ ${outFile} (${kb} KB)`);
console.log(`  Upload this to Chrome Web Store / Edge Add-ons.`);
