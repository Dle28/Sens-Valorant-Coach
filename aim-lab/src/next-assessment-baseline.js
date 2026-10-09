import { assessmentConfigMatches, assessmentMetric } from './assessment-protocol.js';

export const NEXT_ASSESSMENT_BASELINE_VERSION = 'persistence-baseline-v1';
const CLICK_BLOCKS = new Set(['precision', 'micro', 'wide']);

const finiteRate = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

function median(values) {
  const ordered = values.filter(finiteRate).slice().sort((a, b) => a - b);
  if (!ordered.length) return null;
  const middle = Math.floor(ordered.length / 2);
  return (ordered[middle] + ordered[Math.ceil((ordered.length - 1) / 2)]) / 2;
}

function recordTime(record) {
  const value = Date.parse(record?.startedAt ?? record?.endedAt ?? '');
  return Number.isFinite(value) ? value : -Infinity;
}

function cleanClickAssessment(record, playerId, blockId) {
  const assignment = record?.protocol?.assessment;
  const metric = assessmentMetric(record);
  if (!assignment || assignment.blockId !== blockId || assignment.metric !== 'firstShotSuccessRate') return null;
  if (!CLICK_BLOCKS.has(assignment.blockId) || record?.playerId !== playerId) return null;
  if (record?.status !== 'completed' || record?.qualityClean !== true || record?.imported === true) return null;
  if (!assessmentConfigMatches(record) || !metric || metric.key !== 'firstShotSuccessRate') return null;
  return { id: record.id ?? null, startedAt: record.startedAt ?? null, rate: metric.value };
}

/**
 * Personal persistence baseline for the next standardized click assessment.
 * It intentionally is not an ML prediction: the result is a transparent
 * rolling median and observed range, used until a trained model beats it.
 */
export function nextAssessmentForecast(records, { playerId, assignment } = {}) {
  if (!assignment || !CLICK_BLOCKS.has(assignment.blockId) || assignment.metric !== 'firstShotSuccessRate') return null;
  const history = (Array.isArray(records) ? records : [])
    .map(record => cleanClickAssessment(record, playerId, assignment.blockId))
    .filter(Boolean)
    .sort((a, b) => recordTime(a) - recordTime(b));
  const recent = history.slice(-3);
  if (recent.length < 3) {
    return {
      state: 'insufficient-history',
      modelVersion: NEXT_ASSESSMENT_BASELINE_VERSION,
      requiredAssessments: 3,
      observedAssessments: recent.length,
      message: `Cần thêm ${3 - recent.length} assessment ${assignment.blockId} sạch cùng cấu hình để tạo mốc dự báo cá nhân.`,
    };
  }
  const rates = recent.map(row => row.rate);
  const predictionRate = median(rates);
  const low = Math.min(...rates), high = Math.max(...rates);
  return {
    state: 'available',
    modelVersion: NEXT_ASSESSMENT_BASELINE_VERSION,
    source: 'rolling_median_not_ml',
    blockId: assignment.blockId,
    predictionRate,
    observedRange: { low, high },
    sourceSessionIds: recent.map(row => row.id),
    message: `Mốc lần đo kế tiếp: ${(predictionRate * 100).toFixed(1)}% (ba assessment gần nhất: ${(low * 100).toFixed(1)}–${(high * 100).toFixed(1)}%). Đây là median lịch sử cá nhân, chưa phải dự đoán AI; chỉ dùng khi đo lại trong 1–3 ngày với cùng protocol.`,
  };
}
