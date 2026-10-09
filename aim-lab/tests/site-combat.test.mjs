import test from 'node:test';
import assert from 'node:assert/strict';
import {evadeBot,jumpStep,recoilShot,smoothVelocity,WAVE_PAUSE_MS,BOT_SPAWN_GAP_MS} from '../src/site-combat.js';
import {SITES} from '../src/site-layout.js';
test('movement eases into speed and brakes without overshoot',()=>{
 let v={x:0,z:0};const target={x:4.65,z:0};v=smoothVelocity(v,target,1/60);assert.ok(v.x>0&&v.x<4.65);
 for(let i=0;i<60;i++)v=smoothVelocity(v,target,1/60);assert.ok(v.x>4.64&&v.x<=4.65);
 for(let i=0;i<20;i++)v=smoothVelocity(v,{x:0,z:0},1/60);assert.ok(v.x<.01&&v.x>=0);
});
test('bots evade at bounded speed without crossing cover',()=>{
 const bot={position:{x:0,y:1.6,z:-19},index:0},site=SITES.atrium;
 const original={...bot.position};
 for(let t=0;t<20000;t+=16){const m=evadeBot(site,bot,{x:0,y:1.6,z:0},t,.016,42);assert.ok(Math.hypot(m.velocity.x,m.velocity.z)<=1.651);for(const b of site.cover)assert.ok(Math.abs(m.position.x-b.position[0])>=b.size[0]/2+.31||Math.abs(m.position.z-b.position[2])>=b.size[2]/2+.31);}
 assert.notDeepEqual(bot.position,original);assert.ok(bot.turn>=3);
});
test('jump rises and lands, and can land on low cover',()=>{
 let p={x:0,y:1.6,z:0},vy=0,peak=0;
 for(let i=0;i<120;i++){const n=jumpStep({cover:[]},p,vy,1/60,i===0);p.y=n.y;vy=n.vy;peak=Math.max(peak,p.y);}
 assert.ok(peak>2.4&&peak<2.7);assert.equal(p.y,1.6);assert.equal(vy,0);
 const land=jumpStep({cover:[{position:[0,.35,0],size:[2,.7,2]}]},{x:0,y:2.31,z:0},-2,.05,false);assert.ok(Math.abs(land.y-2.3)<1e-8);
});
test('spray climbs progressively and waves have breathing room',()=>{
 assert.ok(recoilShot(12).pitch>recoilShot(0).pitch);assert.notEqual(recoilShot(5).yaw,recoilShot(6).yaw);
 assert.ok(WAVE_PAUSE_MS>=2500);assert.ok(BOT_SPAWN_GAP_MS>=900);
});
