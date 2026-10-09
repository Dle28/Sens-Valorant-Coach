import * as THREE from 'three';

// Original reliefs and plant circuitry; no downloaded game art is embedded.
export function addCarvings(root,stone,brass){
 const dark=new THREE.MeshStandardMaterial({color:0x5d767b,roughness:.96});
 const sculpt=new THREE.MeshStandardMaterial({color:0xa6a598,roughness:.9});
 const add=(g,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;o.userData.staticArchitecture=true;parent.add(o);return o;};
 const curve=(points,radius,material,parent=root)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,radius,6,false),material,0,0,0,parent);
 for(const [x,z,rotation] of [[-7.48,-12,Math.PI/2],[7.48,-14,-Math.PI/2],[-4.7,-20.48,0]]){
  const niche=new THREE.Group();niche.position.set(x,0,z);niche.rotation.y=rotation;root.add(niche);
  const shape=new THREE.Shape();shape.moveTo(-.65,0);shape.lineTo(-.65,1.25);shape.quadraticCurveTo(-.6,1.8,0,2);shape.quadraticCurveTo(.6,1.8,.65,1.25);shape.lineTo(.65,0);shape.closePath();
  add(new THREE.ShapeGeometry(shape),dark,0,2.1,0,niche);
  curve([[-.69,2.1,.035],[-.69,3.4,.035],[0,4.15,.035],[.69,3.4,.035],[.69,2.1,.035]],.055,sculpt,niche);
  // Stylized seated sentinel: halo, head, folded limbs and stone plinth.
  add(new THREE.TorusGeometry(.36,.035,8,32),sculpt,0,3.42,.05,niche);
  const head=add(new THREE.SphereGeometry(.16,12,8),sculpt,0,3.4,.13,niche);head.scale.z=.6;
  const body=add(new THREE.SphereGeometry(.33,12,8),sculpt,0,2.98,.12,niche);body.scale.set(.7,1,.42);
  for(const sign of [-1,1]){
   curve([[sign*.15,3.2,.14],[sign*.35,2.93,.15],[0,2.88,.23]],.07,sculpt,niche);
   const knee=add(new THREE.SphereGeometry(.29,12,8),sculpt,sign*.24,2.59,.16,niche);knee.scale.set(1,.45,.5);
  }
  add(new THREE.BoxGeometry(1.05,.14,.26),sculpt,0,2.36,.05,niche);
 }
 // Concentric ceiling engravings, centered in each coffer outside the oculus.
 for(const [x,z] of [[-6,-13],[6,-13],[0,-19.8],[0,-6.3],[-6,-19.5],[6,-6.5]]){
  for(const r of [.45,.7,1]){const o=add(new THREE.TorusGeometry(r,.022,4,48),dark,x,6.97,z);o.rotation.x=Math.PI/2;}
 }
 // Embedded plant conduits extend around the room above the aiming band.
 const vine=new THREE.MeshStandardMaterial({color:0x536440,roughness:.98});
 for(const x of [-7.7,7.7])curve([[x,6.56,-5],[x,6.48,-10],[x,6.58,-15],[x,6.49,-21]],.095,vine);
 const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(-.18,.2,0,.48);leafShape.quadraticCurveTo(.18,.2,0,0);
 const leafGeo=new THREE.ShapeGeometry(leafShape),leafMat=new THREE.MeshStandardMaterial({color:0x647b44,roughness:1,side:THREE.DoubleSide});
 for(let i=0;i<100;i++){
  const a=i*2.39996,r=3.85+(i%5)*.17,y=7.3-(i%9)*.065,x=Math.cos(a)*r,z=-13+Math.sin(a)*r;
  const leaf=add(leafGeo,leafMat,x,y,z);leaf.rotation.set(.5+i%3,a,.4);leaf.scale.setScalar(.8+(i%4)*.25);
 }
 // Weathered vertical monoliths frame the sky with carved inset silhouettes.
 for(const x of [-3.2,3.2]){
  const base=add(new THREE.BoxGeometry(1.65,4.8,.9),stone,x,9.4,-17.9);
  add(new THREE.SphereGeometry(.8,12,8),stone,x,11.8,-17.9).scale.set(1,.9,.55);
  add(new THREE.TorusGeometry(.48,.055,8,32),brass,x,10.6,-17.4);
  const body=add(new THREE.ConeGeometry(.48,1.6,5),sculpt,x,9.4,-17.37);body.scale.z=.2;
  for(const y of [7.3,8,11.3])add(new THREE.BoxGeometry(1.8,.15,1),stone,x,y,-17.9);
  base.name='lotus-sky-monolith';
 }
}

export function energyPanelMap(){
 const c=document.createElement('canvas');c.width=128;c.height=512;const g=c.getContext('2d');
 const gradient=g.createLinearGradient(0,0,128,0);gradient.addColorStop(0,'#73ded9');gradient.addColorStop(.13,'#245c62');gradient.addColorStop(.65,'#3c8b8b');gradient.addColorStop(1,'#84ded0');g.fillStyle=gradient;g.fillRect(0,0,128,512);
 g.strokeStyle='#9cf6e5';g.lineWidth=2;g.shadowColor='#85ffef';g.shadowBlur=12;
 g.beginPath();g.moveTo(55,0);g.bezierCurveTo(140,100,-25,120,59,230);g.bezierCurveTo(116,320,20,440,80,512);g.stroke();
 for(const [x,y,dx] of [[63,85,-55],[46,160,80],[66,260,-66],[62,390,66]]){g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+dx*.25,y+30,x+dx,y+72);g.stroke();}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return map;
}


