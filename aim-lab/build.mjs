import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, sourcemap: true, format: 'esm', outdir: 'dist', target: ['chrome110', 'firefox115', 'safari17'] });
const html = (await readFile('index.html', 'utf8')).replace('/src/main.js', '/main.js').replace('/src/style.css', '/style.css').replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
await writeFile('dist/index.html', html);
await copyFile('src/style.css', 'dist/style.css');
console.log('Built dist/ — npm run preview');
