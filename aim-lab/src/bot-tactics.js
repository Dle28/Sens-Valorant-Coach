import {seededUnit} from './enemy-behavior.js';
export function botAction(seed,index,time,difficulty='normal'){
 const cycle=Math.floor(time/4800),phase=time%4800;
 const choice=seededUnit(seed,index*719+cycle*41);
 const crouch=choice<.55&&phase>1800&&phase<3000;
 const jump=choice>=.55&&phase>900&&phase<1050;
 return {crouch,jump,cycle,burst:Math.floor(time/(difficulty==='easy'?1800:1400))%3!==2};
}
export function turnToward(current,target,dt){const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+delta*(1-Math.exp(-8*dt));}
