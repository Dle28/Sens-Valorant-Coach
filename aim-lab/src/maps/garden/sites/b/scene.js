import * as THREE from 'three';
import layout from './layout.js';
import {mineralMaps} from '../main/materials.js';
import {addCarvings,energyPanelMap} from './carvings.js';
export function buildDetails(root,block){
 const stone=new THREE.MeshStandardMaterial({color:0xb8bdb7,roughness:.92,...mineralMaps('limestone'),side:THREE.DoubleSide});
 const brass=new THREE.MeshStandardMaterial({color:0xb7a477,roughness:.66,metalness:.12,side:THREE.DoubleSide});
 const energy=energyPanelMap();
 const teal=new THREE.MeshStandardMaterial({map:energy,emissiveMap:energy,color:0xffffff,emissive:0xffffff,emissiveIntensity:.5,roughness:.28});
 const violet=new THREE.MeshStandardMaterial({color:0xc583ac,emissive:0xa15089,emissiveIntensity:.3,roughness:.4,side:THREE.DoubleSide});
 const mesh=(geometry,material,x,y,z,rx=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.rotation.x=rx;m.castShadow=true;m.receiveShadow=true;m.userData.staticArchitecture=true;root.add(m);return m;};
 const ring=(inner,outer,y,material=stone)=>mesh(new THREE.RingGeometry(inner,outer,96),material,0,y,-13,-Math.PI/2);
 // Real opening in the floor: the rendered treads and terrainHeight share pit data.
 const floor=new THREE.Shape();floor.moveTo(-8,-21);floor.lineTo(8,-21);floor.lineTo(8,-5);floor.lineTo(-8,-5);floor.closePath();
 const hole=new THREE.Path();hole.absarc(0,-13,layout.pit.radius,0,Math.PI*2,true);floor.holes.push(hole);
 mesh(new THREE.ShapeGeometry(floor,96),stone,0,0,0,Math.PI/2);
 for(const r of layout.rooms.slice(1))block(r.x,-.12,r.z,r.width,.24,r.depth,0xaaa38e);
 const p=layout.pit,stepWidth=(p.radius-p.innerRadius)/p.steps;
 for(let i=0;i<p.steps;i++){
  const outer=p.radius-i*stepWidth,inner=outer-stepWidth,y=-(i+1)*p.depth/p.steps;
  ring(inner,outer,y);
  const riser=mesh(new THREE.CylinderGeometry(outer,outer,p.depth/p.steps,96,1,true),stone,0,y+p.depth/p.steps/2,-13);riser.castShadow=false;
 }
 mesh(new THREE.CircleGeometry(p.innerRadius,96),stone,0,-p.depth,-13,-Math.PI/2);
 ring(4.62,4.69,.012,brass);
 // Floor joints stop at the pit; individually laid perimeter flags.
 for(let x=-7;x<=7;x+=2)for(let z=-20;z<=-6;z+=2)if(Math.hypot(x,z+13)>5.8){
  block(x,.008,z,1.96,.012,1.96,((x+z)%4===0)?0xb2aa93:0xa79f89);
 }
 // Coffered roof with a circular oculus, not a solid plate over the chamber.
 const roof=new THREE.Shape();roof.moveTo(-8,-8);roof.lineTo(8,-8);roof.lineTo(8,8);roof.lineTo(-8,8);roof.closePath();
 const aperture=new THREE.Path();aperture.absarc(0,0,3.8,0,Math.PI*2,true);roof.holes.push(aperture);
 mesh(new THREE.ShapeGeometry(roof,96),stone,0,7,-13,-Math.PI/2);
 ring(3.74,3.88,6.88,brass);ring(3.88,4.35,6.9,violet);ring(4.35,4.48,6.88,brass);
 mesh(new THREE.CylinderGeometry(3.8,3.8,.55,96,1,true),brass,0,7.13,-13);
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,x=Math.cos(a)*4.1,z=-13+Math.sin(a)*4.1;
  const rib=block(x,7.12,z,.12,.16,.8,0xb8a575);rib.rotation.y=-a+Math.PI/2;
 }
 // Horizontal friezes sit above door lintels, keeping every aperture clear.
 for(const [z] of [[-5.1],[-20.9]])for(const y of [4.8,6.4,6.7])block(0,y,z,15.8,.13,.2,0x8f8569);
 for(const x of [-7.9,7.9])for(const y of [4.8,6.4,6.7])block(x,y,-13,.2,.13,15.8,0x8f8569);
 for(const door of [...layout.entrances,layout.upperEntrance]){
  const side=door.axis==='x',half=door.width/2,base=door.height??0;
  const crown=base?3.9:4.8,shoulder=crown-1.2;
  const portal=new THREE.Shape();portal.moveTo(-half,shoulder);portal.quadraticCurveTo(-half*.7,crown-.25,0,crown);portal.quadraticCurveTo(half*.7,crown-.25,half,shoulder);portal.lineTo(half,7-base);portal.lineTo(-half,7-base);portal.closePath();
  const arch=mesh(new THREE.ExtrudeGeometry(portal,{depth:.7,bevelEnabled:false,curveSegments:24}),stone,door.x,base,door.z-.35);
  if(side){arch.rotation.y=Math.PI/2;arch.position.set(door.x-.35,base,door.z);}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#827963';ctx.fillRect(0,0,512,96);ctx.font='500 36px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e4dbc2';ctx.fillText(door.name,256,61);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const label=mesh(new THREE.PlaneGeometry(1.65,.31),new THREE.MeshStandardMaterial({map,roughness:1}),door.x,5.3+base,door.z+(side?0:.38));
  if(side){label.rotation.y=door.x<0?Math.PI/2:-Math.PI/2;label.position.x+=door.x<0?.38:-.38;}
 }
 // Cyan insets and pointed stone surrounds, all flush with collision walls.
 const panel=(x,z,turn)=>{
  const group=new THREE.Group();root.add(group);group.position.set(x,0,z);group.rotation.y=turn;
  const part=(g,m,px,py,pz)=>{const o=new THREE.Mesh(g,m);o.position.set(px,py,pz);o.castShadow=true;group.add(o);};
  part(new THREE.BoxGeometry(.82,4.5,.11),stone,0,2.75,0);
  part(new THREE.BoxGeometry(.46,3.2,.12),teal,0,2.8,.035);
  for(const dx of [-.31,.31])part(new THREE.BoxGeometry(.09,3.5,.18),brass,dx,2.8,.06);
  const cap=new THREE.Shape();cap.moveTo(-.4,0);cap.quadraticCurveTo(-.42,.55,0,.82);cap.quadraticCurveTo(.42,.55,.4,0);cap.closePath();part(new THREE.ShapeGeometry(cap),stone,0,5,.06);

 };
 for(const x of [-6.8,-2.1,6.6])panel(x,-20.53,0);
 for(const z of [-7.3,-13.3])panel(-7.53,z,Math.PI/2);
 for(const z of [-12.5,-19])panel(7.53,z,-Math.PI/2);
 // Carved medallion on the rear return and restrained lotus reliefs on crates.
 const seal=mesh(new THREE.TorusGeometry(.62,.075,8,40),brass,4.65,2.8,-16.34);seal.rotation.z=Math.PI/4;
 mesh(new THREE.TorusGeometry(.38,.04,8,32),stone,4.65,2.8,-16.32);
 for(const y of [1.1,4.7,5.1,6.6])block(4.65,y,-18.7,1.42,.13,4.65,0x9ba9a4);
 for(const x of [4.13,5.17])block(x,3,-16.36,.09,3.3,.08,0xabb3a9);
 const nicheOutline=new THREE.CatmullRomCurve3([new THREE.Vector3(4.15,1.4,-16.32),new THREE.Vector3(4.15,3.4,-16.32),new THREE.Vector3(4.65,4.05,-16.32),new THREE.Vector3(5.15,3.4,-16.32),new THREE.Vector3(5.15,1.4,-16.32)]);
 mesh(new THREE.TubeGeometry(nicheOutline,32,.035,6,false),brass,0,0,0);
 // Stone flags on the connected platform, kept inside its collision extents.
 for(let x=-.85;x<4.05;x+=1.1)for(let z=-18.5;z<-11.7;z+=1.1)block(x,1.352,z,1.075,.012,1.075,0xbac0b6);
 // Repeated shallow lotus reliefs form a continuous carved frieze.
 const petalShape=new THREE.Shape();petalShape.moveTo(0,0);petalShape.bezierCurveTo(-.28,.17,-.23,.42,0,.56);petalShape.bezierCurveTo(.23,.42,.28,.17,0,0);
 const petalGeo=new THREE.ShapeGeometry(petalShape);
 const relief=(x,y,z,angle=0)=>{for(let i=-1;i<=1;i++){const m=mesh(petalGeo,brass,x,y,z);m.rotation.y=angle;m.rotateZ(i*.6);m.scale.setScalar(.55);}};
 for(let x=-7;x<=7;x+=.65){relief(x,5.95,-20.52);relief(x,5.95,-5.48,Math.PI);}
 for(let z=-20;z<=-6;z+=.65){relief(-7.52,5.95,z,Math.PI/2);relief(7.52,5.95,z,-Math.PI/2);}
 // Coffers and inset arch niches add depth to broad walls above the combat band.
 for(const x of [-7.5,7.5])for(const z of [-6,-13,-20]){
  for(const y of [5.2,5.78])block(x,y,z,.07,.06,1.8,0xc0b397);
  for(const dz of [-.88,.88])block(x,5.5,z+dz,.07,.62,.065,0xc0b397);
 }
 for(const x of [-6.5,3.8,6.8])for(const y of [1.05,4.5])block(x,y,-20.5,.85,.11,.13,0xc0b397);
 // High ceiling ribs radiate away from the oculus into the square chamber.
 for(const z of [-19.8,-6.2])block(0,6.86,z,15.8,.14,.12,0xb2a483);
 for(const x of [-7,7])block(x,6.86,-13,.12,.14,15.8,0xb2a483);
 for(const b of layout.cover.filter(b=>b.detail==='lotus-crate')){
  const [x,y,z]=b.position,[w,h,d]=b.size;
  for(const side of [-1,1]){
   block(x,y,z+side*(d/2+.008),w-.18,h-.18,.012,0xa28a6c);
   for(let i=-1;i<=1;i++){const leaf=mesh(new THREE.SphereGeometry(.22,10,6),stone,x+i*.15,y,z+side*(d/2+.035));leaf.scale.set(.6,1.4,.13);leaf.rotation.z=i*-.4;}
  }
 }
 // Upper silhouettes and foliage frame the opening without hiding head-height targets.
 const leaves=new THREE.MeshStandardMaterial({color:0x677f3f,roughness:.95,side:THREE.DoubleSide});
 for(let i=0;i<28;i++){
  const a=i*2.39996,r=3.95+(i%4)*.14,x=Math.cos(a)*r,z=-13+Math.sin(a)*r,y=7.18-(i%7)*.09;
  const leaf=mesh(new THREE.SphereGeometry(.17,5,3),leaves,x,y,z);leaf.scale.set(1,.25,1.8);leaf.rotation.y=a;
 }
 addCarvings(root,stone,brass);
 // Simple corridor ceilings give the chamber a visible light/shadow transition.
 for(const r of layout.rooms.slice(1))block(r.x,5.5,r.z,r.width,.25,r.depth,0x918b7c);
 const light=new THREE.PointLight(0x85d8d3,28,22,2);light.position.set(1,4.8,-15);root.add(light);
 const bounce=new THREE.AmbientLight(0xadcbd1,.28);root.add(bounce);
}


