import * as THREE from 'three';
import { DEFAULT_WEAPON, WEAPONS } from './weapon-profiles.js';

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
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);parent.add(mesh);return mesh;
 };

 // Stylized sidearm: lower-right placement leaves the crosshair and target clear.
 const receiver=add(new THREE.BoxGeometry(.23,.17,.43),body,[0,.015,.035]);receiver.name='weapon-receiver';
 const slideProfile=new THREE.Shape();
 slideProfile.moveTo(-.145,-.045);slideProfile.lineTo(.145,-.045);slideProfile.lineTo(.145,.04);slideProfile.lineTo(.09,.075);slideProfile.lineTo(-.105,.075);slideProfile.lineTo(-.145,.025);slideProfile.closePath();
 const slide=new THREE.ExtrudeGeometry(slideProfile,{depth:.53,bevelEnabled:true,bevelThickness:.009,bevelSize:.008,bevelSegments:1});
 const slideMesh=add(slide,dark,[0,.075,-.27]);slideMesh.name='weapon-slide';
 const grip=add(new THREE.BoxGeometry(.12,.25,.22),dark,[.005,-.17,.11],[-.26,0,0]);grip.name='weapon-grip';
 add(new THREE.BoxGeometry(.19,.045,.34),edge,[0,.205,-.075]);
 add(new THREE.BoxGeometry(.055,.025,.19),edge,[.12,.165,.05]);
 const muzzle=add(new THREE.CylinderGeometry(.03,.03,.11,10),edge,[0,.11,-.32],[Math.PI/2,0,0]);muzzle.name='weapon-muzzle';
 add(new THREE.TorusGeometry(.065,.012,5,10,Math.PI),dark,[0,-.05,.26],[0,0,Math.PI]);
 add(new THREE.BoxGeometry(.025,.11,.025),edge,[.018,-.065,.235],[-.35,0,0]);

 const rifleParts=new THREE.Group();rifleParts.name='rifle-profile-parts';rig.add(rifleParts);
 const rifleReceiver=add(new THREE.BoxGeometry(.16,.13,.46),body,[0,.02,-.47],[-.015,0,0],rifleParts);rifleReceiver.name='rifle-receiver';
 const rifleStock=add(new THREE.BoxGeometry(.11,.16,.25),dark,[0,-.12,.34],[-.15,0,0],rifleParts);rifleStock.name='rifle-stock';
 const rifleBarrel=add(new THREE.BoxGeometry(.055,.055,.5),dark,[0,.09,-.8],[-.01,0,0],rifleParts);rifleBarrel.name='rifle-barrel';
 const rifleMuzzle=add(new THREE.CylinderGeometry(.045,.055,.16,8),edge,[0,.09,-1.05],[Math.PI/2,0,0],rifleParts);rifleMuzzle.name='rifle-muzzle';
 const rifleRail=add(new THREE.BoxGeometry(.035,.11,.16),edge,[0,.175,-.56],[-.05,0,0],rifleParts);rifleRail.name='rifle-rail';
 const rifleMagazine=add(new THREE.BoxGeometry(.09,.18,.18),dark,[0,-.12,-.26],[-.22,0,0],rifleParts);rifleMagazine.name='rifle-magazine';
 const rifleLight=add(new THREE.BoxGeometry(.025,.025,.2),edge,[.08,.03,-.82],[-.01,0,0],rifleParts);rifleLight.name='rifle-light';

 // Forearm, wrist and glove are intentionally low-poly so they stay readable
 // on both integrated GPUs and full-screen displays.
 add(new THREE.CapsuleGeometry(.115,.47,5,10),skin,[.14,-.49,.25],[.77,0,.2]);
 add(new THREE.CapsuleGeometry(.13,.18,5,10),glove,[.045,-.29,.16],[-.24,.05,.03]);
 for(const [x,y,z,angle] of [[-.09,-.14,.12,-.3],[-.035,-.105,.13,-.18],[.025,-.1,.13,-.08],[.08,-.13,.11,.06]]) {
  add(new THREE.CapsuleGeometry(.027,.13,4,8),glove,[x,y,z],[angle,0,.08]);
 }
 const sight=add(new THREE.BoxGeometry(.035,.045,.06),edge,[0,.22,-.24]);
 sight.name='weapon-sight';
 const fill=new THREE.PointLight(0xffd8c7,3.2,3.4,2);fill.position.set(-.25,.22,.5);rig.add(fill);
 camera.add(rig);

 let firedAt=-Infinity;
 let profile=WEAPONS[profileId]||WEAPONS[DEFAULT_WEAPON];
 function setProfile(id){
  profile=WEAPONS[id]||WEAPONS[DEFAULT_WEAPON];
  const rifle=profile.tag==='RIFLE';rifleParts.visible=rifle;slideMesh.visible=!rifle;muzzle.visible=!rifle;
  const scale=.72*(profile.length??1);rig.scale.setScalar(scale);
  rig.position.x=.44-(rifle?.025:0);rig.position.y=-.35;rig.position.z=-.95;
  body.color.set(profile.color);body.emissive.set(profile.accent);body.emissiveIntensity=rifle?.38:.3;
  dark.color.set(rifle?'#172431':'#263241');edge.color.set(profile.accent);edge.emissive.set(profile.accent);edge.emissiveIntensity=rifle?.68:.55;
  fill.color.set(profile.accent);return profile;
 }
 setProfile(profile.id);
 return {
  rig,
  get profile(){return profile;},
  setProfile,
  setVisible(visible) { rig.visible=visible; },
  fire(now=performance.now()) { firedAt=now; },
  update(now, active) {
   const bob=active?Math.sin(now*.0032)*.006:0;
   // Time-based decay keeps the visual recoil identical at 60 or 240 FPS.
   const kick=Math.exp(-Math.max(0,now-firedAt)/85);
   rig.position.y=-.35+bob+kick*.025;
   rig.position.z=-.95+kick*.11;
   rig.rotation.x=-.08-kick*.075;
   rig.rotation.z=-.035+Math.sin(now*.0021)*.006+kick*.028;
   sight.material.emissiveIntensity=.42+kick*.75;
  },
 };
}
