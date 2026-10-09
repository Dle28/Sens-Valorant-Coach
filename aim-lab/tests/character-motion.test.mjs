import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEnemyRig} from '../src/enemy-rig.js';
test('visual head and scoring proxy stay coincident through turns, crouch and air poses',()=>{
 const rig=createEnemyRig(),head=rig.hurtMeshes.find(m=>m.userData.hitRegion==='head');
 for(let i=0;i<240;i++){
  rig.root.position.set(i*.01,1.6-(i>100?.42:0),-3);rig.root.rotation.y=i*.02;
  rig.animate({x:Math.sin(i*.05)*2,z:1.3},1/60,i*1000/60,i>100?1:0,{grounded:i<170});rig.root.updateMatrixWorld(true);
  assert.ok(head.getWorldPosition(new THREE.Vector3()).distanceTo(rig.hitbox.getWorldPosition(new THREE.Vector3()))<1e-8);
  for(const m of rig.hurtMeshes)assert.ok(m.matrixWorld.elements.every(Number.isFinite));
 }
});
test('crouch feet stay on the floor and knees bend instead of scaling leg groups',()=>{
 const rig=createEnemyRig();rig.root.position.y=1.18;
 for(let i=0;i<120;i++)rig.animate({x:0,z:0},1/60,i*16,1,{grounded:true});rig.root.updateMatrixWorld(true);
 for(const leg of rig.root.children.filter(g=>g.name.startsWith('leg-'))){
  assert.deepEqual(leg.scale.toArray(),[1,1,1]);const boot=leg.children.at(-1);
  const bounds=new THREE.Box3().setFromObject(boot);assert.ok(Math.abs(bounds.min.y)<.005);
  assert.ok(leg.children[2].position.z>.2);
 }
});
test('strafe stride follows lateral movement and airborne pose lifts both boots',()=>{
 const rig=createEnemyRig();for(let i=0;i<20;i++)rig.animate({x:2,z:0},1/60,i*16,0,{grounded:true});
 const legs=rig.root.children.filter(g=>g.name.startsWith('leg-'));
 assert.ok(Math.abs(legs[0].children.at(-1).position.x+.19)>.03);
 for(let i=0;i<30;i++)rig.animate({x:0,z:0},1/60,400+i*16,0,{grounded:false});
 assert.ok(legs.every(g=>g.children.at(-1).position.y>-1.46));
});
