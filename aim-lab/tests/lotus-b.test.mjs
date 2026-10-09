import test from 'node:test';
import assert from 'node:assert/strict';
import {SITES,getSite,clearSiteLine,slideSite,siteSpawn} from '../src/site-layout.js';
import {terrainHeight} from '../src/maps/shared/traversal.js';
import {navigationGrid,navigationEdge} from '../src/bot-navigation.js';
import {jumpStep} from '../src/site-combat.js';
import {createObjective,stepObjective} from '../src/objective-round.js';
const site=getSite('garden');
test('Lotus B has connected Main, both Links, Upper and objective at runtime scale',()=>{
 const grid=navigationGrid(site),start=[...grid.values()].reduce((a,b)=>Math.hypot(b.x-site.starts.attack.x,b.z-site.starts.attack.z)<Math.hypot(a.x-site.starts.attack.x,a.z-site.starts.attack.z)?b:a),queue=[start],seen=new Set([`${start.x},${start.z}`]);
 for(let i=0;i<queue.length;i++)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const key=`${queue[i].x+dx},${queue[i].z+dz}`;if(grid.has(key)&&!seen.has(key)&&navigationEdge(site,queue[i],grid.get(key))){seen.add(key);queue.push(grid.get(key));}}
 for(const [x,z] of site.spawns){assert.ok(queue.some(n=>Math.hypot(n.x-x,n.z-z)<1.5),`Disconnected spawn ${x},${z}`);}
 for(const room of site.rooms)assert.ok(queue.some(n=>Math.hypot(n.x-room.x,n.z-room.z)<1.5),`Disconnected room ${room.name}`);
 assert.ok(queue.some(n=>Math.hypot(n.x-site.objectivePosition.x,n.z-site.objectivePosition.z)<1));
 assert.ok(queue.some(n=>Math.abs(n.x)<1&&Math.abs(n.z+18*site.worldScale)<1&&Math.abs(n.y-2.95)<.01),'bot can reach the upper plinth via ramp and bridge');
 assert.ok(queue.some(n=>Math.abs(n.y-.34)<.01),'bot can reach the deep pit');
 for(let i=0;i<10;i++){const p=siteSpawn(site,42,1,i,{x:0,z:0});assert.ok(seen.has(`${p.x},${p.z}`));assert.equal(p.y,terrainHeight(site,p.x,p.z)+1.6);}
 assert.equal(SITES.garden.authoredTraversal,true);
});
test('room orientation follows defender-up reference and planting stays on pit floor',()=>{
 const a=site.entrances.find(g=>g.name==='A LINK'),c=site.entrances.find(g=>g.name==='C LINK'),upper=site.rooms.find(r=>r.name==='B UPPER');
 assert.ok(a.x>0&&c.x<0&&a.z>c.z&&upper.x>0&&upper.z<c.z);
 const o=createObjective('attack'),p={...site.objectivePosition,y:site.objectivePosition.y+1.6};
 stepObjective(o,{dt:4000,position:p,zone:site.plantZone,held:true,slot:4,moving:false,grounded:true});
 assert.equal(o.phase,'planted');assert.equal(o.position.y,terrainHeight(site,p.x,p.z));
});
test('central plinth occludes a crouched pit target and has the correct landing top',()=>{
 const s=site.worldScale;
 assert.equal(clearSiteLine(site,{x:0,y:.9,z:-8*s},{x:0,y:.9,z:-17*s}),false);
 assert.equal(clearSiteLine(site,{x:-5*s,y:1.6,z:-10*s},{x:-5*s,y:1.6,z:-17*s}),true);
 const top=1.35;assert.equal(jumpStep(site,{x:0,y:top+1.62,z:-13*s},-2,.05,false).y,top+1.6);
});
test('attack and retake start inside their corridors and can advance',()=>{
 for(const start of Object.values(site.starts)){
  const moved=slideSite(site,start,{...start,x:start.x-Math.sin(start.yaw),z:start.z-Math.cos(start.yaw)});
  assert.ok(Math.hypot(moved.x-start.x,moved.z-start.z)>.95);
  assert.equal(terrainHeight(site,start.x,start.z)+1.6,start.y);
 }
});
test('B Upper connects continuously to the central platform at the same height',()=>{
 const s=site.worldScale;let p={x:3*s,y:2.95,z:-26*s};
 for(let i=0;i<170;i++){
  const v=jumpStep(site,p,0,.02,false);
  p=slideSite(site,{...p,y:v.y},{...p,y:v.y,z:p.z+.1});
  assert.ok(Math.abs(p.y-2.95)<.03,`platform discontinuity at ${p.z}`);
 }
 assert.ok(p.z>-18.2,`bridge blocked at ${p.z}`);
});
test('eight pit treads permit a swept descent and return without an invisible floor',()=>{
 const s=site.worldScale;let p={x:-5*s,y:1.6,z:-13*s},vy=0;
 for(const direction of [1,-1]){
  for(let i=0;i<68;i++){const v=jumpStep(site,p,vy,.02,false);vy=v.vy;p=slideSite(site,{...p,y:v.y},{...p,y:v.y,x:p.x+direction*.04});}
  if(direction===1)assert.ok(p.y<1.1,`did not descend: ${p.y}`);
 }
 assert.ok(p.x< -6.6&&Math.abs(p.y-1.6)<.02,`stuck returning: ${JSON.stringify(p)}`);
});
test('full pit depth and raised top remain distinct and all eight steps are climbable',()=>{
 const s=site.worldScale;let p={x:0,y:1.6,z:-7*s},vy=0;
 for(const direction of [-1,1]){
  for(let i=0;i<125;i++){const v=jumpStep(site,p,vy,.02,false);vy=v.vy;p=slideSite(site,{...p,y:v.y},{...p,y:v.y,z:p.z+direction*.04});}
  if(direction===-1)assert.ok(Math.abs(p.y-.34)<.02,`pit eye height ${p.y}`);
 }
 assert.ok(Math.abs(p.z+7*s)<.02&&Math.abs(p.y-1.6)<.02);
 assert.equal(navigationEdge(site,{x:0,z:-10.3*s},{x:0,z:-12*s}),false,'bots must not route directly up the raised face');
 assert.ok(Math.abs(terrainHeight(site,0,-13*s)-1.35)<1e-8);
});

