import test from 'node:test';import assert from 'node:assert/strict';
import {getSite,slideSite} from '../src/site-layout.js';
import {navigationGrid,navigationEdge} from '../src/bot-navigation.js';
import {jumpStep} from '../src/site-combat.js';
test('player swept movement follows routes through every Lotus connector chamber',()=>{
 const site=getSite('garden'),grid=navigationGrid(site),nodes=[...grid.values()],key=p=>`${p.x},${p.z}`;
 const nearest=p=>nodes.reduce((a,b)=>Math.hypot(b.x-p.x,b.z-p.z)<Math.hypot(a.x-p.x,a.z-p.z)?b:a);
 const start=nearest(site.starts.attack),queue=[start],parents=new Map([[key(start),null]]);
 for(let i=0;i<queue.length;i++)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const n=grid.get(`${queue[i].x+dx},${queue[i].z+dz}`);if(n&&!parents.has(key(n))&&navigationEdge(site,queue[i],n)){parents.set(key(n),queue[i]);queue.push(n);}
 }
 for(const room of site.rooms){
  let node=nearest(room),path=[];assert.ok(parents.has(key(node)),room.name);
  while(node){path.push(node);node=parents.get(key(node));}path.reverse();
  let p={...start},vy=0;
  for(const target of path){
   for(let i=0;i<100&&Math.hypot(target.x-p.x,target.z-p.z)>.005;i++){
    const dist=Math.hypot(target.x-p.x,target.z-p.z),f=Math.min(1,.04/dist),v=jumpStep(site,p,vy,.02,false);vy=v.vy;
    p=slideSite(site,{...p,y:v.y},{x:p.x+(target.x-p.x)*f,y:v.y,z:p.z+(target.z-p.z)*f});
   }
   assert.ok(Math.hypot(target.x-p.x,target.z-p.z)<.01,`${room.name}: blocked at ${JSON.stringify(p)}`);
  }
 }
});
