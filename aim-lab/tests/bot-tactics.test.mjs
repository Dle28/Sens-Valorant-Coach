import test from 'node:test';import assert from 'node:assert/strict';
import {botAction,turnToward} from '../src/bot-tactics.js';
import {evadeBot} from '../src/site-combat.js';
import {SITES} from '../src/site-layout.js';
test('bot repertoire includes crouch, jump and trigger release without permanent idle',()=>{
 let crouch=false,jump=false,release=false;
 for(let t=0;t<90000;t+=50){const a=botAction(42,0,t);crouch||=a.crouch;jump||=a.jump;release||=!a.burst;}
 assert.ok(crouch&&jump&&release);
});
test('preaim turn is frame independent and crosses angle seam by shortest path',()=>{
 let a=3.1,b=3.1;for(let i=0;i<60;i++)a=turnToward(a,-3.1,1/60);for(let i=0;i<120;i++)b=turnToward(b,-3.1,1/120);
 assert.ok(Math.abs(a-b)<1e-8);assert.ok(a>3.1&&a<3.19);
});
test('bot crouching lowers hittable head while navigation stays at foot height',()=>{
 const bot={position:{x:0,y:1.6,z:-19},index:0};let lowered=false,airborne=false;
 for(let t=0;t<60000;t+=16){const m=evadeBot(SITES.atrium,bot,{x:0,y:1.6,z:0},t,.016,42);lowered||=m.position.y<bot.position.y-.2;airborne||=bot.position.y>2;assert.ok(bot.position.y>=1.6);}
 assert.ok(lowered&&airborne);
});
