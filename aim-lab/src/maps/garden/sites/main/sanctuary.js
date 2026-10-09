import * as THREE from 'three';
import layout from './layout.js';
import {mineralMaps} from './materials.js';

// Set dressing remains above the playable sightline or against existing masonry.
export function addSanctuary(root){
 const stone=new THREE.MeshStandardMaterial({color:0xe2d6bb,...mineralMaps('paving'),roughness:1});
 const bronze=new THREE.MeshStandardMaterial({color:0x9d8250,metalness:.55,roughness:.48});
 const dark=new THREE.MeshStandardMaterial({color:0x766c56,roughness:1});
 const mesh=(g,m,p)=>{const o=new THREE.Mesh(g,m);o.position.set(...p);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
 // Carved corbels, bevelled capitals and slender bronze inlays on structural pillars.
 for(const b of layout.cover.filter(b=>b.detail==='pillar')){
  const [x,,z]=b.position,[w,h,d]=b.size;
  for(const [height,scale] of [[h-.12,1.08],[h+.04,1.2],[h+.18,1.08]]){
   const band=mesh(new THREE.CylinderGeometry(w*scale*.70,w*scale*.72,.13,4),stone,[x,height,z]);band.rotation.y=Math.PI/4;
  }
  for(const side of [-1,1]){
   mesh(new THREE.TorusGeometry(.24,.026,5,24),bronze,[x,h-.65,z+side*(d/2+.035)]);
   for(let j=0;j<3;j++){mesh(new THREE.BoxGeometry(.035,h*.63,.018),dark,[x+(j-1)*w*.23,h*.49,z+side*(d/2+.015)]);}
  }
 }
 // Open clerestory arches: lower edges are >6 m, preserving combat sight lines.
 const curve=new THREE.CatmullRomCurve3(Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return new THREE.Vector3(Math.cos(a)*7.4,Math.sin(a)*2.5,0);}));
 for(const z of [-18,5]){
  mesh(new THREE.TubeGeometry(curve,36,.25,8,false),stone,[0,6.95,z]);
  const rim=new THREE.TubeGeometry(curve,36,.032,5,false);mesh(rim,bronze,[0,6.95,z+.18]);
  for(const x of [-7.4,7.4])mesh(new THREE.BoxGeometry(.52,.7,.7),stone,[x,6.8,z]);
 }
 // The large rear relief is supplied by the map landmark layer. Leaving this
 // wall clear avoids stacking multiple ornaments over the same focal point.
 // Fine grit on cover tops adds scale without adding floor obstacles.
 const chips=[];
 for(const [i,b] of layout.cover.entries())if(b.size[1]>.8&&b.size[1]<3)for(let j=0;j<5;j++)chips.push([b.position[0]+Math.sin(i*9+j)*b.size[0]*.34,b.size[1]+.09,b.position[2]+Math.cos(i+j*3)*b.size[2]*.3]);
 const grit=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.065,0),stone,chips.length),matrix=new THREE.Matrix4();
 chips.forEach(([x,y,z],i)=>{matrix.compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(i,i*.3,i*.7)),new THREE.Vector3(1.3,.5,1));grit.setMatrixAt(i,matrix);});grit.castShadow=grit.receiveShadow=true;root.add(grit);
}

export function addLotusSky(root){
 const sky=new THREE.Mesh(new THREE.SphereGeometry(95,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
  vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 vPosition;void main(){float h=clamp(normalize(vPosition).y,0.,1.);vec3 col=mix(vec3(.72,.78,.75),vec3(.24,.49,.62),pow(h,.65));float cloud=sin(vPosition.x*.035+sin(vPosition.z*.05))*sin(vPosition.z*.028);col=mix(col,vec3(.86,.84,.75),smoothstep(.3,.85,cloud)*.25*(1.-h));gl_FragColor=vec4(col,1.);}',
 }));sky.name='lotus-sky';root.add(sky);
 const mountainMat=new THREE.MeshStandardMaterial({color:0x768d84,roughness:1});
 for(let i=0;i<9;i++){
  const mountain=new THREE.Mesh(new THREE.ConeGeometry(9+(i%3)*2,18+(i%4)*3,6),mountainMat);mountain.position.set(-48+i*12,5,-55-(i%2)*7);mountain.rotation.y=i*.71;root.add(mountain);
 }
}
