import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TACTICAL_LESSONS, sampleLesson, head, sightline } from './tactical-lessons.js';

const CYAN=0x45dcf0,RED=0xff6245;
const vector=p=>new THREE.Vector3(...p);
function disposeGroup(group){
 group.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
 group.clear();
}
function block(parent,p,size,color,roughness=.82){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness}));
 mesh.position.set(...p);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function mannequin(parent,color,ghost=false){
 const group=new THREE.Group();parent.add(group);
 const material=new THREE.MeshStandardMaterial({color,roughness:.42,metalness:.25,emissive:color,emissiveIntensity:ghost?.15:.22,transparent:ghost,opacity:ghost?.17:1,depthWrite:!ghost});
 const add=(geometry,position)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.castShadow=!ghost;group.add(mesh);return mesh;};
 add(new THREE.SphereGeometry(.19,12,10),[0,1.55,0]);
 add(new THREE.BoxGeometry(.52,.58,.3),[0,1.02,0]);
 add(new THREE.BoxGeometry(.22,.08,.055),[0,1.56,.18]);
 for(const side of [-1,1]){
  add(new THREE.CapsuleGeometry(.10,.46,4,8),[side*.16,.38,0]);
  const arm=add(new THREE.CapsuleGeometry(.09,.32,4,8),[side*.31,1.02,.17]);arm.rotation.x=-.6;
  add(new THREE.BoxGeometry(.2,.12,.35),[side*.16,.06,.07]);
 }
 add(new THREE.BoxGeometry(.09,.10,.62),[.17,1.05,.45]);
 const muzzle=add(new THREE.SphereGeometry(.09,8,6),[.17,1.05,.8]);muzzle.material=new THREE.MeshBasicMaterial({color:0xffe5aa});muzzle.visible=false;
 return {group,muzzle};
}
function line(parent,points,color,dashed=false,width=.035){
 if(points.length<2)return;
 if(dashed){const object=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(vector)),new THREE.LineDashedMaterial({color,dashSize:.25,gapSize:.17,transparent:true,opacity:.78}));object.computeLineDistances();parent.add(object);return object;}
 const curve=new THREE.CatmullRomCurve3(points.map(vector),false,'centripetal');
 const object=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(12,points.length*10),width,5,false),new THREE.MeshBasicMaterial({color}));parent.add(object);return object;
}
function arrow(parent,from,to,color,width=.05){
 if(vector(from).distanceTo(vector(to))<.04)return;
 line(parent,[from,to],color,false,width);
 const direction=vector(to).sub(vector(from)).normalize();
 const cone=new THREE.Mesh(new THREE.ConeGeometry(width*3.5,.34,8),new THREE.MeshBasicMaterial({color}));
 cone.position.copy(vector(to));cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);parent.add(cone);
}
function ring(parent,p,color,radius=.42){
 const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.035,radius,32),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.set(p[0],p[1]+.025,p[2]);parent.add(mesh);
}
function arc(parent,from,to,color,width=.04){
 const a=vector(from),b=vector(to),mid=a.clone().lerp(b,.5);mid.y+=Math.min(1.4,a.distanceTo(b)*.22);
 line(parent,[from,mid.toArray(),to],color,false,width);
 const tangent=b.clone().sub(mid).normalize();arrow(parent,b.clone().addScaledVector(tangent,-.25).toArray(),to,color,width);
}
function floorRegion(parent,x,z,color){
 const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.35,.35),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.045,z);parent.add(mesh);
}
function terrain(parent,lesson){
 block(parent,[0,-.28,0],[20,.5,20],0x746c59);
 for(let x=-9;x<=9;x+=1.5)for(let z=-9;z<=9;z+=1.5)block(parent,[x,-.005,z],[1.45,.04,1.45],((Math.round(x*2+z*4)%3)+3)%3===0?0xa49a80:0x938870);
 for(const cover of lesson.cover){
  const {position:p,size:s}=cover;block(parent,p,s,s[1]>2?0xb4a58a:0x536570);
  block(parent,[p[0],p[1]+s[1]/2+.055,p[2]],[s[0]+.08,.11,s[2]+.08],0xc6b899);
  for(const side of [-1,1])block(parent,[p[0]+side*(s[0]/2-.06),p[1],p[2]+s[2]/2+.025],[.10,s[1],.06],0x736e61);
  if(s[1]>2)for(let y=.6;y<s[1];y+=.65)block(parent,[p[0],y,p[2]+s[2]/2+.008],[s[0],.018,.015],0x847a66);
 }
 // Low cutaway perimeter keeps the whole interaction visible from above.
 block(parent,[0,.38,-9.7],[20,.8,.4],0xa99b83);
 block(parent,[-9.7,.38,0],[.4,.8,20],0xa99b83);
 for(const x of [-8.8,8.8])for(const z of [-8.5,8.5]){
  block(parent,[x,.35,z],[.75,.7,.75],0x6e6555);
  for(let i=0;i<5;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.22,.9,5),new THREE.MeshStandardMaterial({color:0x4b6952}));leaf.position.set(x+Math.cos(i*2)*.22,1,z+Math.sin(i*2)*.22);leaf.rotation.z=Math.sin(i)*.3;parent.add(leaf);}
 }
 for(const e of lesson.enemies)if(e.position[1]>0){for(let i=0;i<6;i++){const h=e.position[1]*(i+1)/6;block(parent,[e.position[0]+2,h/2,e.position[2]+3-i*.5],[1.2,h,.5],0xada087);}}
 if(lesson.retake){block(parent,[0,.35,-5],[.7,.7,.7],0x394b56);block(parent,[0,.73,-5],[.35,.05,.35],0xf0b45e);}
}

