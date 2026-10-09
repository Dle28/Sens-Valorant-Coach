export const OBJECTIVE_TIMING={plant:4000,defuse:7000,fuse:45000};
export function createObjective(mode){return {mode,phase:mode==='retake'?'planted':'carried',remaining:mode==='retake'?45000:90000,progress:0,checkpoint:0,position:{x:0,y:0,z:-4},result:null,interacting:false};}
export function stepObjective(o,{dt,position,zone,held,slot,moving,grounded=true}){
 if(o.result)return o;
 o.remaining-=dt;o.interacting=false;
 if(o.remaining<=0){o.result=o.phase==='planted'?(o.mode==='attack'?'detonated-win':'detonated-loss'):'time-loss';return o;}
 const planting=o.phase==='carried',near=planting?Math.abs(position.x-zone.x)<=zone.width/2&&Math.abs(position.z-zone.z)<=zone.depth/2:Math.hypot(position.x-o.position.x,position.z-o.position.z)<2;
 const can=held&&!moving&&grounded&&near&&(planting?slot===4:o.mode==='retake');
 if(!can){o.progress=planting?0:o.checkpoint;return o;}
 o.interacting=true;o.progress+=dt;
 if(planting&&o.progress>=4000){o.phase='planted';o.position={x:position.x,y:zone.height??0,z:position.z};o.remaining=45000;o.progress=0;o.interacting=false;}
 else if(!planting){if(o.progress>=3500)o.checkpoint=3500;if(o.progress>=7000)o.result='defused-win';}
 return o;
}
export function movementSpeed({crouch=false,walk=false,slot=1,interacting=false}={}){return interacting?0:crouch?1.65:walk?2.4:slot===3?5.4:4.65;}
