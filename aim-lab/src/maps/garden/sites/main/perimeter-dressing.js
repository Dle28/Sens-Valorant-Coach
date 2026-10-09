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

// Distant roofline dressing creates a clear destination silhouette. Everything
// is beyond the sanctuary wall (z < -32) and above the combat band.
export function addTemplePerimeterDressing(root){
 const limestone=new THREE.MeshStandardMaterial({color:0x8e8064,roughness:.9});
 const roof=new THREE.MeshStandardMaterial({color:0x5b665d,roughness:.75,metalness:.08});
 const bronze=new THREE.MeshStandardMaterial({color:0xa98d5d,roughness:.5,metalness:.42,emissive:0x2e2720,emissiveIntensity:.12});
 const skyline=[
  {position:[-14,11.8,-34.8],scale:[1,.9,1],rotation:[0,Math.PI/4,0]},
  {position:[0,14.15,-36.2],scale:[1.3,1.22,1.3],rotation:[0,0,0]},
  {position:[14,11.8,-34.8],scale:[1,.9,1],rotation:[0,Math.PI/4,0]},
 ];

 instanced(root,'temple-roofline-bases',new THREE.CylinderGeometry(1.2,1.42,4.8,6),limestone,skyline.map(({position,scale,rotation})=>({position:[position[0],position[1]-2.55,position[2]],scale,rotation})));
 instanced(root,'temple-roofline-eaves',new THREE.ConeGeometry(2.45,1.35,4),roof,skyline.map(({position,scale,rotation})=>({position,scale,rotation})));
 instanced(root,'temple-roofline-finials',new THREE.ConeGeometry(.27,.95,6),bronze,skyline.map(({position,scale,rotation})=>({position:[position[0],position[1]+1.05*scale[1],position[2]],scale,rotation})));

 // Six lantern brackets read as a restrained rhythm along the existing outer
 // walls. Their light is baked into the emissive material, avoiding extra
 // shadow-casting lights and preserving a clean target silhouette.
 const lanterns=[];
 for(const side of [-1,1])for(const z of [-22,-6,9])lanterns.push({position:[side*24.7,8.72,z],scale:[1,1,1],color:new THREE.Color(side<0?0x98c5bd:0xbda06a)});
 instanced(root,'temple-perimeter-lanterns',new THREE.OctahedronGeometry(.28,1),bronze,lanterns);
 instanced(root,'temple-lantern-brackets',new THREE.BoxGeometry(.46,.09,.82),limestone,lanterns.map(({position})=>({position:[position[0],position[1]+.4,position[2]],scale:[1,1,1]})));
}
