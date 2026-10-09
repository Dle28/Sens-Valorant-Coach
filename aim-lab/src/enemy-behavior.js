/**
 * Deterministic movement and opponent-fire primitives for the tactical
 * mini-games.  This module deliberately knows nothing about Three.js, the DOM
 * or a particular map, so the renderer and the session recorder can both
 * sample exactly the same simulation.
 *
 * Coordinates use a small ground-plane convention: x is left/right, y is
 * height, and negative z is in front of the player.  Time arguments are in
 * milliseconds; velocities are world units per second.
 */

const TAU = Math.PI * 2;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const integer = (value, fallback = 0) => Math.trunc(finite(value, fallback));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const nonNegative = (value, fallback = 0) => Math.max(0, finite(value, fallback));
const copyVector = ({ x = 0, y = 0, z = 0 } = {}) => ({ x: finite(x), y: finite(y), z: finite(z) });
const freezeVector = vector => Object.freeze(copyVector(vector));

/** Original opponent silhouettes are renderer hints, never external assets. */
export const ENEMY_ARCHETYPES = Object.freeze({
  static: Object.freeze({ id: 'static', label: 'Anchor', silhouette: 'guard', description: 'Giữ một vị trí để luyện phát đầu.' }),
  strafe: Object.freeze({ id: 'strafe', label: 'Strafe', silhouette: 'runner', description: 'Di chuyển ngang đều qua một lane.' }),
  peek: Object.freeze({ id: 'peek', label: 'Peek', silhouette: 'cover', description: 'Lộ ra rồi trở về sau vật che.' }),
  wide: Object.freeze({ id: 'wide', label: 'Wide swing', silhouette: 'duelist', description: 'Quét ngang với biên độ lớn.' }),
  random: Object.freeze({ id: 'random', label: 'Unscripted', silhouette: 'scout', description: 'Đổi điểm đến theo seed xác định.' }),
});

export const ENEMY_ARCHETYPE_IDS = Object.freeze(Object.keys(ENEMY_ARCHETYPES));

export const DEFAULT_ENEMY_OPTIONS = Object.freeze({
  archetype: 'strafe',
  seed: 1,
  spawnIndex: 0,
  id: 'enemy-0',
  anchor: freezeVector({ x: 0, y: 1.6, z: -18 }),
  randomSpawn: true,
  bounds: Object.freeze({ minX: -11, maxX: 11, minZ: -34, maxZ: -7 }),
  size: 0.75,
  health: 100,
  speed: 1,
  amplitude: 2.4,
  strafePeriodMs: 2200,
  peekPeriodMs: 2500,
  peekVisibleMs: 1180,
  peekSide: 1,
  widePeriodMs: 2800,
  randomStepMs: 850,
  cooldownMs: 900,
  initialShotDelayMs: 620,
  hitChance: 0.42,
  movementEvasion: 0.055,
  damage: 20,
});

export const DEFAULT_PLAYER_OPTIONS = Object.freeze({
  speed: 4.8,
  maxDeltaMs: 250,
  bounds: DEFAULT_ENEMY_OPTIONS.bounds,
});

function bool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizedSeed(value, fallback = DEFAULT_ENEMY_OPTIONS.seed) {
  return integer(value, fallback) >>> 0;
}

function normalizedBounds(value, fallback = DEFAULT_ENEMY_OPTIONS.bounds) {
  const source = value && typeof value === 'object' ? value : {};
  const rawMinX = finite(source.minX, fallback.minX);
  const rawMaxX = finite(source.maxX, fallback.maxX);
  const rawMinZ = finite(source.minZ, fallback.minZ);
  const rawMaxZ = finite(source.maxZ, fallback.maxZ);
  const minX = Math.min(rawMinX, rawMaxX);
  const maxX = Math.max(rawMinX, rawMaxX);
  const minZ = Math.min(rawMinZ, rawMaxZ);
  const maxZ = Math.max(rawMinZ, rawMaxZ);
  return Object.freeze({
    minX: minX === maxX ? fallback.minX : minX,
    maxX: minX === maxX ? fallback.maxX : maxX,
    minZ: minZ === maxZ ? fallback.minZ : minZ,
    maxZ: minZ === maxZ ? fallback.maxZ : maxZ,
  });
}

