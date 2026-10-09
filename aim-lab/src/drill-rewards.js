import {median} from './metrics.js';

export function drillStats(run){
 const trials=run.trials??[],shots=run.shots??[];
 let combo=0,bestCombo=0;
 for(const trial of trials){
  const clean=trial.outcome==='hit'&&trial.firstShotHit===true&&trial.shots===(trial.priorityOrder?.length??1)||trial.decision==='withhold'&&trial.outcome==='no_shot';
  combo=clean?combo+1:0;bestCombo=Math.max(bestCombo,combo);
 }
 const decisions=trials.filter(t=>t.decision);
 const correct=decisions.filter(t=>t.decision==='withhold'?t.outcome==='no_shot':t.outcome==='hit'&&!shots.some(s=>s.trialId===t.trialId&&s.decisionError)).length;
 const mistakes=shots.filter(s=>s.decisionError).length;
 const timeoutRate=trials.length?trials.filter(t=>t.outcome==='timeout').length/trials.length:null;
 const accuracy=shots.length?shots.filter(s=>s.hit).length/shots.length:null;
 const tracking=run.config.trackingTask;
 const score=tracking?(run.tracking?.validMs>0?run.tracking.onTargetMs/run.tracking.validMs:null):decisions.length?correct/decisions.length:accuracy;
 const eligible=run.status==='completed'&&!run.pauses?.length&&(run.quality?.eligibleForAimEvaluation===true||run.quality?.eligibleForDecisionEvaluation===true);
 const completion=tracking?1:trials.length?trials.filter(t=>t.outcome==='hit'||t.outcome==='no_shot').length/trials.length:0;
 const medalScore=score===null?null:Math.min(score,completion);
 const medal=eligible&&medalScore!==null?(medalScore>=.9?'Vàng':medalScore>=.8?'Bạc':medalScore>=.65?'Đồng':null):null;
 const details=[];
 if(run.config.task==='stopgo'){
  for(const phase of ['hold','moving']){const sample=shots.filter(s=>s.motionPhase===phase);details.push({label:phase==='hold'?'Bắn lúc mục tiêu dừng':'Bắn lúc mục tiêu chạy',value:sample.length>=5?`${Math.round(sample.filter(s=>s.hit).length/sample.length*100)}% (${sample.length} phát)`:`Cần 5 phát; hiện ${sample.length}`});}
 }
 if(run.config.task==='ladder'){
  for(const [level,label] of [[-1,'Thấp'],[0,'Giữa'],[1,'Cao']]){const sample=trials.filter(t=>t.elevationLevel===level);details.push({label:`Cao độ ${label}`,value:sample.length>=3?`${sample.filter(t=>t.outcome==='hit').length}/${sample.length} mục tiêu trúng`:`Cần 3 mục tiêu; hiện ${sample.length}`});}
 }
 if(run.config.task==='zigzag'){
  const sample=shots.filter(s=>s.hit&&Number.isFinite(s.sinceReversalMs));
  details.push({label:'Bắn trúng sau lần đổi hướng ngang gần nhất',value:sample.length>=5?`${Math.round(median(sample.map(s=>s.sinceReversalMs)))} ms (trung vị)`:`Cần 5 phát trúng; hiện ${sample.length}`});
 }
 if(decisions.length)details.push({label:'Quyết định đúng',value:`${correct}/${decisions.length} · ${mistakes} phát sai luật`});
 if(eligible&&score!==null)details.push({label:'Bài tiếp theo',value:score<.8?'Lặp lại cùng bài, ưu tiên độ chính xác.':'Lặp lại cùng cấu hình để kiểm độ ổn định trước khi tăng độ khó.'});
 return {version:1,bestCombo,combo,timeoutRate,score,medal,eligible,details,completion};
}

export function rewardText(stats){
 return `Combo sạch tốt nhất: ${stats.bestCombo} · ${stats.medal?`Huy chương ${stats.medal}`:'Chưa đạt huy chương'} · ${stats.timeoutRate===null?'Chưa có mục tiêu':`Hết giờ: ${Math.round(stats.timeoutRate*100)}%`}`;
}
