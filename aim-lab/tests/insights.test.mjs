import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionInsights } from '../src/insights.js';

const card = (result, label) => result.cards.find(item => item.label === label);

test('distance groups include timeouts, use boundary distances, and exclude missing telemetry', () => {
 const run={elapsedMs:30000,trials:[{distance:8,outcome:'hit',hitMs:300},{distance:8,outcome:'timeout'}, {distance:12,outcome:'hit',hitMs:500},{distance:24,outcome:'hit',hitMs:800},{distance:null,outcome:'hit'},{distance:-2,outcome:'hit'}]};
 const snapshot=JSON.stringify(run),rows=sessionInsights(run).distanceRows;
 assert.deepEqual(rows.map(r=>[r.band,r.trials,r.hits,r.rate,r.medianMs]),[['near',2,1,.5,300],['mid',1,1,1,500],['far',1,1,1,800]]);
 assert.equal(JSON.stringify(run),snapshot);
});

test('tracking distance groups weight valid observed time and clip at session end', () => {
 const rows=sessionInsights({config:{task:'tracking'},elapsedMs:100,frames:[{t:20,dt:20,distance:10,onTarget:true},{t:80,dt:60,distance:10,onTarget:false},{t:120,dt:40,distance:24,onTarget:true},{t:50,dt:200,distance:14,onTarget:true},{t:50,dt:10,distance:14}]}).distanceRows;
 assert.deepEqual(rows.map(r=>[r.band,r.validMs,r.onTargetMs,r.rate]),[['near',80,20,.25],['far',20,20,1]]);
 assert.deepEqual(sessionInsights({config:{task:'tracking'},frames:[]}).distanceRows,[]);
});

test('session insights keep click, trial, deadline, timing, and pace denominators distinct', () => {
  const result = sessionInsights({
    elapsedMs: 120000,
    config: { deadlineMs: 1000 },
    shots: [{ hit: true }, { hit: false }, { hit: true }, { hit: 'invalid' }],
    trials: [
      { outcome: 'hit', firstShotMs: 300, firstShotHit: true, hitMs: 400 },
      { outcome: 'hit', firstShotMs: 1200, firstShotHit: true, hitMs: 900 },
      { outcome: 'timeout', firstShotMs: null, firstShotHit: null, hitMs: null },
      { outcome: 'interrupted', firstShotMs: null, firstShotHit: null, hitMs: null },
    ],
    tracking: { validMs: 90000, onTargetMs: 45000 },
  });

  assert.equal(card(result, 'Độ chính xác phát bắn').value, 2 / 3);
  assert.equal(card(result, 'Mục tiêu hoàn thành').value, 2 / 4);
  assert.equal(card(result, 'Trúng phát đầu đúng hạn').value, 1 / 4);
  assert.equal(card(result, 'Trung vị thời gian tới hit').value, 650);
  assert.equal(card(result, 'P90 thời gian tới hit').value, 850);
  assert.equal(card(result, 'Nhịp hit').value, 1);
  assert.match(card(result, 'Trung vị thời gian tới hit').explanation, /Một nửa/);
  assert.match(card(result, 'P90 thời gian tới hit').explanation, /90%/);
  assert.ok(result.findings.some(item => item.title === 'Chênh lệch giữa phát bắn và target'));
  assert.ok(result.quality.warnings.some(message => message.includes('hợp lệ')));
});

test('hit timing uses only hit trials and weighted frame time can be derived', () => {
  const result = sessionInsights({
    elapsedMs: 1000,
    shots: [],
    trials: [
      { outcome: 'timeout', hitMs: 999 },
      { outcome: 'hit', hitMs: 100 },
      { outcome: 'hit', hitMs: 300 },
    ],
    frames: [
      { dt: 100, onTarget: true },
      { dt: 50, onTarget: false },
      { dt: 120, onTarget: true }, // invalid stall, excluded
    ],
  });

  assert.equal(card(result, 'Trung vị thời gian tới hit').value, 200);
  assert.equal(card(result, 'P90 thời gian tới hit').value, 280);
  assert.equal(card(result, 'Độ phủ hợp lệ'), undefined);
});

