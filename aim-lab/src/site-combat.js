import {botAction} from './bot-tactics.js';
import {seededUnit} from './enemy-behavior.js';
import {planBotRoute} from './bot-navigation.js';
import {botLevel} from './combat-balance.js';
import {slideSite} from './site-layout.js';
import {terrainHeight} from './maps/shared/traversal.js';
export const WAVE_PAUSE_MS=2800;
export const BOT_SPAWN_GAP_MS=1000;
export function siteBotCount(difficulty){return ({easy:4,normal:6,hard:8,expert:10})[difficulty]??6;}
export function smoothVelocity(current,desired,dt){
 const stopping=Math.hypot(desired.x,desired.z)<.01,rate=stopping?22:14,k=1-Math.exp(-rate*dt);
 return {x:current.x+(desired.x-current.x)*k,z:current.z+(desired.z-current.z)*k};
}
export function jumpStep(site,position,vy,dt,jump){
 let floor=terrainHeight(site,position.x,position.z)+1.6;
 for(const b of site.cover){const top=b.position[1]+b.size[1]/2;if(Math.abs(position.x-b.position[0])<b.size[0]/2+.25&&Math.abs(position.z-b.position[2])<b.size[2]/2+.25&&position.y>=top+1.6-.08)floor=Math.max(floor,top+1.6);}
 if(jump&&position.y<=floor+.02&&vy<=0)vy=5.4;
 vy-=15*dt;let y=position.y+vy*dt;
 if(y<=floor){y=floor;vy=0;}
 return {y,vy};
}
export function evadeBot(site,bot,player,time,dt,seed){
 const p=bot.position,level=botLevel(bot.difficulty),action=botAction(seed,bot.index??0,time,bot.difficulty);
 bot.crouch=(bot.crouch??0)+((action.crouch?1:0)-(bot.crouch??0))*(1-Math.exp(-12*dt));bot.action=action;
 if(!bot.route?.length||!bot.nextDecision||time>=bot.nextDecision){
  bot.turn=(bot.turn??0)+1;
  bot.route=planBotRoute(site,p,player,seed+(bot.index??0)*1009,bot.turn);
  bot.nextDecision=time+4500+seededUnit(seed,bot.turn*17)*2500;
 }
 while(bot.route.length&&Math.hypot(bot.route[0].x-p.x,bot.route[0].z-p.z)<.22)bot.route.shift();
 const goal=bot.route[0];
 bot.direction=goal?{x:goal.x-p.x,z:goal.z-p.z}:{x:0,z:0};
 // Brief stop to fire, followed by immediate relocation; never idle at spawn.
 const speed=time<(bot.pauseUntil??0)?0:level.speed*(action.crouch?.65:1),mag=Math.hypot(bot.direction.x,bot.direction.z)||1;
 bot.velocity=smoothVelocity(bot.velocity??{x:0,z:0},{x:bot.direction.x/mag*speed,z:bot.direction.z/mag*speed},dt);
 const next={...p,x:p.x+bot.velocity.x*dt,z:p.z+bot.velocity.z*dt};
 const legal=slideSite(site,p,next,.32);
 const vertical=jumpStep(site,legal,bot.vy??0,dt,action.jump&&bot.jumpCycle!==action.cycle);if(action.jump)bot.jumpCycle=action.cycle;bot.vy=vertical.vy;legal.y=vertical.y;
 if(speed&&Math.hypot(legal.x-p.x,legal.z-p.z)<speed*dt*.2)bot.nextDecision=0;
 const velocity={x:(legal.x-p.x)/Math.max(.001,dt),y:vertical.vy,z:(legal.z-p.z)/Math.max(.001,dt)};
 bot.position=legal;return {position:{...legal,y:legal.y-bot.crouch*.42},velocity,crouch:bot.crouch,grounded:vertical.vy===0,visible:true};
}
export function recoilShot(index){return {pitch:.003+Math.min(index,15)*.00035,yaw:Math.sin(index*1.7)*(.0008+Math.min(index,15)*.00015)};}