function hasPosition(value) {
  return !!value && typeof value === 'object' && ['x', 'y', 'z'].some(key => Number.isFinite(Number(value[key])));
}

function normalizedArchetype(value) {
  const id = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ENEMY_ARCHETYPES[id] ? id : DEFAULT_ENEMY_OPTIONS.archetype;
}

/**
 * Turn loose UI / scenario values into a safe, immutable simulation contract.
 * Unknown archetypes and invalid numeric values resolve to a stable default.
 */
export function normalizeEnemyOptions(options = {}) {
  const source = options && typeof options === 'object' ? options : {};
  const rawAnchor = source.anchor ?? source.position;
  const anchor = freezeVector(rawAnchor ?? DEFAULT_ENEMY_OPTIONS.anchor);
  const bounds = normalizedBounds(source.bounds);
  const speed = clamp(finite(source.speed, DEFAULT_ENEMY_OPTIONS.speed), 0.1, 3.5);
  const amplitudeLimit = Math.max(0.25, (bounds.maxX - bounds.minX) / 2);
  const spawnIndex = Math.max(0, integer(source.spawnIndex ?? source.index, DEFAULT_ENEMY_OPTIONS.spawnIndex));
  const seed = normalizedSeed(source.seed, DEFAULT_ENEMY_OPTIONS.seed);
  const requestedId = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : `enemy-${spawnIndex}`;
  const randomSpawn = typeof source.randomSpawn === 'boolean' ? source.randomSpawn : !hasPosition(rawAnchor);
  return Object.freeze({
    archetype: normalizedArchetype(source.archetype ?? source.behavior ?? source.type),
    id: requestedId,
    seed,
    spawnIndex,
    anchor,
    randomSpawn,
    bounds,
    size: clamp(finite(source.size ?? source.radius, DEFAULT_ENEMY_OPTIONS.size), 0.15, 2.5),
    health: Math.round(clamp(finite(source.health, DEFAULT_ENEMY_OPTIONS.health), 1, 10000)),
    speed,
    amplitude: clamp(finite(source.amplitude, DEFAULT_ENEMY_OPTIONS.amplitude), 0, amplitudeLimit),
    strafePeriodMs: Math.round(clamp(finite(source.strafePeriodMs, DEFAULT_ENEMY_OPTIONS.strafePeriodMs), 300, 15000)),
    peekPeriodMs: Math.round(clamp(finite(source.peekPeriodMs, DEFAULT_ENEMY_OPTIONS.peekPeriodMs), 500, 20000)),
    peekVisibleMs: Math.round(clamp(finite(source.peekVisibleMs, DEFAULT_ENEMY_OPTIONS.peekVisibleMs), 120, 15000)),
    peekSide: finite(source.peekSide, DEFAULT_ENEMY_OPTIONS.peekSide) < 0 ? -1 : 1,
    widePeriodMs: Math.round(clamp(finite(source.widePeriodMs, DEFAULT_ENEMY_OPTIONS.widePeriodMs), 450, 20000)),
    randomStepMs: Math.round(clamp(finite(source.randomStepMs, DEFAULT_ENEMY_OPTIONS.randomStepMs), 220, 10000)),
    cooldownMs: Math.round(clamp(finite(source.cooldownMs, DEFAULT_ENEMY_OPTIONS.cooldownMs), 120, 15000)),
    initialShotDelayMs: Math.round(clamp(finite(source.initialShotDelayMs, DEFAULT_ENEMY_OPTIONS.initialShotDelayMs), 0, 15000)),
    hitChance: clamp(finite(source.hitChance ?? source.accuracy, DEFAULT_ENEMY_OPTIONS.hitChance), 0, 1),
    movementEvasion: clamp(finite(source.movementEvasion, DEFAULT_ENEMY_OPTIONS.movementEvasion), 0, 0.5),
    damage: Math.round(clamp(finite(source.damage, DEFAULT_ENEMY_OPTIONS.damage), 0, 10000)),
  });
}

/** Normalize player movement limits without mutating a caller-owned object. */
export function normalizePlayerOptions(options = {}) {
  const source = options && typeof options === 'object' ? options : {};
  return Object.freeze({
    speed: clamp(finite(source.speed, DEFAULT_PLAYER_OPTIONS.speed), 0, 20),
    maxDeltaMs: Math.round(clamp(finite(source.maxDeltaMs, DEFAULT_PLAYER_OPTIONS.maxDeltaMs), 1, 1000)),
    bounds: normalizedBounds(source.bounds, DEFAULT_PLAYER_OPTIONS.bounds),
  });
}

