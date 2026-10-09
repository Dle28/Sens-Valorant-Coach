import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ingestRawSession, LOCAL_LAKE_VERSION } from '../src/data-lake.js';

const args = process.argv.slice(2);
if (!args[0] || !args[1]) {
  console.error('Usage: npm run lake:sync -- source-raw-directory local-lake-directory');
  process.exit(2);
}

const sourceDirectory = path.resolve(args[0]);
const lakeDirectory = path.resolve(args[1]);
const results = [];
for (const file of (await readdir(sourceDirectory)).filter(name => name.endsWith('.json') && !name.endsWith('.manifest.json')).sort()) {
  try {
    const source = path.join(sourceDirectory, file);
    const text = await readFile(source, 'utf8');
    const run = JSON.parse(text);
    let sourceManifest = null;
    try { sourceManifest = JSON.parse(await readFile(`${source}.manifest.json`, 'utf8')); }
    catch { results.push({ file, state: 'skipped', reason: 'SOURCE_MANIFEST_MISSING' }); continue; }
    results.push({ file, ...await ingestRawSession({ run, text, sourceManifest, lakeDirectory, source: 'manual-game-pull' }) });
  } catch (error) {
    results.push({ file, state: 'error', reason: error.message });
  }
}
const counts = results.reduce((all, item) => ({ ...all, [item.state]: (all[item.state] ?? 0) + 1 }), {});
const report = { lakeVersion: LOCAL_LAKE_VERSION, sourceDirectory, lakeDirectory, syncedAt: new Date().toISOString(), counts, results };
await mkdir(path.join(lakeDirectory, 'manifests'), { recursive: true });
await writeFile(path.join(lakeDirectory, 'manifests', 'latest-sync.json'), JSON.stringify(report, null, 2), { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify(report, null, 2));
if (counts.error) process.exitCode = 1;
