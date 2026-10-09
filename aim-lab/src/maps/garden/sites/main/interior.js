import * as THREE from 'three';
import layout from './layout.js';
import {insideFootprint} from '../../../shared/footprint.js';
import {mineralMaps,mossMaterial} from './materials.js';
export function buildInterior(root,block){
 const soil=new THREE.MeshStandardMaterial({color:0xc2b6a0,...mineralMaps('earth'),roughness:1,normalScale:new THREE.Vector2(.5,.5)});
 const stone=new THREE.MeshStandardMaterial({color:0xddd8cb,...mineralMaps('paving'),roughness:1,normalScale:new THREE.Vector2(.6,.6)});
 const moss=mossMaterial();
 // One continuous, irregular footprint made from non-overlapping floor cells.
 const cells=[];for(let x=-25;x<25;x++)for(let z=-31;z<16;z++)if(insideFootprint(layout,x+.5,z+.5))cells.push([x+.5,z+.5]);
 const earth=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.25,1),soil,cells.length);
 const tiles=new THREE.InstancedMesh(new THREE.BoxGeometry(.965,.035,.965),stone,cells.length);
 const matrix=new THREE.Matrix4();let count=0;
 cells.forEach(([x,z],i)=>{
  earth.setMatrixAt(i,matrix.makeTranslation(x,-.125,z));
  // Leave weathered dirt channels around broken paving; never raise collision edges.
  if(Math.sin(x*.43+z*.21)+Math.cos(z*.61-x*.14)>-1.32){matrix.compose(new THREE.Vector3(x,.004,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.sin(i*17)*.025),new THREE.Vector3(1,1,1));tiles.setMatrixAt(count,matrix);tiles.setColorAt(count++,new THREE.Color().setScalar(.88+((i*17)%13)*.01));}
 });tiles.count=count;earth.receiveShadow=tiles.receiveShadow=true;root.add(earth,tiles);
 const patches=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),moss,90);let n=0;
 for(let i=0;i<180;i++){const x=-24+(i*17.3)%48,z=-30+(i*11.7)%45;if(!insideFootprint(layout,x,z)||n>=90)continue;
  matrix.compose(new THREE.Vector3(x,.027,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,i)),new THREE.Vector3(1.5,1.1,1));patches.setMatrixAt(n++,matrix);
 }patches.count=n;root.add(patches);
 // Two distant lintels imply the old roof without filling the sky with a
 // repeated beam grid. Clear silhouettes matter more than ceiling density.
 for(const z of [-24,8]){
  block(0,11.15,z,17.5,.38,.62,0x827559);
  block(0,10.86,z,17.1,.12,.82,0x594e3e);
 }
 // Trabeated nave: pillars are collision-backed in layout.js.
 for(const z of [-18,5]){block(0,6.8,z,17.5,.7,1.65,0x948167);block(0,7.25,z,18,.2,1.9,0x675b46);}
 for(const [x,z] of [[-17,-7],[17,-14],[4,-25],[0,3]]){
  const glow=new THREE.PointLight(0xffd4a0,26,14,2);glow.position.set(x,5,z);root.add(glow);
  block(x,6.85,z,.06,2.7,.06,0x554433);block(x,5.5,z,.65,.18,.65,0x554433);block(x,5.2,z,.22,.4,.22,0xd9ad69);
 }
 const fill=new THREE.HemisphereLight(0xe1edff,0x69747c,1.65);root.add(fill);
}
