import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assessSession, researchEvents } from './data-contract.js';

export const LOCAL_LAKE_VERSION = 'local-lake-1';

const hash = text => createHash('sha256').update(text).digest('hex');
const json = value => JSON.stringify(value, null, 2);
const exists = async file => {
  try { await readFile(file); return true; } catch { return false; }
};

async function writeAtomic(file, text) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, text, { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, file);
}

async function assertNoConflictingSession(file, expectedHash) {
  if (!await exists(file)) return false;
  const existing = await readFile(file, 'utf8');
  if (hash(existing) !== expectedHash) throw new Error('LAKE_SESSION_ID_CONFLICT');
  return true;
}

/**
 * Copies a consented, validated desktop session into immutable local-lake
 * layers. No network is used; a future API ingestor can replay Bronze safely.
 */
export async function ingestRawSession({ run, text, sourceManifest, lakeDirectory, source = 'desktop-auto-sync' }) {
  if (!run || typeof run !== 'object' || typeof text !== 'string' || !lakeDirectory) throw new Error('LAKE_INGEST_ARGUMENTS_INVALID');
  if (run.protocol?.consentForTraining !== true) return { state: 'skipped', reason: 'NO_TRAINING_CONSENT' };
  if (run.isSynthetic === true) return { state: 'skipped', reason: 'SYNTHETIC_SESSION' };
  const sourceSha256 = hash(text);
  if (sourceManifest?.sha256 !== sourceSha256) return { state: 'skipped', reason: 'SOURCE_MANIFEST_HASH_MISMATCH' };
  const quality = assessSession(run);
  if (!quality.structurallyValid) return { state: 'skipped', reason: 'STRUCTURALLY_INVALID', quality };

  const id = run.id;
  const bronzeFile = path.join(lakeDirectory, 'bronze', 'sessions', `${id}.json`);
  const alreadyIngested = await assertNoConflictingSession(bronzeFile, sourceSha256);
  if (alreadyIngested) return { state: 'already-ingested', sessionId: id, sourceSha256, quality };

  const events = researchEvents(run).map(event => ({ ...event, sourceManifestHash: sourceSha256, lakeVersion: LOCAL_LAKE_VERSION }));
  const record = {
    lakeVersion: LOCAL_LAKE_VERSION,
    sessionId: id,
    playerId: run.playerId,
    source,
    ingestedAt: new Date().toISOString(),
    sourceSha256,
    sourceManifest: sourceManifest ?? null,
    quality,
    layers: {
      bronze: `bronze/sessions/${id}.json`,
      silverQuality: `silver/quality/${id}.json`,
      silverEvents: `silver/events/${id}.jsonl`,
      goldPredictiveEvents: quality.eligibleForPredictiveDataset ? `gold/predictive-events/${id}.jsonl` : null,
    },
  };
  await writeAtomic(bronzeFile, text);
  await writeAtomic(path.join(lakeDirectory, 'silver', 'quality', `${id}.json`), json({ sessionId: id, sourceSha256, quality }));
  await writeAtomic(path.join(lakeDirectory, 'silver', 'events', `${id}.jsonl`), events.map(event => JSON.stringify(event)).join('\n'));
  if (quality.eligibleForPredictiveDataset) await writeAtomic(path.join(lakeDirectory, 'gold', 'predictive-events', `${id}.jsonl`), events.map(event => JSON.stringify(event)).join('\n'));
  await writeAtomic(path.join(lakeDirectory, 'manifests', 'sessions', `${id}.json`), json(record));
  return { state: 'ingested', sessionId: id, sourceSha256, quality, events: events.length, predictive: quality.eligibleForPredictiveDataset };
}
