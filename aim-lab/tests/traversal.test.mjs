import test from 'node:test';
import assert from 'node:assert/strict';
import {SITES,slideSite} from '../src/site-layout.js';
import {terrainHeight} from '../src/maps/shared/traversal.js';
import {jumpStep} from '../src/site-combat.js';
import {createEnemyRig} from '../src/enemy-rig.js';
test('all sites have three clear entrances and continuous walkable ramps',()=>{
 for(const site of Object.values(SITES)){
  assert.equal(site.entrances.length,3);assert.ok(site.plantZone.width>0&&site.plantZone.depth>0);
  for(const gate of site.entrances){const axis=gate.axis==='x'?'x':'z',a={x:gate.x,y:1.6,z:gate.z};a[axis]+=1;const b=slideSite(site,a,{...a,[axis]:a[axis]-2});assert.ok(b[axis]<a[axis]-1.9,gate.name);}
  for(const ramp of site.ramps){const sign=ramp.riseToward==='south'?1:-1;let p={x:ramp.x,y:1.6,z:ramp.z-sign*(ramp.depth/2+.2)};const steps=Math.ceil((ramp.depth+.4)/.1);for(let i=0;i<steps;i++)p=slideSite(site,p,{...p,z:p.z+sign*.1});assert.ok(Math.abs(p.y-(ramp.height+1.6))<.05);
   let vy=0;for(let i=0;i<steps+8;i++){const v=jumpStep(site,p,vy,.02,false);vy=v.vy;p=slideSite(site,{...p,y:v.y},{...p,y:v.y,z:p.z-sign*.1});}assert.ok(p.y<1.7);
  }
 }
});
test('animation moves articulated legs and blends back toward idle',()=>{
 const r=createEnemyRig();r.root.visible=true;r.animate({x:1.6,z:0},.1,100);assert.ok(r.root.userData.animation.blend>.1);
 for(let i=0;i<120;i++)r.animate({x:0,z:0},1/60,200+i*16);assert.ok(r.root.userData.animation.blend<.001);
});
