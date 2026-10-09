import { assessmentMetric } from './assessment-protocol.js';
import { comparable } from './training.js';

function qualityClean(record) {
  return record?.status === 'completed' && record?.qualityClean === true && record?.imported !== true;
}

function byId(records, id) {
  return records.find(record => record?.id === id) ?? null;
}

function dose(record) {
  return Number.isFinite(record?.elapsedMs) && record.elapsedMs >= 0 ? record.elapsedMs : 0;
}

function plannedDose(record) {
  const value = record?.protocol?.coaching?.plannedDurationMs;
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Describes a single player's observed baseline -> intervention -> retest
 * chain.  It intentionally reports an observed delta, never a causal effect.
 */
export function coachingFollowup(current, history = []) {
  const records = [current, ...history].filter(record => record && typeof record === 'object');
  const protocol = current?.protocol ?? {};
  if (protocol.phase === 'intervention') {
    const baselineId = protocol.coaching?.sourceSessionId ?? null;
    const baseline = baselineId ? byId(records, baselineId) : null;
    const actualDoseMs = dose(current);
    const expectedDoseMs = plannedDose(current);
    return {
      state: baseline && qualityClean(baseline) && qualityClean(current) ? 'awaiting-retest' : 'incomplete',
      baselineId,
      interventionSessionIds: [current.id].filter(Boolean),
      actualDoseMs,
      expectedDoseMs,
      canScheduleRetest: Boolean(baseline && qualityClean(baseline) && qualityClean(current)),
      message: baseline && qualityClean(baseline) && qualityClean(current)
        ? `Đã ghi ${Math.round(actualDoseMs / 1000)} giây luyện can thiệp${expectedDoseMs === null ? '' : ` trên ${Math.round(expectedDoseMs / 1000)} giây dự kiến`}. Cần đo lại cùng cấu hình để có một cặp quan sát.`
        : 'Can thiệp chưa có baseline sạch liên kết nên chưa thể lập cặp đo lại.',
    };
  }
  if (protocol.phase !== 'retest') return null;
  const baseline = byId(records, protocol.referenceSessionId);
  if (!baseline || !qualityClean(baseline) || !qualityClean(current) || !comparable(baseline.config, current.config)) {
    return { state: 'incomplete', baselineId: protocol.referenceSessionId ?? null, canScheduleRetest: false, message: 'Đo lại thiếu baseline sạch cùng cấu hình; không tính thay đổi.' };
  }
  const before = assessmentMetric(baseline);
  const after = assessmentMetric(current);
  if (!before || !after || before.key !== after.key) {
    return { state: 'incomplete', baselineId: baseline.id, canScheduleRetest: false, message: 'Cặp đo lại chưa có cùng endpoint chuẩn hoá.' };
  }
  const interventions = records.filter(record => record?.protocol?.phase === 'intervention' && record?.protocol?.coaching?.sourceSessionId === baseline.id && qualityClean(record));
  const actualDoseMs = interventions.reduce((sum, record) => sum + dose(record), 0);
  const expectedDoseMs = interventions.reduce((sum, record) => sum + (plannedDose(record) ?? 0), 0);
  const delta = after.value - before.value;
  return {
    state: 'paired-observation',
    baselineId: baseline.id,
    interventionSessionIds: interventions.map(record => record.id),
    actualDoseMs,
    expectedDoseMs: expectedDoseMs || null,
    metric: after.label,
    before: before.value,
    after: after.value,
    delta,
    canScheduleRetest: false,
    message: `${after.label}: ${(before.value * 100).toFixed(1)}% → ${(after.value * 100).toFixed(1)}% (${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)} điểm). Đây là một cặp quan sát sau ${Math.round(actualDoseMs / 1000)} giây tập, chưa chứng minh bài tập là nguyên nhân.`,
  };
}
