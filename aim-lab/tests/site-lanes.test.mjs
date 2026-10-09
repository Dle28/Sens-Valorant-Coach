import test from 'node:test';import assert from 'node:assert/strict';
import {SITES} from '../src/site-layout.js';
import {navigationGrid,navigationEdge} from '../src/bot-navigation.js';
import {jumpStep} from '../src/site-combat.js';
test('new wall bands retain routes from all three entries to the objective',()=>{
 for(const [name,site] of Object.entries(SITES)){
  const nodes=navigationGrid(site),start=site.starts?.attack??{x:0,z:0},nearest=[...nodes.values()].reduce((a,b)=>Math.hypot(b.x-start.x,b.z-start.z)<Math.hypot(a.x-start.x,a.z-start.z)?b:a),seen=new Set(),queue=[nearest];assert.ok(queue[0]);
  for(let i=0;i<queue.length;i++){
   const p=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const key=`${p.x+dx},${p.z+dz}`,n=nodes.get(key);if(n&&!seen.has(key)&&navigationEdge(site,p,n)){seen.add(key);queue.push(n);}
   }
  }
  for(const gate of site.entrances)assert.ok(queue.some(n=>Math.hypot(n.x-gate.x,n.z-gate.z)<1),`${name}: ${gate.name} sealed`);
  const plant=site.plantZone;
  assert.ok(queue.some(n=>Math.hypot(n.x-plant.x,n.z-plant.z)<1&&navigationEdge(site,n,plant)),`${name}: plant zone inaccessible`);
 }
});
test('rear raised cover supports landing instead of falling through',()=>{
 for(const site of Object.values(SITES))for(const b of site.cover.filter(b=>b.detail==='terrain-step')){
  const p={x:b.position[0],z:b.position[2],y:b.size[1]+1.62};
  const landed=jumpStep(site,p,-2,.05,false);assert.ok(Math.abs(landed.y-b.size[1]-1.6)<.001);
 }
});
