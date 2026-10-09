import test from 'node:test';
import assert from 'node:assert/strict';
import {TASKS, DIFFICULTIES, CHALLENGES, MINI_GAME_GROUPS, miniGameEntries, taskMotion, targetPosition, taskDeadlineMs, challengeResult} from '../src/training.js';

const added=['figure8','pendulum','zigzag','stopgo','ladder','snap'];
test('every range mini-game is reachable through exactly one picker group',()=>{
 const entries=MINI_GAME_GROUPS.flatMap(group=>miniGameEntries(group.id));
 assert.equal(new Set(entries.map(([id])=>id)).size,entries.length);
 assert.deepEqual(entries.map(([id])=>id).sort(),Object.keys(TASKS).filter(id=>!TASKS[id].site).sort());
 for(const id of added)assert.ok(entries.some(([task])=>task===id));
});
test('new trajectories are repeatable, bounded and distinct across difficulty levels',()=>{
 for(const difficulty of Object.keys(DIFFICULTIES)){
  const signatures=[];
  for(const task of ['figure8','pendulum','zigzag','stopgo']){
   const samples=Array.from({length:101},(_,i)=>{
    const options={task,difficulty,seed:42,index:3,timeMs:i*37,baseYaw:.1,basePitch:.05};
    const point=taskMotion(options);
    assert.deepEqual(point,taskMotion(options));
    assert.ok(Math.abs(point.yaw-.1)<=.43&&Math.abs(point.pitch-.05)<=.17);
    return point;
   });
   assert.ok(new Set(samples.map(p=>p.yaw)).size>10);
   signatures.push(JSON.stringify(samples));
  }
  assert.equal(new Set(signatures).size,4);
 }
});
test('Stop & Go holds still at both ends and moves continuously between them',()=>{
 assert.deepEqual(taskMotion('stopgo',650),taskMotion('stopgo',950));
 assert.deepEqual(taskMotion('stopgo',1650),taskMotion('stopgo',1950));
 assert.notDeepEqual(taskMotion('stopgo',100),taskMotion('stopgo',400));
 for(const boundary of [600,1000,1600,2000])assert.ok(Math.abs(taskMotion('stopgo',boundary-1).yaw-taskMotion('stopgo',boundary+1).yaw)<.002);
});
test('ladder traverses three heights up then down, flash expires sooner on every difficulty',()=>{
 const points=Array.from({length:6},(_,index)=>targetPosition({task:'ladder',map:'dark',seed:5,index}));
 assert.deepEqual(points.map(p=>p.pitch),[-.22,0,.22,.22,0,-.22]);
 assert.equal(new Set(points.map(p=>p.layoutKey)).size,6);
 for(const difficulty of Object.keys(DIFFICULTIES)){
  const target=targetPosition({task:'snap',difficulty});
  assert.equal(target.deadlineMs,taskDeadlineMs('snap',difficulty));
  assert.ok(target.deadlineMs<taskDeadlineMs('precision',difficulty));
 }
 assert.equal(taskDeadlineMs('snap','normal'),1375);
});
test('new challenges require both performance goals and a full run',()=>{
 for(const id of ['eight','rhythm','flash','elevation']){
  const c=CHALLENGES[id];
  const run={config:{task:c.task,challengeId:id,inputMode:'unadjusted-requested-unverified'},status:'completed',elapsedMs:c.duration*1000,
   shots:Array.from({length:c.minHits??20},()=>({hit:true})),trials:[],frames:[],pauses:[],frameIntervals:[16],tracking:{validMs:c.duration*1000,onTargetMs:c.duration*1000,squaredErrorTime:0}};
  assert.equal(challengeResult(run).passed,true,id);
  if(c.minOnTarget)run.tracking.onTargetMs=0;else run.shots.push(...Array.from({length:100},()=>({hit:false})));
  assert.equal(challengeResult(run).passed,false,id);
  run.status='ended-early';assert.equal(challengeResult(run).eligible,false,id);
 }
});
