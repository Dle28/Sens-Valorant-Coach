import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {cloneModelScene,fitCharacterModel,loadExternalModel} from './models/model-library.js';

// Original tactical character. Root is at head centre; boots rest at -1.6 m.
export const ENEMY_HEAD_HEIGHT=1.6;
export const ENEMY_HEAD_RADIUS=.135;
export function createEnemyRig({tint='#d64d60',accent='#91dbdc',variant='sentinel'}={}){
 const root=new THREE.Group(),hurtMeshes=[],legs=[],renderMeshes=[];
 const armor=new THREE.MeshStandardMaterial({color:tint,roughness:.65,metalness:.12});
 const cloth=new THREE.MeshStandardMaterial({color:'#26303c',roughness:.92});
 const leather=new THREE.MeshStandardMaterial({color:'#111c27',roughness:.66});
 const skin=new THREE.MeshStandardMaterial({color:variant==='scout'?'#b58063':variant==='engineer'?'#81513f':'#c99a7d',roughness:.72});
 const hair=new THREE.MeshStandardMaterial({color:variant==='scout'?'#e2d7c5':'#232631',roughness:.95});
 const trim=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.18,roughness:.48});
 const visor=new THREE.MeshStandardMaterial({color:'#101923',metalness:.7,roughness:.2,emissive:'#1b5261',emissiveIntensity:.18});
 const add=(g,m,p,hit=true)=>{const mesh=new THREE.Mesh(g,m);mesh.position.set(...p);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);renderMeshes.push(mesh);if(hit)hurtMeshes.push(mesh);return mesh;};
 const box=(s,m,p,hit=true)=>add(new RoundedBoxGeometry(...s,1,Math.min(...s)*.12),m,p,hit);
 const segment=(a,b,r,m,hit=true)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const mesh=add(new THREE.CapsuleGeometry(r,Math.max(.001,delta.length()-r*2),4,8),m,av.clone().lerp(bv,.5).toArray(),hit);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;};
 const head=add(new THREE.SphereGeometry(1,16,12),skin,[0,0,0]);head.scale.set(.135,.16,.13);head.userData.hitRegion='head';
 const cap=add(new THREE.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI*.5),hair,[0,.061,-.014],false);cap.scale.set(.136,.108,.132);
 // Smaller recessed eyes, visor and mask avoid a toy-like face while keeping
 // the head silhouette clear from any combat distance.
 const eyeWhite=new THREE.MeshStandardMaterial({color:'#17232d',roughness:.38,metalness:.22});
 const lips=new THREE.MeshStandardMaterial({color:'#805b50',roughness:.85});
 for(const side of [-1,1]){
  const eye=add(new THREE.SphereGeometry(1,10,6),eyeWhite,[side*.045,.012,.117],false);eye.scale.set(.018,.008,.009);
  const iris=add(new THREE.SphereGeometry(.005,8,6),trim,[side*.044,.012,.126],false);
  const brow=box([.043,.009,.010],hair,[side*.045,.04,.12],false);brow.rotation.z=side*-.13;
  const ear=add(new THREE.SphereGeometry(1,10,8),skin,[side*.127,-.015,-.005],false);ear.scale.set(.018,.035,.018);
 }
 const nose=add(new THREE.SphereGeometry(1,10,8),skin,[0,-.024,.122],false);nose.scale.set(.017,.026,.02);
 box([.042,.007,.008],lips,[0,-.076,.111],false);
 if(variant==='scout')for(let i=0;i<5;i++){const tuft=add(new THREE.SphereGeometry(1,10,8),hair,[-.08+i*.04,.108,-.008],false);tuft.scale.set(.032,.047,.085);tuft.rotation.z=-.25;}
 else{
  const goggles=box([.245,.052,.026],visor,[0,.015,.123],false);goggles.rotation.x=-.04;
  box([.245,.05,.018],leather,[0,-.078,.117],false);
  for(const side of [-1,1])box([.035,.064,.038],leather,[side*.108,-.044,.105],false);
 }
 const earpiece=box([.025,.046,.035],leather,[.133,.006,0],false);
 segment([.13,-.02,.01],[.085,-.07,.12],.008,leather,false);
 segment([0,-.13,0],[0,-.30,0],.065,skin);
 const torso=add(new THREE.CylinderGeometry(.25,.185,.49,8),cloth,[0,-.52,0]);torso.rotation.y=Math.PI/8;torso.scale.set(1,1,.7);
 const plate=box([.32,.30,.08],armor,[0,-.47,.115]);plate.rotation.x=.08;
 // Layered jacket, collar, webbing and armour panels, all cosmetic additions.
 for(const side of [-1,1]){
  const collar=box([.075,.12,.07],armor,[side*.093,-.265,.035],false);collar.rotation.z=side*.27;
  const shoulderPad=add(new THREE.SphereGeometry(1,12,8),armor,[side*.225,-.33,.018],false);shoulderPad.scale.set(.09,.075,.1);
  const strap=box([.041,.37,.018],leather,[side*.13,-.47,.165],false);strap.rotation.z=side*.10;
  box([.05,.036,.018],trim,[side*.13,-.39,.179],false);
  const coat=box([.095,.22,.19],armor,[side*.135,-.76,-.025],false);coat.rotation.z=side*.09;
 }
 box([.012,.32,.015],trim,[0,-.49,.163],false);
 box([.075,.048,.023],leather,[.06,-.43,.165],false);
 for(let i=0;i<3;i++)box([.058,.08,.04],leather,[-.075+i*.075,-.58,.172],false);
 const badge=box([.038,.042,.013],trim,[-.06,-.385,.172],false);badge.rotation.z=Math.PI/4;
 box([.24,.28,.085],leather,[0,-.48,-.14],false);
 box([.14,.16,.035],armor,[0,-.47,-.19],false);
 if(variant==='engineer'){
  box([.23,.036,.025],leather,[0,.063,.12],false);
  for(const side of [-1,1])box([.074,.046,.025],trim,[side*.05,.063,.137],false);
  box([.08,.14,.075],armor,[-.19,-.77,.05],false);
 }else if(variant==='scout'){
  const scarf=box([.14,.26,.03],cloth,[-.1,-.36,-.17],false);scarf.rotation.z=-.25;
  segment([-.23,-.35,.08],[.16,-.66,.17],.015,leather,false);
 }
 root.userData.variant=variant;
 box([.035,.26,.022],trim,[-.105,-.47,.165],false);
 box([.3,.11,.20],leather,[0,-.80,0]);
 const hips=add(new THREE.SphereGeometry(1,12,8),cloth,[0,-.85,0]);hips.scale.set(.17,.14,.12);
 for(const side of [-1,1]){
  box([.07,.105,.065],armor,[side*.105,-.69,.125],false);
  const first=root.children.length;
  const hip=[side*.115,-.86,0],knee=[side*.145,-1.17,side*.03],ankle=[side*.19,-1.49,side*.04];
  segment(hip,knee,.095,cloth);segment(knee,ankle,.072,cloth);
  box([.13,.115,.08],armor,[knee[0],knee[1],knee[2]+.07]);
  box([.155,.12,.255],leather,[ankle[0],-1.54,ankle[2]+.055]);
  const parts=root.children.slice(first),pivot=new THREE.Group();pivot.position.set(side*.115,-.86,0);root.add(pivot);root.updateMatrixWorld(true);for(const part of parts){part.userData.hitRegion='leg';pivot.attach(part);}legs.push(pivot);
 }
 // Both arms reach the rifle grip/fore-end; shoulders stay close to the torso.
 const arms=[[[.21,-.32,0],[.28,-.57,.12],[.17,-.50,.34]],[[-.21,-.32,0],[-.26,-.54,.19],[.07,-.49,.55]]];
 for(const [shoulder,elbow,hand] of arms){segment(shoulder,elbow,.072,armor);segment(elbow,hand,.058,cloth);add(new THREE.SphereGeometry(.063,8,6),leather,hand);}
 // Vandal-style angular rifle, authored with primitives.
 root.userData.weapon='vandal';
 box([.11,.13,.34],leather,[.12,-.43,.33],false);
 box([.09,.10,.22],leather,[.12,-.44,-.015],false);
 box([.11,.17,.055],cloth,[.12,-.45,-.135],false);
 const magazine=box([.065,.23,.10],leather,[.12,-.60,.43],false);magazine.rotation.x=-.23;
 for(let i=0;i<4;i++)box([.071,.018,.085],cloth,[.12,-.52-i*.045,.43+i*.01],false);
 box([.075,.025,.38],cloth,[.12,-.36,.39],false);
 for(let i=0;i<6;i++)box([.08,.022,.018],leather,[.12,-.34,.25+i*.045],false);
 box([.045,.08,.035],leather,[.12,-.37,.74],false);
 box([.058,.06,.08],cloth,[.12,-.43,.80],false);
 // Weapon and small accessories never count as character hits.
 box([.095,.095,.44],leather,[.12,-.43,.37],false);
 box([.08,.075,.18],cloth,[.12,-.43,.06],false);
 box([.075,.14,.065],leather,[.12,-.53,.31],false);
 box([.07,.13,.09],leather,[.12,-.53,.43],false);
 box([.035,.04,.24],leather,[.12,-.43,.68],false);
 const muzzle=new THREE.Object3D();muzzle.position.set(.12,-.43,.82);root.add(muzzle);
 const flash=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),new THREE.MeshBasicMaterial({color:'#ffe7a0'}));flash.visible=false;muzzle.add(flash);
 const hitbox=add(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),[0,0,0],false);hitbox.name='enemy-hitbox';
 // The full SAS mesh is optional so the open-source build still starts before
 // the CC BY binary is installed.  Hit meshes remain in place for stable aim
 // scoring even after their primitive presentation is muted.
 const agentMount=new THREE.Group();agentMount.name='sas-agent-visual';root.add(agentMount);
 let agentMixer=null,agentBaseY=0;
 loadExternalModel('sas-cs2-blue.glb').then(gltf=>{
  if(!agentMount.parent)return;
  const visual=fitCharacterModel(cloneModelScene(gltf.scene),1.65);visual.name='sas-cs2-blue';
  visual.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  agentMount.add(visual);agentBaseY=visual.position.y;
  const clip=gltf.animations.find(c=>/idle|stand/i.test(c.name))??gltf.animations[0];
  if(clip){agentMixer=new THREE.AnimationMixer(visual);agentMixer.clipAction(clip).play();}
  for(const mesh of renderMeshes){
   if(mesh===hitbox)continue;
   mesh.castShadow=false;mesh.receiveShadow=false;
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.colorWrite=false;
  }
 }).catch(error=>{root.userData.agentAssetError=error.message;});
 root.visible=false;
 const upper=root.children.filter(o=>!legs.includes(o)&&o!==hitbox&&o!==agentMount);const bases=upper.map(o=>o.position.clone());
 let phase=0,blend=0,lean=0;
 function animate(velocity,dt,time,crouch=0){
  const speed=Math.hypot(velocity?.x??0,velocity?.z??0),k=1-Math.exp(-12*dt);blend+=(Math.min(1,speed/1.65)-blend)*k;
  phase+=speed*dt*5.5;
  const yaw=root.rotation.y,lateral=(velocity?.x??0)*Math.cos(yaw)-(velocity?.z??0)*Math.sin(yaw);lean+=(lateral*.025-lean)*k;
  legs.forEach((leg,i)=>{const stride=Math.sin(phase+i*Math.PI)*blend;leg.scale.y=1-crouch*.56;leg.rotation.x=stride*.30+crouch*.22;leg.rotation.z=-lean*.7;});
  const bob=Math.abs(Math.sin(phase))*.018*blend+Math.sin(time*.0018)*.005*(1-blend);
  upper.forEach((part,i)=>{part.position.copy(bases[i]);part.position.y+=bob;part.position.x+=lean;});
  if(agentMixer)agentMixer.update(dt);
  if(agentMount.children[0])agentMount.children[0].position.y=agentBaseY+bob;
 }
 return {root,muzzle,flash,core:plate,hitbox,hurtMeshes,animate};
}
