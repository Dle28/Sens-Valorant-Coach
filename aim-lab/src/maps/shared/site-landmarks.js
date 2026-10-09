import * as THREE from 'three';

const assetUrl=file=>new URL(`../../assets/maps/${file}`,import.meta.url).href;

function mesh(root,geometry,material,position,rotation){
 const object=new THREE.Mesh(geometry,material);
 object.position.set(...position);
 if(rotation)object.rotation.set(...rotation);
 object.castShadow=object.receiveShadow=true;
 root.add(object);
 return object;
}

function standard(color,options={}){
 return new THREE.MeshStandardMaterial({color,roughness:.72,metalness:.05,...options});
}

function rememberArtwork(root,promise){
 if(!root.userData.artworkReady)root.userData.artworkReady=[];
 root.userData.artworkReady.push(promise);
}

// The art only lives on perimeter walls, so it distinguishes a location without
// introducing extra cover or competing with enemy silhouettes in play.
function addArtwork(root,{file,position,width,height,frame,glow,label}){
 let markReady=()=>{};
 const ready=new Promise(resolve=>{markReady=resolve;});
 const texture=new THREE.TextureLoader().load(assetUrl(file),loaded=>{
  loaded.colorSpace=THREE.SRGBColorSpace;
  loaded.anisotropy=4;
  markReady();
 },undefined,markReady);
 rememberArtwork(root,ready);
 const [x,y,z]=position;
 const backing=standard(frame,{metalness:.28,roughness:.54});
 const panel=standard(0xffffff,{map:texture,emissive:glow,emissiveIntensity:.035,roughness:.62,metalness:.08});
 const trim=standard(glow,{emissive:glow,emissiveIntensity:.34,roughness:.42,metalness:.2});
 mesh(root,new THREE.BoxGeometry(width+.44,height+.44,.16),backing,[x,y,z-.11]);
 const face=mesh(root,new THREE.PlaneGeometry(width,height),panel,[x,y,z]);
 face.name=label;
 for(const [dx,dy,sx,sy] of [[0,height/2+.16,width+.4,.08],[0,-height/2-.16,width+.4,.08],[-width/2-.16,0,.08,height+.4],[width/2+.16,0,.08,height+.4]]){
  mesh(root,new THREE.BoxGeometry(sx,sy,.055),trim,[x+dx,y+dy,z+.025]);
 }
 const light=new THREE.PointLight(glow,5.5,15,2);light.position.set(x,y,z+1.6);root.add(light);
}

function addTempleLandmark(root,block){
 // The relief sits on the primary rear axis so it reads as the destination
 // landmark from the entry, instead of becoming perimeter decoration.
 addArtwork(root,{file:'temple-relief-v1.png',position:[4,5.1,-30.35],width:6.7,height:4.45,frame:0x5d5548,glow:0x55b9bd,label:'temple-relief-panel'});
 for(const x of [.15,7.85]){
  block(x,5.1,-30.46,.32,5.25,.28,0x887451);
  block(x,7.65,-30.39,.72,.16,.46,0xbc9f6d);
 }
}

function addPiazzaLandmark(root,block){
 const sandstone=0xc6b092,terracotta=0x8a554b,trim=0xc5ab7b;
 addArtwork(root,{file:'piazza-mosaic-v1.png',position:[0,5.2,-30.62],width:8.25,height:5.5,frame:terracotta,glow:0x406b9c,label:'piazza-civic-mosaic'});
 // Three staggered facades form a memorable skyline far behind the back wall.
 for(const [x,width,roof] of [[-12,8,0], [0,9,Math.PI/4], [12,8,0]]){
  block(x,10,-35.3,width,6.2,3.4,sandstone);
  block(x,12.9,-33.55,width+.45,.22,.32,trim);
  for(const dx of [-width*.3,width*.3]){
   block(x+dx,10.9,-33.5,.5,3.2,.2,terracotta);
   block(x+dx,12.15,-33.28,1.15,.18,.28,trim);
  }
  const roofMesh=mesh(root,new THREE.ConeGeometry(width*.66,2.4,4),standard(terracotta,{roughness:.85}),[x,14.15,-35.25]);
  roofMesh.rotation.y=roof;
 }
 for(const x of [-12,0,12]){
  const banner=mesh(root,new THREE.PlaneGeometry(1.15,2.4),standard(0x7c4d45,{side:THREE.DoubleSide,roughness:.9}),[x,10.2,-33.25]);
  banner.name='piazza-wayfinding-banner';
  block(x,11.62,-33.29,1.3,.07,.08,trim);
 }
}

