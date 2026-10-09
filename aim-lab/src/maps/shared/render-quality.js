import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const SITE_RENDER_PROFILES=Object.freeze({
 garden:{exposure:1.1,sun:0xffe4bb,intensity:3.8,fog:.003,sky:0x91cbd9,ground:0x526872,ambient:.95,fill:0x8cbcc2,fillIntensity:.42,rim:0xe7c681,rimIntensity:.34,accent:0x7ed1c8,accentIntensity:2.1},
 piazza:{exposure:1.04,sun:0xfff1df,intensity:2.6,fog:.0038,sky:0xb8d5e5,ground:0x876d50,ambient:1.2,fill:0xb8d4dd,fillIntensity:.36,rim:0xe5a76e,rimIntensity:.32,accent:0xe6bb78,accentIntensity:1.9},
 atrium:{exposure:1.07,sun:0xe3f1ff,intensity:2.4,fog:.0042,sky:0x9bc8da,ground:0x53655d,ambient:1.25,fill:0x8ed6dd,fillIntensity:.42,rim:0xb5e6eb,rimIntensity:.38,accent:0x8edce2,accentIntensity:2.2},
 foundry:{exposure:1.13,sun:0xcce5ff,intensity:2.15,fog:.0048,sky:0x23394a,ground:0x1d2930,ambient:1.05,fill:0x638eaa,fillIntensity:.38,rim:0xd59a55,rimIntensity:.46,accent:0xdca15b,accentIntensity:2.5},
});

export const RENDER_QUALITY=Object.freeze({performance:{pixelRatio:1,shadowSize:1024,textureAnisotropy:2},balanced:{pixelRatio:1.5,shadowSize:2048,textureAnisotropy:4},high:{pixelRatio:2,shadowSize:4096,textureAnisotropy:8}});
export function savedRenderQuality(){try{const value=localStorage.getItem('gamesen.render-quality');return RENDER_QUALITY[value]?value:'balanced';}catch{return 'balanced';}}
export function configureRenderer(renderer,quality=savedRenderQuality(),pixelRatio=globalThis.devicePixelRatio??1){
 const preset=RENDER_QUALITY[quality]??RENDER_QUALITY.balanced;
 renderer.setPixelRatio(Math.min(pixelRatio,preset.pixelRatio));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.08;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.shadowMap.autoUpdate=true;
 renderer.shadowMap.needsUpdate=true;
}
export function configureShadows(root,quality=savedRenderQuality()){
 const size=(RENDER_QUALITY[quality]??RENDER_QUALITY.balanced).shadowSize;
 root.traverse(light=>{
  if(!light.isLight||!light.shadow)return;
  if(light.shadow.mapSize.x!==size){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.set(size,size);light.shadow.needsUpdate=true;}
 });
}

// Only explicitly tagged, immutable architecture. Spatial buckets retain culling.
// Objective fixtures, animated meshes, and raycast targets must never enter batches.
export function batchArchitecture(root){
 const groups=new Map(),retired=new Set();
 for(const mesh of root.children){
  if(!mesh.isMesh||!mesh.userData.staticArchitecture||mesh.children.length||Array.isArray(mesh.material))continue;
  const key=[mesh.material.uuid,Math.floor(mesh.position.x/12),Math.floor(mesh.position.z/12),mesh.castShadow,mesh.receiveShadow].join(':');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 }
 let removed=0,batches=0;
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;
  const geometries=meshes.map(mesh=>{mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return g.applyMatrix4(mesh.matrix);});
  const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
  if(!geometry)continue;
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const batch=new THREE.Mesh(geometry,meshes[0].material);batch.name='architecture-batch';batch.castShadow=meshes[0].castShadow;batch.receiveShadow=meshes[0].receiveShadow;
  for(const mesh of meshes){root.remove(mesh);retired.add(mesh.geometry);removed++;}root.add(batch);batches++;
 }
 const retained=new Set();root.traverse(o=>{if(o.geometry)retained.add(o.geometry);});
 retired.forEach(g=>{if(!retained.has(g))g.dispose();});
 return {removed,batches};
}

// Project in local metres so long walls and narrow pillars share a texel density.
export function masonryGeometry(w,h,d,bevel=false){
 const radius=bevel?Math.min(.055,Math.min(w,h,d)*.08):0;
 const g=radius?new RoundedBoxGeometry(w,h,d,1,radius):new THREE.BoxGeometry(w,h,d);
 const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){
  const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));
  const u=x>y&&x>z?p.getZ(i):p.getX(i),v=y>x&&y>z?p.getZ(i):p.getY(i);
  uv.setXY(i,u/2,v/2);
 }
 uv.needsUpdate=true;return g;
}

export function contactShadows(root,cover){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const c=canvas.getContext('2d'),pixels=c.createImageData(64,64);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const edge=Math.max(Math.abs((x-31.5)/31.5),Math.abs((y-31.5)/31.5));
  const alpha=Math.pow(Math.max(0,Math.min(1,(1-edge)/.35)),2)*.25;
  const i=(y*64+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=22;pixels.data[i+3]=Math.round(alpha*255);
 }
 c.putImageData(pixels,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});
 // Only ground-supported objects: decals must not float below elevated geometry.
 const objects=cover.filter(b=>Math.abs(b.position[1]-b.size[1]/2)<.08&&b.size[1]>.5);
 const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,objects.length);
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
 objects.forEach((b,i)=>matrix.compose(new THREE.Vector3(b.position[0],.042,b.position[2]),q,new THREE.Vector3(b.size[0]+.5,b.size[2]+.5,1))&&mesh.setMatrixAt(i,matrix));
 mesh.name='static-contact-shadows';mesh.renderOrder=1;root.add(mesh);
}
