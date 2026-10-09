import { assessmentConfigMatches } from './assessment-protocol.js';
import { telemetryForTrial } from './telemetry-features.js';

export const DATA_VERSION = '0.4';
export const EXTRACTOR_VERSION = 'aim-quality-1';
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const number = v => typeof v === 'number' && Number.isFinite(v);
const vector = v => Array.isArray(v) && v.length === 3 && v.every(number);

// Same semantic validator in the renderer, native save and offline audit.
// Raw observations are retained even when quality gates fail.
export function validateSession(run, {checkpoint=false} = {}) {
 const errors=[], warnings=[];
 const error=(code,path)=>errors.push({code,path});
 if (!run || typeof run !== 'object') return {valid:false,errors:[{code:'OBJECT_REQUIRED',path:'$'}],warnings};
 if(run.schemaVersion!==DATA_VERSION)error('UNSUPPORTED_SCHEMA','schemaVersion');
 for(const k of ['id','playerId'])if(!uuid.test(run[k]??''))error('INVALID_ID',k);
 if(!['completed','ended-early',...(checkpoint?['in-progress']:[])].includes(run.status))error('INVALID_STATUS','status');
 if(!number(run.elapsedMs)||run.elapsedMs<0)error('INVALID_DURATION','elapsedMs');
 if(!Number.isFinite(Date.parse(run.startedAt)))error('INVALID_DATE','startedAt');
 if(!run.config||!number(run.config.sensitivity)||run.config.sensitivity<=0||!number(run.config.dpi)||run.config.dpi<=0)error('INVALID_SETTINGS','config');
 if(run.clock?.timebase!=='session_active_ms'||run.clock?.inputCoordinateSpace!=='browser_movement_units')error('INVALID_CLOCK','clock');
 if(!run.protocol?.blockId||!['practice','baseline','intervention','retest'].includes(run.protocol?.phase))error('INVALID_PROTOCOL','protocol');
 if(run.protocol?.assessment!=null){
  const assessment=run.protocol.assessment;
  if(!assessment||typeof assessment!=='object'||typeof assessment.protocolId!=='string'||typeof assessment.protocolVersion!=='string'||typeof assessment.blockId!=='string'||!Number.isInteger(assessment.blockIndex)||!Number.isInteger(assessment.blockCount)||assessment.blockIndex<0||assessment.blockCount<1)error('INVALID_ASSESSMENT_ASSIGNMENT','protocol.assessment');
  else if(!assessmentConfigMatches(run,assessment))error('ASSESSMENT_CONFIG_MISMATCH','protocol.assessment');
 }
 if(!run.provenance?.collectorVersion||!run.provenance?.buildId)error('MISSING_PROVENANCE','provenance');
 if(typeof run.isSynthetic!=='boolean')error('MISSING_SYNTHETIC_FLAG','isSynthetic');
 if(typeof run.config?.trackingTask!=='boolean'||typeof run.config?.combatTask!=='boolean')error('MISSING_TASK_SEMANTICS','config');
 if(typeof run.protocol?.consentForTraining!=='boolean')error('MISSING_TRAINING_PERMISSION','protocol.consentForTraining');
 const trials=new Map();
 for(const [i,t] of (Array.isArray(run.trials)?run.trials:[]).entries()){
  const p=`trials[${i}]`;
  if(!t||typeof t!=='object'){error('INVALID_TRIAL',p);continue;}
  if(!Number.isInteger(t.trialId)||trials.has(t.trialId))error('DUPLICATE_OR_INVALID_TRIAL',p);
  trials.set(t.trialId,t);
  if(!number(t.startedMs)||t.startedMs<0||t.startedMs>run.elapsedMs)error('INVALID_TRIAL_START',p);
  if(!['hit','miss','no_shot','timeout','interrupted',...(checkpoint?['pending']:[])].includes(t.outcome))error('INVALID_OUTCOME',p);
  if(!checkpoint&&(!number(t.endedMs)||t.endedMs<t.startedMs||t.endedMs>run.elapsedMs))error('INVALID_TRIAL_END',p);
  for(const k of ['firstShotMs','firstEntryMs','firstHitMs','hitMs'])if(t[k]!=null&&(!number(t[k])||t[k]<0||t.startedMs+t[k]>(t.endedMs??run.elapsedMs)+.001))error('INVALID_TRIAL_TIMING',p+'.'+k);
 }
 for(const name of ['frames','inputEvents','controlEvents','shots','trials'])if(!Array.isArray(run[name]))error('MISSING_STREAM',name);
 for(const name of ['frames','inputEvents','controlEvents','shots']){
  let previous=-Infinity;
  for(const [i,r] of (Array.isArray(run[name])?run[name]:[]).entries()){
   const p=`${name}[${i}]`;
   if(!r||typeof r!=='object'){error('INVALID_RECORD',p);continue;}
   if(r.seq!==i)error('INVALID_SEQUENCE',p);
   if(!number(r.t)||r.t<0||r.t<previous||r.t>run.elapsedMs)error('INVALID_TIME',p);
   previous=r.t;
   if(r.trialId!=null&&!trials.has(r.trialId))error('ORPHAN_TRIAL',p);
   if(name==='frames'){
    if(!vector(r.cameraPosition)||!vector(r.target)||![r.yaw,r.pitch,r.dt].every(number)||r.dt<=0)error('INVALID_GEOMETRY',p);
    if(r.targetId==null && r.errorDeg!==null)error('UNIDENTIFIED_TARGET_METRIC',p);
    if(r.errorDeg!==null&&(!number(r.errorDeg)||r.errorDeg<0))error('INVALID_ERROR',p);
    if(r.onTarget!==null&&typeof r.onTarget!=='boolean')error('INVALID_ALIGNMENT',p);
   }
   if(name==='inputEvents'&&(![r.dx,r.dy,r.yaw,r.pitch,r.receivedAtMs].every(number)||!(r.sourceTimestampMs===null||number(r.sourceTimestampMs))))error('INVALID_INPUT',p);
   if(name==='shots'){
    if(typeof r.hit!=='boolean'||!vector(r.cameraPosition)||!vector(r.target))error('INVALID_SHOT',p);
    if(r.hit&&r.hitTargetId==null)error('MISSING_HIT_TARGET',p);
    if(r.controlSeq!==null&&!(Array.isArray(run.controlEvents)&&run.controlEvents.some(c=>c?.seq===r.controlSeq&&c.type==='pointerdown'&&c.t<=r.t)))error('ORPHAN_CLICK',p);
    const trial=trials.get(r.trialId);
    if(!trial||r.t<trial.startedMs||r.t>(trial.endedMs??run.elapsedMs)+.001)error('SHOT_OUTSIDE_TRIAL',p);
   }
  }
 }
 if(run.config?.rawVerified!==true)warnings.push('RAW_INPUT_UNVERIFIED');
 if(run.identityPersistent!==true)warnings.push('IDENTITY_NOT_PERSISTENT');
 if(run.provenance?.buildId==='development-unpinned')warnings.push('UNPINNED_BUILD');
 if(run.protocol?.phase==='practice')warnings.push('OBSERVATIONAL_PRACTICE');
 return {valid:errors.length===0,errors,warnings};
}

