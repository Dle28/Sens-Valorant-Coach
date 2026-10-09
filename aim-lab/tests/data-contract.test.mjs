import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSession,assessSession,researchEvents} from '../src/data-contract.js';
import {aimOffset} from '../src/aim-geometry.js';
import {chartData} from '../src/charts.js';
const id='12345678-1234-4234-8234-123456789abc';
export function fixture(){return {schemaVersion:'0.4',isSynthetic:false,id,playerId:id,startedAt:'2026-09-09T00:00:00Z',status:'completed',elapsedMs:1000,config:{trackingTask:false,combatTask:false,sensitivity:.3,dpi:800,deadlineMs:100,task:'precision'},clock:{timebase:'session_active_ms',inputCoordinateSpace:'browser_movement_units'},protocol:{consentForTraining:false,blockId:id,phase:'baseline'},provenance:{collectorVersion:'0.4.0',buildId:'test-fixture'},pauses:[],inputEvents:[],controlEvents:[],shots:[],trials:Array.from({length:10},(_,i)=>({trialId:i+1,startedMs:i*100,endedMs:(i+1)*100,outcome:'timeout',firstShotMs:null,firstShotHit:null})),frames:Array.from({length:10},(_,i)=>({seq:i,t:(i+1)*100,dt:100,trialId:i+1,targetId:'target-'+(i+1),cameraPosition:[0,1.6,0],target:[0,1.6,-20],yaw:0,pitch:0,errorDeg:0,onTarget:true}))};}
test('camera translation and crouch preserve zero alignment error',()=>{
 assert.deepEqual(aimOffset([10,.8,-20],0,0,[10,.8,0]),{x:-0,y:0});assert.equal(aimOffset([1,1,1],0,0,[1,1,1]),null);
 const r=fixture();r.frames.forEach(f=>{f.cameraPosition=[10,.8,0];f.target=[10,.8,-20];});const d=chartData(r);assert.equal(d.inside,1000);assert.equal(d.cells[7*25+12],1000);
});
test('all-timeout baseline retains failures without claiming sens or coaching evidence',()=>{
 const r=fixture(),q=assessSession(r);assert.equal(q.structurallyValid,true);assert.equal(q.eligibleForAimEvaluation,true);assert.equal(q.eligibleForSensitivityFit,false);assert.equal(q.eligibleForCoachingEffectFit,false);assert.ok(researchEvents(r).every(e=>e.successBeforeDeadline===false));
});
test('duplicate sequence, reversed time, orphan click and invalid units are rejected',()=>{
 for(const mutate of [r=>r.frames[1].seq=0,r=>r.frames[1].t=50,r=>r.frames[0].trialId=100,r=>r.clock.inputCoordinateSpace='raw_device_counts',r=>r.trials[0].endedMs=-1,r=>r.frames[0].cameraPosition=[null,0,0],r=>r.shots.push({seq:0,t:50,trialId:1,hit:true,hitTargetId:null,controlSeq:22,cameraPosition:[0,1,0],target:[0,1,-20]})]){const r=fixture();mutate(r);assert.equal(validateSession(r).valid,false);assert.equal(assessSession(r).eligibleForAimEvaluation,false);}
});
test('equal timestamps allowed but occlusion, lag and overlapping windows never inflate coverage',()=>{
 const r=fixture();r.frames[1].t=r.frames[0].t;assert.equal(validateSession(r).valid,true);assert.equal(assessSession(r).frameCoverage,.9);r.frames[2].errorDeg=null;r.frames[2].onTarget=null;assert.equal(assessSession(r).eligibleForAimEvaluation,false);r.frames[3].dt=200;assert.ok(assessSession(r).frameCoverage<.8);
});
test('pending checkpoint stays incomplete and combat has separate endpoint',()=>{
 const r=fixture();r.status='in-progress';r.trials.at(-1).outcome='pending';r.trials.at(-1).endedMs=null;assert.equal(validateSession(r).valid,false);assert.equal(validateSession(r,{checkpoint:true}).valid,true);assert.equal(assessSession(r,{checkpoint:true}).eligibleForAimEvaluation,false);
 const combat=fixture();combat.config.combatTask=true;assert.equal(assessSession(combat).eligibleForAimEvaluation,false);assert.equal(researchEvents(combat)[0].successBeforeDeadline,null);
});
test('malformed arrays and rows report errors without crashing',()=>{
 for(const patch of [{frames:null},{frames:[null]},{trials:[null]},{controlEvents:{}},{inputEvents:[null]}])assert.equal(assessSession({...fixture(),...patch}).structurallyValid,false);assert.equal(assessSession(null).structurallyValid,false);
});
test('synthetic and decision sessions cannot become an aim training corpus',()=>{
 const r=fixture();r.isSynthetic=true;assert.equal(assessSession(r).eligibleForAimEvaluation,false);
 r.isSynthetic=false;r.config.task='discrimination';const q=assessSession(r);assert.equal(q.eligibleForAimEvaluation,false);assert.equal(q.eligibleForDecisionEvaluation,true);assert.equal(q.eligibleForTraining,false);
});
test('tracking export retains a session without shot trials and recomputes weighted measurements',()=>{
 const r=fixture();r.config.trackingTask=true;r.config.task='tracking';r.trials=[];r.elapsedMs=10000;
 r.frames=Array.from({length:100},(_,i)=>({seq:i,t:(i+1)*100,dt:100,targetId:'tracking',trialId:null,cameraPosition:[0,1.6,0],target:[0,1.6,-20],yaw:0,pitch:0,errorDeg:2,onTarget:i<25}));
 assert.equal(assessSession(r).eligibleForAimEvaluation,true);const [event]=researchEvents(r);assert.equal(event.unit,'tracking_session');assert.equal(event.timeOnTarget,.25);assert.equal(event.trackingRmsDeg,2);assert.equal(event.eligibleForTraining,false);
});
