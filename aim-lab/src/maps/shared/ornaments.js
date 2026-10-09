import * as THREE from 'three';
export function ornaments(root,block,id){
 const industrial=id==='foundry',town=id==='piazza';
 const material=new Map();
 const mesh=(g,color,p)=>{if(!material.has(color))material.set(color,new THREE.MeshStandardMaterial({color,roughness:.76}));const m=new THREE.Mesh(g,material.get(color));m.position.set(...p);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
 for(const side of [-1,1])for(let z=-25;z<=7;z+=8){
  const x=side*26.55;
  if(town){
   for(const dz of [-.75,.75]){
    block(x,6.5,z+dz,.16,1.6,.65,0x657a72);
    for(let y=5.85;y<7.2;y+=.18)block(x-side*.1,y,z+dz,.08,.06,.57,0x89988a);
   }
   const awning=block(x-side*.45,4.7,z,1.3,.12,3.6,0xa36352);awning.rotation.z=side*.18;
   for(let dz=-1.6;dz<1.7;dz+=.4)block(x-side*.5,4.65,z+dz,1.3,.06,.16,0xdac9ad);
   block(x-side*.35,5.45,z,.4,.25,2.2,0x725a48);
   for(let j=0;j<8;j++)mesh(new THREE.IcosahedronGeometry(.15,0),j%2?0x637f4b:0xbd8587,[x-side*.4,5.7,z-1+j*.28]);
  }else if(industrial){
   for(const y of [8.7,9.2]){const pipe=mesh(new THREE.CylinderGeometry(.19,.19,7,12),0x8a918d,[x,y,z]);pipe.rotation.x=Math.PI/2;
    for(const dz of [-2,2]){const ring=mesh(new THREE.TorusGeometry(.21,.035,6,12),0x424b50,[x,y,z+dz]);}}
   const wheel=mesh(new THREE.TorusGeometry(.35,.045,6,16),0xc17751,[x-side*.3,8.7,z]);wheel.rotation.y=Math.PI/2;
   for(let a=0;a<4;a++){const spoke=block(x-side*.3,8.7,z,.055,.65,.045,0xc17751);spoke.rotation.x=a*Math.PI/4;}
  }else{
   for(const dz of [-2.7,2.7]){
    mesh(new THREE.CylinderGeometry(.24,.31,2.3,12),0xb9a27d,[x,7,z+dz]);
    for(const y of [5.9,6.1,7.9,8.1])block(x,y,z+dz,.68,.14,.68,0x8c795e);
   }
   for(let j=0;j<5;j++){const diamond=block(x-side*.25,8.3,z-1.6+j*.8,.12,.23,.23,0xc7b58c);diamond.rotation.x=Math.PI/4;}
   const medallion=mesh(new THREE.TorusGeometry(.5,.10,8,24),0xc6ad7f,[x-side*.28,7.2,z]);medallion.rotation.y=Math.PI/2;
  }
 }
 // Raised frieze follows the back wall, above the character silhouette zone.
 for(let x=-16;x<=16;x+=2){
  const trim=block(x,4.25,-31.35,.25,.25,.09,industrial?0xb19754:0xb6a181);trim.rotation.z=Math.PI/4;
 }
}
