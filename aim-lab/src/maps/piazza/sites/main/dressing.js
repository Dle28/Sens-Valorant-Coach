import * as THREE from 'three';

function material(color,options={}){
 return new THREE.MeshStandardMaterial({color,roughness:.72,metalness:.08,...options});
}

function addInstances(root,{name,geometry,material:instanceMaterial,entries,rotation=[0,0,0]}){
 const mesh=new THREE.InstancedMesh(geometry,instanceMaterial,entries.length);
 const matrix=new THREE.Matrix4();
 const quaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
 for(const [index,entry] of entries.entries()){
  const {position,scale=[1,1,1],turn=0}=entry;
  const localRotation=quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),turn));
  matrix.compose(new THREE.Vector3(...position),localRotation,new THREE.Vector3(...scale));
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

// Piazza's details remain on the exterior and the upper arcade. They build a
// distinct civic skyline without making new cover or breaking the clear lane
// silhouettes needed during a fast FPS drill.
export function addPiazzaDressing(root,block){
 const sandstone=0xcab695;
 const terracotta=0x875448;
 const limestone=0xe0cfad;
 const blue=0x315f82;

 // Twin campaniles give players an immediate long-range orientation cue. Their
 // bases sit behind the rear boundary; only the high silhouette enters play.
 for(const [x,height] of [[-20,11.2],[20,12.7]]){
  block(x,height/2,-36.5,3.5,height,3.6,sandstone);
  block(x,height+.14,-36.5,4.05,.28,4.15,limestone);
  block(x,height+1.08,-36.5,2.5,1.65,2.65,sandstone);
  block(x,height+1.94,-36.5,2.9,.16,3.05,terracotta);
 }

 const towerWindows=[];
 const towerTiles=[];
 for(const [x,height] of [[-20,11.2],[20,12.7]]){
  for(const y of [height-4.5,height-1.8,height+.8])towerWindows.push({position:[x,y,-34.66],scale:[1,1,1]});
  for(const dx of [-1.45,-.72,0,.72,1.45])towerTiles.push({position:[x+dx,height+.42,-34.55],scale:[1,1,1]});
 }
 addInstances(root,{
  name:'piazza-campanile-windows',
  geometry:new THREE.BoxGeometry(.78,1.35,.11),
  material:material(0x324650,{roughness:.55,metalness:.14}),
  entries:towerWindows,
 });
 addInstances(root,{
  name:'piazza-campanile-cornice',
  geometry:new THREE.BoxGeometry(.42,.25,.28),
  material:material(limestone,{roughness:.8}),
  entries:towerTiles,
 });
 addInstances(root,{
  name:'piazza-campanile-roofs',
  geometry:new THREE.ConeGeometry(2.35,2.8,4),
  material:material(terracotta,{roughness:.87}),
  entries:[
   {position:[-20,14.2,-36.5],turn:Math.PI/4},
   {position:[20,15.7,-36.5],turn:Math.PI/4},
  ],
 });

 // Repeated banners and warm lanterns only occupy the upper side galleries.
 // Instancing keeps the whole arcade addition to three material submissions.
 const bannerEntries=[];
 const lanternEntries=[];
 const canopyEntries=[];
 for(const side of [-1,1])for(const z of [-24,-12,0,8]){
  bannerEntries.push({position:[side*25.48,7.45,z],turn:side<0?-Math.PI/2:Math.PI/2});
  lanternEntries.push({position:[side*25.18,9.12,z],scale:[1,1,1]});
  canopyEntries.push({position:[side*25.05,9.72,z],scale:[1,1,1],turn:side<0?-Math.PI/2:Math.PI/2});
 }
 addInstances(root,{
  name:'piazza-upper-wayfinding-banners',
  geometry:new THREE.PlaneGeometry(1.05,2.45),
  material:material(blue,{side:THREE.DoubleSide,roughness:.88}),
  entries:bannerEntries,
 });
 addInstances(root,{
  name:'piazza-arcade-lanterns',
  geometry:new THREE.SphereGeometry(.22,8,6),
  material:material(0xffd99c,{emissive:0xffbd69,emissiveIntensity:.48,roughness:.42}),
  entries:lanternEntries,
 });
 addInstances(root,{
  name:'piazza-arcade-sunshades',
  geometry:new THREE.BoxGeometry(3.3,.12,.7),
  material:material(terracotta,{roughness:.86}),
  entries:canopyEntries,
 });
}
