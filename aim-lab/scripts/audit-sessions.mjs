import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assessSession,researchEvents} from '../src/data-contract.js';
const args=process.argv.slice(2);
if(!args[0]){console.error('Usage: npm run data:audit -- <sessions/raw directory> [new output directory]');process.exit(2);}
const root=path.resolve(args[0]),output=args[1]?path.resolve(args[1]):null;
const report={version:'aim-audit-2',source:root,sessions:[],counts:{files:0,valid:0,aimEligible:0,predictiveDatasetEligible:0,kinematicModelEligible:0,sensitivityEligible:0,coachingEffectEligible:0}};
const events=[], predictiveEvents=[];
const identities=new Set(),hashes=new Set();
for(const file of (await readdir(root)).filter(f=>f.endsWith('.json')&&!f.endsWith('.manifest.json')).sort()){
 report.counts.files++;
 try{
  const text=await readFile(path.join(root,file),'utf8'),run=JSON.parse(text),quality=assessSession(run);
  const hash=createHash('sha256').update(text).digest('hex');
  let hashVerified=false;
  try{const manifest=JSON.parse(await readFile(path.join(root,file+'.manifest.json'),'utf8'));hashVerified=manifest.sha256===hash;}catch{}
  const duplicate=identities.has(run.id)||hashes.has(hash);identities.add(run.id);hashes.add(hash);
  const eligible=quality.eligibleForAimEvaluation&&hashVerified&&!duplicate;
  report.sessions.push({file,sessionId:run.id,playerId:run.playerId,sha256:hash,hashVerified,duplicate,quality,eligibleForExport:eligible});
  if(quality.structurallyValid)report.counts.valid++;
  if(eligible){
   report.counts.aimEligible++;
   const rows=researchEvents(run).map(e=>({...e,sourceSha256:hash}));
   events.push(...rows);
   if(quality.eligibleForPredictiveDataset){report.counts.predictiveDatasetEligible++;predictiveEvents.push(...rows);}
   if(quality.eligibleForKinematicModel)report.counts.kinematicModelEligible++;
  }
 }catch(error){report.sessions.push({file,error:error.message});}
}
if(output){await mkdir(output,{recursive:false});await writeFile(path.join(output,'audit.json'),JSON.stringify(report,null,2));await writeFile(path.join(output,'aim-events.jsonl'),events.map(e=>JSON.stringify(e)).join('\n'));await writeFile(path.join(output,'predictive-model-events.jsonl'),predictiveEvents.map(e=>JSON.stringify(e)).join('\n'));}
console.log(JSON.stringify(output?{...report.counts,output}:report,null,2));
if(report.sessions.some(s=>s.error||!s.quality?.structurallyValid||!s.hashVerified||s.duplicate))process.exitCode=1;
