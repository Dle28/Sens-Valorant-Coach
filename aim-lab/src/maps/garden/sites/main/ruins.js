import * as THREE from 'three';
import layout from './layout.js';
function growth(w,h){
 const shape=new THREE.Shape();shape.moveTo(-w/2,h/2);
 for(let i=0;i<=8;i++)shape.lineTo(-w/2+i*w/8,h/2-Math.abs(Math.sin(i*2.7))*.1);
 for(let i=8;i>=0;i--)shape.lineTo(-w/2+i*w/8,-h/2+Math.abs(Math.sin(i*4.1))*h*.7);
 shape.closePath();return new THREE.ShapeGeometry(shape);
}
export function addRuins(root,block){
 const moss=new THREE.MeshStandardMaterial({color:0x506543,roughness:1,side:THREE.DoubleSide});
 const stone=new THREE.MeshStandardMaterial({color:0xa38e69,roughness:.95});
 const petal=new THREE.MeshStandardMaterial({color:0xbb8d90,roughness:.9,side:THREE.DoubleSide});
 // Surface growth sits against existing collision-backed masonry.
 for(const [index,b] of layout.cover.entries()){
  if(b.size[1]<1.2)continue;
  const [x,y,z]=b.position,[w,h,d]=b.size;
  for(const side of [-1,1]){
   for(let j=0;j<3;j++){
    const leaf=new THREE.Mesh(growth(Math.min(w*.35,.8),.22+j*.12),moss);
    leaf.position.set(x+Math.sin(index*9+j)*w*.3,h-.18-j*.22,z+side*(d/2+.062));leaf.rotation.z=Math.sin(index+j)*.4;root.add(leaf);
   }
   // Damaged horizontal carvings: gaps deliberately break the repeated frieze.
   for(let j=0;j<Math.floor(w/.45);j++)if((j+index)%4!==0){const piece=block(x-w/2+.25+j*.45,h-.38,z+side*(d/2+.055),.27,.07,.065,0x796c52);piece.rotation.z=((index+j)%3-1)*.07;}
  }
 }
 // Ancient lotus reliefs and incomplete halo carvings on the sanctuary wall.
 for(const x of [0,5,10]){
  const halo=new THREE.Mesh(new THREE.TorusGeometry(1.12,.075,6,28,Math.PI*1.65),stone);halo.position.set(x,5,-31.04);halo.rotation.z=.2;root.add(halo);
  for(let j=-2;j<=2;j++){
   const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.43,.35,-.4,.8,0,1.22);shape.bezierCurveTo(.4,.8,.43,.35,0,0);
   const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape,12),petal);mesh.position.set(x,4.35,-30.93);mesh.rotation.z=j*.43;root.add(mesh);
  }
  for(let j=0;j<5;j++){const vine=new THREE.Mesh(growth(.25,1.3+j*.16),moss);vine.position.set(x+Math.sin(j*2)*.85,3.4,-31.02);vine.rotation.z=Math.sin(j)*.15;root.add(vine);}
 }
 // Broken parapet teeth stay above the playable silhouette band.
 for(let i=0;i<15;i++)if(i%5!==2){const x=-5+i*1.25,h=.18+(i%3)*.13;const chunk=block(x,8+h/2,-31,1.04,h,.9,0x8d7b60);chunk.rotation.z=(i%3-1)*.025;}
}
