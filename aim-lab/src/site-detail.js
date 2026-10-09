import * as THREE from 'three';
// Decorative architecture stays beyond the playable walls or above sightlines.
export function detailSite(root,id,block){
 const temple=id==='garden',piazza=id==='piazza';
 if(!temple&&!piazza)return;
 const stone=temple?0xbda480:0xd3c3ae,edge=temple?0x917b60:0xb59d83;
 const mesh=(g,color,p)=>{const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.88}));m.position.set(...p);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
 for(let x=-16;x<=16;x+=8){
  block(x,8,-33,7.5,5,3,stone);block(x,10.6,-33,8,.35,3.4,edge);
  for(const dx of [-2.4,2.4]){
   block(x+dx,6,-31.8,.65,7,.65,edge);
   const arch=mesh(new THREE.TorusGeometry(1.2,.15,6,20,Math.PI),edge,[x,7.8,-31.35]);
   block(x,7,-31.6,2.2,1.5,.1,0x54646a);
   block(x-1.2,7,-31.35,.15,1.6,.2,edge);block(x+1.2,7,-31.35,.15,1.6,.2,edge);
  }
  if(piazza){const roof=mesh(new THREE.ConeGeometry(5.6,2.1,4),0x9e6452,[x,12,-33]);roof.rotation.y=Math.PI/4;roof.scale.z=.65;}
  else{
   for(let j=0;j<4;j++)block(x,11+j*.3,-33,7.8-j,.3,3.8-j*.35,stone);
   for(let j=0;j<7;j++){const petal=mesh(new THREE.SphereGeometry(1,8,6),j%2?0xc786a0:0xe1a9b8,[x+Math.sin(j)*.5,12.3,-32.8+Math.cos(j)*.5]);petal.scale.set(.35,.85,.3);petal.rotation.z=Math.sin(j)*.7;}
  }
 }
 if(piazza){
  block(-11,13,-38,4,11,4,0xc4aa91);block(-11,18.6,-38,4.5,.4,4.5,edge);
  mesh(new THREE.ConeGeometry(3.3,4,4),0x876557,[-11,20.7,-38]);
  for(const x of [-26.5,26.5])for(let z=-26;z<9;z+=7){block(x,7,z,.7,2,2,0x816354);block(x,8.2,z,1,.2,2.3,edge);}
 }else{
  for(const x of [-30,30])for(let z=-28;z<10;z+=7){const rock=mesh(new THREE.DodecahedronGeometry(4,0),0x7c8974,[x,6,z]);rock.scale.set(1,2,1.1);mesh(new THREE.IcosahedronGeometry(3,1),0x527660,[x,12,z]);}
 }
 // Ivy falls along the upper ledge, away from head-height aiming silhouettes.
 for(const x of [-16,-8,0,8,16])for(let j=0;j<12;j++){
  const leaf=mesh(new THREE.SphereGeometry(.18,5,4),j%2?0x58734b:0x76925c,[x+Math.sin(j*2)*.3,6.8-j*.16,-31.15]);leaf.scale.set(1.6,.6,1);
 }
}
