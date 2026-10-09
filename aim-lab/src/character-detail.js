import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function fabricMap(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const v=214+((x%4<2)!==(y%4<2)?17:0)+((x*13+y*7)%5);data.set([v,v,v,255],(y*size+x)*4);}
 const map=new THREE.DataTexture(data,size,size);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(4,4);map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;return map;
}
export function tailoredTorso(){
 const points=[[.16,-.245],[.185,-.20],[.205,-.08],[.245,.14],[.21,.22],[.15,.245]].map(([r,y])=>new THREE.Vector2(r,y));
 return new THREE.LatheGeometry(points,24);
}
export function chestPlate(){
 const s=new THREE.Shape();s.moveTo(-.115,-.16);s.lineTo(-.16,-.055);s.lineTo(-.15,.095);s.lineTo(-.09,.16);s.lineTo(.09,.16);s.lineTo(.15,.095);s.lineTo(.16,-.055);s.lineTo(.115,-.16);s.closePath();
 return new THREE.ExtrudeGeometry(s,{depth:.055,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.012,bevelThickness:.008});
}

// Original equipment details. Cosmetic parts are merged per parent/material to
// keep ten-bot scenes affordable; moving boot details remain boot-local.
export function dressCharacter({root,legs,armor,cloth,leather,trim,renderMeshes}){
 const metal=new THREE.MeshStandardMaterial({color:0x748894,roughness:.42,metalness:.6});
 const thread=new THREE.MeshStandardMaterial({color:0x72848a,roughness:.95});
 const groups=new Map();
 const part=(g,m,p,rotation=[0,0,0],parent=root)=>{const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1));g.applyMatrix4(matrix);g.deleteAttribute('uv');let byMat=groups.get(parent);if(!byMat){byMat=new Map();groups.set(parent,byMat);}if(!byMat.has(m))byMat.set(m,[]);byMat.get(m).push(g);};
 const stitch=(points,m=thread,r=.0035,parent=root)=>part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,r,4,false),m,[0,0,0],[0,0,0],parent);
 for(const side of [-1,1]){
  // Curved layered shoulder shells follow the upper arm, rather than cube pads.
  part(new THREE.SphereGeometry(.096,14,8,0,Math.PI*2,0,Math.PI*.62),armor,[side*.226,-.338,.012],[0,0,side*-.4]);
  stitch([[side*.13,-.30,.125],[side*.18,-.42,.139],[side*.14,-.64,.125]]);
  stitch([[side*.135,-.82,.09],[side*.17,-.73,.108],[side*.17,-.65,.102]],thread,.004);
  for(const y of [-.365,-.43,-.50])part(new THREE.TorusGeometry(.017,.004,4,10),metal,[side*.128,y,.181]);
  // Belt loops and a closed utility pouch, with a curved flap and snap.
  part(new THREE.CapsuleGeometry(.041,.09,3,8),cloth,[side*.19,-.74,.105],[0,0,Math.PI/2]);
  part(new THREE.SphereGeometry(.042,10,6,0,Math.PI*2,0,Math.PI/2),leather,[side*.19,-.73,.139],[Math.PI/2,0,0]);
  part(new THREE.SphereGeometry(.009,8,4),metal,[side*.19,-.727,.176]);
 }
 // Chest panel seams, zip teeth, dog tag and fine webbing hardware.
 stitch([[-.12,-.39,.183],[-.105,-.49,.189],[-.085,-.59,.176]],leather,.006);
 stitch([[.12,-.39,.183],[.105,-.49,.189],[.085,-.59,.176]],leather,.006);
 for(let i=0;i<11;i++)part(new THREE.BoxGeometry(.017,.004,.003),metal,[0,-.30-i*.026,.154]);
 part(new THREE.TorusGeometry(.012,.003,4,10),metal,[0,-.38,.164]);
 part(new THREE.BoxGeometry(.024,.035,.004),metal,[-.037,-.335,.154],[0,0,.2]);
 // Ribbed grip gloves with separate knuckles and fingers wrapped at the weapon.
 for(const [x,y,z] of [[.17,-.50,.34],[.07,-.49,.55]]){
  for(let i=0;i<4;i++){
   part(new THREE.CapsuleGeometry(.013,.035,3,6),leather,[x-.038+i*.022,y-.025,z+.025],[Math.PI*.38,0,0]);
   part(new THREE.SphereGeometry(.013,8,4),armor,[x-.038+i*.022,y+.027,z+.038]);
  }
  stitch([[x-.045,y+.038,z],[x,y+.05,z+.035],[x+.045,y+.038,z]],thread,.003);
 }
 for(const {boot,side} of legs){
  // Coordinates are local to the animated boot, so tread and laces follow it.
  part(new THREE.BoxGeometry(.154,.022,.25),leather,[0,-.049,0],[0,0,0],boot);
  for(let i=0;i<5;i++){
   part(new THREE.BoxGeometry(.148,.009,.018),thread,[0,-.058,-.095+i*.045],[0,0,0],boot);
   stitch([[-.048,.055,-.07+i*.023],[.048,.055,-.049+i*.023]],thread,.003,boot);
  }
  stitch([[side*.065,-.012,-.10],[side*.074,.027,-.035],[side*.068,-.005,.105]],thread,.0035,boot);
 }
 for(const [parent,byMat] of groups)for(const [material,geometries] of byMat){
  const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
  const mesh=new THREE.Mesh(geometry,material);mesh.name='tailored-equipment-detail';mesh.userData.followTorso=parent===root;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);renderMeshes.push(mesh);
 }
}
