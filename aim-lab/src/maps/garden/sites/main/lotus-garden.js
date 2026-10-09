import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import layout from './layout.js';
export function addLotusGarden(root,block){
 const pink=new THREE.MeshStandardMaterial({color:0xd68caa,emissive:0xa73769,emissiveIntensity:.12,roughness:.55,side:THREE.DoubleSide});
 const leaf=new THREE.MeshStandardMaterial({color:0x586d38,roughness:1,side:THREE.DoubleSide});
 const petal=new THREE.Shape();petal.moveTo(0,0);petal.bezierCurveTo(-.55,.4,-.35,.95,0,1.45);petal.bezierCurveTo(.35,.95,.55,.4,0,0);
 const pg=new THREE.ShapeGeometry(petal,12),lg=new THREE.SphereGeometry(1,6,4);
 const blossom=pg.clone(),vertices=blossom.attributes.position;
 for(let i=0;i<vertices.count;i++){const y=vertices.getY(i);vertices.setZ(i,.30*Math.sin(y/1.45*Math.PI)+Math.abs(vertices.getX(i))*.35);}
 blossom.computeVertexNormals();
 // Blossoms crown the existing columns; their bases remain collision-backed.
 for(const [x,z] of [[-8,-18],[8,-11],[-8,-2],[8,5]]){
  block(x,6.52,z,1.8,.22,1.8,0xb6a17c);
  for(let ring=0;ring<2;ring++)for(let i=0;i<8;i++){
   const pivot=new THREE.Group();pivot.position.set(x,6.67,z);pivot.rotation.y=i*Math.PI/4+ring*.3;
   const p=new THREE.Mesh(blossom,pink);p.rotation.x=ring?.25:.8;p.scale.setScalar(ring?.7:1);pivot.add(p);root.add(pivot);
  }
 }
 const leaves=[],stems=[];
 const stemMat=new THREE.MeshStandardMaterial({color:0x5b5435,roughness:1});
 for(const [index,b] of layout.cover.entries()){
  if(b.size[1]<1||b.size[1]>7)continue;
  for(let branch=0;branch<4;branch++){
   const x=b.position[0]+Math.sin(index*7+branch)*b.size[0]*.35,z=b.position[2]+b.size[2]/2+.09;
   const points=[];
   for(let j=0;j<16;j++){
    const px=x+Math.sin(j*.5+branch)*.13,py=b.size[1]+.08-j*.10;
    points.push(new THREE.Vector3(px,py,z));
    leaves.push([px+(j%2?-.06:.06),py,z+.025,Math.sin(j+index)]);
   }
   stems.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.009,4,false));
  }
 }
 if(stems.length){root.add(new THREE.Mesh(mergeGeometries(stems),stemMat));stems.forEach(g=>g.dispose());}
 const foliage=new THREE.InstancedMesh(lg,leaf,leaves.length),m=new THREE.Matrix4();
 leaves.forEach(([x,y,z,a],i)=>{m.compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,a,a*.5)),new THREE.Vector3(.065+(i%3)*.018,.018,.11+(i%4)*.016));foliage.setMatrixAt(i,m);foliage.setColorAt(i,new THREE.Color(i%3?0x9eb279:0xc6bf83));});foliage.receiveShadow=true;root.add(foliage);
 const engraved=new THREE.MeshStandardMaterial({color:0x9b8561,roughness:1,side:THREE.DoubleSide});
 for(const r of [2.2,2.45]){const ring=new THREE.Mesh(new THREE.RingGeometry(r,r+.035,64),engraved);ring.rotation.x=-Math.PI/2;ring.position.set(0,.03,-4);root.add(ring);}
 for(let i=0;i<12;i++){const pivot=new THREE.Group();pivot.position.set(0,.031,-4);pivot.rotation.y=i*Math.PI/6;const p=new THREE.Mesh(pg,engraved);p.rotation.x=-Math.PI/2;p.scale.set(.35,1.25,1);pivot.add(p);root.add(pivot);}
}
