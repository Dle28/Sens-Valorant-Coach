import test from 'node:test';import assert from 'node:assert/strict';
import {createObjective,stepObjective,movementSpeed} from '../src/objective-round.js';
const input={dt:100,position:{x:0,y:1.6,z:-4},zone:{x:0,z:-5,width:7,depth:6},held:true,slot:4,moving:false};
test('plant requires site, equipped device, stillness and uninterrupted hold',()=>{
 const o=createObjective('attack');
 stepObjective(o,{...input,dt:3000});assert.equal(o.progress,3000);
 stepObjective(o,{...input,moving:true});assert.equal(o.progress,0);
 stepObjective(o,{...input,dt:4000,slot:1});assert.equal(o.phase,'carried');
 stepObjective(o,{...input,dt:4000,position:{x:20,z:0}});assert.equal(o.phase,'carried');
 stepObjective(o,{...input,dt:4000});assert.equal(o.phase,'planted');assert.equal(o.remaining,45000);
 stepObjective(o,{...input,dt:45000});assert.equal(o.result,'detonated-win');
});
test('retake retains half defuse and cannot win by merely waiting',()=>{
 const o=createObjective('retake');stepObjective(o,{...input,dt:3600});assert.equal(o.checkpoint,3500);
 stepObjective(o,{...input,held:false});assert.equal(o.progress,3500);
 stepObjective(o,{...input,dt:3500});assert.equal(o.result,'defused-win');
 const lost=createObjective('retake');stepObjective(lost,{...input,dt:45000});assert.equal(lost.result,'detonated-loss');
});
test('walk and crouch slow movement; interacting immobilizes',()=>{
 assert.ok(movementSpeed({walk:true})<movementSpeed());assert.ok(movementSpeed({crouch:true})<movementSpeed({walk:true}));assert.equal(movementSpeed({interacting:true}),0);
});
