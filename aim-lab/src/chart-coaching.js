/*
 * Small, descriptive coaching notes for the three result charts.
 *
 * This module intentionally reads raw run telemetry and makes no sensitivity,
 * rank, or movement diagnosis.  Every recommendation is gated by the sample
 * and coverage needed to support the corresponding chart.
 */

const TRACKING_TASKS = new Set(['tracking', 'orbit']);
const DEADZONE_DEG = 1;

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function finite(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nonNegative(value) {
  const n = finite(value);
  return n !== null && n >= 0 ? n : null;
}

function pct(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
}

function ms(value) {
  return Number.isFinite(value) ? `${Math.round(value)} ms` : '—';
}

function ratio(numerator, denominator) {
  return denominator > 0 && Number.isFinite(numerator) && Number.isFinite(denominator)
    ? numerator / denominator
    : null;
}

function runDuration(run) {
  const value = nonNegative(object(run).elapsedMs);
  return value !== null && value > 0 ? value : null;
}

function pausedOrIncomplete(run) {
  const source = object(run);
  if (Array.isArray(source.pauses) && source.pauses.length) return 'Phiên có tạm dừng; biểu đồ không đủ liên tục để giao việc luyện tập.';
  if (source.status !== undefined && source.status !== 'completed') return 'Phiên chưa hoàn tất; hãy hoàn tất một phiên liên tục trước khi dùng nhận xét này.';
  return null;
}

function frameWindow(frame, duration) {
  const dt = nonNegative(frame?.dt);
  if (dt === null || dt <= 0 || dt > 100 || duration === null) return null;
  const endRaw = nonNegative(frame?.t);
  if (endRaw === null) return null;
  const end = Math.min(duration, endRaw);
  const start = Math.max(0, endRaw - dt);
  const weight = Math.max(0, end - Math.min(duration, start));
  return weight > 0 ? { start: Math.min(duration, start), end, weight } : null;
}

function validFrameCoverage(run) {
  const duration = runDuration(run);
  const frames = Array.isArray(object(run).frames) ? object(run).frames : [];
  if (duration === null || !frames.length) return null;
  const validMs = frames.reduce((sum, frame) => sum + (frameWindow(frame, duration)?.weight || 0), 0);
  return ratio(validMs, duration);
}

function aimOffset(target, yaw, pitch) {
  if (!Array.isArray(target) || target.length !== 3 || !target.every(value => finite(value) !== null)) return null;
  const cameraYaw = finite(yaw);
  const cameraPitch = finite(pitch);
  if (cameraYaw === null || cameraPitch === null) return null;
  const [x, y, z] = target;
  const targetYaw = Math.atan2(x, -z);
  const horizontal = -Math.atan2(Math.sin(targetYaw + cameraYaw), Math.cos(targetYaw + cameraYaw)) * 180 / Math.PI;
  const targetPitch = Math.atan2(y - 1.6, Math.hypot(x, z));
  const vertical = (cameraPitch - targetPitch) * 180 / Math.PI;
  return { x: horizontal, y: vertical };
}

function validErrorHalves(run) {
  const duration = runDuration(run);
  const frames = Array.isArray(object(run).frames) ? object(run).frames : [];
  const halves = [
    { validMs: 0, sum: 0 },
    { validMs: 0, sum: 0 },
  ];
  if (duration === null) return { duration: null, halves, validMs: 0 };
  for (const frame of frames) {
    const error = nonNegative(frame?.errorDeg);
    const window = frameWindow(frame, duration);
    if (error === null || !window) continue;
    const midpoint = duration / 2;
    for (const index of [0, 1]) {
      const lower = index ? midpoint : 0;
      const upper = index ? duration : midpoint;
      const weight = Math.max(0, Math.min(window.end, upper) - Math.max(window.start, lower));
      if (weight > 0) {
        halves[index].validMs += weight;
        halves[index].sum += error * weight;
      }
    }
  }
  return { duration, halves, validMs: halves[0].validMs + halves[1].validMs };
}

function unavailable(title, evidence, action) {
  return { title, evidence, action };
}

function errorCoaching(run) {
  const source = object(run);
  const blocked = pausedOrIncomplete(source);
  if (blocked) return unavailable('Chưa giao bài từ biểu đồ sai số', blocked, 'Hoàn tất một phiên liên tục 30 giây rồi xem lại hai nửa thời gian.');
  const stats = validErrorHalves(source);
  if (stats.duration === null) return unavailable('Chưa đủ dữ liệu sai số', 'Thiếu thời lượng phiên thực tế.', 'Hoàn tất một phiên 30 giây để có đủ mốc thời gian.');
  const coverage = ratio(stats.validMs, stats.duration);
  if (stats.duration < 10000 || stats.halves.some(half => half.validMs < 1000) || coverage < .6) {
    return unavailable('Chưa đủ độ phủ sai số', `Chỉ có ${ms(stats.validMs)} frame hợp lệ có sai số trên ${ms(stats.duration)} phiên (${pct(coverage)}).`, 'Giữ phiên liên tục 30 giây và để cả hai nửa có ít nhất 1 giây frame hợp lệ.');
  }
  const means = stats.halves.map(half => half.sum / half.validMs);
  const delta = means[1] - means[0];
  const difference = Math.abs(delta);
  let title = 'Sai số tương đối ổn định giữa hai nửa';
  let action = `Lặp lại bài hiện tại 30 giây; lấy ${means[0].toFixed(2)}° và ${means[1].toFixed(2)}° làm mốc cho hai nửa.`;
  if (difference >= .5 && Math.abs(delta) / Math.max(.1, means[0]) >= .15) {
    title = delta > 0 ? 'Sai số cao hơn ở nửa sau' : 'Sai số cao hơn ở nửa đầu';
    const target = Math.max(0, means[delta > 0 ? 1 : 0] - difference * .2);
    action = `Lặp lại chính bài và độ khó hiện tại trong 30 giây; mục tiêu đưa nửa ${delta > 0 ? 'sau' : 'đầu'} về khoảng ${target.toFixed(2)}° hoặc thấp hơn, rồi kiểm tra lại cùng bài.`;
  }
  return {
    title,
    evidence: `Sai số trung bình có trọng số thời gian: nửa đầu ${means[0].toFixed(2)}° trên ${ms(stats.halves[0].validMs)}, nửa sau ${means[1].toFixed(2)}° trên ${ms(stats.halves[1].validMs)}; tổng độ phủ ${pct(coverage)}. Vị trí và kích thước target cũng có thể làm hai nửa khác nhau.`,
    action,
  };
}

function isTracking(run) {
  const config = object(object(run).config);
  return config.tracking === true || TRACKING_TASKS.has(config.task);
}

function sameTaskInstruction(run) {
  const config = object(object(run).config);
  const difficulty = typeof config.difficulty === 'string' ? config.difficulty : 'hiện tại';
  return `Lặp lại đúng bài hiện tại ở độ khó ${difficulty} trong 30 giây`;
}

function intervalEvidence(run, duration, tracking, trials, shots) {
  const bucketCount = Math.floor(duration / 5000);
  if (bucketCount < 1) return null;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({ start: index * 5000, end: (index + 1) * 5000, validMs: 0, onTargetMs: 0, shots: 0, hits: 0 }));
  if (tracking) {
    for (const frame of Array.isArray(object(run).frames) ? object(run).frames : []) {
      const window = frameWindow(frame, duration);
      if (!window) continue;
      for (const bucket of buckets) {
        const weight = Math.max(0, Math.min(window.end, bucket.end) - Math.max(window.start, bucket.start));
        if (weight > 0) {
          bucket.validMs += weight;
          if (frame.onTarget === true) bucket.onTargetMs += weight;
        }
      }
    }
    const eligible = buckets.filter(bucket => bucket.validMs >= 4000);
    if (!eligible.length) return null;
    const weakest = eligible.reduce((a, b) => ratio(a.onTargetMs, a.validMs) <= ratio(b.onTargetMs, b.validMs) ? a : b);
    return `Khoảng yếu nhất ${weakest.start / 1000}–${weakest.end / 1000}s: ${(weakest.onTargetMs / 1000).toFixed(1)}s trên mục tiêu / ${(weakest.validMs / 1000).toFixed(1)}s hợp lệ (${pct(ratio(weakest.onTargetMs, weakest.validMs))}).`;
  }
  for (const shot of shots) {
    const t = nonNegative(shot?.t);
    if (t === null || t < 0 || t >= duration) continue;
    const bucket = buckets[Math.floor(t / 5000)];
    if (!bucket) continue;
    bucket.shots++;
    if (shot.hit === true) bucket.hits++;
  }
  const eligible = buckets.filter(bucket => bucket.shots >= 5);
  if (!eligible.length) return null;
  const weakest = eligible.reduce((a, b) => ratio(a.hits, a.shots) <= ratio(b.hits, b.shots) ? a : b);
  return `Khoảng yếu nhất ${weakest.start / 1000}–${weakest.end / 1000}s: ${weakest.hits}/${weakest.shots} phát trúng (${pct(ratio(weakest.hits, weakest.shots))}).`;
}

