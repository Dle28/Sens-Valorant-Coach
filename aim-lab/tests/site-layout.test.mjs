import test from 'node:test';
import assert from 'node:assert/strict';
import {SITES,siteSpawn,slideSite,clearSiteLine,readMovementPose} from '../src/site-layout.js';
import {TASKS} from '../src/training.js';
test('FPS site modes are combat tasks',()=>{for(const id of ['site','readmove'])assert.ok(TASKS[id].site&&TASKS[id].combat);});
test('movement reading alternates travel and a short fake stop',()=>{
 const options={archetype:'strafe',seed:42,anchor:{x:0,y:2,z:-10},randomSpawn:false};
 assert.deepEqual(readMovementPose(options,700).position,readMovementPose(options,850).position);
 assert.deepEqual(readMovementPose(options,750).velocity,{x:0,y:0,z:0});
 assert.notDeepEqual(readMovementPose(options,950).position,readMovementPose(options,850).position);
});
test('site waves have repeatable separate spawns outside cover',()=>{
 for(const site of Object.values(SITES))for(let wave=0;wave<30;wave++){
  const points=[0,1,2].map(i=>siteSpawn(site,42,wave,i,{x:0,z:0}));assert.equal(new Set(points.map(p=>JSON.stringify(p))).size,3);
  for(const [i,p] of points.entries()){
   assert.deepEqual(p,siteSpawn(site,42,wave,i,{x:0,z:0}));
   assert.ok(site.cover.every(b=>p.y-1.6>=b.position[1]+b.size[1]/2-.01||Math.abs(p.x-b.position[0])>b.size[0]/2+.38||Math.abs(p.z-b.position[2])>b.size[2]/2+.38));
  }
 }
});
test('cover blocks bullets and swept movement while allowing sliding',()=>{
 const site={cover:[{position:[0,1.5,0],size:[2,3,2]}]};
 assert.equal(clearSiteLine(site,{x:-3,y:1.6,z:0},{x:3,y:1.6,z:0}),false);
 assert.equal(clearSiteLine(site,{x:-3,y:4,z:0},{x:3,y:4,z:0}),true);
 const stopped=slideSite(site,{x:-3,y:1.6,z:0},{x:3,y:1.6,z:0});assert.ok(stopped.x< -1.3);
 const slid=slideSite(site,{x:-1.4,y:1.6,z:0},{x:0,y:1.6,z:3});assert.ok(slid.z>2.9);
});