export function assessSession(run, options={}) {
 const result=validateSession(run,options);
 run=run&&typeof run==='object'?run:{};
 const duration=number(run.elapsedMs)?run.elapsedMs:0;
 let lastEnd=0, validMs=0;
 for(const f of Array.isArray(run.frames)?run.frames:[]){
  if(!f||typeof f!=='object')continue;
  if(!number(f.t)||!number(f.dt)||f.dt<=0||f.dt>100||!number(f.errorDeg)||typeof f.onTarget!=='boolean'||f.targetId==null)continue;
  const end=Math.min(duration,f.t), start=Math.max(0,lastEnd,f.t-f.dt);
  validMs+=Math.max(0,end-start);lastEnd=Math.max(lastEnd,end);
 }
 const coverage=duration>0?validMs/duration:0;
 const reasons=[...new Set([...result.errors.map(e=>e.code),...result.warnings])];
 if(coverage<.9)reasons.push('LOW_FRAME_COVERAGE');
 if(run.status!=='completed')reasons.push('INCOMPLETE_SESSION');
 if(run.pauses?.length)reasons.push('PAUSED_SESSION');
 const enough=run.config?.trackingTask?validMs>=10000:(run.trials?.length??0)>=10;
 if(!enough)reasons.push('LOW_SAMPLE_COUNT');
 if(run.config?.combatTask)reasons.push('COMBAT_REQUIRES_SEPARATE_ENDPOINT');
 const decisionTask=['priority','discrimination'].includes(run.config?.task);
 if(decisionTask)reasons.push('DECISION_REQUIRES_SEPARATE_ENDPOINT');
 if(run.isSynthetic)reasons.push('SYNTHETIC_SESSION');
 const measurementEligible=result.valid&&coverage>=.9&&enough&&run.status==='completed'&&!run.pauses?.length&&!run.config?.combatTask&&!run.isSynthetic;
 const eligible=measurementEligible&&!decisionTask;
 const standardizedAssessment=run.protocol?.assessment!=null&&assessmentConfigMatches(run);
 const consented=run.protocol?.consentForTraining===true;
 const predictiveDatasetEligible=eligible&&standardizedAssessment&&consented&&run.identityPersistent===true;
 if(!standardizedAssessment)reasons.push('NOT_STANDARDIZED_ASSESSMENT');
 if(!consented)reasons.push('NO_TRAINING_CONSENT');
 if(!run.identityPersistent)reasons.push('IDENTITY_NOT_PERSISTENT');
 return {version:EXTRACTOR_VERSION,structurallyValid:result.valid,errors:result.errors,reasonCodes:reasons,validFrameMs:validMs,frameCoverage:coverage,eligibleForAimEvaluation:eligible,
  eligibleForDecisionEvaluation:measurementEligible&&decisionTask,eligibleForTraining:false,eligibleForSensitivityFit:false,eligibleForCoachingEffectFit:false,
  eligibleForPredictiveDataset:predictiveDatasetEligible,eligibleForKinematicModel:predictiveDatasetEligible&&run.config?.rawVerified===true,
  limitations:['No verified randomized sensitivity protocol','No controlled longitudinal coaching outcome']};
}

