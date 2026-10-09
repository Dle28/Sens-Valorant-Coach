export function decisionTrial(task,seed,index){
 if(task==='discrimination')return {decision:(index+(seed>>>0)%3)%3===0?'withhold':'shoot'};
 if(task==='priority')return {decision:'priority',priorityOrder:[0,1,2].map(i=>(i+(seed+index)%3)%3),priorityIndex:0};
 return {};
}
export function decisionShot(trial,slot,geometricHit){
 if(trial.decision==='withhold')return {hit:false,decisionError:'NO_SHOOT'};
 if(trial.decision==='priority')return {hit:geometricHit&&slot===trial.priorityOrder[trial.priorityIndex],decisionError:geometricHit&&slot!==trial.priorityOrder[trial.priorityIndex]?'WRONG_ORDER':null};
 return {hit:geometricHit,decisionError:null};
}
export function motionPhase(task,timeMs,speed=1){
 if(task==='stopgo'){const phase=(timeMs/1000*speed%2)/2;return phase>=.3&&phase<.5||phase>=.8?'hold':'moving';}
 return null;
}
export function sinceReversal(timeMs,speed=1){const period=Math.PI/(3.4*speed)*1000,first=period/2;return timeMs<first?null:(timeMs-first)%period;}
