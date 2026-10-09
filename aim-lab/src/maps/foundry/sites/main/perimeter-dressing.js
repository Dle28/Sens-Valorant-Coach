import * as THREE from 'three';

function instanced(root,name,geometry,material,entries){
 const mesh=new THREE.InstancedMesh(geometry,material,entries.length);
 const matrix=new THREE.Matrix4();
 entries.forEach(({position,rotation: rotation=[0,0,0],scale: scale=[1,1,1],color},index)=>{
  matrix.compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));
  mesh.setMatrixAt(index,matrix);
  if(color)mesh.setColorAt(index,color);
 });
 mesh.instanceMatrix.needsUpdate=true;
 if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 mesh.castShadow=false;
 mesh.receiveShadow=true;
 mesh.name=name;
 mesh.computeBoundingSphere();
 root.add(mesh);
 return mesh;
}

function clearSightlineCeiling(root){
 // These three pre-existing cosmetic crossbars sat directly over the primary
 // sightline. They never represent collision cover, so removing just them
 // makes room for the distant relay structures without changing play routes.
 const legacyZ=new Set([-18,-10,-2]);
 for(const object of root.children){
  if(!object.isMesh||Math.abs(object.position.x)>.01||!legacyZ.has(object.position.z))continue;
  if(Math.abs(object.position.y-7)>.02&&Math.abs(object.position.y-6.75)>.02)continue;
  object.visible=false;
  object.userData.staticArchitecture=false;
 }
}

// Cooling silhouettes live behind the existing rear wall, not in a movement
// lane. They make the foundry identifiable without adding overhead clutter.
export function addFoundryPerimeterDressing(root){
 clearSightlineCeiling(root);
 const graphite=new THREE.MeshStandardMaterial({color:0x26323a,roughness:.62,metalness:.36});
 const steel=new THREE.MeshStandardMaterial({color:0x607783,roughness:.48,metalness:.48});
 const amber=new THREE.MeshStandardMaterial({color:0xc98647,roughness:.38,metalness:.28,emissive:0x5a260d,emissiveIntensity:.2});
 const stacks=[
  {position:[-17,8.1,-36.4],scale:[1,1,1],rotation:[0,0,0]},
  {position:[17,8.1,-36.4],scale:[1,1,1],rotation:[0,0,0]},
 ];

 instanced(root,'foundry-cooling-stacks',new THREE.CylinderGeometry(1.2,1.48,9.2,8),graphite,stacks);
 instanced(root,'foundry-stack-caps',new THREE.ConeGeometry(1.56,1.4,8),steel,stacks.map(({position})=>({position:[position[0],13.4,position[2]],scale:[1,1,1]})));
 instanced(root,'foundry-stack-beacons',new THREE.CylinderGeometry(.28,.28,.42,8),amber,stacks.map(({position})=>({position:[position[0],14.32,position[2]],scale:[1,1,1]})));

 // Recessed vertical fins make the stacks read at a glance. One instanced mesh
 // keeps all sixteen panels to a single draw call.
 const fins=[];
 for(const {position:[x,,z]} of stacks)for(let i=0;i<8;i++){
  const angle=i/8*Math.PI*2;
  fins.push({position:[x+Math.cos(angle)*1.23,8.15,z+Math.sin(angle)*1.23],rotation:[0,-angle,0],scale:[1,1,1],color:new THREE.Color(i%2?0x54717b:0x334852)});
 }
 instanced(root,'foundry-cooling-fins',new THREE.BoxGeometry(.08,5.65,.62),steel,fins);

 // Two narrow signal bridges, high behind the wall, frame the central control
 // panel while leaving the middle of the ceiling intentionally open.
 const bridges=[
  {position:[-10.7,10.1,-34.6],scale:[1,1,1]},
  {position:[10.7,10.1,-34.6],scale:[1,1,1]},
 ];
 instanced(root,'foundry-rear-signal-bridges',new THREE.BoxGeometry(7.1,.18,.42),graphite,bridges);
 instanced(root,'foundry-rear-signal-strips',new THREE.BoxGeometry(5.6,.045,.07),amber,bridges.map(({position})=>({position:[position[0],position[1]-.15,position[2]-.25],scale:[1,1,1]})));
}
