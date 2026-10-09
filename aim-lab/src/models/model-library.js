import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {MODEL_DATA} from './kenney-data.js';

const externalModels=new Map();

// Embedded source files contain their texture palette; no runtime network needed.
export async function loadModel(name){
 const data=MODEL_DATA[name];if(!data)throw new Error(`Unknown model: ${name}`);
 const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
 return new GLTFLoader().parseAsync(bytes.buffer,'');
}
// Downloaded GLBs remain binary application assets.  Keeping them out of the
// JavaScript bundle avoids a large startup/parse cost and lets Electron serve
// them under the same offline-only policy as map textures.
export function loadExternalModel(file){
 if(!/^[a-z0-9-]+\.glb$/i.test(file))throw new Error('Invalid external model name');
 if(!externalModels.has(file))externalModels.set(file,new GLTFLoader().loadAsync(`/assets/models/${file}`));
 return externalModels.get(file);
}
export function cloneModelScene(scene){return cloneSkinned(scene);}
export function fitModel(scene,length){
 scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(scene),size=box.getSize(new THREE.Vector3());
 const holder=new THREE.Group();holder.add(scene);scene.position.sub(box.getCenter(new THREE.Vector3()));holder.scale.setScalar(length/Math.max(size.x,size.y,size.z));return holder;
}
export function fitCharacterModel(scene,height=1.65){
 scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(scene),size=box.getSize(new THREE.Vector3());
 if(size.y<=0)throw new Error('Character model has no height');
 const holder=new THREE.Group(),center=box.getCenter(new THREE.Vector3()),scale=height/size.y;
 holder.add(scene);scene.position.sub(center);holder.scale.setScalar(scale);holder.position.y=-1.6+size.y*.5*scale;
 return holder;
}
export function addAnimatedCrate(parent,position){
 const mount=new THREE.Group();mount.name='animated-supply-crate';mount.position.set(...position);parent.add(mount);
 // Reject a late load if a map rebuild has detached this mount.
 loadModel('crate-medium').then(gltf=>{
  if(mount.parent!==parent){disposeModel(gltf.scene);return;}
  const model=fitModel(gltf.scene,.85);mount.add(model);model.position.y=.20;
  model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
  const mixer=new THREE.AnimationMixer(gltf.scene),clip=gltf.animations.find(c=>c.name==='open-close');
  if(clip)mixer.clipAction(clip).play();
  mount.userData.animate=time=>mixer.setTime((time*.001)%8);
 }).catch(error=>{mount.userData.loadError=error.message;console.warn('Crate model unavailable',error);});
}
export function disposeModel(root){const geos=new Set(),mats=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
