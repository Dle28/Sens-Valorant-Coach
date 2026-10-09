import * as THREE from 'three';

// Tree trunks are outside the playable footprint; crowns live above the roofline.
export function addCanopy(root){
 const bark=new THREE.MeshStandardMaterial({color:0x615647,roughness:1});
 const leaves=new THREE.MeshStandardMaterial({color:0x688158,roughness:.91,side:THREE.DoubleSide});
 const points=[];
 const branch=(a,b,r1,r2)=>{
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,delta.length(),8),bark);m.position.copy(from).lerp(to,.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());m.castShadow=true;root.add(m);
 };
 for(const [tree,[x,z]] of [[-28,-12],[28,-20],[-18,-38],[20,-40]].entries()){
  const sign=x<0?1:-1;
  branch([x,0,z],[x+sign,9,z-.5],.85,.46);branch([x+sign,9,z-.5],[x+sign*2,14,z-1],.46,.16);
  for(let i=0;i<6;i++){
   const angle=i/6*Math.PI*2+tree*.7,start=[x+sign*1.4,9.5+i*.55,z-.6];
   const end=[x+sign*2+Math.cos(angle)*5.5,12.5+i*.35,z+Math.sin(angle)*5.5];branch(start,end,.23,.045);
   for(let j=0;j<95;j++){
    const a=j*2.399,rad=Math.sqrt((j+.5)/95)*3.3;
    points.push([end[0]+Math.cos(a)*rad,end[1]+Math.sin(j*4.7)*.9,end[2]+Math.sin(a)*rad,j+tree*117+i*5]);
   }
  }
 }
 const shape=new THREE.Shape();shape.moveTo(0,-.7);shape.quadraticCurveTo(-.45,-.1,0,.7);shape.quadraticCurveTo(.45,-.1,0,-.7);
 const geo=new THREE.ShapeGeometry(shape,4);const pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++)pos.setZ(i,Math.abs(pos.getX(i))*.35);geo.computeVertexNormals();
 const foliage=new THREE.InstancedMesh(geo,leaves,points.length),matrix=new THREE.Matrix4();
 points.forEach(([x,y,z,k],i)=>{matrix.compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.1+Math.sin(k)*.6,k*1.7,k*.2)),new THREE.Vector3(.6+(k%4)*.17,.6+(k%3)*.15,1));foliage.setMatrixAt(i,matrix);foliage.setColorAt(i,new THREE.Color().setHSL(.20+(k%5)*.007,.24,.42+(k%7)*.035));});
 foliage.castShadow=foliage.receiveShadow=true;foliage.name='lotus-canopy';root.add(foliage);
}
