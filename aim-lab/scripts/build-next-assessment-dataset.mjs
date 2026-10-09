import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assessSession } from '../src/data-contract.js';
import { assessmentConfigMatches, assessmentMetric } from '../src/assessment-protocol.js';
import { summarizeRun } from '../src/metrics.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATASET_VERSION = 'next-assessment-click-v1';
const CLICK_BLOCKS = new Set(['precision', 'micro', 'wide']);
const args = process.argv.slice(2);

if (!args[0] || !args[1]) {
  console.error('Usage: npm run ml:build-dataset -- <sessions/raw directory> <new output directory>');
  process.exit(2);
}

const sourceDirectory = path.resolve(args[0]);
const outputDirectory = path.resolve(args[1]);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const at = run => Date.parse(run?.startedAt ?? '');
const median = values => {
  const sorted = values.filter(finite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return (sorted[middle] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2;
};

function asClickAssessment(run, sourceSha256) {
  const quality = assessSession(run);
  if (!quality.eligibleForPredictiveDataset) return null;
  const assignment = run?.protocol?.assessment;
  const summary = run?.summary ?? summarizeRun(run);
  const metric = assessmentMetric({ ...run, summary });
  if (!assignment || !CLICK_BLOCKS.has(assignment.blockId)) return null;
  if (!assessmentConfigMatches(run) || metric?.key !== 'firstShotSuccessRate' || !finite(at(run))) return null;
  return { run: { ...run, summary }, quality, assignment, rate: metric.value, sourceSha256 };
}

function doseBetween(runs, playerId, startMs, endMs) {
  return runs
    .filter(row => row?.playerId === playerId && row?.protocol?.phase === 'intervention' && row?.protocol?.consentForTraining === true && row?.status === 'completed')
    .filter(row => at(row) > startMs && at(row) < endMs)
    .reduce((sum, row) => sum + (finite(row.elapsedMs) && row.elapsedMs >= 0 ? row.elapsedMs : 0), 0);
}

const parsedRuns = [];
const rejected = [];
for (const file of (await readdir(sourceDirectory)).filter(name => name.endsWith('.json') && !name.endsWith('.manifest.json')).sort()) {
  try {
    const text = await readFile(path.join(sourceDirectory, file), 'utf8');
    const run = JSON.parse(text);
    parsedRuns.push({ ...run, _sourceFile: file, _sourceSha256: createHash('sha256').update(text).digest('hex') });
  } catch (error) {
    rejected.push({ file, reason: error.message });
  }
}

const assessments = parsedRuns
  .map(run => asClickAssessment(run, run._sourceSha256))
  .filter(Boolean)
  .sort((a, b) => at(a.run) - at(b.run));
const groups = new Map();
for (const row of assessments) {
  const key = [row.run.playerId, row.assignment.protocolId, row.assignment.blockId].join(':');
  const group = groups.get(key) ?? [];
  group.push(row);
  groups.set(key, group);
}

const rows = [];
const skipped = { insufficientHistory: 0, outsidePredictionWindow: 0, missingTrialOutcome: 0 };
for (const group of groups.values()) {
  for (let index = 0; index < group.length; index++) {
    const current = group[index];
    const previous = group.slice(0, index).slice(-3);
    if (previous.length < 3) {
      skipped.insufficientHistory++;
      continue;
    }
    const previousLatest = previous.at(-1);
    const daysSincePrevious = (at(current.run) - at(previousLatest.run)) / DAY_MS;
    if (!finite(daysSincePrevious) || daysSincePrevious < 1 || daysSincePrevious > 3) {
      skipped.outsidePredictionWindow++;
      continue;
    }
    const priorRates = previous.map(row => row.rate);
    const priorConfig = previousLatest.run.config;
    const trainingDoseMs = doseBetween(parsedRuns, current.run.playerId, at(previousLatest.run), at(current.run));
    for (const trial of current.run.trials ?? []) {
      if (!Number.isInteger(trial?.trialId) || !['hit', 'miss', 'no_shot', 'timeout'].includes(trial.outcome)) {
        skipped.missingTrialOutcome++;
        continue;
      }
      const deadlineMs = current.run.config.deadlineMs;
      const firstShotSuccess = trial.firstShotHit === true && finite(trial.firstShotMs) && trial.firstShotMs < deadlineMs;
      rows.push({
        datasetVersion: DATASET_VERSION,
        rowId: `${current.run.id}:${trial.trialId}`,
        playerId: current.run.playerId,
        protocolId: current.assignment.protocolId,
        protocolVersion: current.assignment.protocolVersion,
        blockId: current.assignment.blockId,
        targetSessionId: current.run.id,
        targetStartedAt: current.run.startedAt,
        sourceManifestHash: current.sourceSha256,
        labelFirstShotSuccess: firstShotSuccess ? 1 : 0,
        targetDeadlineMs: deadlineMs,
        targetRadius: trial.targetRadius ?? null,
        targetDistance: trial.distance ?? null,
        targetSizeBand: trial.sizeBand ?? null,
        targetDistanceBand: trial.distanceBand ?? null,
        priorAssessmentSessionIds: previous.map(row => row.run.id),
        priorRate1: priorRates.at(-1),
        priorRate2: priorRates.at(-2),
        priorRate3: priorRates.at(-3),
        persistenceMedian3: median(priorRates),
        persistenceMin3: Math.min(...priorRates),
        persistenceMax3: Math.max(...priorRates),
        daysSincePreviousAssessment: daysSincePrevious,
        trainingDoseMsSincePreviousAssessment: trainingDoseMs,
        fatigueBefore: current.run.protocol?.fatigueBefore ?? null,
        sensitivityChangedSincePrevious: current.run.config.sensitivity !== priorConfig.sensitivity,
        dpiChangedSincePrevious: current.run.config.dpi !== priorConfig.dpi,
        dpiSourceChangedSincePrevious: current.run.config.dpiSource !== priorConfig.dpiSource,
        collectorVersion: current.run.provenance.collectorVersion,
        extractorVersion: current.quality.version,
      });
    }
  }
}

await mkdir(outputDirectory, { recursive: false });
const output = path.join(outputDirectory, `${DATASET_VERSION}.jsonl`);
const manifest = {
  datasetVersion: DATASET_VERSION,
  sourceDirectory,
  generatedAt: new Date().toISOString(),
  sourceFiles: parsedRuns.length,
  rejectedFiles: rejected,
  eligibleAssessmentSessions: assessments.length,
  groups: groups.size,
  rows: rows.length,
  skipped,
  label: 'first shot hit before deadline for the target assessment trial',
  predictionHorizonDays: { minimum: 1, maximum: 3 },
  baseline: 'median of the preceding three clean same-player same-block assessments',
};
await writeFile(output, rows.map(row => JSON.stringify(row)).join('\n'));
await writeFile(path.join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ output, ...manifest }, null, 2));
