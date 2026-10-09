import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { assessmentAssignment } from '../src/assessment-protocol.js';
import { ingestRawSession } from '../src/data-lake.js';

const id = '12345678-1234-4234-8234-123456789abc';
const playerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function validConsentedAssessment() {
  const assessment = assessmentAssignment('core-aim-battery-v1', 0);
  return {
    schemaVersion: '0.4', id, playerId, identityPersistent: true, isSynthetic: false,
    startedAt: '2026-09-11T00:00:00Z', status: 'completed', elapsedMs: 1000,
    clock: { timebase: 'session_active_ms', inputCoordinateSpace: 'browser_movement_units' },
    provenance: { collectorVersion: '0.4.0', buildId: 'test-fixture' },
    protocol: { blockId: id, phase: 'baseline', assignment: 'protocol_fixed', assessment, consentForTraining: true },
    config: { ...assessment.assignedConfig, trackingTask: false, combatTask: false, sensitivity: .3, dpi: 800, dpiSource: 'declared', deadlineMs: 2500, exerciseVersion: '0.24.0', rawVerified: false },
    pauses: [], inputEvents: [], controlEvents: [], shots: [],
    trials: Array.from({ length: 10 }, (_, index) => ({
      trialId: index + 1, startedMs: index * 100, endedMs: (index + 1) * 100,
      outcome: index % 2 ? 'timeout' : 'hit', firstShotMs: index % 2 ? null : 50, firstShotHit: index % 2 ? null : true,
    })),
    frames: Array.from({ length: 10 }, (_, index) => ({
      seq: index, t: (index + 1) * 100, dt: 100, trialId: index + 1, targetId: `target-${index + 1}`,
      cameraPosition: [0, 1.6, 0], target: [0, 1.6, -20], yaw: 0, pitch: 0, errorDeg: 0, onTarget: true,
    })),
  };
}

test('local data lake ingests consented validated raw once and emits immutable Bronze/Silver/Gold layers', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'v-aim-lake-test-'));
  try {
    const run = validConsentedAssessment();
    const text = JSON.stringify(run);
    const manifest = { sha256: createHash('sha256').update(text).digest('hex') };
    const result = await ingestRawSession({ run, text, sourceManifest: manifest, lakeDirectory: root });
    assert.equal(result.state, 'ingested');
    assert.equal(result.predictive, true);
    const bronze = await readFile(path.join(root, 'bronze', 'sessions', `${id}.json`), 'utf8');
    assert.equal(bronze, text);
    const events = await readFile(path.join(root, 'gold', 'predictive-events', `${id}.jsonl`), 'utf8');
    assert.equal(events.trim().split(/\r?\n/).length, 10);
    const duplicate = await ingestRawSession({ run, text, sourceManifest: manifest, lakeDirectory: root });
    assert.equal(duplicate.state, 'already-ingested');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
