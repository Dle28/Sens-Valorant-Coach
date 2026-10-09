import test from 'node:test';
import assert from 'node:assert/strict';
import {comparable,progressSummary,sessionScore} from '../src/training.js';
import {copyScenario,scenarioKey} from '../src/training-config.js';
import {parseHistory} from '../src/history-transfer.js';
import {createQueue,advanceQueue,tickQueue,PLAYLISTS} from '../src/playlists.js';
import {decisionTrial,decisionShot,motionPhase,sinceReversal} from '../src/decision-drills.js';
import {drillStats} from '../src/drill-rewards.js';

const config={task:'precision',weapon:'vandal',map:'lotus',difficulty:'normal',durationMs:30000,sensitivity:.3,dpi:800,dpiSource:'manual',inputMode:'unadjusted-requested-unverified',inputGain:1,exerciseVersion:'0.20',challengeId:null,horizontalFovDeg:103,deadlineMs:2500,scenario:null};
const scenario={mapId:'lotus',zoneId:'a',scenarioId:'b',angleId:'c',gameMode:'scenario',behavior:'auto',reaction:'instant',distance:'mixed',head:'fixed',repetitions:25,siteId:'atrium'};
test('comparison rejects missing or changed geometry and all relevant run settings',()=>{
 assert.equal(comparable(config,{...config}),true);
 const incomplete={...config};delete incomplete.scenario;assert.equal(comparable(incomplete,incomplete),false);
 for(const key of Object.keys(scenario))assert.equal(comparable({...config,scenario},{...config,scenario:{...scenario,[key]:key==='repetitions'?40:'different'}}),false,key);
 for(const key of ['weapon','durationMs','difficulty','sensitivity','dpi','exerciseVersion','deadlineMs'])assert.equal(comparable(config,{...config,[key]:'changed'}),false,key);
 assert.equal(scenarioKey({scenario:{distance:'mixed'}}),null);
 assert.deepEqual(copyScenario({...scenario,injected:{bad:true}}),scenario);
});
test('history roundtrip retains weapon and scenario but keeps imported records out of records',()=>{
 const record={id:'12345678-1234-1234-1234-123456789012',startedAt:'2026-09-09T00:00:00Z',status:'completed',config:{...config,scenario},summary:{shots:10,hits:9,accuracy:.9},qualityClean:true};
 const imported=parseHistory(JSON.stringify({format:'gamesen-history',version:1,sessions:[record]}))[0];
 assert.deepEqual(imported.config.scenario,scenario);assert.equal(imported.config.weapon,'vandal');assert.equal(imported.config.deadlineMs,2500);
 assert.equal(imported.qualityClean,false);
 assert.equal(progressSummary([imported],{config:record.config}).count,0);
 assert.equal(sessionScore({config,summary:{accuracy:null}}),null);
});
test('playlists advance exactly once per item, hold rest and finish with a report',()=>{
 for(const id of Object.keys(PLAYLISTS)){
  let queue=createQueue(id);
  for(let i=0;i<PLAYLISTS[id].steps.length;i++){
   queue=advanceQueue(queue,{task:PLAYLISTS[id].steps[i].task,status:i===1?'skipped':'completed',score:.8});
   if(queue.phase!=='done'){assert.equal(queue.phase,'rest');queue=tickQueue(queue,5);assert.ok(queue.remaining>0);queue=tickQueue(queue,999);assert.equal(queue.phase,'ready');}
  }
  assert.equal(queue.phase,'done');assert.equal(queue.results.length,PLAYLISTS[id].steps.length);assert.deepEqual(advanceQueue(queue,{}),queue);
 }
});
test('decision trials balance hold signals and enforce all priority steps',()=>{
 const trials=Array.from({length:12},(_,i)=>decisionTrial('discrimination',42,i));assert.equal(trials.filter(t=>t.decision==='withhold').length,4);
 assert.equal(decisionShot({decision:'withhold'},-1,false).decisionError,'NO_SHOOT');
 for(let seed=0;seed<5;seed++){
  const trial=decisionTrial('priority',seed,2);assert.equal(new Set(trial.priorityOrder).size,3);
  for(let i=0;i<3;i++){trial.priorityIndex=i;assert.equal(decisionShot(trial,trial.priorityOrder[i],true).hit,true);assert.equal(decisionShot(trial,(trial.priorityOrder[i]+1)%3,true).hit,false);assert.equal(decisionShot(trial,trial.priorityOrder[i],false).hit,false);}
 }
 assert.equal(motionPhase('stopgo',700),'hold');assert.equal(motionPhase('stopgo',100),'moving');assert.equal(sinceReversal(0),null);
});
test('rewards reset combo on mistakes, exclude interrupted runs and gate small samples',()=>{
 const run={config:{task:'stopgo'},status:'completed',quality:{eligibleForAimEvaluation:true},pauses:[],trials:[{outcome:'hit',firstShotHit:true,shots:1},{outcome:'hit',firstShotHit:true,shots:1},{outcome:'timeout'},{decision:'withhold',outcome:'no_shot'}],shots:[{hit:true,motionPhase:'hold'}]};
 let stats=drillStats(run);assert.equal(stats.bestCombo,2);assert.equal(stats.timeoutRate,.25);assert.ok(stats.details.some(d=>d.value.includes('Cần 5 phát')));
 run.status='ended-early';stats=drillStats(run);assert.equal(stats.medal,null);assert.equal(stats.eligible,false);
});
