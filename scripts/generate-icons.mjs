// Render public/icons/icon.svg to 16/48/128 PNG using @resvg/resvg-js.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcSvg = join(root, 'public', 'icons', 'icon.svg');
const outDir = join(root, 'public', 'icons');

const sizes = [16, 48, 128];

const svg = await readFile(srcSvg, 'utf8');
await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  const png = resvg.render().asPng();
  const out = join(outDir, `icon${size}.png`);
  await writeFile(out, png);
  console.log(`✓ ${out} (${png.length} bytes)`);
}