function paceCoaching(run) {
  const source = object(run);
  const blocked = pausedOrIncomplete(source);
  if (blocked) return unavailable('Chưa giao bài từ biểu đồ nhịp', blocked, 'Hoàn tất một phiên liên tục 30 giây rồi xem lại nhịp theo thời gian.');
  const duration = runDuration(source);
  if (duration === null) return unavailable('Chưa đủ thời lượng cho biểu đồ nhịp', 'Thiếu thời lượng phiên thực tế.', 'Hoàn tất một phiên liên tục 30 giây rồi xem lại nhịp theo thời gian.');
  if (isTracking(source)) {
    const tracking = object(source.tracking);
    const validMs = nonNegative(tracking.validMs);
    const onTargetMs = nonNegative(tracking.onTargetMs);
    const coverage = ratio(validMs, duration);
    const timeOnTarget = ratio(Math.min(onTargetMs ?? 0, validMs ?? 0), validMs);
    if (duration === null || validMs === null || onTargetMs === null || validMs < 10000 || coverage === null || coverage < .9) {
      return unavailable('Chưa đủ mẫu tracking', `Cần ít nhất 10 giây tracking hợp lệ và 90% độ phủ; hiện có ${ms(validMs)} trên ${ms(duration)} (${pct(coverage)}).`, 'Hoàn tất một phiên tracking liên tục 30 giây với frame hợp lệ rồi xem lại nhịp.');
    }
    const baselineTarget = timeOnTarget >= .95
      ? `giữ ít nhất ${pct(timeOnTarget)}`
      : `đạt khoảng ${pct(Math.min(1, (timeOnTarget ?? 0) + .05))}`;
    const interval = intervalEvidence(source, duration, true, [], []);
    return {
      title: 'Ưu tiên tăng thời gian trên mục tiêu',
      evidence: `Tâm ở trên mục tiêu ${pct(timeOnTarget)} trong ${ms(validMs)} tracking hợp lệ; độ phủ ${pct(coverage)}.${interval ? ` ${interval}` : ''}`,
      action: `${sameTaskInstruction(source)}; mục tiêu phiên kế tiếp là ${baselineTarget} thời gian trên mục tiêu trong mẫu tương tự.`,
    };
  }

  const trials = Array.isArray(source.trials) ? source.trials.filter(trial => trial && typeof trial === 'object') : [];
  const shots = Array.isArray(source.shots) ? source.shots.filter(shot => typeof shot?.hit === 'boolean') : [];
  const started = trials.length;
  const hits = shots.filter(shot => shot.hit).length;
  const accuracy = ratio(hits, shots.length);
  const timeouts = trials.filter(trial => {
    const outcome = String(trial.outcome || '').toLowerCase();
    return outcome === 'timeout' || outcome === 'timedout' || outcome === 'timed-out' || outcome === 'hết thời gian' || outcome === 'het thoi gian';
  }).length;
  const coverage = validFrameCoverage(source);
  if (coverage !== null && coverage < .9) {
    return unavailable('Chưa đủ độ phủ cho biểu đồ nhịp', `Frame hợp lệ chỉ phủ ${pct(coverage)} thời lượng phiên; cần ít nhất 90% để đọc nhịp.`, 'Hoàn tất một phiên liên tục 30 giây với frame hợp lệ rồi xem lại biểu đồ nhịp.');
  }
  const timeoutRate = ratio(timeouts, started);
  const deadline = nonNegative(object(source.config).deadlineMs);
  const firstShotHits = deadline === null ? null : trials.filter(trial => {
    const time = nonNegative(trial.firstShotMs);
    return trial.firstShotHit === true && time !== null && time <= deadline;
  }).length;
  const firstShotRate = firstShotHits === null ? null : ratio(firstShotHits, started);
  if (started < 10 && shots.length < 10) {
    return unavailable('Chưa đủ mẫu click', `Có ${shots.length} phát bắn hợp lệ và ${started} target đã bắt đầu; cần ít nhất 10 ở mỗi mẫu liên quan.`, 'Hoàn tất một phiên click liên tục 30 giây với ít nhất 10 target và 10 phát bắn hợp lệ.');
  }
  const observations = [
    accuracy !== null && shots.length >= 10 ? { kind: 'accuracy', value: accuracy } : null,
    timeoutRate !== null && started >= 10 ? { kind: 'timeout', value: timeoutRate } : null,
    firstShotRate !== null && started >= 10 ? { kind: 'firstShot', value: firstShotRate } : null,
  ].filter(Boolean);
  if (!observations.length) return unavailable('Chưa đủ mẫu click', 'Không có chỉ số nhịp nào đạt mẫu số tối thiểu 10.', 'Hoàn tất một phiên click liên tục 30 giây rồi xem lại biểu đồ.');
  if (accuracy !== null && shots.length >= 10 && accuracy < .75) {
    const target = Math.min(.95, accuracy + .05);
    const interval = intervalEvidence(source, duration, false, trials, shots);
    return { title: 'Ưu tiên độ chính xác phát bắn', evidence: `Độ chính xác là ${pct(accuracy)} trên ${shots.length} phát hợp lệ.${interval ? ` ${interval}` : ''}`, action: `${sameTaskInstruction(source)}; mục tiêu đạt khoảng ${pct(target)} trên mẫu phát bắn tương tự. Micro adjustment có thể dùng như bài bổ sung riêng, không dùng mục tiêu này để so chéo bài.` };
  }
  if (timeoutRate !== null && started >= 10 && timeoutRate > .2) {
    const target = Math.max(0, timeoutRate - .05);
    const interval = intervalEvidence(source, duration, false, trials, shots);
    return { title: 'Ưu tiên giảm target hết thời gian', evidence: `${timeouts}/${started} target hết thời gian (${pct(timeoutRate)}).${interval ? ` ${interval}` : ''}`, action: `${sameTaskInstruction(source)}; mục tiêu đưa tỷ lệ timeout về khoảng ${pct(target)} hoặc thấp hơn với mẫu target tương tự.` };
  }
  if (firstShotRate !== null && started >= 10 && firstShotRate < .7) {
    const target = Math.min(.9, firstShotRate + .05);
    const interval = intervalEvidence(source, duration, false, trials, shots);
    return { title: 'Ưu tiên phát đầu đúng hạn', evidence: `${firstShotHits}/${started} target có phát đầu trúng trong ${deadline} ms (${pct(firstShotRate)}).${interval ? ` ${interval}` : ''}`, action: `${sameTaskInstruction(source)}; mục tiêu nâng tỷ lệ phát đầu đúng hạn lên khoảng ${pct(target)} trong cùng deadline.` };
  }
  return { title: 'Nhịp click ổn trong mẫu hiện có', evidence: `Có ${shots.length} phát bắn hợp lệ và ${started} target đã bắt đầu; không chỉ số nào vượt ngưỡng cảnh báo đã đặt.`, action: `${sameTaskInstruction(source)} để kiểm tra độ ổn định trước khi đổi bài.` };
}