/* A tiny stateless PRNG.  Sampling a time or a shot index in any order gives
 * the same result, which is important for replay and frame-rate independence. */
function hash32(seed, salt = 0) {
  let value = (normalizedSeed(seed) + Math.imul(integer(salt), 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

export function seededUnit(seed, salt = 0) {
  return hash32(seed, salt) / 0x100000000;
}

function clampToBounds(position, bounds) {
  return {
    x: clamp(position.x, bounds.minX, bounds.maxX),
    y: position.y,
    z: clamp(position.z, bounds.minZ, bounds.maxZ),
  };
}

function spawnAnchor(config) {
  if (!config.randomSpawn) return clampToBounds(config.anchor, config.bounds);
  const salt = config.spawnIndex * 17;
  return {
    x: config.bounds.minX + (config.bounds.maxX - config.bounds.minX) * seededUnit(config.seed, salt + 1),
    y: config.anchor.y,
    z: config.bounds.minZ + (config.bounds.maxZ - config.bounds.minZ) * seededUnit(config.seed, salt + 2),
  };
}

/**
 * Create a repeatable spawn record.  Calling this again with the same options
 * returns the same lane and keeps a replay independent from previous spawns.
 */
export function spawnEnemy(options = {}) {
  const config = normalizeEnemyOptions(options);
  const anchor = spawnAnchor(config);
  return Object.freeze({
    id: config.id,
    archetype: config.archetype,
    seed: config.seed,
    spawnIndex: config.spawnIndex,
    anchor: freezeVector(anchor),
    position: freezeVector(anchor),
    size: config.size,
    health: config.health,
  });
}

export const spawnTarget = spawnEnemy;

function modulo(value, divisor) {
  const result = value % divisor;
  return result < 0 ? result + divisor : result;
}

function triangle(value) {
  return 1 - 4 * Math.abs(modulo(value, 1) - 0.5);
}

function randomWaypoint(config, anchor, index) {
  if (index <= 0) return { ...anchor };
  const salt = config.spawnIndex * 1009 + index * 2;
  return {
    x: config.bounds.minX + (config.bounds.maxX - config.bounds.minX) * seededUnit(config.seed, salt + 1),
    y: anchor.y,
    z: config.bounds.minZ + (config.bounds.maxZ - config.bounds.minZ) * seededUnit(config.seed, salt + 2),
  };
}

function phaseFraction(config, salt = 0) {
  return seededUnit(config.seed, config.spawnIndex * 71 + salt);
}

function emptyVelocity() {
  return { x: 0, y: 0, z: 0 };
}

/**
 * Sample the target transform at an elapsed time.  The result is pure: it does
 * not advance hidden state, so a renderer at 60 FPS and an analytics replay at
 * 20 FPS see the same opponent path.
 */
export function enemyMotion(options = {}, timeMs = 0) {
  const config = normalizeEnemyOptions(options);
  const anchor = spawnAnchor(config);
  const time = nonNegative(timeMs);
  const result = {
    id: config.id,
    archetype: config.archetype,
    timeMs: time,
    anchor: freezeVector(anchor),
    position: { ...anchor },
    velocity: emptyVelocity(),
    visible: true,
    state: 'engaged',
  };

  if (config.archetype === 'static') return Object.freeze({ ...result, position: freezeVector(result.position), velocity: freezeVector(result.velocity) });

  if (config.archetype === 'strafe') {
    const radiansPerSecond = TAU * config.speed / (config.strafePeriodMs / 1000);
    const phase = phaseFraction(config, 11) * TAU + time / 1000 * radiansPerSecond;
    result.position.x = anchor.x + Math.sin(phase) * config.amplitude;
    result.velocity.x = Math.cos(phase) * config.amplitude * radiansPerSecond;
  } else if (config.archetype === 'peek') {
    const period = config.peekPeriodMs / config.speed;
    const visibleMs = Math.min(config.peekVisibleMs, period);
    const local = modulo(time + phaseFraction(config, 13) * period, period);
    if (local >= visibleMs) {
      result.visible = false;
      result.state = 'covered';
      result.position.x = anchor.x + config.peekSide * config.amplitude;
    } else {
      const progress = local / visibleMs;
      const open = Math.sin(Math.PI * progress);
      result.position.x = anchor.x + config.peekSide * config.amplitude * (1 - open);
      result.velocity.x = -config.peekSide * config.amplitude * Math.cos(Math.PI * progress) * Math.PI / (visibleMs / 1000);
    }
  } else if (config.archetype === 'wide') {
    const periodSeconds = config.widePeriodMs / 1000 / config.speed;
    const phase = time / 1000 / periodSeconds + phaseFraction(config, 17);
    result.position.x = anchor.x + triangle(phase) * config.amplitude;
    const phasePosition = modulo(phase, 1);
    const direction = phasePosition < 0.5 ? 1 : -1;
    result.velocity.x = direction * 4 * config.amplitude / periodSeconds;
  } else if (config.archetype === 'random') {
    const stepMs = config.randomStepMs / config.speed;
    const shiftedTime = time + phaseFraction(config, 19) * stepMs;
    const segment = Math.floor(shiftedTime / stepMs);
    const progress = modulo(shiftedTime, stepMs) / stepMs;
    const eased = progress * progress * (3 - 2 * progress);
    const easedDerivative = 6 * progress * (1 - progress);
    const start = randomWaypoint(config, anchor, segment);
    const end = randomWaypoint(config, anchor, segment + 1);
    result.position.x = start.x + (end.x - start.x) * eased;
    result.position.z = start.z + (end.z - start.z) * eased;
    result.velocity.x = (end.x - start.x) * easedDerivative / (stepMs / 1000);
    result.velocity.z = (end.z - start.z) * easedDerivative / (stepMs / 1000);
  }

  result.position = clampToBounds(result.position, config.bounds);
  return Object.freeze({ ...result, position: freezeVector(result.position), velocity: freezeVector(result.velocity) });
}

export const sampleEnemyMotion = enemyMotion;

function readKey(input, names) {
  const source = input && typeof input === 'object' ? input : {};
  const keys = source.keys && typeof source.keys === 'object' ? source.keys : {};
  return names.some(name => bool(source[name]) || bool(keys[name]));
}

/** Build a normalized WASD movement direction and world-space velocity. */
export function playerMovement(input = {}, options = {}) {
  const playerOptions = normalizePlayerOptions({ ...options, speed: options?.speed ?? input?.speed });
  const left = readKey(input, ['a', 'A', 'KeyA', 'left']);
  const right = readKey(input, ['d', 'D', 'KeyD', 'right']);
  const forward = readKey(input, ['w', 'W', 'KeyW', 'forward']);
  const backward = readKey(input, ['s', 'S', 'KeyS', 'backward']);
  const rawX = (right ? 1 : 0) - (left ? 1 : 0);
  const rawZ = (backward ? 1 : 0) - (forward ? 1 : 0);
  const length = Math.hypot(rawX, rawZ);
  const direction = length ? { x: rawX / length, y: 0, z: rawZ / length } : { x: 0, y: 0, z: 0 };
  const speed = length ? playerOptions.speed : 0;
  return Object.freeze({
    moving: length > 0,
    direction: freezeVector(direction),
    velocity: freezeVector({ x: direction.x * speed, y: 0, z: direction.z * speed }),
    speed,
  });
}

export const playerMovementVector = playerMovement;

/** Advance a player position with normalized WASD input and enforce lane bounds. */
export function stepPlayer(player = {}, input = {}, deltaMs = 0, options = {}) {
  const config = normalizePlayerOptions(options);
  const movement = playerMovement(input, config);
  const elapsedMs = clamp(nonNegative(deltaMs), 0, config.maxDeltaMs);
  const position = copyVector(player.position ?? player);
  // Input is authored in player-local WASD space.  Turning the camera changes
  // the world direction while preserving the same deterministic speed/bounds.
  const heading = finite(options.heading ?? options.yaw, 0);
  const cos = Math.cos(heading), sin = Math.sin(heading);
  const velocity = {
    x: movement.velocity.x * cos + movement.velocity.z * sin,
    y: 0,
    z: -movement.velocity.x * sin + movement.velocity.z * cos,
  };
  const next = clampToBounds({
    x: position.x + velocity.x * elapsedMs / 1000,
    y: position.y,
    z: position.z + velocity.z * elapsedMs / 1000,
  }, config.bounds);
  const actualVelocity = elapsedMs > 0
    ? { x: (next.x - position.x) / (elapsedMs / 1000), y: 0, z: (next.z - position.z) / (elapsedMs / 1000) }
    : emptyVelocity();
  return Object.freeze({
    position: freezeVector(next),
    direction: freezeVector(movement.speed ? { x: velocity.x / movement.speed, y: 0, z: velocity.z / movement.speed } : { x: 0, y: 0, z: 0 }),
    velocity: freezeVector(actualVelocity),
    moving: movement.moving && (next.x !== position.x || next.z !== position.z),
    elapsedMs,
  });
}

function velocityMagnitude(value) {
  const vector = value && typeof value === 'object' ? value : {};
  return Math.hypot(finite(vector.x), finite(vector.y), finite(vector.z));
}

function playerSpeed(state) {
  const source = state && typeof state === 'object' ? state : {};
  if (Number.isFinite(Number(source.speed))) return Math.max(0, Number(source.speed));
  return velocityMagnitude(source.velocity ?? source.playerVelocity);
}

function shotIndexAfter(config, timeMs) {
  const time = nonNegative(timeMs);
  if (time < config.initialShotDelayMs) return 0;
  return Math.floor((time - config.initialShotDelayMs) / config.cooldownMs) + 1;
}

/**
 * Resolve one cooldown tick.  Hidden peek opponents keep their cooldown but
 * emit `enemy-hold`, making the missed opportunity explicit to analytics.
 */
export function resolveEnemyShot(options = {}, shotIndex = 0, timeMs, state = {}) {
  const config = normalizeEnemyOptions(options);
  const index = Math.max(0, integer(shotIndex));
  const scheduledAt = timeMs === undefined
    ? config.initialShotDelayMs + index * config.cooldownMs
    : nonNegative(timeMs);
  const motion = enemyMotion(config, scheduledAt);
  const speed = playerSpeed(state);
  const chance = motion.visible ? clamp(config.hitChance - speed * config.movementEvasion, 0, 1) : 0;
  const hit = motion.visible && seededUnit(config.seed, config.spawnIndex * 4099 + index * 13 + 23) < chance;
  return Object.freeze({
    type: motion.visible ? 'enemy-shot' : 'enemy-hold',
    enemyId: config.id,
    archetype: config.archetype,
    shotIndex: index,
    t: scheduledAt,
    cooldownMs: config.cooldownMs,
    nextReadyAt: scheduledAt + config.cooldownMs,
    visible: motion.visible,
    fired: motion.visible,
    hit,
    damage: hit ? config.damage : 0,
    hitChance: chance,
    position: motion.position,
  });
}

/** Return the first cooldown event strictly after `afterMs`. */
export function nextEnemyShot(options = {}, afterMs = 0, state = {}) {
  const config = normalizeEnemyOptions(options);
  const index = shotIndexAfter(config, afterMs);
  const time = config.initialShotDelayMs + index * config.cooldownMs;
  return resolveEnemyShot(config, index, time, state);
}

/**
 * Return every cooldown event inside the half-open update interval
 * `(fromMs, toMs]`.  Passing the previous frame's time as `fromMs` prevents
 * duplicate shots across frames.  `state` may be an object or a function that
 * samples player state for each scheduled shot time.
 */
export function enemyShotEvents(options = {}, fromMs = 0, toMs = 0, state = {}) {
  const config = normalizeEnemyOptions(options);
  const from = nonNegative(fromMs);
  const to = nonNegative(toMs);
  if (to <= from) return Object.freeze([]);
  const firstIndex = shotIndexAfter(config, from);
  const events = [];
  for (let index = firstIndex; ; index++) {
    const time = config.initialShotDelayMs + index * config.cooldownMs;
    if (time > to) break;
    const sampledState = typeof state === 'function' ? state(time, index) : state;
    events.push(resolveEnemyShot(config, index, time, sampledState));
  }
  return Object.freeze(events);
}

/** Sample target motion and cooldown events together for a render/update tick. */
export function updateEnemy(options = {}, fromMs = 0, toMs = fromMs, state = {}) {
  return Object.freeze({
    motion: enemyMotion(options, toMs),
    shots: enemyShotEvents(options, fromMs, toMs, state),
  });
}
