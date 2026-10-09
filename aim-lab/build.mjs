import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function sourceFiles(dir){const entries=await readdir(dir,{withFileTypes:true});const result=[];for(const e of entries){const p=dir+'/'+e.name;if(e.isDirectory())result.push(...await sourceFiles(p));else if(/\.(js|cjs|css)$/.test(p))result.push(p);}return result;}
const sourceHash=createHash('sha256');
for(const file of [...await sourceFiles('src'),...await sourceFiles('desktop'),'index.html','package-lock.json'].sort()){sourceHash.update(file);sourceHash.update(await readFile(file));}
const buildId=sourceHash.digest('hex');
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/main.js'], define:{__BUILD_ID__:JSON.stringify(buildId)}, bundle: true, minify: true, sourcemap: true, format: 'esm', outdir: 'dist', target: ['chrome110', 'firefox115', 'safari17'] });
const html = (await readFile('index.html', 'utf8')).replace('/src/main.js', '/main.js').replace('/src/style.css', '/style.css').replace('/src/interface.css', '/interface.css').replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
await writeFile('dist/index.html', html);
await copyFile('src/style.css', 'dist/style.css');
await copyFile('src/interface.css', 'dist/interface.css');
await mkdir('dist/assets/fonts', { recursive: true });
for (const font of await readdir('src/assets/fonts')) await copyFile(`src/assets/fonts/${font}`, `dist/assets/fonts/${font}`);
await mkdir('dist/assets', { recursive: true });
await mkdir('dist/assets/maps', {recursive:true});
for(const asset of await readdir('src/assets/maps')) await copyFile(`src/assets/maps/${asset}`,`dist/assets/maps/${asset}`);
await mkdir('dist/assets/models', {recursive:true});
for(const asset of ['vandal-valorant.glb','sas-cs2-blue.glb']){
 const source=`src/assets/models/${asset}`;
 try{if((await stat(source)).isFile())await copyFile(source,`dist/assets/models/${asset}`);}catch{}
}
console.log('Built dist/ — npm run preview');
