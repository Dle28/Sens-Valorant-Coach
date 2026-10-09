import * as THREE from 'three';
import {detailSite} from '../../site-detail.js';
import {ornaments} from './ornaments.js';
export function decorateSite(root,block,id){
 detailSite(root,id,block);
 ornaments(root,block,id);
 const industrial=id==='foundry',stone=id==='piazza'?0xcab9a3:0xa99577;
 const mesh=(geometry,color,position)=>{const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.78}));m.position.set(...position);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
 // Side galleries add depth above the clear aiming band.
 for(const side of [-1,1])for(let z=-26;z<10;z+=8){
  const x=side*26.45;
  block(x,5.2,z,.7,.32,5.8,industrial?0x343e47:stone);
  block(x,8.2,z,.7,.25,5.8,industrial?0x343e47:stone);
  for(const dz of [-2.5,2.5])block(x,6.7,z+dz,.5,3,.32,industrial?0x788491:0x8d7b63);
  if(industrial){
   const pipe=mesh(new THREE.CylinderGeometry(.15,.15,6,10),0x90979a,[x,7,z]);pipe.rotation.x=Math.PI/2;
   for(let dz=-2;dz<=2;dz++)block(x-side*.2,6,z+dz,.08,.8,.35,0x38444c);
   block(x-side*.3,7.8,z,.08,.1,3.6,0xe8c481);
  }else{
   for(let dz=-2;dz<=2;dz++)block(x-side*.22,5.8,z+dz,.15,1,.13,0xc4b394);
   const arch=mesh(new THREE.TorusGeometry(1.65,.17,8,24,Math.PI),stone,[x-side*.1,6.4,z]);arch.rotation.y=Math.PI/2;
   if(id==='piazza'){block(x-side*.35,7.6,z,.15,.15,4,0x805a4c);for(let dz=-2;dz<=2;dz+=.5)block(x,8.4,z+dz,1,.12,.4,0x9d6351);}
   else for(let j=0;j<10;j++){const leaf=mesh(new THREE.IcosahedronGeometry(.2,0),j%2?0x708652:0x46644c,[x-side*.4,7.9-j*.15,z+Math.sin(j)*.3]);leaf.scale.set(.6,1,1.7);}
  }
 }
 // Back-wall masonry courses and inset lintels are visible at FPS distances.
 for(let y=.45;y<6;y+=.6)block(0,y,-31.48,35,.025,.025,industrial?0x43515c:0x8e806c);
 for(let x=-16;x<=16;x+=4){
  block(x,3.1,-31.28,1.95,.2,.32,industrial?0x566879:stone);
  for(const dx of [-.95,.95])block(x+dx,1.6,-31.28,.16,3,.22,industrial?0x566879:stone);
  if(industrial)for(let j=0;j<4;j++)block(x-.55+j*.35,.3,-31.24,.17,.3,.035,j%2?0xb6a152:0x26313b);
 }
 // Small lamps, correctly kept above head-height gameplay.
 for(const x of [-12,-4,4,12]){
  block(x,3.7,-31.2,.18,.7,.28,0x28313a);
  mesh(new THREE.BoxGeometry(.13,.35,.15),0xffd7a1,[x,3.7,-31]);
 }
}
