import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeCombat } from '../src/combat-analysis.js';

test('combat summary uses measured aggregate counters and normalizes only timestamped events', () => {
  const run = {
    elapsedMs: 10000,
    combat: {
      enabled: true,
      shotsFired: 5,
      shotsLanded: 3,
      damageTaken: 54,
      playerHealth: 46,
      playerShield: 0,
      enemyShots: [
        { t: 9900, hit: false, damage: 0 },
        { t: 500, hit: true, damage: 18 },
        { t: 2500, hit: true, damage: 18 },
        { t: 12000, hit: true, damage: 18 },
      ],
    },
    frames: [
      { t: 100, dt: 100, player: { velocity: { x: 0, y: 0, z: 0 } } },
      { t: 200, dt: 100, player: { velocity: { x: 2, y: 0, z: 0 } } },
      { t: 300, dt: 100, player: { velocity: { x: 2, y: 0, z: 0 } } },
      { t: 400, dt: 100, player: { velocity: { x: 0, y: 0, z: 0 } } },
    ],
  };

  const result = summarizeCombat(run);
  assert.deepEqual({
    enabled: result.enabled,
    enemyShots: result.enemyShots,
    enemyHits: result.enemyHits,
    enemyHitRate: result.enemyHitRate,
    damageTaken: result.damageTaken,
    health: result.health,
    shield: result.shield,
    movingRatio: result.movingRatio,
    pressure: result.pressure,
  }, {
    enabled: true,
    enemyShots: 5,
    enemyHits: 3,
    enemyHitRate: 0.6,
    damageTaken: 54,
    health: 46,
    shield: 0,
    movingRatio: 0.5,
    pressure: 'high',
  });
  assert.deepEqual(result.timeline, [
    { type: 'enemy-shot', progress: 0.05, hit: true, damage: 18 },
    { type: 'enemy-shot', progress: 0.25, hit: true, damage: 18 },
    { type: 'enemy-shot', progress: 0.99, hit: false, damage: 0 },
  ]);
});

test('combat summary falls back to measured shot records and frame vitals without inventing timestamps', () => {
  const run = {
    elapsedMs: 1000,
    combat: {
      enabled: true,
      enemyShots: [
        { t: 100, hit: true, damage: 12 },
        { t: 400, hit: false, damage: 0 },
      ],
    },
    frames: [
      { t: 100, dt: 100, player: { health: 96, shield: 50, moving: false } },
      { t: 200, dt: 100, player: { health: 88, shield: 50, moving: true } },
      { t: 300, dt: 100, player: { health: 88, shield: 38, moving: true } },
      { t: 400, dt: 100, player: { health: 88, shield: 38, moving: false } },
    ],
  };

  const result = summarizeCombat(run);
  assert.equal(result.enemyShots, 2);
  assert.equal(result.enemyHits, 1);
  assert.equal(result.enemyHitRate, 0.5);
  assert.equal(result.damageTaken, 12);
  assert.equal(result.health, 88);
  assert.equal(result.shield, 38);
  assert.equal(result.movingRatio, 0.5);
  assert.equal(result.pressure, 'moderate');
  assert.equal(result.timeline.length, 2);
});

test('combat summary rejects malformed or unverifiable telemetry without mutating the source', () => {
  const run = {
    elapsedMs: 0,
    combat: {
      enabled: true,
      shotsFired: 'bad',
      shotsLanded: -2,
      damageTaken: -1,
      playerHealth: 'unknown',
      playerShield: null,
      enemyShots: [{ t: -1, hit: 'yes', damage: -5 }, null],
    },
    frames: [
      { t: 50, dt: 150, player: { moving: true } },
      { t: 'bad', dt: 20, player: { velocity: { x: 1, y: 0, z: 0 } } },
    ],
  };
  const snapshot = JSON.stringify(run);
  const result = summarizeCombat(run);

  assert.equal(JSON.stringify(run), snapshot);
  assert.deepEqual(result, {
    enabled: true,
    enemyShots: 1,
    enemyHits: 0,
    enemyHitRate: null,
    damageTaken: 0,
    health: null,
    shield: null,
    movingRatio: null,
    pressure: 'low',
    timeline: [],
  });
  assert.doesNotThrow(() => JSON.stringify(result));
});

test('non-combat or zero-shot runs expose no hit-rate or movement conclusion', () => {
  const result = summarizeCombat({ elapsedMs: 2000, frames: [] });
  assert.equal(result.enabled, false);
  assert.equal(result.enemyShots, 0);
  assert.equal(result.enemyHits, 0);
  assert.equal(result.enemyHitRate, null);
  assert.equal(result.damageTaken, 0);
  assert.equal(result.movingRatio, null);
  assert.equal(result.pressure, 'low');
  assert.deepEqual(result.timeline, []);
});
