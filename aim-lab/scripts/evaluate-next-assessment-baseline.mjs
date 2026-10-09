import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
if (!args[0] || !args[1]) {
  console.error('Usage: npm run ml:evaluate-baseline -- <next-assessment-click-v1.jsonl> <new output directory>');
  process.exit(2);
}

const input = path.resolve(args[0]);
const outputDirectory = path.resolve(args[1]);
const rows = (await readFile(input, 'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse)
  .filter(row => Number.isFinite(row?.persistenceMedian3) && (row.labelFirstShotSuccess === 0 || row.labelFirstShotSuccess === 1));
const clamp = value => Math.max(.001, Math.min(.999, value));
const bins = Array.from({ length: 5 }, (_, index) => ({ lower: index / 5, upper: (index + 1) / 5, rows: [] }));
for (const row of rows) bins[Math.min(4, Math.floor(clamp(row.persistenceMedian3) * 5))].rows.push(row);
const brier = rows.length ? rows.reduce((sum, row) => sum + (row.labelFirstShotSuccess - row.persistenceMedian3) ** 2, 0) / rows.length : null;
const logLoss = rows.length ? rows.reduce((sum, row) => {
  const probability = clamp(row.persistenceMedian3);
  return sum - (row.labelFirstShotSuccess ? Math.log(probability) : Math.log(1 - probability));
}, 0) / rows.length : null;
const report = {
  evaluatorVersion: 'persistence-baseline-eval-v1',
  source: input,
  rows: rows.length,
  brierScore: brier,
  logLoss,
  calibration: bins.filter(bin => bin.rows.length).map(bin => ({
    range: [bin.lower, bin.upper],
    rows: bin.rows.length,
    meanPrediction: bin.rows.reduce((sum, row) => sum + row.persistenceMedian3, 0) / bin.rows.length,
    observedRate: bin.rows.reduce((sum, row) => sum + row.labelFirstShotSuccess, 0) / bin.rows.length,
  })),
  releaseDecision: rows < 100 ? 'NOT_READY: fewer than 100 held-out trial rows; do not show model prediction.' : 'BASELINE_ONLY: compare a trained candidate against this report on the same future holdout.',
};
await mkdir(outputDirectory, { recursive: false });
await writeFile(path.join(outputDirectory, 'persistence-baseline-evaluation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
