import { chartCoaching } from './chart-coaching.js';
import { initTheme } from './theme.js';
import { sessionInsights } from './insights.js';
import { renderInsights } from './insights-view.js';
import { renderCharts, aimOffset } from './charts.js';
import { parseHistory, mergeHistory } from './history-transfer.js';
import { requestUnadjustedInput } from './input.js';
import { createViewWeapon } from './weapon-view.js';
import { WEAPONS, DEFAULT_WEAPON } from './weapon-profiles.js';
import * as THREE from 'three';
import { clamp, validNumber, cm360, rotationDelta, verticalFov, calibrationTrial, calibrationSummary, summarizeRun, trialsCsv } from './metrics.js';
import { TASKS, CHALLENGES, DIFFICULTIES, MAPS, DEFAULT_MAP, resolveMapId, historicalMapId, taskMotion, targetPosition, scenarioInfo, progressSummary, analyzeRun } from './training.js';
const $ = id => document.getElementById(id);
const show = (id, yes) => $(id).hidden = !yes;
const put = (id, text) => $(id).textContent = text;
let toastTimer;
function toast(message) { put('toast', message); show('toast', true); clearTimeout(toastTimer); toastTimer = setTimeout(() => show('toast', false), 4500); }
let challengeId=null;
let task = 'precision', baseline = .3, dpiSource = 'manual', calibration = null, activeMap=DEFAULT_MAP, activeWeapon=DEFAULT_WEAPON;
let state = 'idle', run = null, elapsed = 0, previous = 0, countdownUntil = 0, pending = null, inputMode = 'not-requested', trial, spawnNext=false;
let renderer, scene, camera, target, weapon, activeLockElement=null, desktopReadySent=false, cinematicWorld=null;
const ray = new THREE.Raycaster(), forward = new THREE.Vector3(), direction = new THREE.Vector3();
const canvas = $('range-canvas');
initTheme();
let activeTarget=null;
for(const id of ['heat-kind','heat-extent','pace-metric'])$(id).onchange=()=>{if(run&&state==='finished')renderCharts(run,!!TASKS[run.config.task].tracking);};
for (const [id, data] of Object.entries(TASKS)) {
 const button=document.createElement('button');button.className='task-card'+(id===task?' selected':'');button.dataset.task=id;button.dataset.category=data.category||(data.tracking?'tracking':['transfer','wide','reactive'].includes(id)?'speed':'precision');button.setAttribute('aria-pressed',String(id===task));
 const icon=document.createElement('span');icon.className='task-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=`<svg viewBox="0 0 90 64"><path d="M14 44L42 18L75 39" fill="none" stroke="currentColor" stroke-dasharray="3 4" opacity=".3"/><circle cx="14" cy="44" r="6" fill="currentColor" opacity=".45"/><circle cx="42" cy="18" r="10" fill="currentColor"/><circle cx="75" cy="39" r="8" fill="currentColor" opacity=".7"/><circle cx="42" cy="18" r="15" fill="none" stroke="currentColor" opacity=".2"/></svg>`;
 const text=document.createElement('span'),title=document.createElement('b'),description=document.createElement('small');title.textContent=data.name;description.textContent=data.description;text.append(title,description);button.append(icon,text);$('task-list').append(button);
}
function clearChallenge(){challengeId=null;$('challenge-select').value='';put('challenge-description','Tập tự do · không xét mục tiêu thử thách.');}
function renderTaskProgress(){const difficulty=$('difficulty')?.value??'normal';const summary=progressSummary(history(),{task,map:activeMap,difficulty,weapon:activeWeapon});const {scores,last,best,delta}=summary;put('task-progress-count',`${scores.length} PHIÊN`);put('task-progress-last',last===null?'—':`${last.toFixed(1)}%`);put('task-progress-best',best===null?'—':`${best.toFixed(1)}%`);put('task-progress-delta',delta===null?'—':`${delta>=0?'+':''}${delta.toFixed(1)}%`);const bars=$('task-progress-bars');bars.replaceChildren(...scores.slice().reverse().map((value,index)=>{const bar=document.createElement('i');bar.style.height=`${Math.max(8,Math.min(100,value))}%`;bar.title=`Phiên ${index+1}: ${value.toFixed(1)}%`;bar.setAttribute('aria-label',`Phiên ${index+1}: ${value.toFixed(1)}%`);return bar;}));const trend=$('task-progress-trend');if(trend)trend.textContent=scores.length?scores.slice().reverse().map((value,index)=>`S${index+1} ${value.toFixed(1)}%`).join('  ·  '):'Chưa có dữ liệu phiên';const difficultyName=DIFFICULTIES[difficulty]?.name??difficulty;put('task-progress-copy',scores.length?`So sánh ${scores.length} phiên ${TASKS[task].name} · ${MAPS[activeMap].name} · ${difficultyName} · ${WEAPONS[activeWeapon].name}. Click dùng accuracy; tracking dùng thời gian trên target.`:`Hoàn tất một phiên ${TASKS[task].name} ở map này để bắt đầu so sánh tiến bộ.`);}
function renderMapInfo(){activeMap=resolveMapId(activeMap);const map=MAPS[activeMap];put('map-tag',map.short.split(' / ')[0]);put('map-copy',map.copy);if($('map-select'))$('map-select').value=activeMap;document.documentElement.style.setProperty('--map-primary',map.palette.primary);document.documentElement.style.setProperty('--map-secondary',map.palette.secondary);cinematicWorld?.setMap?.(activeMap);renderTaskProgress();}
function renderWeaponInfo(){const profile=WEAPONS[activeWeapon]||WEAPONS[DEFAULT_WEAPON];put('weapon-tag',profile.tag);put('weapon-specs',`${profile.role} · ${profile.damage} dmg · ${profile.fireRate} · ${profile.magazine}`);if($('weapon-select'))$('weapon-select').value=activeWeapon;weapon?.setProfile?.(activeWeapon);renderTaskProgress();}
function selectTask(id){task=id;document.querySelectorAll('[data-task]').forEach(button=>{button.classList.toggle('selected',button.dataset.task===id);button.setAttribute('aria-pressed',String(button.dataset.task===id));});put('mode-current',TASKS[id].name);put('selected-task-name',TASKS[id].name);put('selected-task-description',TASKS[id].description);put('menu-task-name',TASKS[id].name.toUpperCase());put('menu-task-copy',TASKS[id].description);put('overlay-title',TASKS[id].name);put('overlay-copy',TASKS[id].description+' · Bắt đầu để mở toàn màn hình.');renderScenario();renderTaskProgress();}
function renderScenario(){const info=scenarioInfo(task,$('difficulty').value),d=DIFFICULTIES[info.difficulty];const panel=$('scenario-preview');panel.replaceChildren();const sizes=document.createElement('div');sizes.className='sphere-preview';for(const b of info.sizeBands){const item=document.createElement('div'),orb=document.createElement('i'),label=document.createElement('span');const radius=TASKS[task].radius*d.radius*b.multiplier;orb.style.width=orb.style.height=`${Math.max(7, radius*60)}px`;label.textContent=b.label;item.append(orb,label);sizes.append(item);}const p=document.createElement('p');p.textContent=info.scenario;const detail=document.createElement('small');detail.textContent=`Cự ly ${info.distanceRange.minimum}–${info.distanceRange.maximum} m · ${info.distanceBands.map(b=>b==='near'?'gần':b==='mid'?'trung':'xa').join(' / ')} · ${info.tracking?'size đổi 6 giây, cự ly đổi 18 giây':'đổi theo mục tiêu'}.`;const scale=document.createElement('small');const angles=info.sizeBands.map(b=>2*Math.asin(TASKS[task].radius*d.radius*b.multiplier/info.targetDistance)*180/Math.PI);scale.textContent=`Đường kính góc danh định ${Math.min(...angles).toFixed(2)}–${Math.max(...angles).toFixed(2)}° · ${info.tracking?'tốc độ ×'+d.speed:'hạn bắn '+d.deadlineMs/1000+'s'}`;panel.append(sizes,p,detail,scale);}
for(const [id,name] of [['all','Tất cả'],['precision','Độ chính xác'],['speed','Tốc độ & phản xạ'],['tracking','Bám mục tiêu']]){const b=document.createElement('button');b.className='filter-button'+(id==='all'?' active':'');b.textContent=name;b.setAttribute('aria-pressed',String(id==='all'));b.onclick=()=>{document.querySelectorAll('.filter-button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});document.querySelectorAll('[data-task]').forEach(x=>x.hidden=id!=='all'&&x.dataset.category!==id);};$('task-filters').append(b);}
put('library-count',`${Object.keys(TASKS).length} BÀI TẬP · 4 ĐỘ KHÓ`);selectTask(task);
 $('challenge-select').onchange=()=>{challengeId=$('challenge-select').value||null;const c=CHALLENGES[challengeId];if(!c)return clearChallenge();selectTask(c.task);$('difficulty').value=c.difficulty;$('duration').value=c.duration;put('challenge-description',c.description+' · chuỗi target cố định · hoàn tất không tạm dừng.');renderScenario();renderTaskProgress();};
$('duration').onchange=clearChallenge;$('difficulty').onchange=()=>{clearChallenge();renderScenario();renderTaskProgress();};
function profile() {
 const sensitivity = validNumber($('sensitivity').value, .01, 10, .3), dpi = validNumber($('dpi-input').value, 100, 32000, 800);
 $('sensitivity').value = sensitivity; $('dpi-input').value = dpi;
 put('edpi-value', (dpi * sensitivity).toFixed(1)); put('cm-value', cm360(dpi, sensitivity).toFixed(2));
 put('dpi-source', dpiSource === 'manual' ? 'nhập tay' : 'ước lượng');
 try{localStorage.setItem('gamesen.profile',JSON.stringify({sensitivity,dpi,dpiSource,calibration}));}catch{}
 return { sensitivity, dpi, dpiSource, calibration, inputGain:1, sensitivityPreset:'valorant-hipfire' };
}
function busy() { return ['running','countdown','paused'].includes(state); }
function navigate(view) {
 if (busy() || document.pointerLockElement || pending) return toast('Kết thúc phiên hoặc phép đo trước khi chuyển trang.');
 document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== `${view}-view`);
 document.querySelectorAll('.nav-button').forEach(el => el.classList.toggle('active', el.dataset.view === view));
 if (view === 'history') renderHistory();
}
document.querySelectorAll('[data-view]').forEach(el => el.onclick = () => navigate(el.dataset.view));
$('open-dpi').onclick = () => navigate('dpi');
document.querySelectorAll('[data-task]').forEach(el => el.onclick = () => {if(busy())return;clearChallenge();selectTask(el.dataset.task);$('mode-picker').open=false;});
const menuPlay=$('menu-play-btn'), menuModes=$('menu-modes-btn'), modePicker=$('mode-picker');
menuPlay.onclick=()=>{if(!busy()&&!pending)$('start-btn').click();};
menuModes.onclick=()=>{if(busy())return;modePicker.open=!modePicker.open;menuModes.setAttribute('aria-expanded',String(modePicker.open));if(modePicker.open)modePicker.scrollIntoView({behavior:'smooth',block:'nearest'});};
modePicker.addEventListener('toggle',()=>menuModes.setAttribute('aria-expanded',String(modePicker.open)));
document.addEventListener('keydown',event=>{if(event.code!=='Enter'||event.repeat||$('practice-view').hidden||busy()||pending)return;const tag=document.activeElement?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;menuPlay.click();});
$('map-select').onchange=()=>{if(busy())return;activeMap=resolveMapId($('map-select').value);renderMapInfo();};
$('weapon-select').onchange=()=>{if(busy())return;activeWeapon=WEAPONS[$('weapon-select').value]?$('weapon-select').value:DEFAULT_WEAPON;renderWeaponInfo();};
renderMapInfo();renderWeaponInfo();
$('sensitivity').onchange = () => { baseline = profile().sensitivity; put('base-sens-label', `Gốc: ${baseline.toFixed(3)}`); };
$('dpi-input').onchange = () => { dpiSource = 'manual'; calibration = null; profile(); };
document.querySelectorAll('[data-factor]').forEach(el => el.onclick = () => { $('sensitivity').value = clamp(baseline * Number(el.dataset.factor), .01, 10).toFixed(3); profile(); });
$('sens-reset').onclick = () => { $('sensitivity').value = baseline; profile(); };
$('fullscreen-btn').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('range-shell').requestFullscreen(); } catch { toast('Trình duyệt không cho phép toàn màn hình.'); } };
function settingsLocked(locked) {if(locked){$('mode-picker').open=false;menuModes.setAttribute('aria-expanded','false');} menuPlay.disabled=locked;menuModes.disabled=locked;document.querySelectorAll('.settings-panel input,.settings-panel button,.settings-panel select,.library-panel button').forEach(el => el.disabled = locked); }
function createCinematicWorld() {
 const root=new THREE.Group();root.name='cinematic-world';scene.add(root);
 const floats=[],pulses=[],waterfalls=[];
 const add=(object,parent=root)=>{parent.add(object);return object;};
 const pulse=(material,base,amp,speed,phase=0)=>{pulses.push({material,base,amp,speed,phase});return material;};
 const darkMat=new THREE.MeshStandardMaterial({color:'#0b111a',roughness:.88,metalness:.08});
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(150,75),new THREE.MeshBasicMaterial({color:'#05070c'}));backdrop.position.set(0,11,-56);add(backdrop);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),darkMat);floor.rotation.x=-Math.PI/2;floor.position.y=-6;add(floor);
 const particlePositions=new Float32Array(260*3);for(let i=0;i<260;i++){const a=i*12.9898;particlePositions[i*3]=((Math.sin(a)*.5+.5)*2-1)*60;particlePositions[i*3+1]=-4+((Math.sin(a*1.37)*.5+.5)*30);particlePositions[i*3+2]=-12-((Math.sin(a*1.93)*.5+.5)*48);}
 const particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));const particles=new THREE.Points(particleGeometry,new THREE.PointsMaterial({color:'#fff1c4',size:.075,transparent:true,opacity:.32,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));add(particles);
 // Lotus is the detailed scene; Dark Range intentionally keeps only the floor,
 // fog and target so the player can remove visual distractions.
 const mapGroups={};
 const mapMaterial=(spec,color=spec.palette.ground,emissive=spec.palette.primary,intensity=.32)=>new THREE.MeshStandardMaterial({color,roughness:.66,metalness:.38,emissive,emissiveIntensity:intensity});
 const mapBox=(group,geometry,material,position,rotation=[0,0,0])=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);group.add(mesh);return mesh;};
 const mapRing=(group,geometry,material,position,rotation=[0,0,0])=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);group.add(mesh);return mesh;};
 const mapPlane=(group,geometry,material,position,rotation=[0,0,0])=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);group.add(mesh);return mesh;};
 for(const [id,spec] of Object.entries(MAPS)){
  const group=new THREE.Group();group.name=`map-${id}`;add(group);mapGroups[id]=group;
  if(id==='lotus'){
   // Original temple sector: layered sandstone, water and foliage are all
   // built from primitives so it remains light enough for the training range.
   const sandstone=mapMaterial(spec,'#9a704d','#5d3f2f',.12), paleStone=mapMaterial(spec,'#c69e6b','#79563a',.1), moss=mapMaterial(spec,'#315a39','#62a85f',.42), cliff=mapMaterial(spec,'#645845','#3f6948',.18);
   const leafMaterial=new THREE.MeshStandardMaterial({color:'#4d8a4b',roughness:.76,metalness:.04,emissive:'#184427',emissiveIntensity:.24});
   const flowerMaterial=pulse(new THREE.MeshStandardMaterial({color:'#f29ac8',roughness:.28,metalness:.08,emissive:'#d7439a',emissiveIntensity:1.18}),1.18,.28,.72,.35);
   const flowerCore=pulse(new THREE.MeshStandardMaterial({color:'#fff0bb',roughness:.18,metalness:.1,emissive:'#ffb756',emissiveIntensity:1.65}),1.65,.32,.92,1.1);
   const waterfallMaterial=new THREE.MeshBasicMaterial({color:'#bff7ff',transparent:true,opacity:.39,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
   const sunMaterial=new THREE.MeshBasicMaterial({color:'#fff0bc',transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
   // This stone base hides the cyber grid and gives the sector a full ground plane.
   mapBox(group,new THREE.BoxGeometry(150,.55,115),sandstone,[0,-5.8,-45]);
   mapBox(group,new THREE.BoxGeometry(48,.75,13),paleStone,[0,-5.2,-46]);
   mapBox(group,new THREE.BoxGeometry(34,.72,8),sandstone,[0,-4.62,-40]);
   mapBox(group,new THREE.BoxGeometry(22,.65,5),paleStone,[0,-4.06,-35]);
   mapBox(group,new THREE.BoxGeometry(54,13,2.4),paleStone,[0,1.1,-56]);
   mapBox(group,new THREE.BoxGeometry(14,11,4),sandstone,[-23,.25,-51]);
   mapBox(group,new THREE.BoxGeometry(14,11,4),sandstone,[23,.25,-51]);
   const cliffGeo=new THREE.DodecahedronGeometry(1,0);
   for(const [x,y,z,s,rot] of [[-38,3,-54,9,.3],[-31,8,-57,7,1.2],[-25,11,-58,5,.6],[37,5,-55,10,.7],[30,11,-58,7,1.1],[24,14,-59,5,.2]]){const rock=mapBox(group,cliffGeo,cliff,[x,y,z],[.1,rot,.08]);rock.scale.set(s,s*1.25,s*.85);}
   const recess=mapMaterial(spec,'#465043','#253c2c',.14), pathStone=mapMaterial(spec,'#b68b5d','#664631',.08);
   mapBox(group,new THREE.BoxGeometry(12,8.4,.32),recess,[0,.1,-54.68]);
   mapBox(group,new THREE.BoxGeometry(12.9,.55,.7),sandstone,[0,4.32,-54.35]);
   mapBox(group,new THREE.BoxGeometry(.72,8.8,.7),sandstone,[-6.25,.1,-54.35]);
   mapBox(group,new THREE.BoxGeometry(.72,8.8,.7),sandstone,[6.25,.1,-54.35]);
   const pathSlabGeo=new THREE.BoxGeometry(7.2,.1,3.4);
   for(let i=0;i<10;i++){const slab=mapBox(group,pathSlabGeo,pathStone,[0,-5.47,-8-i*4.2],[0,(i%2?-.012:.012),0]);slab.rotation.y=i%2?.018:-.018;}
   for(const [x,z,s] of [[-31,-26,1.6],[-25,-18,1.1],[-20,-12,.7],[31,-25,1.5],[25,-17,1.1],[20,-12,.75]]){const rubble=mapBox(group,cliffGeo,cliff,[x,-5.05,z],[.08,x*.17,.16]);rubble.scale.set(s,s*.52,s*.85);}
   const columnGeo=new THREE.CylinderGeometry(1.05,1.18,12,8), columnBaseGeo=new THREE.BoxGeometry(2.8,.7,2.8), columnCapGeo=new THREE.BoxGeometry(2.75,.72,2.75);
   const templeColumn=(x,z,height=12,broken=0)=>{
    const baseY=-4.85, actual=height-broken;
    mapBox(group,columnBaseGeo,sandstone,[x,baseY,z]);
    mapBox(group,new THREE.CylinderGeometry(1.05,1.18,actual,8),paleStone,[x,baseY+actual/2+.32,z]);
    mapBox(group,columnCapGeo,sandstone,[x,baseY+actual+.68,z]);
    mapBox(group,new THREE.BoxGeometry(3.05,.18,3.05),moss,[x,baseY+actual+1.08,z]);
    if(broken){const fragment=mapBox(group,new THREE.CylinderGeometry(.6,.95,broken,8),paleStone,[x+.4,baseY+actual+broken/2+.7,z-.15],[.12,.18,.22]);fragment.rotation.z=.28;}
   };
   templeColumn(-17,-47,15);templeColumn(17,-47,13,2.2);templeColumn(-10,-52,10,2.6);templeColumn(10,-52,12,1.4);templeColumn(-29,-48,11,1.8);templeColumn(29,-49,12,2.4);
   // Background arch fragments leave a clean centre lane for distant targets.
   for(const x of [-12,12]){mapBox(group,new THREE.BoxGeometry(6.2,.62,1.8),sandstone,[x,7.6,-53]);mapRing(group,new THREE.TorusGeometry(3.15,.27,7,20,Math.PI),paleStone,[x,4.6,-52.9],[0,0,Math.PI]);}
   const waterfall=(x,y,z,width,height,phase)=>{
    for(let strip=0;strip<3;strip++){
     const sheet=mapPlane(group,new THREE.PlaneGeometry(width*(.38+strip*.13),height),waterfallMaterial.clone(),[x+(strip-1)*width*.22,y,z+(strip%2)*.04]);
     waterfalls.push({object:sheet,baseY:y,baseX:sheet.position.x,phase:phase+strip*.82,opacity:.22+strip*.06});
    }
    mapBox(group,new THREE.BoxGeometry(width+1,.45,.8),sandstone,[x,y+height/2+.3,z-.08]);
   };
   waterfall(-20,3.7,-54.45,3.8,14,.2);waterfall(16,2.8,-54.35,3.1,12,1.4);waterfall(0,2.2,-56.5,2.1,10,2.2);
   const vine=(points,radius=.085)=>{const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));return mapBox(group,new THREE.TubeGeometry(curve,18,radius,5,false),moss,[0,0,0]);};
   vine([[-18,10.7,-46.5],[-20,8,-46],[-18,5,-45.8],[-20,1.5,-45.4]],.12);vine([[17,8.4,-46.3],[19,6.5,-46],[17,2.2,-45.6],[19,-1,-45.4]],.1);vine([[-29,5,-49],[-26,2,-48],[-24,.4,-47]],.11);vine([[28,7,-49],[26,4,-48],[28,1,-47]],.09);
   const leafGeo=new THREE.DodecahedronGeometry(.52,0);
   for(let i=0;i<44;i++){const side=i%2?1:-1,x=side*(12+(i%6)*2.2)+(i%3-.5)*.35,y=-1+(i%8)*1.38,z=-46-(i%5)*1.9;const leaf=mapBox(group,leafGeo,leafMaterial,[x,y,z],[i*.17,i*.49,i*.11]);leaf.scale.set(.8+(i%3)*.22,.45+(i%4)*.16,1.1);}
   const lotus=(x,y,z,size=1)=>{
    const bloom=new THREE.Group(), petalGeo=new THREE.ConeGeometry(.38*size,1.62*size,4);
    for(let i=0;i<7;i++){const angle=i/7*Math.PI*2,petal=new THREE.Mesh(petalGeo,flowerMaterial);petal.position.set(Math.cos(angle)*.66*size,0,Math.sin(angle)*.66*size);petal.rotation.set(Math.PI/2.45,0,-angle);bloom.add(petal);}
    const core=new THREE.Mesh(new THREE.SphereGeometry(.38*size,12,8),flowerCore);core.scale.y=.75;bloom.add(core);bloom.position.set(x,y,z);group.add(bloom);floats.push({object:bloom,baseY:y,amp:.08*size,speed:.32,phase:x*.19,spin:.00008});
   };
   lotus(-17,11.7,-46.8,1.85);lotus(17,9.6,-46.6,1.55);lotus(-10,7.3,-52.5,1.05);lotus(10,8.1,-52.5,1.18);
   mapPlane(group,new THREE.PlaneGeometry(15,28),sunMaterial,[-8,10,-55.25],[-.16,.08,0]);mapPlane(group,new THREE.PlaneGeometry(13,25),sunMaterial,[13,9,-55.2],[-.16,-.06,0]);
   const warmLight=new THREE.PointLight('#ffd48d',6.2,52,2);warmLight.position.set(0,13,-29);group.add(warmLight);
   const bloomLight=new THREE.PointLight('#f07cbd',5,35,2);bloomLight.position.set(-15,10,-38);group.add(bloomLight);
   const waterLight=new THREE.PointLight('#9eefff',4,36,2);waterLight.position.set(11,6,-40);group.add(waterLight);
  }
 }
 const setMap=id=>{
  const active=resolveMapId(id),spec=MAPS[active];
  for(const [key,group] of Object.entries(mapGroups))group.visible=key===active;
  const temple=active==='lotus';
  scene.background.set(spec.palette.sky);scene.fog.color.set(spec.palette.fog);scene.fog.density=spec.environment?.fogDensity??.0125;renderer.toneMappingExposure=spec.environment?.exposure??1.12;
  backdrop.material.color.set(spec.palette.sky);particles.visible=temple;particles.material.color.set('#fff1c4');particles.material.opacity=.32;
  return active;
 };
 setMap(DEFAULT_MAP);
 return {root,floats,pulses,particles,waterfalls,mapGroups,setMap};
}
function updateCinematicWorld(now){if(!cinematicWorld)return;const t=now*.001;for(const item of cinematicWorld.floats){item.object.position.y=item.baseY+Math.sin(t*item.speed+item.phase)*item.amp;item.object.rotation.y+=item.spin;item.object.rotation.x+=item.spin*.35;}for(const item of cinematicWorld.pulses){item.material[item.material.isMeshBasicMaterial?'opacity':'emissiveIntensity']=item.base+Math.sin(t*item.speed+item.phase)*item.amp;}for(const waterfall of cinematicWorld.waterfalls){waterfall.object.position.y=waterfall.baseY+Math.sin(t*1.15+waterfall.phase)*.075;waterfall.object.position.x=waterfall.baseX+Math.sin(t*.72+waterfall.phase)*.035;waterfall.object.material.opacity=waterfall.opacity+Math.sin(t*1.8+waterfall.phase)*.045;}cinematicWorld.particles.rotation.y=t*.004;}
try {
 renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 scene = new THREE.Scene(); scene.background = new THREE.Color('#071321'); scene.fog = new THREE.FogExp2('#071321', .0125);
 camera = new THREE.PerspectiveCamera(verticalFov(103, 16/9), 16/9, .1, 150); camera.position.set(0, 1.6, 0); camera.rotation.order = 'YXZ';
 scene.add(camera);
 scene.add(new THREE.HemisphereLight(0x9defff, 0x08131d, 2.4));
 const light = new THREE.DirectionalLight(0xb9f6ff, 2.5); light.position.set(-6, 14, 8); scene.add(light);
 cinematicWorld=createCinematicWorld();
 target = new THREE.Mesh(new THREE.SphereGeometry(1,32,24), new THREE.MeshStandardMaterial({ color:'#ffe8e8', emissive:'#bd354d', emissiveIntensity:.62, roughness:.3 }));
 target.position.set(0,1.6,-20); target.scale.setScalar(.4); scene.add(target);
 weapon=createViewWeapon(camera,activeWeapon);
 new ResizeObserver(() => { const w=canvas.clientWidth,h=canvas.clientHeight; if (!w||!h) return; renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov=verticalFov(103,w/h); camera.updateProjectionMatrix(); }).observe(canvas);
} catch (error) { put('overlay-title','Không khởi tạo được đồ họa 3D'); put('overlay-copy','Mở bằng trình duyệt desktop có WebGL2 và bật tăng tốc phần cứng.'); $('start-btn').disabled = true; console.error(error); }
function errorAngle() { camera.getWorldDirection(forward); direction.copy(target.position).sub(camera.position).normalize(); return THREE.MathUtils.radToDeg(forward.angleTo(direction)); }
function isHit() { camera.updateMatrixWorld(); target.updateMatrixWorld(); ray.setFromCamera({x:0,y:0},camera); return ray.intersectObject(target).length > 0; }
function placeTarget(yaw, pitch, distance=20) { target.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,1.6+Math.sin(pitch)*distance,-Math.cos(yaw)*Math.cos(pitch)*distance); }
function eventActiveTime(){return Math.min(run.config.durationMs,elapsed+Math.max(0,performance.now()-previous));}
function spawnTrial() {
 const angles=targetPosition({task:run.config.task,map:run.config.map,difficulty:run.config.difficulty,seed:run.config.seed,index:run.trials.length,cameraYaw:-camera.rotation.y,cameraPitch:camera.rotation.x});
 activeTarget=angles;target.scale.setScalar(angles.radius);placeTarget(angles.yaw,angles.pitch,angles.distance);
 trial={targetRadius:angles.radius,sizeBand:angles.sizeBand,distance:angles.distance,distanceBand:angles.distanceBand,layoutKey:angles.layoutKey,baseYaw:angles.yaw,basePitch:angles.pitch,trialId:run.trials.length+1,startedMs:elapsed,initialErrorDeg:errorAngle(),outcome:'pending',shots:0,firstEntryMs:null,firstShotMs:null,firstShotHit:null,hitMs:null,entryToFirstShotMs:null}; run.trials.push(trial);
}
async function lock(element, purpose) {
 if (pending) return; pending=purpose;
 try {
  inputMode='requesting-unadjusted';
  await requestUnadjustedInput(element,()=>document.exitPointerLock());
  inputMode='unadjusted-requested-unverified';
  put('input-mode','Input: trình duyệt đã chấp nhận yêu cầu bỏ xử lý của hệ điều hành; chưa kiểm chứng sensor counts độc lập.');
  handleLockChange();
 } catch {
  pending=null;inputMode='unadjusted-unavailable';
  put('input-mode','Không nhận được xác nhận input chưa qua xử lý. Phiên tập chưa bắt đầu.');
  toast('Không bật được chế độ bỏ xử lý chuột của hệ điều hành. Phòng tập không chuyển sang input thường.');
 }
}
let enteringGame=false;
$('start-btn').onclick=async()=>{
 if(enteringGame||pending)return;enteringGame=true;$('start-btn').disabled=true;
 try{
  // Pointer Lock must request the click's activation before fullscreen consumes it.
  const input=lock(canvas,'game');
  const fullscreen=document.fullscreenElement?Promise.resolve():$('range-shell').requestFullscreen();
  await Promise.all([input,fullscreen]);
  enteringGame=false;
  if(document.pointerLockElement===canvas&&document.fullscreenElement===$('range-shell'))handleLockChange();
  else {pending=null;document.exitPointerLock();if(document.fullscreenElement)await document.exitFullscreen();toast('Không khóa được chuột để chơi. Nhấn Bắt đầu để thử lại.');}
 }catch{pending=null;document.exitPointerLock();toast('Không mở được toàn màn hình. Nhấn Bắt đầu để thử lại.');}
 finally{enteringGame=false;$('start-btn').disabled=false;}
};
document.addEventListener('pointerlockerror',()=>{ if (!document.pointerLockElement) { pending=null; toast('Yêu cầu khóa chuột bị từ chối. Hãy thử nhấn Bắt đầu lần nữa.'); } });
function handleLockChange(){
 if(enteringGame)return;
 if(document.pointerLockElement){
  if(inputMode!=='unadjusted-requested-unverified'){if(inputMode!=='requesting-unadjusted')document.exitPointerLock();return;}
  if(activeLockElement===document.pointerLockElement)return;
  activeLockElement=document.pointerLockElement;
 }else activeLockElement=null;
 if (document.pointerLockElement===canvas) {
  pending=null;
  if (state!=='paused') {
   elapsed=0; const seed=CHALLENGES[challengeId]?.seed??crypto.getRandomValues(new Uint32Array(1))[0];
   run={schemaVersion:'0.2',id:crypto.randomUUID(),startedAt:new Date().toISOString(),status:'in-progress',config:{...profile(),task,map:activeMap,weapon:activeWeapon,challengeId,exerciseVersion:'0.6',difficulty:$('difficulty').value,durationMs:Number($('duration').value)*1000,deadlineMs:DIFFICULTIES[$('difficulty').value].deadlineMs,yawDeg:.07,horizontalFovDeg:103,seed,inputMode,rawVerified:false},shots:[],trials:[],frames:[],inputEvents:[],frameIntervals:[],pauses:[],tracking:{validMs:0,onTargetMs:0,squaredErrorTime:0}};
   camera.rotation.set(0,0,0); target.scale.setScalar(DIFFICULTIES[run.config.difficulty].radius*TASKS[task].radius); trial=null;spawnNext=false;activeTarget=targetPosition({task,map:activeMap,difficulty:run.config.difficulty,seed,index:0});target.scale.setScalar(activeTarget.radius);
  } else run.pauses.push({resumedAt:new Date().toISOString(),elapsedMs:elapsed,inputMode});
  state='countdown'; countdownUntil=performance.now()+3000; weapon?.setVisible(true); settingsLocked(true); show('range-overlay',false); show('countdown',true); show('crosshair',true); show('game-hud',true); show('end-btn',true); show('result-panel',false); put('range-state','Chuẩn bị');
 } else if (document.pointerLockElement===$('cal-pad')) { pending=null; calState='armed'; put('cal-message','Nhấn Space để bắt đầu ghi'); }
 else {
  pending=null;
  if (state==='running'||state==='countdown') { state='paused'; run.pauses.push({pausedAt:new Date().toISOString(),elapsedMs:elapsed}); show('countdown',false); show('range-overlay',true); put('overlay-title','Phiên tập đã tạm dừng'); put('overlay-copy','Thời gian dừng không tính vào kết quả.'); put('start-btn','Tiếp tục phiên tập ↗'); put('range-state','Tạm dừng'); }
  if (calState!=='idle') { calState='idle'; put('cal-message','Lượt đo đã hủy. Nhấn bắt đầu để đo lại.'); }
 }
}
document.addEventListener('pointerlockchange',handleLockChange);
document.addEventListener('visibilitychange',()=>{ if(document.hidden && document.pointerLockElement) document.exitPointerLock(); });
document.addEventListener('mousemove',event=>{
 if (document.pointerLockElement===canvas && (state==='running'||state==='countdown')) {
  camera.rotation.y-=rotationDelta(event.movementX,run.config.sensitivity); camera.rotation.x=clamp(camera.rotation.x-rotationDelta(event.movementY,run.config.sensitivity),-Math.PI*.49,Math.PI*.49);
  if(state==='running') run.inputEvents.push({t:eventActiveTime(),dx:event.movementX,dy:event.movementY,yaw:camera.rotation.y,pitch:camera.rotation.x});
 } else if(document.pointerLockElement===$('cal-pad') && calState==='measuring') { calMove.dx+=event.movementX;calMove.pathX+=Math.abs(event.movementX);calMove.pathY+=Math.abs(event.movementY);calMove.samples++; put('cal-count',`${Math.round(Math.abs(calMove.dx))} đơn vị · Space để kết thúc`); }
});
document.addEventListener('mousedown',event=>{
 if(event.button!==0||state!=='running'||document.pointerLockElement!==canvas||TASKS[run.config.task].tracking||trial?.outcome!=='pending') return;
 const shotTime=eventActiveTime(), ms=shotTime-trial.startedMs;
 if(shotTime>=run.config.durationMs)return;
 if(ms>=run.config.deadlineMs){trial.outcome='timeout';spawnNext=true;return;}
 const hit=isHit();
 if(hit&&trial.firstEntryMs===null)trial.firstEntryMs=ms;
 const offset=aimOffset(target.position.toArray(),camera.rotation.y,camera.rotation.x);
 run.shots.push({t:shotTime,trialId:trial.trialId,hit,errorDeg:errorAngle(),aimX:offset?.x??null,aimY:offset?.y??null,targetRadius:target.scale.x,sizeBand:trial.sizeBand,distance:trial.distance,distanceBand:trial.distanceBand});weapon?.fire(performance.now());trial.shots++;
 if(trial.firstShotMs===null){trial.firstShotMs=ms;trial.firstShotHit=hit;trial.entryToFirstShotMs=trial.firstEntryMs===null?null:ms-trial.firstEntryMs;}
 if(hit){trial.outcome='hit';trial.hitMs=ms;show('hit-marker',true);setTimeout(()=>show('hit-marker',false),80);spawnNext=true;}
});
function liveStats() {
 const s=summarizeRun(run), tracking=TASKS[run.config.task].tracking;
 put('stat-shots',s.shots);put('stat-accuracy',s.accuracy===null?'—':`${(100*s.accuracy).toFixed(1)}%`);put('stat-hits',s.hits);
 put('timing-label',tracking?'THỜI GIAN TRÊN TARGET':'TRUNG VỊ TỚI HIT');put('stat-time',tracking?(s.timeOnTarget===null?'—':`${(s.timeOnTarget*100).toFixed(1)}%`):(s.medianAcquireMs===null?'—':`${Math.round(s.medianAcquireMs)} ms`));
 put('hud-time',`${Math.max(0,Math.ceil((run.config.durationMs-elapsed)/1000))}s`);put('hud-map',MAPS[resolveMapId(run.config.map)].short.split(' / ')[0]);put('hud-task',run.config.task.toUpperCase());put('hud-distance',activeTarget?`${activeTarget.distance}M · ${activeTarget.distanceBand.toUpperCase()}`:'—');put('hud-hits',tracking?'GIỮ TÂM TRÊN TARGET':`${s.hits} TRÚNG`);put('hud-weapon',(WEAPONS[run.config.weapon]||WEAPONS[DEFAULT_WEAPON]).name.replace('-style','').toUpperCase());
}
let lastUi=0;
function animate(now){requestAnimationFrame(animate);if(!renderer)return; const dt=previous?now-previous:0;previous=now;
 if(state==='countdown'){put('countdown',Math.max(1,Math.ceil((countdownUntil-now)/1000)));if(now>=countdownUntil){state='running';show('countdown',false);put('range-state','Đang tập');if(!TASKS[run.config.task].tracking&&!trial)spawnTrial();}}
 else if(state==='running'){
  const step=Math.min(dt,run.config.durationMs-elapsed);elapsed+=step;run.frameIntervals.push(dt);
  if(spawnNext&&elapsed<run.config.durationMs){spawnNext=false;spawnTrial();}
  if(TASKS[run.config.task].tracking){activeTarget=targetPosition({task:run.config.task,map:run.config.map,difficulty:run.config.difficulty,seed:run.config.seed,index:Math.floor(elapsed/6000)});target.scale.setScalar(activeTarget.radius);}
  if(TASKS[run.config.task].motion||TASKS[run.config.task].tracking){const pos=taskMotion({task:run.config.task,difficulty:run.config.difficulty,seed:run.config.seed,index:(trial?.trialId??1)-1,timeMs:TASKS[run.config.task].tracking?elapsed:elapsed-(trial?.startedMs??0),baseYaw:trial?.baseYaw??0,basePitch:trial?.basePitch??0});placeTarget(pos.yaw,pos.pitch,activeTarget?.distance??20);}
  const errorDeg=errorAngle(), onTarget=isHit();run.frames.push({targetRadius:target.scale.x,sizeBand:activeTarget?.sizeBand??null,distance:activeTarget?.distance??null,distanceBand:activeTarget?.distanceBand??null,trialId:trial?.trialId??null,t:elapsed,errorDeg,onTarget,target:target.position.toArray(),yaw:camera.rotation.y,pitch:camera.rotation.x,dt});
  if(dt<=100&&dt>0){run.tracking.validMs+=step;run.tracking.onTargetMs+=onTarget?step:0;run.tracking.squaredErrorTime+=errorDeg*errorDeg*step;}
  if(trial&&trial.outcome==='pending'){if(onTarget&&trial.firstEntryMs===null)trial.firstEntryMs=elapsed-trial.startedMs;if(elapsed-trial.startedMs>=run.config.deadlineMs){trial.outcome='timeout';if(elapsed<run.config.durationMs)spawnNext=true;}}
  if(elapsed>=run.config.durationMs)finish('completed');
 }
 if(now-lastUi>200){lastUi=now;put('fps-label',dt>0?`${Math.round(1000/dt)} FPS`:'— FPS');if(run&&busy())liveStats();}
  updateCinematicWorld(now);weapon?.update(now,state==='running'||state==='countdown');renderer.render(scene,camera);
 if(window.gamesenDesktop&&!desktopReadySent){desktopReadySent=true;window.gamesenDesktop.ready({webgl:true});}
}
requestAnimationFrame(animate);
function history(){try {const data=JSON.parse(localStorage.getItem('gamesen.sessions')||'[]');return Array.isArray(data)?data.filter(x=>x?.config&&x?.summary).slice(0,30):[];}catch{return [];}}
function finish(status){if(!busy())return;state='finished';run.status=status;run.elapsedMs=elapsed;run.endedAt=new Date().toISOString();if(trial?.outcome==='pending')trial.outcome='interrupted';run.summary=summarizeRun(run);run.analysis=analyzeRun(run,history());run.analysis.insights=sessionInsights(run);run.analysis.chartCoaching=chartCoaching(run);
 if(window.gamesenDesktop)window.gamesenDesktop.saveSession(JSON.stringify(run)).then(()=>toast('Đã lưu dữ liệu phiên đầy đủ trong ứng dụng.')).catch(()=>toast('Không tự lưu được dữ liệu phiên. Hãy tải JSON để giữ kết quả.'));
 renderAnalysis(run.analysis);renderInsights(run.analysis.insights,$('insights-panel'));liveStats();document.exitPointerLock();settingsLocked(false);show('countdown',false);show('crosshair',false);show('game-hud',false);show('end-btn',false);show('range-overlay',true);show('result-panel',true);put('overlay-title','Đã lưu một điểm bắt đầu.');put('overlay-copy','Xem kết quả bên dưới hoặc thử một phiên mới.');put('start-btn','Tập phiên mới ↗');put('range-state','Phiên tập kết thúc');
 const reveal=()=> $('result-panel').scrollIntoView({behavior:'smooth',block:'start'});if(document.fullscreenElement)document.exitFullscreen().then(reveal).catch(reveal);else reveal();
 put('result-status',status==='completed'?'HOÀN TẤT':'KẾT THÚC SỚM');
 put('result-copy',`${run.config.task.toUpperCase()} · ${(elapsed/1000).toFixed(1)} giây · sens ${run.config.sensitivity} · ${run.config.dpi} DPI (${run.config.dpiSource==='manual'?'nhập tay':'ước lượng'}). Chưa phải kết luận về sens tối ưu.`);
 const s=run.summary, details=[['Độ khó',DIFFICULTIES[run.config.difficulty].name],['Kích thước cầu','Nhỏ / Vừa / Lớn'],['Frame trên 100ms',s.invalidFrameGaps]];
 $('result-detail').replaceChildren(...details.map(([label,value])=>{const div=document.createElement('div');const small=document.createElement('span');small.textContent=label;const strong=document.createElement('b');strong.textContent=value;div.append(small,strong);return div;}));
 renderCharts(run,!!TASKS[run.config.task].tracking);
 try{localStorage.setItem('gamesen.sessions',JSON.stringify([{id:run.id,startedAt:run.startedAt,status,elapsedMs:elapsed,config:run.config,summary:s,analysis:run.analysis,qualityClean:!run.pauses.length&&!s.invalidFrameGaps&&run.config.inputMode!=='browser-adjusted-fallback'},...history()].slice(0,30)));renderTaskProgress();}catch{toast('Không lưu được lịch sử. Hãy tải JSON để giữ kết quả.');}
}
$('end-btn').onclick=()=>finish('ended-early');
function download(data,type,extension){if(!run||state!=='finished')return;const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=`gamesen-${run.id}.${extension}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-json').onclick=()=>download(JSON.stringify(run,null,2),'application/json','json');
$('export-csv').onclick=()=>download(trialsCsv(run),'text/csv;charset=utf-8','csv');
function renderHistory(){const records=history();put('history-count',`${records.length} PHIÊN`);$('history-list').replaceChildren();if(!records.length){const p=document.createElement('p');p.className='history-empty';p.textContent='Chưa có phiên tập. Kết quả đầu tiên sẽ xuất hiện ở đây.';$('history-list').append(p);}for(const r of records){const row=document.createElement('div');row.className='history-row';const mapId=historicalMapId(r.config.map),map=mapId?MAPS[mapId]:null,weaponProfile=WEAPONS[r.config.weapon??DEFAULT_WEAPON]||WEAPONS[DEFAULT_WEAPON],mapLabel=map?map.short.split(' / ')[0]:'LEGACY';for(const value of [new Date(r.startedAt).toLocaleString('vi-VN'),`${String(r.config.task).toUpperCase()} · ${mapLabel}`,`${weaponProfile.name} · ${DIFFICULTIES[r.config.difficulty??'normal']?.name??'Tiêu chuẩn'}`,`Sens ${r.config.sensitivity} · ${r.config.dpi} DPI`,TASKS[r.config.task]?.tracking?`${((r.summary.timeOnTarget||0)*100).toFixed(1)}% trên target`:`${r.summary.hits}/${r.summary.shots} trúng`,r.status==='completed'?'Hoàn tất':'Kết thúc sớm']){const el=document.createElement('span');el.textContent=value;row.append(el);}const review=document.createElement('button');review.className='text-button';review.textContent=r.analysis?'Xem phân tích ↗':'Phiên cũ: chỉ có tóm tắt';review.disabled=!r.analysis;review.onclick=()=>{show('history-review',true);renderAnalysis(r.analysis,$('history-review'));$('history-review').scrollIntoView({behavior:'smooth'});};row.append(review);$('history-list').append(row);}}
let calState='idle', calMove=null, calTrials=[];
$('distance-cm').onchange=()=>{ $('distance-cm').value=validNumber($('distance-cm').value,5,50,10);put('distance-instruction',`${$('distance-cm').value} cm`); };
$('cal-start').onclick=()=>{if(calTrials.length>=3)return toast('Làm lại phép đo để thu ba lượt mới.');lock($('cal-pad'),'calibration');};
document.addEventListener('keydown',event=>{if(event.code!=='Space'||event.repeat||document.pointerLockElement!==$('cal-pad'))return;event.preventDefault();
 if(calState==='armed'){calState='measuring';calMove={dx:0,pathX:0,pathY:0,samples:0,distanceCm:validNumber($('distance-cm').value,5,50,10)};put('cal-message','Đang ghi — kéo thẳng một chiều');}
 else if(calState==='measuring'){const result=calibrationTrial(calMove);calState='idle';document.exitPointerLock();if(result.valid){calTrials.push({...result,inputMode,rawVerified:false});put('cal-message','Đã ghi lượt đo. Đưa chuột về điểm đầu.');}else put('cal-message',result.reason);renderCalibration();}
});
function renderCalibration(){put('cal-step',`${calTrials.length} / 3 LƯỢT`);$('cal-trials').replaceChildren(...calTrials.map((r,i)=>{const el=document.createElement('span');el.textContent=`Lượt ${i+1}: ${Math.round(r.dpi)} DPI`;return el;}));const s=calibrationSummary(calTrials);show('cal-result',s.n>0);put('cal-dpi',s.estimate===null?'—':Math.round(s.estimate));const sameMode=new Set(calTrials.map(t=>t.inputMode)).size<=1;$('apply-dpi').disabled=!s.usable||!sameMode;put('cal-quality',s.n<3?'Cần đủ ba lượt đo để áp dụng.':s.usable&&sameMode?`Độ trải ${(s.spread*100).toFixed(1)}%. Ba lượt nhất quán; vẫn là DPI hiệu dụng ước lượng.`:'Các lượt chưa nhất quán. Làm lại với cùng tốc độ và cấu hình chuột.');}
$('cal-reset').onclick=()=>{if(document.pointerLockElement)return;calTrials=[];renderCalibration();put('cal-message','Sẵn sàng đo chuyển động');put('cal-count','Đặt chuột ở điểm bắt đầu');};
$('apply-dpi').onclick=()=>{const s=calibrationSummary(calTrials);if(!s.usable)return;dpiSource='effective-estimate';calibration={...s,trials:calTrials.slice(),measuredAt:new Date().toISOString()};$('dpi-input').value=Math.round(s.estimate);profile();navigate('practice');toast('Đã áp dụng DPI hiệu dụng ước lượng.');};

function renderAnalysis(analysis, panel=$('coach-panel')){
panel.replaceChildren();
 const heading=document.createElement('h3');heading.textContent=analysis.headline;panel.append(heading);
 if(panel.id==='history-review'&&analysis.chartCoaching){const priority=analysis.chartCoaching.priority;for(const text of [priority.title,priority.evidence,priority.action]){const p=document.createElement('p');p.textContent=text;panel.append(p);}}
 if(panel.id==='history-review'&&analysis.insights){const details=document.createElement('div');renderInsights(analysis.insights,details);panel.append(details);}
 if(analysis.challenge){const p=document.createElement('p');p.className='challenge-result';p.textContent=`${analysis.challenge.passed?'ĐẠT':analysis.challenge.eligible?'CHƯA ĐẠT':'CHƯA XÉT'} · ${analysis.challenge.name}: ${analysis.challenge.reason}`;panel.append(p);}
 for(const [title,items] of [['Đo được trong phiên',analysis.evidence],['Việc nên làm tiếp',analysis.actions],['Chất lượng dữ liệu',analysis.quality]]){
  if(!items.length)continue;const label=document.createElement('h4');label.textContent=title;const list=document.createElement('ul');for(const text of items){const li=document.createElement('li');li.textContent=text;list.append(li);}panel.append(label,list);
 }
 for(const text of [analysis.comparison,analysis.disclaimer]){const p=document.createElement('p');p.className='small-note';p.textContent=text;panel.append(p);}
 const button=document.createElement('button');button.className='secondary-button';button.textContent=`Chọn bài tiếp: ${TASKS[analysis.nextTask].name}`;button.onclick=()=>{if(busy())return;navigate('practice');clearChallenge();selectTask(analysis.nextTask);$('difficulty').value='easy';$('duration').value='30';renderScenario();$('range-shell').scrollIntoView({behavior:'smooth',block:'center'});};panel.append(button);
}
try{
 const saved=JSON.parse(localStorage.getItem('gamesen.profile')||'null');
 if(saved){$('sensitivity').value=validNumber(saved.sensitivity,.01,10,.3);$('dpi-input').value=validNumber(saved.dpi,100,32000,800);dpiSource=saved.dpiSource==='effective-estimate'?'effective-estimate':'manual';calibration=dpiSource==='effective-estimate'?saved.calibration??null:null;baseline=Number($('sensitivity').value);put('base-sens-label',`Gốc: ${baseline.toFixed(3)}`);}
}catch{}
profile();renderHistory();
$('history-export').onclick=()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify({format:'gamesen-history',version:1,sessions:history()},null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='gamesen-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('history-import').onclick=()=>$('history-file').click();
$('history-file').onchange=async()=>{
 const file=$('history-file').files[0];if(!file)return;
 try{if(file.size>5*1024*1024)throw new Error('File lịch sử vượt giới hạn 5 MiB.');const sessions=parseHistory(await file.text());localStorage.setItem('gamesen.sessions',JSON.stringify(mergeHistory(history(),sessions)));renderHistory();renderTaskProgress();toast(`Đã nhập ${sessions.length} bản tóm tắt; không nhập quỹ đạo.`);}catch(error){toast(error.message||'Không nhập được file lịch sử.');}finally{$('history-file').value='';}
};

if(window.gamesenDesktop){
 document.title='Gamesen Aim Lab — Desktop';
 document.querySelector('.local-badge').lastChild.textContent=' Desktop · dữ liệu trên máy';

 const note=document.createElement('p');note.className='small-note';note.textContent='App tự lưu JSON đầy đủ sau mỗi phiên. Menu Ứng dụng → Mở thư mục dữ liệu phiên.';$('history-view').prepend(note);
 if(!renderer)window.gamesenDesktop.ready({webgl:false});
}
