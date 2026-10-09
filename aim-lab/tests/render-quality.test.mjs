import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {masonryGeometry,batchArchitecture,configureShadows} from '../src/maps/shared/render-quality.js';

test('static batching preserves geometry bounds and leaves moving objects intact',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry(2,3,1);
 for(const x of [2,5,8]){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,2,3);mesh.rotation.y=.3;mesh.userData.staticArchitecture=true;root.add(mesh);}
 const moving=new THREE.Mesh(geometry,material);moving.name='objective';root.add(moving);
 root.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(root);
 assert.deepEqual(batchArchitecture(root),{removed:3,batches:1});root.updateMatrixWorld(true);
 const after=new THREE.Box3().setFromObject(root);
 assert.ok(before.min.distanceTo(after.min)<1e-5&&before.max.distanceTo(after.max)<1e-5);
 assert.equal(moving.parent,root);moving.position.x=100;assert.equal(moving.position.x,100);
 const batch=root.children.find(o=>o.name==='architecture-batch');assert.equal(batch.geometry.attributes.position.count,108);
 assert.ok([...batch.geometry.attributes.normal.array].every(Number.isFinite));
});
test('shadow quality reallocates maps only when resolution changes',()=>{
 const root=new THREE.Group(),sun=new THREE.DirectionalLight();root.add(sun);let disposed=0;
 sun.shadow.map={dispose(){disposed++;}};configureShadows(root,'high');assert.equal(sun.shadow.mapSize.x,4096);assert.equal(disposed,1);assert.equal(sun.shadow.map,null);
 configureShadows(root,'performance');assert.equal(sun.shadow.mapSize.x,1024);
});
test('world-scale UVs preserve surface density across differently sized walls',()=>{
 for(const [w,h,d] of [[2,4,1],[12,4,1],[1.5,6.4,1.5]]){
  const g=masonryGeometry(w,h,d);const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++)if(n.getZ(i)===1){assert.equal(uv.getX(i),p.getX(i)/2);assert.equal(uv.getY(i),p.getY(i)/2);}
  g.dispose();
 }
});
test('bevels stay inside original collision extents with finite UVs and normals',()=>{
 const g=masonryGeometry(1.5,6.4,1.5,true);g.computeBoundingBox();
 assert.ok(g.boundingBox.max.x<=.75001&&g.boundingBox.max.y<=3.20001&&g.boundingBox.max.z<=.75001);
 for(const key of ['position','normal','uv'])assert.ok([...g.attributes[key].array].every(Number.isFinite));
 g.dispose();
});
