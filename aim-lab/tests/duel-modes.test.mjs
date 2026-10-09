import assert from 'node:assert/strict';
import test from 'node:test';
import { TASKS, analyzeRun, distanceBand, scenarioInfo, targetPosition, taskMotion } from '../src/training.js';

const COMBAT_TASKS = ['duel', 'counter', 'survival'];

test('combat mini-games expose movement contracts for the scenario UI', () => {
 for (const task of COMBAT_TASKS) {
  const definition = TASKS[task];
  assert.ok(definition, `${task} is available`);
  assert.equal(definition.category, 'movement');
  assert.equal(definition.combat, true);
  assert.equal(definition.moving, true);
  assert.ok(definition.motion, `${task} has a motion mode`);

  const info = scenarioInfo({ task, difficulty: 'hard' });
  assert.equal(info.task, task);
  assert.equal(info.category, 'movement');
  assert.equal(info.combat, true);
  assert.equal(info.motion, definition.motion);
  assert.ok(info.distanceRange.minimum > 0);
  assert.ok(info.distanceRange.maximum >= info.distanceRange.minimum);
  assert.ok(info.distanceBands.length > 0);
 }
});

test('combat mini-game target geometry and motion stay deterministic and finite', () => {
 for (const task of COMBAT_TASKS) {
  const options = { task, map: 'lotus', difficulty: 'expert', seed: 941, index: 4 };
  const position = targetPosition(options);
  assert.deepEqual(position, targetPosition(options));
  for (const key of ['yaw', 'pitch', 'radius', 'distance']) {
   assert.ok(Number.isFinite(position[key]), `${task} ${key} is finite`);
  }
  assert.ok(position.distance > 0);
  assert.equal(position.distanceBand, distanceBand(position.distance));

  const motionOptions = { task, difficulty: 'expert', seed: 941, index: 4, timeMs: 1375, baseYaw: position.yaw, basePitch: position.pitch };
  const motion = taskMotion(motionOptions);
  assert.deepEqual(motion, taskMotion(motionOptions));
  assert.ok(Number.isFinite(motion.yaw), `${task} motion yaw is finite`);
  assert.ok(Number.isFinite(motion.pitch), `${task} motion pitch is finite`);
 }
});

test('combat analysis describes recorded enemy pressure and proposes a movement response', () => {
 const run = {
  status: 'completed', elapsedMs: 12000,
  config: { task: 'duel', difficulty: 'normal', deadlineMs: 2500, inputMode: 'unadjusted-requested-unverified' },
  shots: Array.from({ length: 10 }, () => ({ hit: true })),
  trials: Array.from({ length: 10 }, () => ({ outcome: 'hit', firstShotHit: true, firstShotMs: 350, hitMs: 350, firstEntryMs: 250 })),
  tracking: { validMs: 12000, onTargetMs: 7000, squaredErrorTime: 2000 }, frameIntervals: [16, 16, 16], pauses: [],
  frames: Array.from({ length: 12 }, (_, index) => ({ t: (index + 1) * 1000, dt: 1000 / 12, player: { velocity: { x: 0, y: 0, z: 0 } } })),
  combat: { enabled: true, shotsFired: 5, shotsLanded: 3, damageTaken: 54, playerHealth: 46, playerShield: 0 },
 };
 const analysis = analyzeRun(run);
 assert.equal(analysis.nextTask, 'counter');
 assert.equal(analysis.combat.enemyHitRate, .6);
 assert.equal(analysis.combat.damageTaken, 54);
 assert.equal(analysis.combat.movingRatio, 0);
 assert.ok(analysis.evidence.some((item) => item.includes('Độ chính xác địch: 3/5')));
 assert.ok(analysis.evidence.some((item) => item.includes('Sát thương nhận: 54')));
 assert.ok(analysis.evidence.some((item) => item.includes('Áp lực địch: cao')));
 assert.ok(analysis.actions.some((item) => item.includes('Counter-strafe')));
});

test('combat analysis keeps missing telemetry explicit instead of fabricating accuracy, damage, or movement', () => {
 const run = {
  status: 'completed', elapsedMs: 12000,
  config: { task: 'duel', difficulty: 'normal', deadlineMs: 2500, inputMode: 'unadjusted-requested-unverified' },
  shots: Array.from({ length: 10 }, () => ({ hit: true })),
  trials: Array.from({ length: 10 }, () => ({ outcome: 'hit', firstShotHit: true, firstShotMs: 350, hitMs: 350, firstEntryMs: 250 })),
  tracking: { validMs: 12000, onTargetMs: 7000, squaredErrorTime: 2000 }, frameIntervals: [16, 16, 16], pauses: [],
  frames: [{ t: 100, dt: 100, player: {} }],
  combat: { enabled: true, shotsFired: 4 },
 };
 const analysis = analyzeRun(run);
 assert.equal(analysis.combat.enemyShots, 4);
 assert.equal(analysis.combat.enemyHitRate, null);
 assert.equal(analysis.combat.movingRatio, null);
 assert.ok(analysis.evidence.some((item) => item.includes('thiếu kết quả hit/miss')));
 assert.ok(analysis.evidence.some((item) => item.includes('Áp lực địch: trung bình')));
 assert.ok(!analysis.evidence.some((item) => item.includes('Sát thương nhận:')));
 assert.ok(!analysis.evidence.some((item) => item.includes('Bạn di chuyển')));
});