export function researchEvents(run) {
 const quality=assessSession(run);
 if(run.config.trackingTask){
  let covered=0,squared=0,on=0,last=0;
  for(const f of run.frames){if(!number(f.errorDeg)||typeof f.onTarget!=='boolean'||f.dt<=0||f.dt>100)continue;const end=Math.min(run.elapsedMs,f.t),dt=Math.max(0,end-Math.max(last,0,f.t-f.dt));last=Math.max(last,end);covered+=dt;squared+=f.errorDeg*f.errorDeg*dt;if(f.onTarget)on+=dt;}
  return [{schemaVersion:'aim-tracking-1',eventId:run.id+':tracking',playerId:run.playerId,sessionId:run.id,blockId:run.protocol.blockId,sourceKind:'controlled_harness',isSynthetic:run.isSynthetic,scenario:run.config.task,phase:run.protocol.phase,assessment:run.protocol.assessment??null,unit:'tracking_session',startedMs:0,endedMs:run.elapsedMs,validMs:covered,timeOnTarget:covered?on/covered:null,trackingRmsDeg:covered?Math.sqrt(squared/covered):null,collectorVersion:run.provenance.collectorVersion,extractorVersion:EXTRACTOR_VERSION,eligibleForAimEvaluation:quality.eligibleForAimEvaluation,eligibleForTraining:false,eligibleForPredictiveDataset:quality.eligibleForPredictiveDataset,eligibleForKinematicModel:quality.eligibleForKinematicModel,eligibleForSensitivityFit:false,eligibleForCoachingEffectFit:false,reasonCodes:quality.reasonCodes}];
 }
 return (run.trials??[]).map(t=>({schemaVersion:'aim-trial-1',eventId:`${run.id}:${t.trialId}`,playerId:run.playerId,sessionId:run.id,blockId:run.protocol.blockId,
  sourceKind:'controlled_harness',collectorVersion:run.provenance.collectorVersion,extractorVersion:EXTRACTOR_VERSION,scenario:run.config.task,phase:run.protocol.phase,
  unit:run.config.combatTask?'encounter':['priority','discrimination'].includes(run.config.task)?'decision_trial':'single_target_trial',startedMs:t.startedMs,endedMs:t.endedMs,outcome:t.outcome,
  sensitivity:run.config.sensitivity,dpi:run.config.dpi,difficulty:run.config.difficulty,deadlineMs:run.config.deadlineMs,initialErrorDeg:t.initialErrorDeg??null,targetRadius:t.targetRadius??null,distance:t.distance??null,
  firstVisibleMs:t.firstVisibleMs??null,motorOnsetMs:null,motorOnsetMissingReason:'NOT_VALIDATED',firstEntryMs:t.firstEntryMs??null,visibilitySemantics:'engine_frustum_sample_not_display_presentation',isSynthetic:run.isSynthetic,
  firstShotMs:t.firstShotMs,firstShotHit:t.firstShotHit,firstHitMs:t.firstHitMs??null,encounterClearMs:run.config.combatTask?t.clearMs??null:null,
  successBeforeDeadline:run.config.combatTask?null:t.firstShotHit===true&&number(t.firstShotMs)&&t.firstShotMs<run.config.deadlineMs,
  assessment:run.protocol.assessment??null,telemetry:telemetryForTrial(run,t.trialId),eligibleForAimEvaluation:quality.eligibleForAimEvaluation,eligibleForTraining:false,eligibleForPredictiveDataset:quality.eligibleForPredictiveDataset,eligibleForKinematicModel:quality.eligibleForKinematicModel,eligibleForSensitivityFit:false,eligibleForCoachingEffectFit:false,reasonCodes:quality.reasonCodes}));
}
