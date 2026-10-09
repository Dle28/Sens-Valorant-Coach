import { aimOffset } from './aim-geometry.js';

export const TELEMETRY_FEATURE_VERSION = 'telemetry-features-1';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const present = value => value !== null && value !== undefined;

function feature(name, value, unit, validity = 'MEASURED', missingReason = null) {
  return { name, value: finite(value) ? value : null, unit, validity: finite(value) ? validity : 'UNAVAILABLE', missingReason: finite(value) ? null : missingReason ?? 'NOT_RECORDED' };
}

function trialEnd(trial) {
  return finite(trial?.endedMs) ? trial.endedMs : null;
}

function inTrial(row, trial, end) {
  return row && row.trialId === trial.trialId && finite(row.t) && row.t >= trial.startedMs && row.t <= end;
}

function sign(value, deadzone = .01) {
  if (!finite(value) || Math.abs(value) <= deadzone) return 0;
  return value > 0 ? 1 : -1;
}

function hasCenterCrossing(samples, axis) {
  let previous = 0;
  for (const sample of samples) {
    const current = sign(sample[axis]);
    if (current && previous && current !== previous) return 1;
    if (current) previous = current;
  }
  return samples.length ? 0 : null;
}

function directionReversals(events, axis) {
  let previous = 0, count = 0, observed = 0;
  for (const event of events) {
    const current = sign(event[axis], .05);
    if (!current) continue;
    observed++;
    if (previous && current !== previous) count++;
    previous = current;
  }
  return observed ? count : null;
}

function inputPath(events) {
  if (!events.length) return null;
  let path = 0;
  for (const event of events) {
    if (!finite(event.dx) || !finite(event.dy)) return null;
    path += Math.hypot(event.dx, event.dy);
  }
  return path;
}

function targetMoved(frames) {
  if (frames.length < 2) return null;
  const first = frames[0].target;
  if (!Array.isArray(first) || first.length !== 3 || !first.every(finite)) return null;
  return frames.some(frame => Array.isArray(frame.target) && frame.target.length === 3 && frame.target.every(finite) && Math.hypot(...frame.target.map((value, index) => value - first[index])) > .001);
}

function offsets(frames) {
  return frames.map(frame => {
    const offset = aimOffset(frame.target, frame.yaw, frame.pitch, frame.cameraPosition);
    return offset && finite(offset.x) && finite(offset.y) ? offset : null;
  }).filter(Boolean);
}

/**
 * Derives transparent, replayable proxy features.  Browser movement deltas are
 * not presented as device counts; all path and reversal fields retain PROXY
 * validity until a raw-device collector is validated.
 */
export function deriveTrialTelemetry(run, trial) {
  const endedMs = trialEnd(trial);
  if (!trial || !finite(trial.startedMs) || endedMs === null || endedMs < trial.startedMs) {
    return { version: TELEMETRY_FEATURE_VERSION, trialId: trial?.trialId ?? null, features: [] };
  }
  const cutoff = finite(trial.firstShotMs) ? Math.min(endedMs, trial.startedMs + trial.firstShotMs) : endedMs;
  const frames = (Array.isArray(run?.frames) ? run.frames : [])
    .filter(frame => inTrial(frame, trial, cutoff) && Array.isArray(frame.target) && Array.isArray(frame.cameraPosition) && finite(frame.yaw) && finite(frame.pitch))
    .sort((a, b) => a.t - b.t || a.seq - b.seq);
  const inputs = (Array.isArray(run?.inputEvents) ? run.inputEvents : [])
    .filter(event => inTrial(event, trial, cutoff))
    .sort((a, b) => a.t - b.t || a.seq - b.seq);
  const clicks = (Array.isArray(run?.controlEvents) ? run.controlEvents : [])
    .filter(event => inTrial(event, trial, cutoff) && event.type === 'pointerdown').length;
  const shots = (Array.isArray(run?.shots) ? run.shots : []).filter(shot => inTrial(shot, trial, cutoff));
  const signed = offsets(frames);
  const moving = targetMoved(frames);
  const staticOnlyReason = moving === true ? 'MOVING_TARGET' : moving === null ? 'INSUFFICIENT_FRAME_GEOMETRY' : null;
  const path = inputPath(inputs);
  const net = inputs.length && inputs.every(event => finite(event.dx) && finite(event.dy))
    ? Math.hypot(inputs.reduce((sum, event) => sum + event.dx, 0), inputs.reduce((sum, event) => sum + event.dy, 0))
    : null;
  return {
    version: TELEMETRY_FEATURE_VERSION,
    trialId: trial.trialId,
    window: { startMs: trial.startedMs, endMs: cutoff, firstShotCutoff: finite(trial.firstShotMs) },
    features: [
      feature('first_visible_to_entry_ms', finite(trial.firstVisibleMs) && finite(trial.firstEntryMs) ? trial.firstEntryMs - trial.firstVisibleMs : null, 'ms', 'MEASURED', 'NO_VISIBLE_AND_ENTRY_PAIR'),
      feature('entry_to_first_shot_ms', trial.entryToFirstShotMs, 'ms', 'MEASURED', 'NO_ENTRY_TO_SHOT_PAIR'),
      feature('pointerdown_before_first_shot_count', clicks, 'count'),
      feature('fired_shot_before_first_shot_count', shots.length, 'count'),
      feature('input_path_units_before_first_shot', path, 'count', 'PROXY', 'NO_COMPLETE_BROWSER_INPUT'),
      feature('input_net_displacement_units_before_first_shot', net, 'count', 'PROXY', 'NO_COMPLETE_BROWSER_INPUT'),
      feature('input_path_efficiency_before_first_shot', path && net !== null ? net / path : null, 'ratio', 'PROXY', 'NO_COMPLETE_BROWSER_INPUT'),
      feature('input_horizontal_reversal_count_before_first_shot', directionReversals(inputs, 'dx'), 'count', 'PROXY', 'NO_BROWSER_INPUT'),
      feature('input_vertical_reversal_count_before_first_shot', directionReversals(inputs, 'dy'), 'count', 'PROXY', 'NO_BROWSER_INPUT'),
      feature('initial_signed_horizontal_error_deg', signed[0]?.x, 'deg', 'MEASURED', 'NO_FRAME_GEOMETRY'),
      feature('initial_signed_vertical_error_deg', signed[0]?.y, 'deg', 'MEASURED', 'NO_FRAME_GEOMETRY'),
      feature('crossed_target_center_horizontal_before_first_shot', moving === false ? hasCenterCrossing(signed, 'x') : null, 'count', 'MEASURED', staticOnlyReason),
      feature('crossed_target_center_vertical_before_first_shot', moving === false ? hasCenterCrossing(signed, 'y') : null, 'count', 'MEASURED', staticOnlyReason),
    ],
  };
}

export function deriveRunTelemetry(run) {
  return (Array.isArray(run?.trials) ? run.trials : []).map(trial => deriveTrialTelemetry(run, trial));
}

export function telemetryForTrial(run, trialId) {
  const existing = run?.derived?.trialTelemetry;
  if (Array.isArray(existing)) return existing.find(row => row?.trialId === trialId) ?? null;
  const trial = (run?.trials ?? []).find(row => row?.trialId === trialId);
  return trial ? deriveTrialTelemetry(run, trial) : null;
}
