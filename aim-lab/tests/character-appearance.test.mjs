import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnemyRig} from '../src/enemy-rig.js';

test('equipment remains cosmetic and attached through crouch and airborne poses',()=>{
 const rig=createEnemyRig(),details=[];
 rig.root.traverse(o=>{if(o.name==='tailored-equipment-detail')details.push(o);});
 assert.ok(details.length>0);
 assert.ok(details.every(o=>!rig.hurtMeshes.includes(o)));
 const coreBase=rig.core.position.clone();
 const attached=details.map(o=>({mesh:o,parent:o.parent,position:o.position.clone()}));
 for(let i=0;i<90;i++){
  rig.animate({x:1.8,z:.7},1/60,i*16,i/90,{grounded:i<45});
  rig.root.updateMatrixWorld(true);
  for(const {mesh,parent,position} of attached){
   assert.equal(mesh.parent,parent);
   assert.ok(mesh.matrixWorld.elements.every(Number.isFinite));
   if(parent!==rig.root)assert.ok(mesh.position.equals(position));
   else assert.ok(mesh.position.clone().sub(position).distanceTo(rig.core.position.clone().sub(coreBase))<1e-8);
  }
 }
});