function heatCoaching(run) {
  const source = object(run);
  const blocked = pausedOrIncomplete(source);
  if (blocked) return unavailable('Chưa giao bài từ bản đồ lệch tâm', blocked, 'Hoàn tất một phiên liên tục 30 giây rồi xem lại các miss có tọa độ.');
  const tracking = isTracking(source);
  const coverage = validFrameCoverage(source);
  if (coverage !== null && coverage < .9) {
    return unavailable('Chưa đủ độ phủ cho bản đồ lệch tâm', `Frame hợp lệ chỉ phủ ${pct(coverage)} thời lượng phiên; cần ít nhất 90% để đọc phân bố.`, 'Hoàn tất một phiên liên tục 30 giây với frame hợp lệ rồi xem lại bản đồ.');
  }
  if (tracking) {
    const duration = runDuration(source);
    const frames = Array.isArray(source.frames) ? source.frames : [];
    const totals = { left: 0, right: 0, up: 0, down: 0, center: 0 };
    let locatedMs = 0;
    for (const frame of frames) {
      const window = frameWindow(frame, duration);
      const offset = aimOffset(frame?.target, frame?.yaw, frame?.pitch);
      if (!window || !offset) continue;
      locatedMs += window.weight;
      if (Math.abs(offset.x) <= DEADZONE_DEG && Math.abs(offset.y) <= DEADZONE_DEG) totals.center += window.weight;
      else if (Math.abs(offset.x) >= Math.abs(offset.y)) totals[offset.x < 0 ? 'left' : 'right'] += window.weight;
      else totals[offset.y > 0 ? 'up' : 'down'] += window.weight;
    }
    if (locatedMs < 10000) {
      return unavailable('Chưa đủ tọa độ tracking', `Chỉ có ${ms(locatedMs)} thời gian frame có tọa độ mục tiêu và camera; cần ít nhất 10 giây.`, 'Tiếp tục bài tracking bình thường trong 30 giây rồi xem lại phân bố lệch tâm.');
    }
    const direction = ['left', 'right', 'up', 'down'].sort((a, b) => totals[b] - totals[a])[0];
    const dominant = totals[direction];
    const directionNames = { left: 'trái', right: 'phải', up: 'trên', down: 'dưới' };
    if (dominant >= locatedMs * .4) {
      const current = ratio(dominant, locatedMs);
      return {
        title: `Thời gian tracking lệch về phía ${directionNames[direction]}`,
        evidence: `${(dominant / 1000).toFixed(1)}s/${(locatedMs / 1000).toFixed(1)}s có tọa độ lệch chủ yếu về phía ${directionNames[direction]}; vùng chết ±${DEADZONE_DEG}° là ${(totals.center / 1000).toFixed(1)}s.`,
        action: `Tiếp tục chính bài tracking hiện tại 30 giây; giữ cùng cấu hình và kiểm tra xem tỷ lệ lệch phía ${directionNames[direction]} (${pct(current)}) có lặp lại không. Phân bố này không tự cho biết overshoot hay sens.`,
      };
    }
    return {
      title: 'Thời gian tracking phân bố nhiều hướng',
      evidence: `${(locatedMs / 1000).toFixed(1)}s có tọa độ: trái ${(totals.left / 1000).toFixed(1)}s, phải ${(totals.right / 1000).toFixed(1)}s, trên ${(totals.up / 1000).toFixed(1)}s, dưới ${(totals.down / 1000).toFixed(1)}s, gần tâm ${(totals.center / 1000).toFixed(1)}s.`,
      action: 'Tiếp tục chính bài tracking hiện tại 30 giây để kiểm tra độ ổn định cùng cấu hình; phân bố này không tự cho biết overshoot hay sens.',
    };
  }
  const shots = Array.isArray(source.shots) ? source.shots : [];
  const misses = shots.filter(shot => shot?.hit === false && finite(shot.aimX) !== null && finite(shot.aimY) !== null);
  if (misses.length < 10) return unavailable('Chưa đủ miss có tọa độ', `Có ${misses.length} miss có aimX/aimY hợp lệ; cần ít nhất 10 để đọc hướng phân bố.`, 'Tiếp tục bài bình thường trong 30 giây; khi có đủ miss có tọa độ, xem lại hướng phân bố mà không cố ý bắn trượt.');
  const counts = { left: 0, right: 0, up: 0, down: 0, center: 0 };
  for (const shot of misses) {
    const x = finite(shot.aimX);
    const y = finite(shot.aimY);
    if (Math.abs(x) <= DEADZONE_DEG && Math.abs(y) <= DEADZONE_DEG) counts.center++;
    else if (Math.abs(x) >= Math.abs(y)) counts[x < 0 ? 'left' : 'right']++;
    else counts[y > 0 ? 'up' : 'down']++;
  }
  const direction = ['left', 'right', 'up', 'down'].sort((a, b) => counts[b] - counts[a])[0];
  const dominant = counts[direction];
  const directionNames = { left: 'trái', right: 'phải', up: 'trên', down: 'dưới' };
  if (dominant >= Math.ceil(misses.length * .4)) {
    return {
      title: `Miss tập trung về phía ${directionNames[direction]}`,
      evidence: `${dominant}/${misses.length} miss có tọa độ nằm lệch chủ yếu về phía ${directionNames[direction]}; vùng chết ±${DEADZONE_DEG}° có ${counts.center}.`,
      action: `Tập Micro adjustment 30 giây; đưa tâm vào vùng mục tiêu rồi dừng xác nhận trước khi click, sau đó đọc cùng độ chính xác phát bắn. Phân bố này không tự cho biết overshoot hay sens.`,
    };
  }
  return {
    title: 'Miss phân bố nhiều hướng',
    evidence: `${misses.length} miss có tọa độ; trái ${counts.left}, phải ${counts.right}, trên ${counts.up}, dưới ${counts.down}, gần tâm ${counts.center}.`,
    action: 'Tập Precision 30 giây; đưa tâm vào vùng mục tiêu rồi dừng xác nhận trước khi click, sau đó đọc cùng độ chính xác phát bắn. Phân bố này không tự cho biết overshoot hay sens.',
  };
}