export function initTacticalLab(page){
 page.innerHTML=`<div class="tactical-lab"><header class="tl-heading"><div><span>TACTICAL LAB / 10 SCENARIOS</span><h1>Movement & angle control</h1></div><label>Tình huống<select id="tl-lesson">${TACTICAL_LESSONS.map(l=>`<option value="${l.id}">${l.title}</option>`).join('')}</select></label></header><div class="tl-stage"><canvas aria-label="Micro-map chiến thuật 3D tương tác"></canvas><p class="tl-error" hidden></p></div><div class="tl-controls"><button type="button" id="tl-play">Phát mô phỏng</button><button type="button" id="tl-reset">Về đầu</button><label class="tl-time">Diễn tiến<input id="tl-time" type="range" min="0" max="1000" value="0" step="1"/></label><label>Tốc độ<select id="tl-speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></label><button type="button" id="tl-camera">Góc nhìn chuẩn</button><button type="button" id="tl-full">Toàn màn hình</button><label><input type="checkbox" id="tl-overlays" checked/> Đường hướng dẫn</label></div><nav class="tl-steps" aria-label="Các bước chiến thuật"></nav><div class="tl-caption"><div><h2 id="tl-phase"></h2><p id="tl-goal"></p></div><div><span class="tl-cyan">Cyan · Người chơi</span><span class="tl-red">Cam · Địch</span><p id="tl-los" aria-live="polite"></p></div></div><p class="tl-note">Kéo để xoay · Cuộn để zoom · Bóng mờ là vị trí trước đó. Mô phỏng minh họa, không ghi điểm phiên tập. Đường nhìn trong cảnh 3D được kiểm tra với vật che.</p></div>`;
 const $=s=>page.querySelector(s),canvas=$('canvas'),stage=$('.tl-stage');
 let renderer,controls,world,actors,guides,staticGuides,ghosts,scene,camera,playerRig,enemyRigs=[];
 let lesson=TACTICAL_LESSONS[0],time=0,playing=false,last=0,active=false,raf=0;
 function standardCamera(){camera.position.set(13,18,19);controls.target.set(0,0,0);controls.update();}
 function create(){
  if(renderer)return true;
  try{
   renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
   scene=new THREE.Scene();scene.background=new THREE.Color('#0a1721');
   camera=new THREE.PerspectiveCamera(42,1,.1,150);controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.minDistance=13;controls.maxDistance=50;controls.maxPolarAngle=Math.PI*.43;standardCamera();
   scene.add(new THREE.HemisphereLight(0xd0ebff,0x665c42,2.5));
   const sun=new THREE.DirectionalLight(0xffefd0,3.4);sun.position.set(-8,20,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14});sun.shadow.bias=-.0005;scene.add(sun);
   world=new THREE.Group();actors=new THREE.Group();guides=new THREE.Group();staticGuides=new THREE.Group();ghosts=new THREE.Group();scene.add(world,actors,guides,staticGuides,ghosts);
   new ResizeObserver(()=>{if(!stage.clientWidth)return;renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();}).observe(stage);
   build();return true;
  }catch(error){$('.tl-error').hidden=false;$('.tl-error').textContent='Không mở được WebGL. Bạn vẫn có thể xem ảnh concept.';console.error(error);return false;}
 }
 function build(){
  for(const g of [world,actors,guides,staticGuides,ghosts])disposeGroup(g);
  terrain(world,lesson);playerRig=mannequin(actors,CYAN);enemyRigs=lesson.enemies.map(()=>mannequin(actors,RED));
  for(let i=0;i<lesson.keys.length;i++){const k=lesson.keys[i];if(i&&vector(k.position).distanceTo(vector(lesson.keys[i-1].position))<.2)continue;const ghost=mannequin(ghosts,CYAN,true);ghost.group.position.set(...k.position);ghost.group.lookAt(k.aim[0],k.position[1],k.aim[2]);}
  const floorPath=lesson.keys.map(k=>[k.position[0],.065,k.position[2]]).filter((p,i,all)=>!i||vector(p).distanceTo(vector(all[i-1]))>.05);
  if(!lesson.peek&&floorPath.length>2)line(staticGuides,floorPath,CYAN,false,.065);
  for(let i=1;i<floorPath.length;i++)arrow(staticGuides,floorPath[i-1],floorPath[i],CYAN,.055);
  if(lesson.peek){
   for(let x=-5.5;x<=-2.2;x+=.38)for(let z=3.25;z<=4.8;z+=.38){
    const visible=sightline(head(lesson.enemies[0].position),head([x,0,z]),lesson.cover).visible;
    floorRegion(staticGuides,x,z,visible?RED:CYAN);
   }
  }
  for(const e of lesson.enemies)if(e.keys)for(let j=1;j<e.keys.length;j++)arrow(staticGuides,[e.keys[j-1].position[0],.08,e.keys[j-1].position[2]],[e.keys[j].position[0],.08,e.keys[j].position[2]],RED,.045);
  if(lesson.dimension){const [a,b]=lesson.dimension;line(staticGuides,[a.map((x,i)=>i===1?.10:x),b.map((x,i)=>i===1?.10:x)],0xd4e5e8,true);ring(staticGuides,a,0xd4e5e8,.16);ring(staticGuides,b,0xd4e5e8,.16);}
  $('.tl-steps').replaceChildren(...lesson.keys.map(k=>{const b=document.createElement('button');b.type='button';b.textContent=k.label;b.onclick=()=>{playing=false;time=k.t;sync();};return b;}));
  $('#tl-goal').textContent=lesson.goal+(lesson.dimension?' Điểm dừng cách góc 3 m.':'')+(lesson.peek?' Sàn cyan: khuất tầm nhìn đầu · Sàn cam: vùng bị thấy.':'');

  sync();
 }
 function sync(){
  $('#tl-play').textContent=playing?'Tạm dừng':'Phát mô phỏng';$('#tl-time').value=String(Math.round(time/lesson.duration*1000));
  const state=sampleLesson(lesson,time);$('#tl-phase').textContent=state.player.label;
  $('.tl-steps').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',i===state.player.index);b.setAttribute('aria-current',String(i===state.player.index));});
  const description=state.enemies.map(e=>`${e.id}: ${!e.active?'chưa giao tranh':e.los.visible?'thấy đầu':e.exposed?'chỉ lộ một phần':'bị cover chặn'}`).join(' · ');if($('#tl-los').textContent!==description)$('#tl-los').textContent=description;
  if(!renderer||!playerRig)return;
  playerRig.group.position.set(...state.player.position);playerRig.group.lookAt(state.player.aim[0],state.player.position[1],state.player.aim[2]);playerRig.muzzle.visible=state.player.fire;
  disposeGroup(guides);
  const overlay=$('#tl-overlays').checked;guides.visible=overlay;staticGuides.visible=overlay;ghosts.visible=overlay;
  if(state.player.speed<.12)ring(guides,state.player.position,CYAN);
  const from=head(state.player.position),aim=head(state.player.aim),aimLOS=sightline(from,aim,lesson.cover);
  line(guides,[from,aimLOS.end],CYAN,true);
  if(lesson.expected){const expected=head(lesson.expected);line(guides,[from,sightline(from,expected,lesson.cover).end],0x78a8b4,true);const end=head(lesson.enemies[0].position);arc(guides,expected,end,CYAN,lesson.correction==='small'?.025:.045);}
  if(lesson.switch&&time>=2.1)arc(guides,head(lesson.enemies[0].position),head(lesson.enemies[1].position),CYAN);
  state.enemies.forEach((e,i)=>{
   const rig=enemyRigs[i];rig.group.position.set(...e.position);rig.group.lookAt(from[0],e.position[1],from[2]);rig.group.visible=e.active;
   rig.muzzle.visible=e.canFire&&((time*5)%1<.12);
   if(!e.active)return;
   line(guides,[head(e.position),e.los.end],e.los.visible?RED:0x726c65,true);
   if(lesson.bait&&e.canFire){
    const shoulder=[-.28,.28].map(dx=>head([state.player.position[0]+dx,state.player.position[1],state.player.position[2]])).find(p=>sightline(head(e.position),p,lesson.cover).visible);
    if(shoulder)line(guides,[head(e.position),shoulder],RED,true);
   }
   if(lesson.hold){const h=head(lesson.hold);line(guides,[head(e.position),sightline(head(e.position),h,lesson.cover).end],0xb87b67,true);if(e.los.visible){const a=vector(h).lerp(vector(head(e.position)),.6).toArray(),b=vector(from).lerp(vector(head(e.position)),.6).toArray();arrow(guides,a,b,RED,.035);}}
  });
  if(lesson.unsafe)line(guides,lesson.unsafe.map(p=>[p[0],.09,p[2]]),0xad5d59,true);
 }
 function frame(now){
  if(!active){raf=0;return;}
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(playing&&!document.hidden){time=Math.min(lesson.duration,time+dt*Number($('#tl-speed').value));if(time>=lesson.duration)playing=false;sync();}
  if(renderer){controls.update();renderer.render(scene,camera);}
  raf=requestAnimationFrame(frame);
 }
 $('#tl-lesson').onchange=e=>{lesson=TACTICAL_LESSONS.find(l=>l.id===e.target.value)??TACTICAL_LESSONS[0];time=0;playing=false;if(create())build();};
 $('#tl-play').onclick=()=>{if(time>=lesson.duration)time=0;playing=!playing;sync();};
 $('#tl-reset').onclick=()=>{time=0;playing=false;sync();};
 $('#tl-time').oninput=e=>{playing=false;time=Number(e.target.value)/1000*lesson.duration;sync();};
 $('#tl-overlays').onchange=sync;
 $('#tl-camera').onclick=()=>{if(create())standardCamera();};
 $('#tl-full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}catch{$('.tl-note').textContent='Không mở được toàn màn hình; bạn vẫn có thể xoay và zoom cảnh.';}};
 document.addEventListener('v-aim:navigate',event=>{
  active=event.detail.view==='tactics';if(active){create();last=0;if(!raf)raf=requestAnimationFrame(frame);}else{playing=false;sync();}
 });
 document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){playing=false;sync();}});
 return {dispose(){active=false;cancelAnimationFrame(raf);controls?.dispose();for(const g of [world,actors,guides,staticGuides,ghosts])if(g)disposeGroup(g);renderer?.dispose();}};
}