test('size rows use sizeBand and radius fallback, with descriptive hit timing', () => {
  const result = sessionInsights({
    elapsedMs: 10000,
    trials: [
      { sizeBand: 'small', targetRadius: .2, outcome: 'hit', hitMs: 250 },
      { sizeBand: 'small', targetRadius: .2, outcome: 'timeout' },
      { targetRadius: .5, outcome: 'hit', hitMs: 500 },
      { targetRadius: .5, outcome: 'hit', hitMs: 700 },
    ],
  });

  assert.deepEqual(result.sizeRows, [
    { label: 'small', trials: 2, hits: 1, rate: .5, medianMs: 250 },
    { label: 'r=0.5', trials: 2, hits: 2, rate: 1, medianMs: 600 },
  ]);
  assert.ok(result.findings.some(item => item.title === 'Nhóm kích thước target'));
});

test('empty and malformed sessions return JSON-safe nulls without invented performance', () => {
  const result = sessionInsights({
    elapsedMs: 0,
    trials: [null, 'bad'],
    shots: [{ hit: undefined }],
    tracking: { validMs: -10, onTargetMs: Number.NaN },
  });

  assert.equal(card(result, 'Độ chính xác phát bắn').value, null);
  assert.equal(card(result, 'Mục tiêu hoàn thành').value, null);
  assert.equal(card(result, 'Trung vị thời gian tới hit').value, null);
  assert.equal(card(result, 'P90 thời gian tới hit').value, null);
  assert.equal(card(result, 'Nhịp hit').value, null);
  assert.equal(card(result, 'Độ phủ hợp lệ'), undefined);
  assert.equal(result.quality.level, 'insufficient');
  assert.doesNotThrow(() => JSON.stringify(result));
});

test('tracking sessions use weighted time and do not expose click cards', () => {
  const result = sessionInsights({
    elapsedMs: 20000,
    config: { task: 'orbit' },
    shots: [],
    trials: [],
    tracking: { validMs: 18000, onTargetMs: 9000, squaredErrorTime: 72000 },
    frames: [
      { t: 100, dt: 100, onTarget: true, sizeBand: 'small' },
      { t: 200, dt: 100, onTarget: false, sizeBand: 'small' },
      { t: 300, dt: 100, onTarget: true, sizeBand: 'large' },
    ],
  });

  assert.deepEqual(result.cards.map(item => item.label), ['Thời gian trên mục tiêu', 'Độ phủ hợp lệ', 'RMS sai số góc']);
  assert.equal(result.cards[0].value, .5);
  assert.equal(result.cards[1].value, .9);
  assert.equal(result.cards[2].value, 2);
  assert.equal(result.quality.tracking, true);
  assert.equal(result.quality.enough, true);
  assert.equal(result.quality.level, 'usable');
  assert.deepEqual(result.trackingSizeRows, [
    { label: 'small', validMs: 200, onTargetMs: 100, rate: .5 },
    { label: 'large', validMs: 100, onTargetMs: 100, rate: 1 },
  ]);
});

test('missing deadline leaves first-shot metric unavailable and frame fallback stays inside elapsed time', () => {
  const result = sessionInsights({
    elapsedMs: 1000,
    trials: [{ outcome: 'hit', firstShotMs: 100, firstShotHit: true, hitMs: 200 }],
    frames: [
      { t: 500, dt: 100, onTarget: true },
      { t: 2000, dt: 100, onTarget: true },
    ],
  });

  assert.equal(card(result, 'Trúng phát đầu đúng hạn').value, null);
  assert.equal(result.quality.validCoverage, .1);
});

test('missing frame errors do not become a zero RMS estimate', () => {
  const missing = sessionInsights({
    elapsedMs: 1000,
    config: { task: 'tracking' },
    tracking: { validMs: 1000, onTargetMs: 500 },
    frames: [{ t: 1000, dt: 100, onTarget: true }],
  });
  assert.equal(missing.cards.find(item => item.label === 'RMS sai số góc').value, null);

  const partial = sessionInsights({
    elapsedMs: 200,
    config: { task: 'tracking' },
    frames: [
      { t: 100, dt: 100, errorDeg: 2, onTarget: true },
      { t: 200, dt: 100, errorDeg: null, onTarget: false },
    ],
  });
  assert.equal(partial.cards.find(item => item.label === 'RMS sai số góc').value, 2);
});
