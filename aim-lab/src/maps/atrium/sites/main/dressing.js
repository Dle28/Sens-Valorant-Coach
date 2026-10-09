import * as THREE from 'three';

function material(color,options={}){
 return new THREE.MeshStandardMaterial({color,roughness:.7,metalness:.1,...options});
}

function addInstances(root,{name,geometry,material:instanceMaterial,entries,rotation=[0,0,0]}){
 const mesh=new THREE.InstancedMesh(geometry,instanceMaterial,entries.length);
 const matrix=new THREE.Matrix4();
 const baseRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
 for(const [index,entry] of entries.entries()){
  const {position,scale=[1,1,1],turn=0}=entry;
  const turnRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),turn);
  matrix.compose(new THREE.Vector3(...position),baseRotation.clone().multiply(turnRotation),new THREE.Vector3(...scale));
  mesh.setMatrixAt(index,matrix);
 }
 mesh.name=name;
 mesh.castShadow=true;
 mesh.receiveShadow=true;
 mesh.instanceMatrix.needsUpdate=true;
 mesh.computeBoundingSphere();
 root.add(mesh);
 return mesh;
}

// Atrium uses light, vertical forms on the outside of the playable envelope.
// The low detail density and high placement preserve a clean target-reading
// band from the floor to the top of normal player cover.
export function addAtriumDressing(root,block){
 const concrete=0x95a7a8;
 const slate=0x36515c;
 const glass=0x8bd5d6;
 const foliage=0x547566;

 // Long planter bridges make the upper level legible without joining the
 // combat lanes. They visually support the landmark aqueduct at the rear.
 for(const side of [-1,1])for(const z of [-22,-6,10]){
  block(side*24.35,9.2,z,4.1,.7,2.4,concrete);
  block(side*24.35,9.58,z,3.6,.08,1.9,slate);
  block(side*24.35,10.05,z,3.85,.08,2.08,foliage);
 }

 // Fins are intentionally tall and narrow. They frame the atrium, provide
 // parallax while moving, and use a single instanced draw call per material.
 const fins=[];
 const strips=[];
 for(const side of [-1,1])for(const z of [-28,-20,-12,-4,4,12]){
  fins.push({position:[side*25.45,7.8,z],scale:[1,1,1]});
  strips.push({position:[side*25.18,8.78,z],scale:[1,1,1]});
 }
 addInstances(root,{
  name:'atrium-perimeter-fins',
  geometry:new THREE.BoxGeometry(.18,4.1,.82),
  material:material(slate,{roughness:.62,metalness:.2}),
  entries:fins,
 });
 addInstances(root,{
  name:'atrium-perimeter-light-strips',
  geometry:new THREE.BoxGeometry(.05,1.45,.17),
  material:material(glass,{emissive:glass,emissiveIntensity:.42,roughness:.38,metalness:.22}),
  entries:strips,
 });

 // A row of reflector crowns reads as an environmental destination beyond the
 // back wall, rather than as a ceiling over the player.
 addInstances(root,{
  name:'atrium-reflector-crowns',
  geometry:new THREE.ConeGeometry(1.15,2.25,6,1,true),
  material:material(concrete,{roughness:.76}),
  entries:[
   {position:[-15,11.5,-35.65],turn:Math.PI/6},
   {position:[-5,12.6,-35.65],turn:Math.PI/6},
   {position:[5,12.6,-35.65],turn:Math.PI/6},
   {position:[15,11.5,-35.65],turn:Math.PI/6},
  ],
 });
 addInstances(root,{
  name:'atrium-reflector-cores',
  geometry:new THREE.CylinderGeometry(.24,.24,1.7,8),
  material:material(glass,{emissive:glass,emissiveIntensity:.35,roughness:.35,metalness:.25}),
  entries:[
   {position:[-15,11.35,-35.65]},
   {position:[-5,12.45,-35.65]},
   {position:[5,12.45,-35.65]},
   {position:[15,11.35,-35.65]},
  ],
 });

 // Sparse hanging foliage breaks up the upper garden bridges. It never drops
 // below head height and all leaves share one low-poly instanced mesh.
 const leaves=[];
 for(const side of [-1,1])for(const z of [-22,-6,10])for(let i=0;i<5;i++){
  leaves.push({position:[side*(23.5+(i%2)*.35),8.05-i*.26,z-.65+i*.32],scale:[.5,.92,.64],turn:i*.7});
 }
 addInstances(root,{
  name:'atrium-hanging-garden',
  geometry:new THREE.IcosahedronGeometry(.32,0),
  material:material(foliage,{roughness:.95}),
  entries:leaves,
 });
}