function addAtriumLandmark(root,block){
 const paleStone=0x9aa8ab,deepStone=0x4a6670,light=0x86d7de;
 addArtwork(root,{file:'atrium-window-v1.png',position:[0,5.2,-30.62],width:8.25,height:5.5,frame:deepStone,glow:light,label:'atrium-observation-window'});
 // A roof lantern and distant aqueduct make the atrium readable from every lane.
 block(0,10.8,-34.7,25.5,.52,4.8,paleStone);
 block(0,12.4,-35.6,23,.18,2.7,deepStone);
 for(const x of [-10,-5,0,5,10]){
  block(x,11.7,-33.0,.42,2.2,.22,deepStone);
  block(x,12.65,-33.12,1.35,.09,.16,light);
 }
 const ring=mesh(root,new THREE.TorusGeometry(3.8,.17,8,40),standard(light,{emissive:light,emissiveIntensity:.38,metalness:.18}),[0,13.5,-35.3],[Math.PI/2,0,0]);
 ring.name='atrium-roof-lantern';
 for(const x of [-18,18]){
  block(x,9.8,-35.2,4.2,8.5,4.1,paleStone);
  block(x,14.15,-35.2,4.6,.22,4.5,deepStone);
 }
 const glow=new THREE.PointLight(light,6.2,18,2);glow.position.set(0,12.4,-31.8);root.add(glow);
}

function addFoundryLandmark(root,block){
 const graphite=0x2c373f,steel=0x60717a,signal=0xd49b52,cyan=0x8adce1;
 addArtwork(root,{file:'foundry-panel-v1.png',position:[0,5.35,-31.02],width:8.25,height:5.5,frame:graphite,glow:cyan,label:'foundry-control-panel'});
 // The gantry is deliberately above the combat band and anchors the industrial space.
 block(0,10.5,-17,36,.5,.72,graphite);
 block(0,10.12,-17,28,.08,.34,signal);
 for(const x of [-22,22]){
  block(x,7.6,-17,.68,6.5,.68,steel);
  block(x,10.7,-17,1.25,.18,1.2,signal);
 }
 for(const x of [-12,0,12]){
  block(x,9.6,-17,.14,1.35,.18,steel);
  const hook=mesh(root,new THREE.TorusGeometry(.34,.07,6,14,Math.PI*1.45),standard(signal,{metalness:.28}),[x,8.82,-17.05],[0,0,Math.PI]);
  hook.name='foundry-gantry-hook';
 }
 for(const z of [-26,-8]){
  const pipe=mesh(root,new THREE.CylinderGeometry(.28,.28,32,12),standard(steel,{metalness:.35,roughness:.48}),[0,9.05,z],[0,0,Math.PI/2]);
  pipe.name='foundry-overhead-pipe';
  for(const x of [-12,0,12])block(x,9.05,z,.24,.55,.64,signal);
 }
}

export function addSiteLandmarks(root,block,id){
 if(id==='garden')addTempleLandmark(root,block);
 if(id==='piazza')addPiazzaLandmark(root,block);
 if(id==='atrium')addAtriumLandmark(root,block);
 if(id==='foundry')addFoundryLandmark(root,block);
}
