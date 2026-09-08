import test from 'node:test';
import assert from 'node:assert/strict';
import { chartCoaching } from '../src/chart-coaching.js';

function framesForErrors(first = 2, second = 4) {
  return Array.from({ length: 100 }, (_, index) => ({
    t: (index + 1) * 100,
    dt: 100,
    errorDeg: index < 50 ? first : second,
    onTarget: index >= 50,
  }));
}

test('empty runs stay gated and do not invent chart coaching', () => {
  const result = chartCoaching({});
  for (const key of ['error', 'pace', 'heat']) {
    assert.equal(typeof result[key].title, 'string');
    assert.equal(typeof result[key].evidence, 'string');
    assert.equal(typeof result[key].action, 'string');
  }
  assert.equal(result.priority.task, null);
  assert.ok(result.error.title.includes('Chưa đủ'));
  assert.ok(result.pace.title.includes('Chưa đủ'));
  assert.ok(result.heat.title.includes('Chưa đủ'));
});

test('error coaching compares valid time weighted halves and proposes a baseline drill', () => {
  const result = chartCoaching({ elapsedMs: 10000, status: 'completed', frames: framesForErrors() });
  assert.equal(result.error.title, 'Sai số cao hơn ở nửa sau');
  assert.match(result.error.evidence, /nửa đầu 2\.00°/);
  assert.match(result.error.evidence, /nửa sau 4\.00°/);
  assert.match(result.error.action, /cùng bài/);
  assert.equal(result.priority.task, null);
});

test('invalid frame coverage gates error coaching instead of reading a sparse chart', () => {
  const result = chartCoaching({
    elapsedMs: 20000,
    status: 'completed',
    frames: [{ t: 100, dt: 100, errorDeg: 1 }, { t: 20000, dt: 200, errorDeg: 20 }],
  });
  assert.ok(result.error.title.includes('Chưa đủ'));
  assert.match(result.error.evidence, /frame hợp lệ/);
});

test('click pace uses guarded accuracy, timeout, and first shot denominators', () => {
  const trials = Array.from({ length: 10 }, (_, index) => ({
    outcome: index < 3 ? 'timeout' : 'hit',
    firstShotMs: 500,
    firstShotHit: index >= 3,
    hitMs: index >= 3 ? 500 : null,
  }));
  const shots = Array.from({ length: 10 }, (_, index) => ({ hit: index < 7 }));
  const result = chartCoaching({ elapsedMs: 30000, status: 'completed', config: { task: 'precision', difficulty: 'normal', deadlineMs: 1000 }, trials, shots });
  assert.equal(result.pace.title, 'Ưu tiên độ chính xác phát bắn');
  assert.match(result.pace.evidence, /70\.0% trên 10/);
  assert.match(result.pace.action, /đúng bài hiện tại/);
  assert.match(result.pace.action, /độ khó normal/);
});

test('tracking pace uses valid weighted time on target and excludes click metrics', () => {
  const result = chartCoaching({
    elapsedMs: 20000,
    status: 'completed',
    config: { task: 'orbit' },
    tracking: { validMs: 18000, onTargetMs: 9000 },
  });
  assert.equal(result.pace.title, 'Ưu tiên tăng thời gian trên mục tiêu');
  assert.match(result.pace.evidence, /50\.0%/);
  assert.match(result.pace.action, /đúng bài hiện tại/);
});

test('high tracking baseline is maintained instead of lowered by a capped target', () => {
  const result = chartCoaching({
    elapsedMs: 20000,
    status: 'completed',
    config: { task: 'orbit', difficulty: 'hard' },
    tracking: { validMs: 18000, onTargetMs: 17900 },
  });
  assert.match(result.pace.action, /giữ ít nhất 99\.4%/);
  assert.match(result.pace.action, /độ khó hard/);
  assert.equal(result.priority.task, 'orbit');
});

test('heat coaching reads directional miss coordinates with a deadzone and no sens diagnosis', () => {
  const shots = [
    ...Array.from({ length: 12 }, () => ({ hit: false, aimX: -3, aimY: 0 })),
    ...Array.from({ length: 48 }, () => ({ hit: true, aimX: 0, aimY: 0 })),
  ];
  const result = chartCoaching({ elapsedMs: 30000, status: 'completed', shots });
  assert.equal(result.heat.title, 'Miss tập trung về phía trái');
  assert.match(result.heat.evidence, /12\/12/);
  assert.match(result.heat.action, /không tự cho biết overshoot hay sens/);
  assert.doesNotMatch(result.heat.action, /giảm tỷ lệ/);
  assert.equal(result.priority.task, 'micro');
});

test('tracking heat uses time weighted frame offsets instead of miss shots', () => {
  const frames = Array.from({ length: 100 }, (_, index) => ({
    t: (index + 1) * 100,
    dt: 100,
    target: [index < 70 ? 6 : -6, 1.6, -20],
    yaw: 0,
    pitch: 0,
  }));
  const result = chartCoaching({ elapsedMs: 10000, status: 'completed', config: { task: 'tracking' }, frames, shots: [] });
  assert.equal(result.heat.title, 'Thời gian tracking lệch về phía trái');
  assert.match(result.heat.evidence, /s có tọa độ/);
  assert.doesNotMatch(result.heat.evidence, /miss/);
});

test('pace evidence names the weakest complete five second interval', () => {
  const trials = Array.from({ length: 10 }, (_, index) => ({ outcome: index < 5 ? 'timeout' : 'hit', firstShotMs: 300, firstShotHit: true }));
  const shots = Array.from({ length: 10 }, (_, index) => ({ t: index < 5 ? 1000 + index * 100 : 6000 + index * 100, hit: index >= 5 }));
  const result = chartCoaching({ elapsedMs: 10000, status: 'completed', config: { deadlineMs: 1000 }, trials, shots });
  assert.match(result.pace.evidence, /Khoảng yếu nhất 0–5s: 0\/5/);
});

test('paused or early runs limit every coaching surface', () => {
  const result = chartCoaching({ elapsedMs: 10000, status: 'ended-early', pauses: [{}], shots: [{ hit: false, aimX: 3, aimY: 0 }] });
  assert.match(result.error.evidence, /tạm dừng|chưa hoàn tất/);
  assert.match(result.pace.evidence, /tạm dừng|chưa hoàn tất/);
  assert.match(result.heat.evidence, /tạm dừng|chưa hoàn tất/);
  assert.equal(result.priority.task, null);
});
