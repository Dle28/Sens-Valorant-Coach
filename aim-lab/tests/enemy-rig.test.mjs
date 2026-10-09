import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEnemyRig,ENEMY_HEAD_HEIGHT} from '../src/enemy-rig.js';
test('compact agent body stands at floor level and excludes weapon from hits',()=>{
 const rig=createEnemyRig();rig.root.position.y=ENEMY_HEAD_HEIGHT;rig.root.updateMatrixWorld(true);
 const body=new THREE.Box3();for(const mesh of rig.hurtMeshes)body.union(new THREE.Box3().setFromObject(mesh,true));
 assert.ok(Math.abs(body.min.y)<.005);assert.ok(body.max.y<1.82);assert.ok(body.max.x-body.min.x<.7);
 assert.ok(!rig.hurtMeshes.includes(rig.hitbox));
 const ray=new THREE.Raycaster(new THREE.Vector3(0,1.6,3),new THREE.Vector3(0,0,-1));assert.ok(ray.intersectObjects(rig.hurtMeshes).length);
 ray.set(new THREE.Vector3(.45,1.6,3),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObjects(rig.hurtMeshes).length,0);
});

test('agent variants preserve matching damage geometry and animate without moving accessories into hit sets',()=>{
 const rigs=['sentinel','scout','engineer'].map(variant=>createEnemyRig({variant}));
 const count=rigs[0].hurtMeshes.length;
 for(const rig of rigs){
  assert.equal(rig.hurtMeshes.length,count);
  rig.root.visible=true;rig.root.position.y=ENEMY_HEAD_HEIGHT;
  rig.animate({x:1,z:.2},.016,1000,.4);rig.root.updateMatrixWorld(true);
  assert.ok(rig.hurtMeshes.every(m=>m.position.toArray().every(Number.isFinite)));
  assert.ok(!rig.hurtMeshes.includes(rig.flash));
  const head=rig.hurtMeshes.find(m=>m.userData.hitRegion==='head');
  assert.deepEqual(head.scale.toArray(),[.135,.16,.13]);
 }
 assert.deepEqual(rigs.map(r=>r.root.userData.variant),['sentinel','scout','engineer']);
});
