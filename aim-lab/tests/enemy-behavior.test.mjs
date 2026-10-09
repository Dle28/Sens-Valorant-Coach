import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENEMY_ARCHETYPE_IDS,
  enemyMotion,
  enemyShotEvents,
  nextEnemyShot,
  normalizeEnemyOptions,
  normalizePlayerOptions,
  playerMovement,
  resolveEnemyShot,
  spawnEnemy,
  stepPlayer,
  updateEnemy,
} from '../src/enemy-behavior.js';

test('enemy options repair malformed UI values without mutating the input', () => {
  const input = {
    archetype: 'not-a-mode', seed: '8.9', spawnIndex: -3, speed: 99,
    amplitude: -2, cooldownMs: 0, hitChance: 4,
    bounds: { minX: 6, maxX: -6, minZ: -5, maxZ: -35 },
  };
  const snapshot = JSON.stringify(input);
  const options = normalizeEnemyOptions(input);
  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(options.archetype, 'strafe');
  assert.equal(options.seed, 8);
  assert.equal(options.spawnIndex, 0);
  assert.equal(options.speed, 3.5);
  assert.equal(options.amplitude, 0);
  assert.equal(options.cooldownMs, 120);
  assert.equal(options.hitChance, 1);
  assert.deepEqual(options.bounds, { minX: -6, maxX: 6, minZ: -35, maxZ: -5 });
  assert.ok(Object.isFrozen(options));
  assert.deepEqual(ENEMY_ARCHETYPE_IDS, ['static', 'strafe', 'peek', 'wide', 'random']);
});

test('WASD produces normalized diagonal velocity and bounded player motion', () => {
  const move = playerMovement({ keys: { KeyW: true, KeyD: true } }, { speed: 6 });
  assert.equal(move.moving, true);
  assert.ok(Math.abs(move.velocity.x - Math.SQRT1_2 * 6) < 1e-12);
  assert.ok(Math.abs(move.velocity.z + Math.SQRT1_2 * 6) < 1e-12);
  assert.ok(Math.abs(Math.hypot(move.velocity.x, move.velocity.z) - 6) < 1e-12);

  const stepped = stepPlayer({ x: 0, y: 1.6, z: -10 }, { d: true }, 500, {
    speed: 4, maxDeltaMs: 250, bounds: { minX: -1, maxX: 1, minZ: -20, maxZ: -2 },
  });
  assert.equal(stepped.elapsedMs, 250);
  assert.equal(stepped.position.x, 1);
  assert.equal(stepped.velocity.x, 4);
  assert.equal(stepped.moving, true);
  assert.equal(normalizePlayerOptions({ speed: -4 }).speed, 0);
});

test('player movement follows camera heading while keeping the same lane bounds', () => {
  const stepped = stepPlayer({ x: 0, y: 1.6, z: 0 }, { w: true }, 250, {
    speed: 4, heading: Math.PI / 2, bounds: { minX: -3, maxX: 3, minZ: -3, maxZ: 3 },
  });
  assert.ok(Math.abs(stepped.position.x + 1) < 1e-12);
  assert.ok(Math.abs(stepped.position.z) < 1e-12);
  assert.ok(Math.abs(stepped.velocity.x + 4) < 1e-12);
});

test('spawn positions and moving target paths are deterministic for a seed', () => {
  const options = { archetype: 'random', seed: 302, spawnIndex: 4, randomSpawn: true };
  assert.deepEqual(spawnEnemy(options), spawnEnemy(options));
  assert.deepEqual(enemyMotion(options, 1637), enemyMotion(options, 1637));
  assert.notDeepEqual(spawnEnemy(options).anchor, spawnEnemy({ ...options, seed: 303 }).anchor);
  const random = enemyMotion(options, 1637);
  assert.ok(random.position.x >= -11 && random.position.x <= 11);
  assert.ok(random.position.z >= -34 && random.position.z <= -7);
  assert.ok(Math.hypot(random.velocity.x, random.velocity.z) > 0);
});

test('each archetype has its own observable target behavior', () => {
  const shared = { seed: 14, randomSpawn: false, anchor: { x: 0, y: 1.6, z: -18 }, amplitude: 3 };
  const staticTarget = enemyMotion({ ...shared, archetype: 'static' }, 700);
  assert.deepEqual(staticTarget.position, staticTarget.anchor);
  assert.deepEqual(staticTarget.velocity, { x: 0, y: 0, z: 0 });

  const strafeStart = enemyMotion({ ...shared, archetype: 'strafe' }, 0);
  const strafeLater = enemyMotion({ ...shared, archetype: 'strafe' }, 550);
  assert.notEqual(strafeStart.position.x, strafeLater.position.x);

  const peekOptions = { ...shared, archetype: 'peek', peekPeriodMs: 1000, peekVisibleMs: 300 };
  const samples = Array.from({ length: 12 }, (_, index) => enemyMotion(peekOptions, index * 100));
  assert.ok(samples.some(sample => sample.visible));
  assert.ok(samples.some(sample => !sample.visible && sample.state === 'covered'));

  const wideA = enemyMotion({ ...shared, archetype: 'wide', widePeriodMs: 1000 }, 80);
  const wideB = enemyMotion({ ...shared, archetype: 'wide', widePeriodMs: 1000 }, 330);
  assert.ok(Math.abs(wideA.position.x - wideB.position.x) > 1);
});

test('enemy fire obeys cooldown boundaries and deterministically factors player movement into hit chance', () => {
  const options = {
    archetype: 'static', randomSpawn: false, anchor: { x: 0, y: 1.6, z: -18 },
    seed: 92, cooldownMs: 500, initialShotDelayMs: 200, hitChance: 1, movementEvasion: 0.1, damage: 25,
  };
  const events = enemyShotEvents(options, 0, 1200, time => ({ velocity: { x: time === 700 ? 3 : 0, y: 0, z: 0 } }));
  assert.deepEqual(events.map(event => event.t), [200, 700, 1200]);
  assert.equal(events[0].hit, true);
  assert.equal(events[1].hitChance, 0.7);
  assert.equal(events[1].damage, events[1].hit ? 25 : 0);
  assert.deepEqual(enemyShotEvents(options, 700, 1200).map(event => event.t), [1200]);
  assert.equal(nextEnemyShot(options, 200).t, 700);
  assert.equal(resolveEnemyShot(options, 2, 1200, { speed: 20 }).hitChance, 0);
  assert.equal(resolveEnemyShot(options, 2, 1200, { speed: 20 }).hit, false);
});

test('combined updates keep the current motion and exactly one event interval', () => {
  const options = { archetype: 'wide', seed: 7, cooldownMs: 400, initialShotDelayMs: 100 };
  const update = updateEnemy(options, 99, 501, { speed: 0 });
  assert.equal(update.motion.timeMs, 501);
  assert.deepEqual(update.shots.map(shot => shot.t), [100, 500]);
  assert.ok(Object.isFrozen(update));
});
