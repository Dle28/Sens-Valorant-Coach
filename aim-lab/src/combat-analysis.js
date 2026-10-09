/*
 * Combat telemetry summary.
 *
 * This module deliberately reads only telemetry recorded by a completed (or
 * live) run.  It does not infer enemy actions from a selected task, estimate
 * missing health, or create timeline points for aggregate counters that have
 * no timestamp.
 */

const MAX_FRAME_WINDOW_MS = 100;
const MOVEMENT_EPSILON = 0.001;

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function finite(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegative(value) {
  const number = finite(value);
  return number !== null && number >= 0 ? number : null;
}

function count(value) {
  const number = nonNegative(value);
  return number === null ? null : Math.floor(number);
}

function shotRecords(combat) {
  return Array.isArray(combat.enemyShots)
    ? combat.enemyShots.filter((entry) => entry && typeof entry === 'object' && entry.fired !== false)
    : [];
}

function countShots(combat, records) {
  return count(combat.shotsFired) ?? records.length;
}

function countHits(combat, records, shots) {
  const measured = count(combat.shotsLanded) ?? records.filter((entry) => entry.hit === true).length;
  return Math.min(measured, shots);
}

function hitRate(combat, records, shots, hits) {
  if (shots <= 0) return null;
  if (count(combat.shotsLanded) !== null) return hits / shots;

  // Aggregate shot totals can be more complete than the event stream.  Without
  // a true/false outcome for every measured shot, a hit rate would turn an
  // unknown result into a fabricated miss.
  if (records.length !== shots || records.some((entry) => typeof entry.hit !== 'boolean')) return null;
  return hits / shots;
}

function damageFromRecords(records) {
  return records.reduce((total, entry) => total + (entry.hit === true ? (nonNegative(entry.damage) ?? 0) : 0), 0);
}

function normalizedTimeline(records, duration) {
  if (duration === null || duration <= 0) return [];

  return records
    .map((entry, index) => {
      const source = object(entry);
      const time = nonNegative(source.t);
      if (time === null || time > duration) return null;

      return {
        index,
        progress: time / duration,
        hit: typeof source.hit === 'boolean' ? source.hit : null,
        damage: nonNegative(source.damage),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.progress - right.progress || left.index - right.index)
    .map(({ progress, hit, damage }) => Object.freeze({ type: 'enemy-shot', progress, hit, damage }));
}

function measuredVital(combat, frames, name) {
  const direct = nonNegative(combat[name]);
  if (direct !== null) return direct;

  let latestTime = -Infinity;
  let latestValue = null;
  for (const frame of frames) {
    const source = object(frame);
    const value = nonNegative(object(source.player)[name]);
    const time = nonNegative(source.t);
    if (value === null || time === null || time < latestTime) continue;
    latestTime = time;
    latestValue = value;
  }
  return latestValue;
}

function movementState(frame) {
  const player = object(object(frame).player);
  const velocity = object(player.velocity);
  const x = finite(velocity.x);
  const y = finite(velocity.y);
  const z = finite(velocity.z);
  if (x !== null && y !== null && z !== null) return Math.hypot(x, y, z) > MOVEMENT_EPSILON;
  return typeof player.moving === 'boolean' ? player.moving : null;
}

function movementRatio(frames, duration) {
  if (duration === null || duration <= 0) return null;

  const windows = [];
  for (let index = 0; index < frames.length; index += 1) {
    const frame = object(frames[index]);
    const dt = nonNegative(frame.dt);
    const endTime = nonNegative(frame.t);
    const moving = movementState(frame);
    if (dt === null || dt <= 0 || dt > MAX_FRAME_WINDOW_MS || endTime === null || moving === null) continue;

    const end = Math.min(duration, endTime);
    const start = Math.max(0, endTime - dt);
    if (end <= start) continue;
    windows.push({ index, start, end, moving });
  }

  // Telemetry is normally sequential.  Removing accidental overlap avoids
  // letting duplicated frames inflate the measured movement time.
  windows.sort((left, right) => left.end - right.end || left.index - right.index);
  let coveredUntil = 0;
  let observed = 0;
  let moving = 0;
  for (const window of windows) {
    const start = Math.max(window.start, coveredUntil);
    if (window.end <= start) continue;
    const weight = window.end - start;
    observed += weight;
    if (window.moving) moving += weight;
    coveredUntil = Math.max(coveredUntil, window.end);
  }
  return observed > 0 ? moving / observed : null;
}

function pressureLabel(enabled, shots, hits, hitRate, damageTaken) {
  if (!enabled) return 'low';
  if (damageTaken >= 60 || hits >= 4 || (shots >= 3 && hitRate !== null && hitRate >= 0.5)) return 'high';
  if (damageTaken >= 20 || hits >= 1 || shots >= 4 || (hitRate !== null && hitRate >= 0.2)) return 'moderate';
  return 'low';
}

/**
 * Summarize measured enemy pressure, movement, and timestamped enemy shots.
 *
 * `timeline` only includes recorded enemy shots with a timestamp inside the
 * recorded elapsed duration.  Its `progress` value is normalized to 0–1 so a
 * chart can render it independent of the session's absolute length.
 */
export function summarizeCombat(run) {
  const source = object(run);
  const combat = object(source.combat);
  const frames = Array.isArray(source.frames) ? source.frames : [];
  const duration = nonNegative(source.elapsedMs);
  const enabled = combat.enabled === true;
  const records = shotRecords(combat);
  const enemyShots = countShots(combat, records);
  const enemyHits = countHits(combat, records, enemyShots);
  const enemyHitRate = hitRate(combat, records, enemyShots, enemyHits);
  const damageTaken = nonNegative(combat.damageTaken) ?? damageFromRecords(records);
  const health = measuredVital(combat, frames, 'playerHealth') ?? measuredVital(combat, frames, 'health');
  const shield = measuredVital(combat, frames, 'playerShield') ?? measuredVital(combat, frames, 'shield');
  const timeline = normalizedTimeline(records, duration);

  return Object.freeze({
    enabled,
    enemyShots,
    enemyHits,
    enemyHitRate,
    damageTaken,
    health,
    shield,
    movingRatio: movementRatio(frames, duration),
    pressure: pressureLabel(enabled, enemyShots, enemyHits, enemyHitRate, damageTaken),
    timeline: Object.freeze(timeline),
  });
}