function chartCoaching(run) {
  const error = errorCoaching(run);
  const pace = paceCoaching(run);
  const heat = heatCoaching(run);
  const source = object(run);
  const configuredTask = typeof source.config?.task === 'string' ? source.config.task : null;
  const available = note => note && typeof note.title === 'string' && !note.title.startsWith('Chưa');
  const candidate = pace.title.includes('Ưu tiên')
    ? { title: pace.title, evidence: pace.evidence, action: pace.action, task: configuredTask }
    : available(error) && error.title.includes('cao hơn')
      ? { title: error.title, evidence: error.evidence, action: error.action, task: configuredTask }
      : heat.title.includes('tập trung')
        ? { title: heat.title, evidence: heat.evidence, action: heat.action, task: 'micro' }
        : available(error)
          ? { title: error.title, evidence: error.evidence, action: error.action, task: configuredTask }
          : available(pace)
            ? { title: pace.title, evidence: pace.evidence, action: pace.action, task: configuredTask }
            : null;
  const priority = candidate || {
    title: 'Chưa có ưu tiên đáng tin cậy',
    evidence: 'Các biểu đồ hiện chưa có đủ mẫu hoặc chưa cho thấy một chênh lệch cần ưu tiên.',
    action: 'Hoàn tất một phiên liên tục 30 giây rồi xem lại ba biểu đồ cùng với mẫu số của chúng.',
    task: null,
  };
  return { error, pace, heat, priority };
}

export { chartCoaching };
export default chartCoaching;
