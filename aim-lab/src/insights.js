import { TASKS } from './training.js';

/*
 * Descriptive, sample-aware session metrics.
 *
 * This module deliberately does not infer rank, overshoot, or a sensitivity
 * recommendation.  A session can tell us what was recorded and how much of
 * it was usable; it cannot identify the cause of a miss from these events.
 */

const TERMINAL_OUTCOMES = new Set([
  'hit', 'miss', 'timeout', 'no_shot', 'no-shot', 'occluded',
]);
const DISPLAY_SIZE_LABELS = Object.freeze({ small: 'Nhỏ', medium: 'Vừa', large: 'Lớn' });

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

function ratio(numerator, denominator) {
  return denominator > 0 && Number.isFinite(numerator) && Number.isFinite(denominator)
    ? numerator / denominator
    : null;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

// Linear interpolation is stable for small samples and makes the percentile
// definition explicit instead of silently selecting an arbitrary observation.
function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function displayRadius(radius) {
  const value = finite(radius);
  if (value === null || value <= 0) return null;
  return `r=${String(Number(value.toFixed(4)))}`;
}

function terminal(trial) {
  const outcome = typeof trial?.outcome === 'string' ? trial.outcome.toLowerCase() : '';
  return TERMINAL_OUTCOMES.has(outcome) || trial?.completed === true;
}

function hitTrial(trial) {
  const outcome = typeof trial?.outcome === 'string' ? trial.outcome.toLowerCase() : '';
  return outcome ? outcome === 'hit' : trial?.hit === true;
}

function card(label, value, unit, explanation) {
  return { label, value: value === null || Number.isFinite(value) ? value : null, unit, explanation };
}

function groupLabel(trial) {
  if (typeof trial?.sizeBand === 'string' && trial.sizeBand.trim()) return trial.sizeBand.trim();
  return displayRadius(trial?.targetRadius);
}

function displaySizeLabel(label) {
  return DISPLAY_SIZE_LABELS[label] || label;
}

function distanceGroup(value) {
  const distance = finite(value);
  return distance === null || distance <= 0 ? null : distance < 12 ? 'near' : distance < 24 ? 'mid' : 'far';
}

function distanceBreakdown(trials, frames, tracking) {
  const groups = new Map();
  const records = tracking ? frames : trials.map(trial => ({ frame: trial }));
  for (const { frame: record, duration } of records) {
    const band = distanceGroup(record?.distance);
    if (!band) continue;
    if (!groups.has(band)) groups.set(band, { band, trials: 0, hits: 0, times: [], validMs: 0, onTargetMs: 0 });
    const group = groups.get(band);
    if (tracking) {
      if (typeof record.onTarget !== 'boolean') continue;
      group.validMs += duration;
      if (record.onTarget) group.onTargetMs += duration;
    } else {
      group.trials++;
      if (hitTrial(record)) {
        group.hits++;
        const time = nonNegative(record.hitMs);
        if (time !== null) group.times.push(time);
      }
    }
  }
  return ['near', 'mid', 'far'].filter(band => groups.has(band)).map(band => {
    const group = groups.get(band);
    return { band, trials: group.trials, hits: group.hits, validMs: group.validMs, onTargetMs: group.onTargetMs,
      rate: tracking ? ratio(group.onTargetMs, group.validMs) : ratio(group.hits, group.trials), medianMs: median(group.times) };
  }).filter(row => tracking ? row.validMs > 0 : row.trials > 0);
}

function frameDuration(frame, elapsedMs) {
  const dt = nonNegative(frame?.dt);
  if (dt === null || dt <= 0 || dt > 100) return 0;
  if (elapsedMs === null) return dt;
  const end = nonNegative(frame?.t);
  if (end === null) return Math.min(dt, elapsedMs);
  const start = Math.max(0, end - dt);
  return Math.max(0, Math.min(end, elapsedMs) - Math.min(elapsedMs, start));
}

/**
 * Build descriptive metrics from one recorded run.
 *
 * Ratios are returned as numbers in [0, 1], durations are milliseconds, and
 * unavailable measurements are null.  The function never mutates `run` and
 * never returns NaN or Infinity, so the result can be JSON serialized.
 */
export function sessionInsights(run) {
  const source = object(run);
  const config = object(source.config);
  const rawTrials = Array.isArray(source.trials) ? source.trials : [];
  const rawShots = Array.isArray(source.shots) ? source.shots : [];
  const trials = rawTrials.filter(trial => trial && typeof trial === 'object' && !Array.isArray(trial));
  const shots = rawShots.filter(shot => shot && typeof shot === 'object' && !Array.isArray(shot));
  const invalidTrials = rawTrials.length - trials.length;
  const invalidShots = rawShots.length - shots.length;
  const isTracking = config.tracking === true || TASKS[config.task]?.tracking === true;

  const validShots = shots.filter(shot => typeof shot.hit === 'boolean');
  const hits = validShots.filter(shot => shot.hit === true).length;
  const accuracy = ratio(hits, validShots.length);

  const startedTrials = trials.length;
  const terminalTrials = trials.filter(terminal).length;
  const hitTrials = trials.filter(hitTrial).length;
  const completion = ratio(hitTrials, startedTrials);

  const deadline = nonNegative(config.deadlineMs);
  const firstShotTrials = deadline === null ? [] : trials.filter(trial => {
    const time = nonNegative(trial.firstShotMs);
    return time !== null && time <= deadline;
  });
  const firstShotHits = firstShotTrials.filter(trial => trial.firstShotHit === true).length;
  // Keep all started trials in this denominator: a target with no click by
  // the deadline is part of the observed first-shot result.
  const firstShotDeadline = deadline === null ? null : ratio(firstShotHits, startedTrials);

  const hitTimes = trials
    .filter(hitTrial)
    .map(trial => nonNegative(trial.hitMs))
    .filter(value => value !== null);
  const medianHitMs = median(hitTimes);
  const p90HitMs = percentile(hitTimes, .9);

  const elapsedMs = nonNegative(source.elapsedMs);
  const pacing = elapsedMs !== null && elapsedMs > 0 ? hits / (elapsedMs / 60000) : null;

  const tracking = object(source.tracking);
  const frameValues = Array.isArray(source.frames) ? source.frames : [];
  const validFrames = frameValues.map(frame => ({ frame, duration: frameDuration(frame, elapsedMs) }))
    .filter(entry => entry.duration > 0);
  const frameRawValidMs = validFrames.reduce((sum, entry) => sum + entry.duration, 0);
  const frameValidMs = elapsedMs === null ? frameRawValidMs : Math.min(frameRawValidMs, elapsedMs);
  const frameRawOnTargetMs = validFrames.reduce(
    (sum, entry) => sum + (entry.frame.onTarget === true ? entry.duration : 0),
    0,
  );
  const frameOnTargetMs = Math.min(frameRawOnTargetMs, frameValidMs);
  const frameErrorSamples = validFrames.filter(entry => nonNegative(entry.frame.errorDeg) !== null);
  const frameErrorValidMs = frameErrorSamples.reduce((sum, entry) => sum + entry.duration, 0);
  const frameSquaredErrorTime = frameErrorSamples.reduce((sum, entry) => {
    const error = nonNegative(entry.frame.errorDeg);
    return sum + error * error * entry.duration;
  }, 0);
  const suppliedValidMs = nonNegative(tracking.validMs);
  const suppliedOnTargetMs = nonNegative(tracking.onTargetMs);
  const suppliedSquaredErrorTime = nonNegative(tracking.squaredErrorTime);
  const validMs = suppliedValidMs !== null
    ? Math.min(suppliedValidMs, elapsedMs ?? suppliedValidMs)
    : frameValidMs;
  const onTargetMs = suppliedOnTargetMs !== null ? Math.min(suppliedOnTargetMs, validMs) : frameOnTargetMs;
  const timeOnTarget = ratio(Math.min(onTargetMs, validMs), validMs);
  const validCoverage = ratio(Math.min(validMs, elapsedMs ?? validMs), elapsedMs ?? 0);
  const squaredErrorTime = suppliedSquaredErrorTime !== null ? suppliedSquaredErrorTime : frameSquaredErrorTime;
  const rmsValidMs = suppliedSquaredErrorTime !== null ? validMs : frameErrorValidMs;
  const trackingRmsDeg = rmsValidMs > 0 && squaredErrorTime !== null
    ? Math.sqrt(squaredErrorTime / rmsValidMs)
    : null;

  const sizeMap = new Map();
  for (const trial of trials) {
    const label = groupLabel(trial);
    if (!label) continue;
    if (!sizeMap.has(label)) sizeMap.set(label, { label, trials: 0, hits: 0, hitTimes: [] });
    const group = sizeMap.get(label);
    group.trials += 1;
    if (hitTrial(trial)) {
      group.hits += 1;
      const hitMs = nonNegative(trial.hitMs);
      if (hitMs !== null) group.hitTimes.push(hitMs);
    }
  }
  const sizeRows = [...sizeMap.values()].map(group => ({
    label: group.label,
    trials: group.trials,
    hits: group.hits,
    rate: ratio(group.hits, group.trials),
    medianMs: median(group.hitTimes),
  }));

  const trackingSizeMap = new Map();
  if (isTracking) {
    for (const entry of validFrames) {
      const frame = entry.frame;
      const label = typeof frame?.sizeBand === 'string' && frame.sizeBand.trim()
        ? frame.sizeBand.trim()
        : displayRadius(frame?.targetRadius);
      if (!label) continue;
      if (!trackingSizeMap.has(label)) trackingSizeMap.set(label, { label, validMs: 0, onTargetMs: 0 });
      const group = trackingSizeMap.get(label);
      group.validMs += entry.duration;
      if (frame.onTarget === true) group.onTargetMs += entry.duration;
    }
  }
  const trackingSizeRows = [...trackingSizeMap.values()].map(group => ({
    label: group.label,
    validMs: group.validMs,
    onTargetMs: group.onTargetMs,
    rate: ratio(group.onTargetMs, group.validMs),
  }));

  const warnings = [];
  if (!elapsedMs || elapsedMs <= 0) warnings.push('Không có thời lượng phiên thực tế; không thể tính nhịp hit và độ phủ.');
  if (invalidTrials) warnings.push(`${invalidTrials} bản ghi target không hợp lệ và đã bị loại.`);
  if (invalidShots) warnings.push(`${invalidShots} bản ghi phát bắn không hợp lệ và đã bị loại.`);
  if (shots.length && validShots.length !== shots.length) warnings.push('Một số phát bắn thiếu kết quả hit hợp lệ; độ chính xác chỉ dùng phát bắn hợp lệ.');
  if (startedTrials && terminalTrials < startedTrials) warnings.push('Một số target đã bắt đầu nhưng chưa có kết quả kết thúc.');
  if (trials.some(hitTrial) && hitTimes.length < trials.filter(hitTrial).length) {
    warnings.push('Một số target trúng không có thời gian hit hợp lệ; chỉ dùng các thời gian đã ghi nhận.');
  }
  if (validCoverage !== null && validCoverage < 0.9) warnings.push('Độ phủ frame hợp lệ dưới 90% thời lượng phiên.');
  if (sizeRows.length === 1) warnings.push('Chỉ có một nhóm kích thước target; hàng này chỉ mang tính mô tả.');
  const smallSizeGroups = sizeRows.filter(row => row.trials < 10);
  if (smallSizeGroups.length > 1 || (smallSizeGroups.length === 1 && sizeRows.length > 1)) {
    warnings.push(`Có ${smallSizeGroups.length} nhóm kích thước có dưới 10 target; so sánh giữa nhóm còn hạn chế.`);
  }

  const enoughTracking = validMs >= 10000 && validCoverage !== null && validCoverage >= 0.9;
  const enoughClicks = startedTrials >= 10 && validShots.length >= 10;
  if (isTracking && validMs < 10000) warnings.push('Cần ít nhất 10 giây thời gian tracking hợp lệ để đọc phiên.');
  if (isTracking && validMs >= 10000 && (validCoverage === null || validCoverage < 0.9)) warnings.push('Cần độ phủ frame hợp lệ ít nhất 90% để đọc phiên tracking.');
  if (!isTracking && (startedTrials < 10 || validShots.length < 10)) warnings.push('Cần ít nhất 10 target và 10 phát bắn hợp lệ để đọc phiên click.');

  const hasObservations = isTracking ? validMs > 0 : startedTrials > 0 || validShots.length > 0;
  const qualityLevel = !hasObservations
    ? 'insufficient'
    : ((isTracking ? !enoughTracking : !enoughClicks) || warnings.length ? 'limited' : 'usable');
  const quality = {
    level: qualityLevel,
    warnings,
    elapsedMs,
    validCoverage,
    tracking: isTracking,
    enough: isTracking ? enoughTracking : enoughClicks,
    startedTrials,
    hitTrials,
    terminalTrials,
    validShots: validShots.length,
    invalidTrials,
    invalidShots,
    hitTimedTrials: hitTimes.length,
  };

  const cards = isTracking ? [
    card('Thời gian trên mục tiêu', timeOnTarget, 'ratio', `${onTargetMs} ms trên mục tiêu trong ${validMs} ms tracking hợp lệ có trọng số thời gian.`),
    card('Độ phủ hợp lệ', validCoverage, 'ratio', `${validMs} ms frame hợp lệ trên ${elapsedMs ?? 0} ms đã trôi qua.`),
    card('RMS sai số góc', trackingRmsDeg, '°', 'Căn bậc hai của sai số góc bình phương có trọng số thời gian; chỉ dùng frame hợp lệ.'),
  ] : [
    card('Độ chính xác phát bắn', accuracy, 'ratio', `${hits} phát trúng trên ${validShots.length} phát bắn hợp lệ.`),
    card('Mục tiêu hoàn thành', completion, 'ratio', `${hitTrials} target trúng trên ${startedTrials} target đã bắt đầu.`),
    card('Trúng phát đầu đúng hạn', firstShotDeadline, 'ratio', deadline === null ? 'Thiếu deadline của phiên nên không thể tính chỉ số này.' : `${firstShotHits} phát đầu trúng trong ${deadline} ms trên ${startedTrials} target đã bắt đầu.`),
    card('Trung vị thời gian tới hit', medianHitMs, 'ms', 'Một nửa target trúng có thời gian không vượt quá mốc này và một nửa có thời gian từ mốc này trở lên; chỉ dùng thời gian hợp lệ.'),
    card('P90 thời gian tới hit', p90HitMs, 'ms', 'Khoảng 90% target trúng có thời gian không vượt quá mốc này; đây là phân vị nội suy từ thời gian hợp lệ.'),
    card('Nhịp hit', pacing, 'hits/min', elapsedMs === null ? 'Không có thời lượng thực tế của phiên.' : `${hits} phát trúng trong ${elapsedMs} ms thực tế.`),
  ];

  const findings = isTracking ? [{
    title: 'Tracking và độ phủ dữ liệu',
      body: validCoverage === null
        ? 'Không thể tính độ phủ frame hợp lệ nếu thiếu thời lượng phiên dương.'
      : `Thời gian trên mục tiêu có trọng số là ${timeOnTarget === null ? 'chưa có' : `${(timeOnTarget * 100).toFixed(1)}%`}; RMS sai số góc là ${trackingRmsDeg === null ? 'chưa có' : `${trackingRmsDeg.toFixed(2)}°`}; độ phủ frame hợp lệ là ${(validCoverage * 100).toFixed(1)}% thời lượng phiên.`,
  }] : [
    {
      title: 'Phát bắn và target',
      body: accuracy === null || completion === null
        ? 'Chưa thể tính độ chính xác hoặc tỷ lệ target hoàn thành nếu chưa có phát bắn hợp lệ hay target đã bắt đầu.'
        : `Độ chính xác phát bắn là ${(accuracy * 100).toFixed(1)}% (${hits}/${validShots.length}); tỷ lệ target hoàn thành là ${(completion * 100).toFixed(1)}% (${hitTrials}/${startedTrials}). Hai chỉ số dùng mẫu số khác nhau và mô tả hai sự kiện khác nhau.`,
    },
    {
      title: 'Thời điểm phát đầu',
      body: firstShotDeadline === null
        ? 'Thiếu deadline hoặc dữ liệu phát đầu nên chưa thể tính tỷ lệ trúng phát đầu đúng hạn.'
        : `${firstShotHits}/${startedTrials} target đã bắt đầu có phát đầu trúng trong deadline (${(firstShotDeadline * 100).toFixed(1)}%). Target không có phát đầu vẫn nằm trong mẫu số.`,
    },
    {
      title: 'Thời gian tới hit và nhịp',
      body: medianHitMs === null
        ? 'Chưa có target trúng với thời gian hit hợp lệ nên không có trung vị hoặc P90.'
        : `Trong ${hitTimes.length} target trúng có thời gian hợp lệ, trung vị là ${Math.round(medianHitMs)} ms và P90 là ${Math.round(p90HitMs)} ms. Nhịp hit theo thời lượng thực tế là ${pacing === null ? 'chưa có' : `${pacing.toFixed(2)} hit/phút`}.`,
    },
  ];
  if (!isTracking && accuracy !== null && completion !== null && Math.abs(accuracy - completion) > Number.EPSILON) {
    findings.splice(1, 0, {
      title: 'Chênh lệch giữa phát bắn và target',
      body: `Phiên có ${validShots.length} phát bắn trên ${startedTrials} target; ${hits} phát trúng và ${hitTrials} target trúng. Hai tỷ lệ lệch ${(Math.abs(accuracy - completion) * 100).toFixed(1)} điểm phần trăm. Dữ liệu này không tách được ảnh hưởng của bắn lại và timeout nên không gán nguyên nhân cho chênh lệch.`,
    });
  }
  if (sizeRows.length) {
    findings.push({
      title: 'Nhóm kích thước target',
      body: sizeRows.length < 2
        ? `Chỉ có một nhóm kích thước (${displaySizeLabel(sizeRows[0].label)}); hàng này chỉ mang tính mô tả, chưa phải so sánh.`
        : sizeRows.map(row => `${displaySizeLabel(row.label)}: ${row.hits}/${row.trials} hit (${row.rate === null ? '—' : `${(row.rate * 100).toFixed(1)}%`})`).join('; ') + '.',
    });
  }

  const distanceRows = distanceBreakdown(trials, validFrames, isTracking);
  return { cards, findings, sizeRows, trackingSizeRows, distanceRows, quality };
}

export default sessionInsights;
