import * as THREE from 'three';
import {loadExternalModel,loadModel,fitModel} from './models/model-library.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DEFAULT_WEAPON, WEAPONS } from './weapon-profiles.js';
import {createAuthoredVandal} from './models/authored-vandal.js';

// A compact view-model built from primitives.  It deliberately lives on the
// camera and is never included in target raycasts, so it is presentation-only.
export function createViewWeapon(camera, profileId=DEFAULT_WEAPON) {
 const rig=new THREE.Group();
 rig.name='view-weapon';
 rig.position.set(.44,-.35,-.95);
 rig.rotation.set(-.08,-.16,-.035);
 rig.scale.setScalar(.72);
 rig.visible=true;

 const dark=new THREE.MeshStandardMaterial({color:0x263241,emissive:0x07101a,emissiveIntensity:.34,roughness:.48,metalness:.72});
 const body=new THREE.MeshStandardMaterial({color:0x52677c,emissive:0x101b29,emissiveIntensity:.3,roughness:.38,metalness:.58});
 const edge=new THREE.MeshStandardMaterial({color:0xffd8d7,emissive:0xb52f48,emissiveIntensity:.55,roughness:.31,metalness:.35});
 const glove=new THREE.MeshStandardMaterial({color:0x273748,roughness:.86,metalness:.05});
 const skin=new THREE.MeshStandardMaterial({color:0xb77757,roughness:.82,metalness:0});
 const add=(geometry,material,position,rotation=[0,0,0],parent=rig)=>{
  if(geometry.type==='BoxGeometry'){
   const {width,height,depth}=geometry.parameters;geometry.dispose();geometry=new RoundedBoxGeometry(width,height,depth,2,Math.min(width,height,depth)*.14);
  }
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);parent.add(mesh);return mesh;
 };

 // Stylized sidearm: lower-right placement leaves the crosshair and target clear.
 const receiver=add(new THREE.BoxGeometry(.23,.17,.43),body,[0,.015,.035]);receiver.name='weapon-receiver';
 const slideProfile=new THREE.Shape();
 slideProfile.moveTo(-.145,-.045);slideProfile.lineTo(.145,-.045);slideProfile.lineTo(.145,.04);slideProfile.lineTo(.09,.075);slideProfile.lineTo(-.105,.075);slideProfile.lineTo(-.145,.025);slideProfile.closePath();
 const slide=new THREE.ExtrudeGeometry(slideProfile,{depth:.53,bevelEnabled:true,bevelThickness:.009,bevelSize:.008,bevelSegments:1});
 const slideMesh=add(slide,dark,[0,.075,-.27]);slideMesh.name='weapon-slide';
 const grip=add(new THREE.BoxGeometry(.12,.25,.22),dark,[.005,-.17,.11],[-.26,0,0]);grip.name='weapon-grip';
 add(new THREE.BoxGeometry(.10,.025,.30),dark,[0,.112,-.075]);
 add(new THREE.BoxGeometry(.055,.025,.19),body,[.115,.067,.05]);
 const muzzle=add(new THREE.CylinderGeometry(.03,.03,.11,10),edge,[0,.11,-.32],[Math.PI/2,0,0]);muzzle.name='weapon-muzzle';
 add(new THREE.TorusGeometry(.065,.012,5,10,Math.PI),dark,[0,-.05,.26],[0,0,Math.PI]);
 add(new THREE.BoxGeometry(.025,.11,.025),edge,[.018,-.065,.235],[-.35,0,0]);

 const rifleParts=new THREE.Group();rifleParts.name='rifle-profile-parts';rig.add(rifleParts);
 const rifleReceiver=add(new THREE.BoxGeometry(.16,.13,.46),body,[0,.02,-.47],[-.015,0,0],rifleParts);rifleReceiver.name='rifle-receiver';
 const rifleStock=add(new THREE.BoxGeometry(.11,.16,.25),dark,[0,-.12,.34],[-.15,0,0],rifleParts);rifleStock.name='rifle-stock';
 const rifleBarrel=add(new THREE.BoxGeometry(.055,.055,.5),dark,[0,.09,-.8],[-.01,0,0],rifleParts);rifleBarrel.name='rifle-barrel';
 const rifleMuzzle=add(new THREE.CylinderGeometry(.045,.055,.16,8),edge,[0,.09,-1.05],[Math.PI/2,0,0],rifleParts);rifleMuzzle.name='rifle-muzzle';
 const rifleRail=add(new THREE.BoxGeometry(.035,.05,.10),dark,[0,.13,-.56],[-.05,0,0],rifleParts);rifleRail.name='rifle-rail';
 const rifleMagazine=add(new THREE.BoxGeometry(.09,.18,.18),dark,[0,-.12,-.26],[-.22,0,0],rifleParts);rifleMagazine.name='rifle-magazine';
 const rifleLight=add(new THREE.BoxGeometry(.025,.025,.2),edge,[.08,.03,-.82],[-.01,0,0],rifleParts);rifleLight.name='rifle-light';

 // Forearm, wrist and glove are intentionally low-poly so they stay readable
 // on both integrated GPUs and full-screen displays.
 add(new THREE.CapsuleGeometry(.115,.47,5,10),skin,[.14,-.49,.25],[.77,0,.2]);
 add(new THREE.CapsuleGeometry(.13,.18,5,10),glove,[.045,-.29,.16],[-.24,.05,.03]);
 for(const [x,y,z,angle] of [[-.09,-.14,.12,-.3],[-.035,-.105,.13,-.18],[.025,-.1,.13,-.08],[.08,-.13,.11,.06]]) {
  add(new THREE.CapsuleGeometry(.027,.13,4,8),glove,[x,y,z],[angle,0,.08]);
 }
 const sight=add(new THREE.BoxGeometry(.035,.045,.06),dark,[0,.14,-.24]);
 sight.name='weapon-sight';
 const fill=new THREE.PointLight(0xddeaff,.8,3.4,2);fill.position.set(-.25,.22,.5);rig.add(fill);
 camera.add(rig);

 // Machined receiver details and contrasting recessed surfaces.
 const steel=new THREE.MeshStandardMaterial({color:0xaebcc5,roughness:.3,metalness:.7});
 const recess=new THREE.MeshStandardMaterial({color:0x0b1017,roughness:.8});
 for(let i=0;i<9;i++){
  add(new THREE.BoxGeometry(.18,.018,.025),dark,[0,.10,-.30-i*.055],[0,0,0],rifleParts);
  add(new THREE.BoxGeometry(.007,.043,.027),recess,[.083,.01,-.4-i*.034],[0,0,0],rifleParts);
 }
 for(let i=0;i<5;i++)add(new THREE.BoxGeometry(.096,.012,.17),body,[0,-.065-i*.03,-.25-i*.004],[-.22,0,0],rifleParts);
 add(new THREE.BoxGeometry(.012,.055,.14),recess,[.119,.02,-.065]);
 add(new THREE.BoxGeometry(.018,.025,.095),steel,[.131,.016,-.06]);
 for(const z of [-.12,.06,.16])add(new THREE.CylinderGeometry(.012,.012,.013,12),steel,[.123,.005,z],[0,0,Math.PI/2]);
 for(let i=0;i<6;i++)add(new THREE.BoxGeometry(.008,.067,.012),recess,[.146,.086,.10-i*.025]);
 add(new THREE.CylinderGeometry(.015,.015,.004,16),recess,[0,.11,-.377],[Math.PI/2,0,0]);
 add(new THREE.CylinderGeometry(.026,.026,.008,20),recess,[0,.09,-1.134],[Math.PI/2,0,0],rifleParts);
 for(let i=0;i<5;i++)add(new THREE.BoxGeometry(.007,.026,.11),body,[.069,-.10-i*.035,.13-i*.009]);
 const originalParts=[...rig.children];
 const knife=new THREE.Group(),device=new THREE.Group();rig.add(knife,device);
 add(new THREE.BoxGeometry(.085,.10,.25),dark,[0,-.02,.05],[0,0,0],knife);
 // Broad bevelled drop-point blade, rather than a triangular spike.
 const bladeShape=new THREE.Shape();bladeShape.moveTo(-.065,0);bladeShape.lineTo(-.075,.33);bladeShape.quadraticCurveTo(-.05,.48,0,.60);bladeShape.lineTo(.09,.34);bladeShape.lineTo(.065,0);bladeShape.closePath();
 const blade=new THREE.ExtrudeGeometry(bladeShape,{depth:.018,bevelEnabled:true,bevelThickness:.009,bevelSize:.012,bevelSegments:2,steps:1});
 const bladeMesh=add(blade,steel,[0,.04,-.09],[-Math.PI/2,0,-.15],knife);bladeMesh.name='knife-bevelled-blade';
 add(new THREE.BoxGeometry(.02,.01,.25),dark,[-.025,.065,-.27],[0,0,0],knife);
 for(let i=0;i<7;i++)add(new THREE.BoxGeometry(.092,.112,.012),glove,[0,-.02,-.04+i*.033],[0,0,0],knife);
 for(const z of [0,.17])add(new THREE.CylinderGeometry(.014,.014,.115,12),steel,[0,-.02,z],[Math.PI/2,0,0],knife);
 add(new THREE.BoxGeometry(.105,.12,.035),steel,[0,-.02,.19],[0,0,0],knife);
 add(new THREE.BoxGeometry(.22,.04,.07),edge,[0,.02,-.08],[0,0,0],knife);
 add(new THREE.BoxGeometry(.35,.30,.30),dark,[0,.02,-.1],[0,0,0],device);
 for(const x of [-.2,.2])add(new THREE.BoxGeometry(.055,.42,.08),body,[x,.02,-.1],[0,0,x],device);
 add(new THREE.BoxGeometry(.22,.13,.015),edge,[0,.10,.06],[0,0,0],device);
 for(const group of [knife,device]){
  add(new THREE.CapsuleGeometry(.10,.28,4,8),glove,[.12,-.22,.18],[.6,0,.15],group);
  add(new THREE.CapsuleGeometry(.085,.32,4,8),skin,[.21,-.42,.32],[.7,0,.15],group);
 }
 knife.visible=device.visible=false;
 const imported=new THREE.Group();imported.name='imported-weapon';rig.add(imported);
 const models=new Map();let skinId='original',slotId=1,equippedAt=-Infinity,inspectAt=-Infinity;
 const authored=createAuthoredVandal();rig.add(authored);
 const syncSkin=()=>{
  const useAuthored=slotId<3&&profile.id==='vandal'&&(skinId==='original'||(skinId==='vandal-sf'&&!models.has(skinId)));
  authored.visible=useAuthored;
  const selected=models.get(skinId),useModel=slotId<3&&!!selected;
  for(const part of originalParts)if(!part.isLight&&part.material!==skin&&part.material!==glove)part.visible=slotId<3&&!useModel&&!useAuthored;
  if(!useModel&&!useAuthored&&slotId<3){rifleParts.visible=profile.tag==='RIFLE';slideMesh.visible=muzzle.visible=profile.tag!=='RIFLE';}
  imported.visible=useModel;for(const [id,model]of models)model.visible=id===skinId;
 };
 const importedWeapons=[
  {id:'blaster-a',load:()=>loadModel('blaster-a'),size:1.15,position:[0,.015,-.28],rotation:0},
  {id:'blaster-r',load:()=>loadModel('blaster-r'),size:1.15,position:[0,.015,-.28],rotation:0},
  {id:'blaster-n',load:()=>loadModel('blaster-n'),size:1.15,position:[0,.015,-.28],rotation:0},
  // CC BY asset credited in docs/IMPORTED_3D_ASSETS.md. The graceful fallback
  // keeps builds usable until the downloaded binary is copied into src/assets/models.
  {id:'vandal-sf',load:()=>loadExternalModel('vandal-valorant.glb'),size:1.12,position:[0,.005,-.43],rotation:Math.PI},
 ];
 const ready=Promise.all(importedWeapons.map(async ({id,load,size,position,rotation})=>{
  try{const gltf=await load(),model=fitModel(gltf.scene,size);model.name=id;
   model.rotation.y=rotation;model.position.set(...position);model.visible=false;imported.add(model);models.set(id,model);syncSkin();
  }catch(error){console.warn('Weapon model unavailable',id,error);}
 }));
 let firedAt=-Infinity;
 let profile=WEAPONS[profileId]||WEAPONS[DEFAULT_WEAPON];
 function setProfile(id){
  profile=WEAPONS[id]||WEAPONS[DEFAULT_WEAPON];
  const rifle=profile.tag==='RIFLE';rifleParts.visible=rifle;slideMesh.visible=!rifle;muzzle.visible=!rifle;
  const scale=.72*(profile.length??1);rig.scale.setScalar(scale);
  rig.position.x=.44-(rifle?.025:0);rig.position.y=-.35;rig.position.z=-.95;
  body.color.set(rifle?'#3f4c58':'#586575');body.emissive.set('#000000');body.emissiveIntensity=0;
  dark.color.set(rifle?'#172431':'#263241');edge.color.set(profile.accent).lerp(new THREE.Color('#67737e'),.6);edge.emissive.set(profile.accent);edge.emissiveIntensity=.035;
  fill.color.set(0xddeaff);syncSkin();return profile;
 }
 setProfile(profile.id);
 return {
  rig,ready,
  setSkin(id){skinId=id;syncSkin();},
  inspect(now=performance.now()){if(slotId<3)inspectAt=now;},
  get profile(){return profile;},
  setProfile,
  setEquipment(slot,primary){
   slotId=slot;equippedAt=performance.now();inspectAt=-Infinity;
   originalParts.forEach(p=>p.visible=slot<3);knife.visible=slot===3;device.visible=slot===4;
   if(slot<3)setProfile(slot===2?'classic':primary);
   else rig.scale.setScalar(.72);
   syncSkin();
  },
  setVisible(visible) { rig.visible=visible; },
  fire(now=performance.now()) { firedAt=now; },
  update(now, active, speed=0) {
   const stride=Math.min(1,speed/4.65),bob=active?Math.sin(now*.009)*.012*stride+Math.sin(now*.0032)*.003:0;
   // Time-based decay keeps the visual recoil identical at 60 or 240 FPS.
   const kick=Math.exp(-Math.max(0,now-firedAt)/85);
   authored.userData.animate(kick);
   rig.position.y=-.35+bob+kick*.025;
   rig.position.z=-.95+kick*.11;
   rig.position.x=.44+Math.sin(now*.0045)*.008*stride;
   rig.rotation.x=-.08-kick*.075;
   rig.rotation.z=-.035+Math.sin(now*.0021)*.006+kick*.028;
   const equip=Math.max(0,1-(now-equippedAt)/300),inspectProgress=Math.max(0,Math.min(1,(now-inspectAt)/1500));
   const inspect=active?Math.sin(inspectProgress*Math.PI)**2:0;
   rig.position.y-=equip*.24;rig.rotation.x+=equip*.35;rig.rotation.z+=inspect*.65;rig.rotation.y=-.16+inspect*.5;
   for(const model of models.values()){const magazine=model.getObjectByName('magazine');if(magazine){if(!magazine.userData.rest)magazine.userData.rest=magazine.position.clone();magazine.position.copy(magazine.userData.rest);magazine.position.y-=kick*.008;}}
   sight.material.emissiveIntensity=.035+kick*.08;
  },
 };
}
