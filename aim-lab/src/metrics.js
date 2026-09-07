// VALORANT-style community convention, not a Riot-verified device calibration.
export const YAW_DEG = 0.07;
export const HFOV_DEG = 103;
export const RAD = Math.PI / 180;
export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
export function validNumber(value, min, max, fallback) {
  const n = typeof value === 'string' && !value.trim() ? NaN : Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}
export function cm360(dpi, sensitivity) {
  return Number.isFinite(dpi) && Number.isFinite(sensitivity) && dpi > 0 && sensitivity > 0 ? 914.4 / (dpi * sensitivity * YAW_DEG) : null;
}
export function rotationDelta(dx, sensitivity) { return dx * sensitivity * YAW_DEG * RAD; }
export function verticalFov(horizontal, aspect) { return 2 * Math.atan(Math.tan(horizontal * RAD / 2) / aspect) / RAD; }
export function median(values) {
  const arr = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  return arr.length ? (arr[Math.floor(arr.length / 2)] + arr[Math.floor((arr.length - 1) / 2)]) / 2 : null;
}
export function calibrationTrial({ dx, pathX, pathY, distanceCm, samples }) {
  if (!Number.isFinite(distanceCm) || distanceCm < 5 || distanceCm > 50) return { valid: false, reason: 'Chọn khoảng cách từ 5 đến 50 cm.' };
  if (![dx, pathX, pathY, samples].every(Number.isFinite) || samples < 5 || Math.abs(dx) < 100) return { valid: false, reason: 'Chưa đủ chuyển động. Di chuột hết khoảng cách đã chọn.' };
  if (pathX <= 0 || Math.abs(dx) / pathX < 0.9) return { valid: false, reason: 'Chuột đã đổi chiều nhiều. Hãy kéo thẳng một chiều.' };
  if (pathY / pathX > 0.25) return { valid: false, reason: 'Đường kéo quá chéo. Đo lại theo phương ngang.' };
  const dpi = Math.abs(dx) * 2.54 / distanceCm;
  if (dpi < 100 || dpi > 32000) return { valid: false, reason: 'Kết quả ngoài 100–32.000 DPI. Kiểm tra lại khoảng cách.' };
  return { valid: true, dpi, dx, pathX, pathY, distanceCm, samples };
}
export function calibrationSummary(trials) {
  const values = trials.filter(x => x.valid).map(x => x.dpi);
  const estimate = median(values);
  const spread = values.length > 1 ? (Math.max(...values) - Math.min(...values)) / estimate : null;
  return { estimate, spread, usable: values.length >= 3 && spread <= 0.15, n: values.length };
}
export function summarizeRun(run) {
  const shots = run.shots || [];
  const hits = shots.filter(s => s.hit).length;
  const completed = (run.trials || []).filter(t => t.outcome === 'hit');
  const successTrials = (run.trials || []).filter(t => t.firstShotHit === true && t.firstShotMs <= run.config.deadlineMs).length;
  const tracking = run.tracking || { validMs: 0, onTargetMs: 0, squaredErrorTime: 0 };
  return {
    shots: shots.length, hits, misses: shots.length - hits,
    accuracy: shots.length ? hits / shots.length : null,
    medianAcquireMs: median(completed.map(t => t.hitMs)),
    startedTrials: (run.trials || []).length,
    firstShotSuccessRate: run.trials?.length ? successTrials / run.trials.length : null,
    timeOnTarget: tracking.validMs > 0 ? tracking.onTargetMs / tracking.validMs : null,
    trackingRmsDeg: tracking.validMs > 0 ? Math.sqrt(tracking.squaredErrorTime / tracking.validMs) : null,
    frameMedianMs: median(run.frameIntervals || []),
    invalidFrameGaps: (run.frameIntervals || []).filter(x => x > 100).length,
  };
}
export function mulberry32(seed) {
  return () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function trialsCsv(run) {
  const cols = ['trialId', 'outcome', 'initialErrorDeg', 'firstShotMs', 'firstShotHit', 'hitMs', 'shots', 'firstEntryMs', 'entryToFirstShotMs'];
  const cell = value => value == null ? '' : '"' + String(value).replaceAll('"', '""') + '"';
  return [cols.join(','), ...(run.trials || []).map(t => cols.map(k => cell(t[k])).join(','))].join('\n');
}
