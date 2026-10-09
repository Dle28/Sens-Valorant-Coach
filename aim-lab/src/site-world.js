import {mineralMaps} from './maps/garden/sites/main/materials.js';
import * as THREE from 'three';
import {addAnimatedCrate} from './models/model-library.js';
import { getSite } from './site-layout.js';
import {SITE_BUILDERS} from './maps/index.js';
import {surfaceMaps} from './maps/shared/surfaces.js';
import {renderTraversal} from './maps/shared/traversal.js';
import {masonryGeometry,contactShadows,batchArchitecture,SITE_RENDER_PROFILES,configureShadows} from './maps/shared/render-quality.js';

function addSiteLighting(root,site,profile){
 const sun=new THREE.DirectionalLight(profile.sun,profile.intensity);
 sun.name='site-key-light';sun.position.set(site.interior?-5:-15,28,site.interior?-4:10);sun.target.position.set(0,0,-10);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-30,right:30,top:32,bottom:-32,near:.5,far:85});sun.shadow.bias=-.00015;sun.shadow.normalBias=.035;sun.shadow.radius=2;
 const fill=new THREE.DirectionalLight(profile.fill,profile.fillIntensity);
 fill.name='site-fill-light';fill.position.set(18,15,12);fill.target.position.set(-4,2,-15);
 const rim=new THREE.DirectionalLight(profile.rim,profile.rimIntensity);
 rim.name='site-rim-light';rim.position.set(-16,10,-30);rim.target.position.set(0,2,-6);
 const sky=new THREE.HemisphereLight(profile.sky,profile.ground,profile.ambient);sky.name='site-sky-light';
 const leftAccent=new THREE.PointLight(profile.accent,profile.accentIntensity,20,2);leftAccent.name='site-accent-left';leftAccent.position.set(-21,6,-18);
 const rightAccent=new THREE.PointLight(profile.accent,profile.accentIntensity*.72,18,2);rightAccent.name='site-accent-right';rightAccent.position.set(20,5,-7);
 root.add(sun,sun.target,fill,fill.target,rim,rim.target,sky,leftAccent,rightAccent);
}
export function createSiteWorld(scene){
 let objectiveMesh,objectiveCap,objectiveRing;
 let animatedMaterials=[];
 let renderProfile=SITE_RENDER_PROFILES.garden;
 const root=new THREE.Group();root.visible=false;scene.add(root);
 function build(id){
  const textures=new Set(),oldMaterials=new Set(),oldGeometry=new Set();root.traverse(o=>{if(o.geometry)oldGeometry.add(o.geometry);if(o.isLight)o.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){oldMaterials.add(m);for(const key of ['map','bumpMap','roughnessMap','normalMap','alphaMap'])if(m[key])textures.add(m[key]);}});oldGeometry.forEach(g=>g.dispose());oldMaterials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();
  animatedMaterials=[];
  root.scale.set(1,1,1);root.updateMatrixWorld(true);
  const expanded=getSite(id),site=expanded.visualLayout??expanded;renderProfile=SITE_RENDER_PROFILES[id]??SITE_RENDER_PROFILES.atrium;
  const materials=new Map();
  const surface=id==='garden'?mineralMaps('limestone'):surfaceMaps(id==='foundry'?'metal':'stone');
  const geometryCache=new Map();
  const block=(x,y,z,w,h,d,color)=>{const textured=w*h>2,key=color+':'+textured;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:id==='foundry'?.62:.84,metalness:id==='foundry'?.38:.03,...(textured?surface:{}),normalScale:new THREE.Vector2(.62,.62),dithering:true}));const bevel=h>.4&&Math.min(w,d)>.4&&y-h/2<.15&&Math.max(w,d)<12,gkey=[w,h,d,bevel].join(':');if(!geometryCache.has(gkey))geometryCache.set(gkey,masonryGeometry(w,h,d,bevel));const m=new THREE.Mesh(geometryCache.get(gkey),materials.get(key));m.position.set(x,y,z);m.castShadow=h>.1;m.receiveShadow=true;m.userData.staticArchitecture=true;root.add(m);return m;};
  if(!site.interior)block(0,-.2,-7.5,52,.4,49,0x4d5659);
  renderTraversal(site,block);
  const tiles=new THREE.InstancedMesh(new THREE.BoxGeometry(1.96,.02,1.96),new THREE.MeshStandardMaterial({color:id==='foundry'?0x576773:id==='piazza'?0xb8afa2:0x9a9787,roughness:id==='foundry'?.72:.88,metalness:id==='foundry'?.2:.02,dithering:true}),18*23);
  const matrix=new THREE.Matrix4();let tile=0;for(let x=-17;x<18;x+=2)for(let z=-31;z<14;z+=2){tiles.setMatrixAt(tile,matrix.makeTranslation(x,.005,z));tiles.setColorAt(tile++,new THREE.Color().setScalar(.88+((tile*17)%11)*.012));}tiles.receiveShadow=true;if(!site.interior)root.add(tiles);else{tiles.geometry.dispose();tiles.material.dispose();}
  for(const b of site.cover){const [x,y,z]=b.position,[w,h,d]=b.size;block(x,y,z,w,h,d,b.detail==='lotus-crate'?0x88735b:site.color);
   if(site.authoredTraversal){
    // Lotus trim stays within the authored AABB; no oversized generic plinths.
    const top=y+h/2;
    block(x,top-.085,z,w,.16,d,0xaaa083);
    for(const side of [-1,1])for(let row=.6;row<top;row+=.65){
     block(x,row,z+side*(d/2+.002),w,.014,.009,0x958e7c);
     for(let joint=-w/2+((Math.round(row/.65)%2)?1.1:.55);joint<w/2;joint+=1.1)block(x+joint,row-.325,z+side*(d/2+.002),.014,.63,.009,0x958e7c);
    }
    continue;
   }
   block(x,h+.06,z,w+.12,.12,d+.12,id==='garden'?0x9b8a68:0x343f48);
   for(const side of [-1,1]){block(x+side*(w/2-.12),y,z+d/2+.015,.16,h,.035,site.accent);block(x,y,z+side*d/2,w,.08,.06,site.accent);}
   if(b.detail==='lane-wall'){
    // Buttressed wall bands make long cover readable from either approach.
    for(let offset=-w/2+.35;offset<w/2;offset+=1.6){
     for(const side of [-1,1])block(x+offset,y,z+side*(d/2+.06),.14,h-.18,.12,site.accent);
    }
    for(const side of [-1,1])block(x,h-.42,z+side*(d/2+.035),w,.12,.07,0x384d54);
   }
   if(b.detail==='terrain-step'||b.detail==='terraced-wall'){
    block(x,h+.025,z,Math.max(.1,w-.12),.035,Math.max(.1,d-.12),0x8b9990);
    for(let offset=-w/2+.25;offset<w/2;offset+=.5)block(x+offset,h+.05,z+d/2-.12,.22,.02,.13,0xd8ba79);
   }
   if(b.detail==='pillar'){
    for(const height of [.2,h-.2])block(x,height,z,w+.22,.18,d+.22,site.accent);
    for(const side of [-1,1])block(x+side*.38,y,z+d/2+.03,.07,h-.5,.06,0x354951);
   }
   if(b.detail==='wall-return')block(x,h-.18,z,w,.08,d+.03,site.accent);
   if(b.detail==='supply-cache'){
    for(const side of [-1,1]){
     block(x+side*w*.32,y,z,.08,h+.06,d+.025,0x263541);
     block(x,y+.15,z+side*(d/2+.055),.42,.13,.05,0x263541);
     block(x+.6,y+.25,z+side*(d/2+.06),.22,.28,.04,0xd9b56d);
    }
    for(let i=0;i<4;i++)block(x-.5+i*.3,h+.13,z,.16,.025,d*.7,0x52616a);
   }
   // Recessed face panels and plinths distinguish cover from plain greybox cubes.
   block(x,.13,z,w+.06,.26,d+.06,0x716b60);
   for(const side of [-1,1]){
    block(x,y,z+side*(d/2+.022),Math.max(.3,w-.5),Math.max(.2,h-.5),.025,id==='foundry'?0x465661:id==='piazza'?0xafa58f:0x9e9075);
    for(let row=.55;row<h-.2;row+=.6)block(x,row,z+side*(d/2+.045),w-.35,.018,.018,id==='foundry'?0x2e424f:0x80755f);
   }
  }
  if(!site.interior){
  // Segmented perimeter, inset doors and deep lintels frame the fighting lanes.
  for(let x=-16;x<=16;x+=4){block(x,3.5,-32,3.8,7,1,site.color);block(x,6,-31.4,3.4,.22,.3,site.accent);block(x,1.5,-31.45,1.6,3,.12,0x293b48);}
  for(const x of [-22,22])block(x,3.5,-32,8,7,1,site.color);
  for(const x of [-26,26])for(let z=-29;z<=15;z+=4){block(x,3,z,1,6,3.9,site.color);block(x*.99,2,z,.1,3,1.8,0x344a55);block(x*.985,5.6,z,.2,.15,3.8,site.accent);}
  block(0,3,17,52,6,.5,site.color);
  for(const x of [-16,16])for(const z of [-30,11]){block(x,4,z,.6,8,.6,0x34454d);block(x,7.5,z,1,.25,1,site.accent);}
  // Inset utility panels, ducts and portal frames remain on the perimeter.
  if(id!=='garden')for(const x of [-25.35,25.35])for(const z of [-24,-16,-8,0,12]){
   block(x,2.8,z,.22,2.6,2.4,0x263944);
   for(let row=0;row<6;row++)block(x+(x<0?.13:-.13),2+row*.28,z,.08,.08,2,site.accent);
   block(x,4.6,z,.36,.18,3.4,0x90a8a5);
   block(x,5.3,z,.28,.12,2.1,0xd3c393);
  }
  for(const gate of site.entrances){
   for(const side of [-1,1]){block(gate.x+side*3.25,2,9,.24,3.9,1.25,0x384b51);block(gate.x+side*3.25,3.75,8.3,.12,.18,.08,0x95ded2);}
   block(gate.x,3.8,9,6.6,.18,1.4,0x384b51);
  }
  }
  // A generic objective fixture, not a game-specific device.
  objectiveMesh=block(0,.23,-4,1.1,.46,1.1,0x263642);objectiveCap=block(0,.48,-4,.8,.04,.8,site.accent);
  objectiveMesh.userData.staticArchitecture=false;objectiveCap.userData.staticArchitecture=false;
  const circle=new THREE.Mesh(new THREE.RingGeometry(1.4,1.47,48),new THREE.MeshBasicMaterial({color:site.accent,side:THREE.DoubleSide}));circle.rotation.x=-Math.PI/2;circle.position.set(0,.03,-4);root.add(circle);objectiveRing=circle;
  if(!site.interior&&id!=='foundry')for(const x of [-16,16]){block(x,.5,-12,1,1,2,0x677266);for(let i=0;i<7;i++){const plant=new THREE.Mesh(new THREE.ConeGeometry(.45,1.7,6),new THREE.MeshStandardMaterial({color:0x537759}));plant.position.set(x+Math.sin(i)*.25,1.7,-12+Math.cos(i)*.55);root.add(plant);}}
  else if(id==='foundry')for(const z of [-18,-10,-2]){block(0,7,z,36,.4,.5,0x34424b);block(0,6.75,z,8,.08,.3,0xafdce2);}
  (SITE_BUILDERS[id]??SITE_BUILDERS.atrium)(root,block);
  root.traverse(o=>{if(o.material?.userData.animateTime&&!animatedMaterials.includes(o.material))animatedMaterials.push(o.material);});
  if(!site.authoredTraversal)for(const b of site.cover.filter(b=>b.size[1]>1&&b.size[1]<2.5&&b.size[0]>1&&b.size[2]>1).slice(0,2))addAnimatedCrate(root,[b.position[0],b.position[1]+b.size[1]/2+.1,b.position[2]]);
  contactShadows(root,site.cover);
  root.userData.batching=batchArchitecture(root);
  addSiteLighting(root,site,renderProfile);
  root.scale.set(expanded.worldScale??1,1,expanded.worldScale??1);
  for(const o of [objectiveMesh,objectiveCap,objectiveRing])o.scale.set(1/root.scale.x,1,1/root.scale.z);
  configureShadows(root);root.visible=true;scene.background.set(site.sky);scene.fog.color.set(site.sky);scene.fog.density=renderProfile.fog;
 }
 return {root,build,get renderProfile(){return renderProfile;},update(time){if(root.visible)root.traverse(o=>o.userData.animate?.(time));if(root.visible)for(const material of animatedMaterials)material.uniforms.time.value=time*.001;},setObjective(o){if(objectiveMesh){objectiveMesh.visible=o.phase==='planted';objectiveMesh.position.set(o.position.x/root.scale.x,(o.position.y??0)+.23,o.position.z/root.scale.z);objectiveCap.visible=objectiveRing.visible=objectiveMesh.visible;objectiveCap.position.set(o.position.x/root.scale.x,(o.position.y??0)+.48,o.position.z/root.scale.z);objectiveRing.position.set(o.position.x/root.scale.x,(o.position.y??0)+.03,o.position.z/root.scale.z);}}};
}

