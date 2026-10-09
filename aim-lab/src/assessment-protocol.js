// A deliberately small, fixed battery.  It measures distinct aim behaviours
// with deterministic seeds, so a later re-test is comparable to its baseline.
// This is a measurement protocol, not a claim that these four blocks predict
// VALORANT rank or that a single score represents all aiming skill.

const FIXED = Object.freeze({ map: 'dark', weapon: 'vandal', difficulty: 'normal', durationMs: 60000 });

export const CORE_AIM_BATTERY = Object.freeze({
  id: 'core-aim-battery-v1',
  version: '1',
  name: 'Đánh giá aim chuẩn hoá',
  blocks: Object.freeze([
    Object.freeze({ id: 'precision', task: 'precision', seed: 410001, label: 'Precision', metric: 'firstShotSuccessRate', ...FIXED }),
    Object.freeze({ id: 'micro', task: 'micro', seed: 410003, label: 'Micro adjustment', metric: 'firstShotSuccessRate', ...FIXED }),
    Object.freeze({ id: 'wide', task: 'wide', seed: 410007, label: 'Wide flick', metric: 'firstShotSuccessRate', ...FIXED }),
    Object.freeze({ id: 'tracking', task: 'tracking', seed: 410009, label: 'Tracking', metric: 'timeOnTarget', ...FIXED }),
  ]),
});

function finiteInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

export function assessmentBlock(protocolId, index) {
  if (protocolId !== CORE_AIM_BATTERY.id) return null;
  const i = finiteInteger(index);
  return i !== null ? CORE_AIM_BATTERY.blocks[i] ?? null : null;
}

export function assessmentAssignment(protocolId, index) {
  const block = assessmentBlock(protocolId, index);
  if (!block) return null;
  const assignedConfig = {
    task: block.task,
    map: block.map,
    weapon: block.weapon,
    difficulty: block.difficulty,
    durationMs: block.durationMs,
    seed: block.seed,
    challengeId: null,
    scenario: null,
  };
  return {
    protocolId: CORE_AIM_BATTERY.id,
    protocolVersion: CORE_AIM_BATTERY.version,
    blockId: block.id,
    blockIndex: index,
    blockCount: CORE_AIM_BATTERY.blocks.length,
    metric: block.metric,
    assignedConfig,
  };
}

export function assessmentConfigMatches(run, assignment = run?.protocol?.assessment) {
  if (!run || !assignment || typeof assignment !== 'object') return false;
  const canonical = assessmentAssignment(assignment.protocolId, assignment.blockIndex);
  if (!canonical || canonical.blockId !== assignment.blockId || canonical.protocolVersion !== assignment.protocolVersion) return false;
  const config = run.config ?? {};
  const expected = canonical.assignedConfig;
  return Object.entries(expected).every(([key, value]) => {
    if (key === 'scenario') return config.scenario === null;
    return config[key] === value;
  });
}

export function assessmentMetric(record) {
  const assignment = record?.protocol?.assessment;
  const block = assignment ? assessmentBlock(assignment.protocolId, assignment.blockIndex) : null;
  if (!block || assignment.blockId !== block.id) return null;
  const value = record?.summary?.[block.metric];
  return Number.isFinite(value) && value >= 0 && value <= 1
    ? { key: block.metric, label: block.metric === 'timeOnTarget' ? 'thời gian trên target' : 'trúng phát đầu đúng hạn', value }
    : null;
}
