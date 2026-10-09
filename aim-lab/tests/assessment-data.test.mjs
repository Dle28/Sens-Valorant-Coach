import test from 'node:test';
import assert from 'node:assert/strict';
import { assessmentAssignment, assessmentConfigMatches } from '../src/assessment-protocol.js';
import { deriveTrialTelemetry } from '../src/telemetry-features.js';
import { coachingFollowup } from '../src/coaching-outcomes.js';
import { nextAssessmentForecast } from '../src/next-assessment-baseline.js';
import { assessSession, validateSession } from '../src/data-contract.js';
import { createQueue } from '../src/playlists.js';

const id = '12345678-1234-4234-8234-123456789abc';

function assessmentRun(overrides = {}) {
  const assessment = assessmentAssignment('core-aim-battery-v1', 0);
  return {
    schemaVersion: '0.4', isSynthetic: false, id, playerId: id, identityPersistent: true,
    startedAt: '2026-09-11T00:00:00Z', status: 'completed', elapsedMs: 1000,
    config: { trackingTask: false, combatTask: false, sensitivity: .3, dpi: 800, deadlineMs: 2500, exerciseVersion: '0.20', ...assessment.assignedConfig },
    clock: { timebase: 'session_active_ms', inputCoordinateSpace: 'browser_movement_units' },
    protocol: { consentForTraining: true, blockId: id, phase: 'baseline', assessment },
    provenance: { collectorVersion: '0.4.0', buildId: 'test-fixture' }, pauses: [], inputEvents: [], controlEvents: [], shots: [],
    trials: Array.from({ length: 10 }, (_, index) => ({ trialId: index + 1, startedMs: index * 100, endedMs: (index + 1) * 100, outcome: 'timeout', firstShotMs: null, firstShotHit: null })),
    frames: Array.from({ length: 10 }, (_, index) => ({ seq: index, t: (index + 1) * 100, dt: 100, trialId: index + 1, targetId: `target-${index + 1}`, cameraPosition: [0, 1.6, 0], target: [0, 1.6, -20], yaw: 0, pitch: 0, errorDeg: 0, onTarget: true })),
    ...overrides,
  };
}

test('fixed assessment assignment validates its exact config and creates a consented predictive-dataset candidate', () => {
  const run = assessmentRun();
  assert.equal(assessmentConfigMatches(run), true);
  assert.equal(validateSession(run).valid, true);
  assert.equal(assessSession(run).eligibleForPredictiveDataset, true);
  assert.equal(assessSession(run).eligibleForKinematicModel, false);
  run.config.seed = 99;
  assert.equal(validateSession(run).valid, false);
  assert.ok(validateSession(run).errors.some(error => error.code === 'ASSESSMENT_CONFIG_MISMATCH'));
});

test('telemetry features keep browser-movement kinematics explicitly as proxies', () => {
  const trial = { trialId: 1, startedMs: 0, endedMs: 500, firstShotMs: 400, firstVisibleMs: 20, firstEntryMs: 240, entryToFirstShotMs: 160 };
  const run = {
    frames: [
      { seq: 0, trialId: 1, t: 100, target: [0, 1.6, -20], cameraPosition: [0, 1.6, 0], yaw: .1, pitch: 0 },
      { seq: 1, trialId: 1, t: 200, target: [0, 1.6, -20], cameraPosition: [0, 1.6, 0], yaw: -.1, pitch: 0 },
    ],
    inputEvents: [{ seq: 0, trialId: 1, t: 100, dx: 4, dy: 0 }, { seq: 1, trialId: 1, t: 200, dx: -2, dy: 1 }],
    controlEvents: [{ seq: 0, trialId: 1, t: 400, type: 'pointerdown' }], shots: [{ seq: 0, trialId: 1, t: 400, hit: true }],
  };
  const features = deriveTrialTelemetry(run, trial).features;
  const byName = name => features.find(item => item.name === name);
  assert.equal(byName('input_horizontal_reversal_count_before_first_shot').value, 1);
  assert.equal(byName('input_horizontal_reversal_count_before_first_shot').validity, 'PROXY');
  assert.equal(byName('crossed_target_center_horizontal_before_first_shot').value, 1);
  assert.equal(byName('first_visible_to_entry_ms').value, 220);
});

test('follow-up reports a paired observation and never upgrades it to a causal effect', () => {
  const assignment = assessmentAssignment('core-aim-battery-v1', 0);
  const config = { ...assignment.assignedConfig, sensitivity: .3, dpi: 800, dpiSource: 'manual', inputMode: 'unadjusted-requested-unverified', inputGain: 1, exerciseVersion: '0.20', horizontalFovDeg: 103, deadlineMs: 2500 };
  const baseline = { id: 'baseline', status: 'completed', qualityClean: true, config, protocol: { phase: 'baseline', assessment: assignment }, summary: { firstShotSuccessRate: .6 } };
  const intervention = { id: 'intervention', status: 'completed', qualityClean: true, elapsedMs: 30000, config: { ...config, task: 'micro' }, protocol: { phase: 'intervention', coaching: { sourceSessionId: 'baseline', plannedDurationMs: 30000 } }, summary: {} };
  const retest = { id: 'retest', status: 'completed', qualityClean: true, config: { ...config }, protocol: { phase: 'retest', referenceSessionId: 'baseline', assessment: assignment }, summary: { firstShotSuccessRate: .75 } };
  const result = coachingFollowup(retest, [intervention, baseline]);
  assert.equal(result.state, 'paired-observation');
  assert.ok(Math.abs(result.delta - .15) < 1e-12);
  assert.match(result.message, /chưa chứng minh/);
});

test('assessment queues retain their baseline or retest intent', () => {
  assert.equal(createQueue('assessment').protocolPhase, 'baseline');
  assert.equal(createQueue('assessment', 'retest').protocolPhase, 'retest');
  assert.equal(createQueue('warmup', 'retest').protocolPhase, null);
});

test('next assessment baseline waits for three clean matching click assessments and then uses their median', () => {
  const assignment = assessmentAssignment('core-aim-battery-v1', 0);
  const config = { ...assignment.assignedConfig, sensitivity: .3, dpi: 800, deadlineMs: 2500, exerciseVersion: '0.20', trackingTask: false, combatTask: false };
  const makeRecord = (id, rate, day, clean = true) => ({ id, playerId: 'player', startedAt: `2026-09-0${day}T00:00:00Z`, status: 'completed', qualityClean: clean, config, protocol: { assessment: assignment }, summary: { firstShotSuccessRate: rate } });
  const two = nextAssessmentForecast([makeRecord('a', .4, 1), makeRecord('b', .8, 2)], { playerId: 'player', assignment });
  assert.equal(two.state, 'insufficient-history');
  const forecast = nextAssessmentForecast([makeRecord('a', .4, 1), makeRecord('b', .8, 2), makeRecord('c', .6, 3), makeRecord('unclean', 1, 4, false)], { playerId: 'player', assignment });
  assert.equal(forecast.state, 'available');
  assert.equal(forecast.predictionRate, .6);
  assert.deepEqual(forecast.observedRange, { low: .4, high: .8 });
  assert.match(forecast.message, /chưa phải dự đoán AI/);
});
