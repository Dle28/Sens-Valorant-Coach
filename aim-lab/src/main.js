import {surfaceMaps} from './maps/shared/surfaces.js';
import {configureRenderer,configureShadows,savedRenderQuality} from './maps/shared/render-quality.js';
import { DATA_VERSION, assessSession } from './data-contract.js';
import { assessmentAssignment } from './assessment-protocol.js';
import { deriveRunTelemetry } from './telemetry-features.js';
import { coachingFollowup } from './coaching-outcomes.js';
import { nextAssessmentForecast } from './next-assessment-baseline.js';
import {EXERCISE_VERSION} from './training-config.js';
import {drillStats,rewardText} from './drill-rewards.js';
import {decisionTrial,decisionShot,motionPhase,sinceReversal} from './decision-drills.js';
import {createCombatHud} from './combat-hud.js';
import {turnToward} from './bot-tactics.js';
import {createObjective,stepObjective,movementSpeed} from './objective-round.js';
import {botLevel,weaponDamage,VANDAL_DAMAGE} from './combat-balance.js';
import {seededUnit as combatRandom} from './enemy-behavior.js';
import { chartCoaching } from './chart-coaching.js';
import { initTheme } from './theme.js';
import { sessionInsights } from './insights.js';
import { renderInsights } from './insights-view.js';
import { renderCharts, aimOffset } from './charts.js';
import { parseHistory, mergeHistory } from './history-transfer.js';
import { requestUnadjustedInput } from './input.js';
import { createViewWeapon } from './weapon-view.js';
import { WEAPONS, DEFAULT_WEAPON } from './weapon-profiles.js';
import { initAppShell } from './app-shell.js';
import { spawnEnemy, stepPlayer, updateEnemy } from './enemy-behavior.js';
import { createEnemyRig, ENEMY_HEAD_RADIUS } from './enemy-rig.js';
import {evadeBot,jumpStep,recoilShot,smoothVelocity,WAVE_PAUSE_MS,BOT_SPAWN_GAP_MS,siteBotCount} from './site-combat.js';
import { createSiteWorld } from './site-world.js';
import { SITES, getSite, siteSpawn, slideSite, clearSiteLine, readMovementPose, SITE_BOUNDS } from './site-layout.js';
import * as THREE from 'three';
import { clamp, validNumber, cm360, rotationDelta, verticalFov, summarizeRun, trialsCsv } from './metrics.js';
import { TASKS, CHALLENGES, DIFFICULTIES, MAPS, DEFAULT_MAP, resolveMapId, historicalMapId, taskDeadlineMs, taskMotion, targetPosition, scenarioInfo, progressSummary, comparable, sessionScore, analyzeRun } from './training.js';
const $ = id => document.getElementById(id);
// Explicit dataset reset: discard legacy summaries once, retain sensitivity settings.
try { if(localStorage.getItem('gamesen.dataVersion')!==DATA_VERSION){localStorage.removeItem('gamesen.sessions');localStorage.setItem('gamesen.dataVersion',DATA_VERSION);} } catch {}
let playerId=crypto.randomUUID(),identityPersistent=false;
try { const saved=localStorage.getItem('gamesen.playerId');if(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(saved??''))playerId=saved;else localStorage.setItem('gamesen.playerId',playerId);identityPersistent=true; } catch {}
let pendingCoaching=null,pendingRetest=null,lastPointerDownSeq=null,lastCheckpointMs=0,checkpointBusy=false;
function recordControl(event,type,extra={}){
 if(state!=='running'||!run)return null;
 const row={seq:run.controlEvents.length,t:eventActiveTime(),receivedAtMs:performance.now(),sourceTimestampMs:Number.isFinite(event?.timeStamp)?event.timeStamp:null,isTrusted:event?.isTrusted??null,type,trialId:trial?.trialId??null,...extra};
 run.controlEvents.push(row);return row;
}
function closeTrial(outcome,t=eventActiveTime()){
 if(!trial||trial.outcome!=='pending')return;
 trial.outcome=outcome;trial.endedMs=Math.max(trial.startedMs,t);
}
function checkpoint(){
 if(!window.gamesenDesktop?.saveCheckpoint||!run||checkpointBusy||elapsed-lastCheckpointMs<5000)return;
 lastCheckpointMs=elapsed;checkpointBusy=true;
 const snapshot={...run,elapsedMs:Math.max(elapsed,eventActiveTime())};
 window.gamesenDesktop.saveCheckpoint(JSON.stringify(snapshot)).catch(()=>toast('Không lưu được checkpoint; hãy xuất JSON khi kết thúc.')).finally(()=>{checkpointBusy=false;});
}
const show = (id, yes) => $(id).hidden = !yes;
const put = (id, text) => $(id).textContent = text;
let toastTimer;
function toast(message) { put('toast', message); show('toast', true); clearTimeout(toastTimer); toastTimer = setTimeout(() => show('toast', false), 4500); }
let challengeId=null;
let task = 'precision', baseline = .3, dpiSource = 'declared', activeMap=DEFAULT_MAP, activeWeapon=DEFAULT_WEAPON, tacticalScenario=null;
let state = 'idle', run = null, elapsed = 0, previous = 0, countdownUntil = 0, pending = null, inputMode = 'not-requested', trial, spawnNext=false;
let renderer, scene, camera, target, weapon, activeLockElement=null, desktopReadySent=false, cinematicWorld=null;
let enemyVisual=null, enemyTracer=null, enemyTracerUntil=0, combatEnemies=[], decoyVisuals=[], playerState=null;
let siteWorld=null,rangeLighting=null;
let fireHeld=false,lastFire=-Infinity,sprayIndex=0,nextWaveAt=0,jumpVelocity=0;
const isSiteRun=()=>Boolean(run&&TASKS[run.config.task]?.site);
const currentSite=()=>getSite(run?.config?.scenario?.siteId);
const ray = new THREE.Raycaster(), forward = new THREE.Vector3(), direction = new THREE.Vector3();
const canvas = $('range-canvas');
const playerInput={KeyW:false,KeyA:false,KeyS:false,KeyD:false,ShiftLeft:false,ShiftRight:false,Space:false,ControlLeft:false,ControlRight:false,KeyF:false};
let equippedSlot=1,crouchBlend=0,equipReadyAt=0;
const heldWeapon=()=>equippedSlot===2?'classic':run?.config?.weapon??'vandal';
const PLAYER_BOUNDS=Object.freeze({minX:-10,maxX:10,minZ:-5,maxZ:7});
initTheme();
let activeTarget=null;
let playlistSelection=null,priorityTargets=[];
const decisionCue=document.createElement('div');decisionCue.className='decision-cue';decisionCue.hidden=true;$('range-shell').append(decisionCue);
function clearDecisionTargets(){for(const mesh of priorityTargets){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();for(const child of mesh.children){child.material.map?.dispose();child.material.dispose();}}priorityTargets=[];decisionCue.hidden=true;}
function expectedPriority(){return priorityTargets[trial?.priorityOrder?.[trial.priorityIndex]];}
function setupDecision(){
 clearDecisionTargets();if(!trial?.decision)return;
 decisionCue.hidden=false;
 if(trial.decision!=='priority'){decisionCue.textContent=trial.decision==='withhold'?'× HOLD — KHÔNG BẮN':'+ SHOOT — BẮN';return;}
 const center=target.position.clone();target.visible=false;
 for(let slot=0;slot<3;slot++){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(activeTarget.radius,24,16),target.material.clone());mesh.position.copy(center);mesh.position.x+=(slot-1)*activeTarget.radius*5;
  const surface=document.createElement('canvas');surface.width=surface.height=128;const ctx=surface.getContext('2d');ctx.fillStyle='#07131d';ctx.fillRect(0,0,128,128);ctx.fillStyle='#ffffff';ctx.font='bold 90px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(trial.priorityOrder.indexOf(slot)+1),64,68);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(surface),depthTest:false}));sprite.scale.setScalar(activeTarget.radius*2);sprite.position.y=activeTarget.radius*2;mesh.add(sprite);scene.add(mesh);priorityTargets.push(mesh);
 }
 target.position.copy(expectedPriority().position);decisionCue.textContent='ƯU TIÊN 1 → 2 → 3';
}
function priorityHit(){camera.updateMatrixWorld();ray.setFromCamera({x:0,y:0},camera);priorityTargets.forEach(m=>m.updateMatrixWorld());return ray.intersectObjects(priorityTargets.filter(m=>m.visible),false)[0]?.object??null;}
for(const id of ['heat-kind','heat-extent','pace-metric'])$(id).onchange=()=>{if(run&&state==='finished')renderCharts(run,!!TASKS[run.config.task].tracking);};
for (const [id, data] of Object.entries(TASKS)) {
 const button=document.createElement('button');button.className='task-card'+(id===task?' selected':'');button.dataset.task=id;button.dataset.category=data.category||(data.tracking?'tracking':['transfer','wide','reactive'].includes(id)?'speed':'precision');button.setAttribute('aria-pressed',String(id===task));
 const icon=document.createElement('span');icon.className='task-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=`<svg viewBox="0 0 90 64"><path d="M14 44L42 18L75 39" fill="none" stroke="currentColor" stroke-dasharray="3 4" opacity=".3"/><circle cx="14" cy="44" r="6" fill="currentColor" opacity=".45"/><circle cx="42" cy="18" r="10" fill="currentColor"/><circle cx="75" cy="39" r="8" fill="currentColor" opacity=".7"/><circle cx="42" cy="18" r="15" fill="none" stroke="currentColor" opacity=".2"/></svg>`;
 const text=document.createElement('span'),title=document.createElement('b'),description=document.createElement('small');title.textContent=data.name;description.textContent=data.description;text.append(title,description);button.append(icon,text);$('task-list').append(button);
}
function clearChallenge(){challengeId=null;$('challenge-select').value='';put('challenge-description','Tập tự do · không xét mục tiêu thử thách.');}
function currentComparisonConfig(){return {task,map:activeMap,weapon:activeWeapon,difficulty:$('difficulty').value,durationMs:Number($('duration').value)*1000,sensitivity:Number($('sensitivity').value),dpi:Number($('dpi-input').value),dpiSource,inputMode:'unadjusted-requested-unverified',inputGain:1,exerciseVersion:EXERCISE_VERSION,challengeId,horizontalFovDeg:103,deadlineMs:taskDeadlineMs(task,$('difficulty').value),scenario:tacticalScenario??null,seed:CHALLENGES[challengeId]?.seed};}
function renderTaskProgress(){const difficulty=$('difficulty')?.value??'normal';const summary=progressSummary(history(),{task,map:activeMap,difficulty,weapon:activeWeapon,config:currentComparisonConfig(),playerId});const {scores,last,best,delta}=summary;put('task-progress-count',`${scores.length} PHIÊN`);put('task-progress-last',last===null?'—':`${last.toFixed(1)}%`);put('task-progress-best',best===null?'—':`${best.toFixed(1)}%`);put('task-progress-delta',delta===null?'—':`${delta>=0?'+':''}${delta.toFixed(1)}%`);const bars=$('task-progress-bars');bars.replaceChildren(...scores.slice().reverse().map((value,index)=>{const bar=document.createElement('i');bar.style.height=`${Math.max(8,Math.min(100,value))}%`;bar.title=`Phiên ${index+1}: ${value.toFixed(1)}%`;bar.setAttribute('aria-label',`Phiên ${index+1}: ${value.toFixed(1)}%`);return bar;}));const trend=$('task-progress-trend');if(trend)trend.textContent=scores.length?scores.slice().reverse().map((value,index)=>`S${index+1} ${value.toFixed(1)}%`).join('  ·  '):'Chưa có dữ liệu phiên';const difficultyName=DIFFICULTIES[difficulty]?.name??difficulty;put('task-progress-copy',scores.length?`So sánh ${scores.length} phiên ${TASKS[task].name} · ${MAPS[activeMap].name} · ${difficultyName} · ${WEAPONS[activeWeapon].name}. Click dùng accuracy; tracking dùng thời gian trên target.`:`Hoàn tất một phiên ${TASKS[task].name} ở map này để bắt đầu so sánh tiến bộ.`);}
function renderMapInfo(){activeMap=resolveMapId(activeMap);const map=MAPS[activeMap];put('map-tag',map.short.split(' / ')[0]);put('map-copy',map.copy);if($('map-select'))$('map-select').value=activeMap;document.documentElement.style.setProperty('--map-primary',map.palette.primary);document.documentElement.style.setProperty('--map-secondary',map.palette.secondary);cinematicWorld?.setMap?.(activeMap);renderTaskProgress();}
function renderWeaponInfo(){const profile=WEAPONS[activeWeapon]||WEAPONS[DEFAULT_WEAPON];put('weapon-tag',profile.tag);put('weapon-specs',`${profile.role} · ${profile.damage} dmg · ${profile.fireRate} · ${profile.magazine}`);if($('weapon-select'))$('weapon-select').value=activeWeapon;weapon?.setProfile?.(activeWeapon);renderTaskProgress();}
function selectTask(id){task=id;document.querySelectorAll('[data-task]').forEach(button=>{button.classList.toggle('selected',button.dataset.task===id);button.setAttribute('aria-pressed',String(button.dataset.task===id));});put('mode-current',TASKS[id].name);put('selected-task-name',TASKS[id].name);put('selected-task-description',TASKS[id].description);put('menu-task-name',TASKS[id].name.toUpperCase());put('menu-task-copy',TASKS[id].description);put('overlay-title',TASKS[id].name);put('overlay-copy',TASKS[id].description+' · Bắt đầu để mở toàn màn hình.');renderScenario();renderTaskProgress();}
function renderScenario(){const info=scenarioInfo(task,$('difficulty').value),d=DIFFICULTIES[info.difficulty];const panel=$('scenario-preview');panel.replaceChildren();const sizes=document.createElement('div');sizes.className='sphere-preview';for(const b of info.sizeBands){const item=document.createElement('div'),orb=document.createElement('i'),label=document.createElement('span');const radius=TASKS[task].radius*d.radius*b.multiplier;orb.style.width=orb.style.height=`${Math.max(7, radius*60)}px`;label.textContent=b.label;item.append(orb,label);sizes.append(item);}const p=document.createElement('p');p.textContent=info.scenario;const detail=document.createElement('small');detail.textContent=`Cự ly ${info.distanceRange.minimum}–${info.distanceRange.maximum} m · ${info.distanceBands.map(b=>b==='near'?'gần':b==='mid'?'trung':'xa').join(' / ')} · ${info.combat?'WASD di chuyển · Shift đi bộ · địch bắn trả':'đổi theo mục tiêu'}.`;const scale=document.createElement('small');const angles=info.sizeBands.map(b=>2*Math.asin(TASKS[task].radius*d.radius*b.multiplier/info.targetDistance)*180/Math.PI);scale.textContent=`Đường kính góc danh định ${Math.min(...angles).toFixed(2)}–${Math.max(...angles).toFixed(2)}° · ${info.tracking?'tốc độ ×'+d.speed:info.combat?'HP / giáp được ghi vào kết quả':'hạn bắn '+taskDeadlineMs(task,info.difficulty)/1000+'s'}`;panel.append(sizes,p,detail,scale);}
for(const [id,name] of [['all','Tất cả'],['precision','Độ chính xác'],['speed','Tốc độ & phản xạ'],['tracking','Bám mục tiêu'],['movement','Duel & di chuyển']]){const b=document.createElement('button');b.className='filter-button'+(id==='all'?' active':'');b.textContent=name;b.setAttribute('aria-pressed',String(id==='all'));b.onclick=()=>{document.querySelectorAll('.filter-button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});document.querySelectorAll('[data-task]').forEach(x=>x.hidden=id!=='all'&&x.dataset.category!==id);};$('task-filters').append(b);}
put('library-count',`${Object.keys(TASKS).length} BÀI TẬP · 4 ĐỘ KHÓ`);selectTask(task);
 $('challenge-select').replaceChildren(new Option('Tập tự do',''),...Object.entries(CHALLENGES).map(([id,c])=>new Option(`${c.name} · ${c.duration}s`,id)));
 $('challenge-select').onchange=()=>{challengeId=$('challenge-select').value||null;const c=CHALLENGES[challengeId];if(!c)return clearChallenge();playlistSelection=null;tacticalScenario=null;selectTask(c.task);$('difficulty').value=c.difficulty;$('duration').value=c.duration;put('challenge-description',c.description+' · chuỗi target cố định · hoàn tất không tạm dừng.');renderScenario();renderTaskProgress();};
$('duration').onchange=()=>{clearChallenge();renderTaskProgress();};$('difficulty').onchange=()=>{clearChallenge();renderScenario();renderTaskProgress();};
function profile() {
 const sensitivity = validNumber($('sensitivity').value, .01, 10, .3), dpi = validNumber($('dpi-input').value, 100, 32000, 800);
 $('sensitivity').value = sensitivity; $('dpi-input').value = dpi;
 put('edpi-value', (dpi * sensitivity).toFixed(1)); put('cm-value', cm360(dpi, sensitivity).toFixed(2));
 put('dpi-source', dpiSource === 'declared' ? 'từ profile' : 'legacy');
 try{localStorage.setItem('gamesen.profile',JSON.stringify({sensitivity,dpi,dpiSource}));}catch{}
 return { sensitivity, dpi, dpiSource, inputGain:1, sensitivityPreset:'valorant-hipfire' };
}
function busy() { return ['running','countdown','paused'].includes(state); }
function navigate(view) {
 if (busy() || document.pointerLockElement || pending) { toast('Kết thúc phiên trước khi chuyển trang.'); return false; }
 document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== `${view}-view`);
 document.querySelectorAll('.nav-button').forEach(el => el.classList.toggle('active', el.dataset.view === view));
 if (view === 'history') renderHistory();
 document.dispatchEvent(new CustomEvent('v-aim:navigate',{detail:{view}}));
 return true;
}
document.querySelectorAll('[data-view]').forEach(el => el.onclick = () => navigate(el.dataset.view));
$('open-dpi').onclick = () => navigate('dpi');
document.querySelectorAll('[data-task]').forEach(el => el.onclick = () => {if(busy())return;playlistSelection=null;tacticalScenario=null;clearChallenge();selectTask(el.dataset.task);$('mode-picker').open=false;});
const menuPlay=$('menu-play-btn'), menuModes=$('menu-modes-btn'), modePicker=$('mode-picker');
menuPlay.onclick=()=>{if(!busy()&&!pending)$('start-btn').click();};
menuModes.onclick=()=>{if(busy())return;modePicker.open=!modePicker.open;menuModes.setAttribute('aria-expanded',String(modePicker.open));if(modePicker.open)modePicker.scrollIntoView({behavior:'smooth',block:'nearest'});};
modePicker.addEventListener('toggle',()=>menuModes.setAttribute('aria-expanded',String(modePicker.open)));
document.addEventListener('keydown',event=>{if(event.code!=='Enter'||event.repeat||$('practice-view').hidden||busy()||pending)return;const tag=document.activeElement?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;menuPlay.click();});
$('map-select').onchange=()=>{if(busy())return;tacticalScenario=null;activeMap=resolveMapId($('map-select').value);renderMapInfo();};
$('weapon-skin').onchange=()=>{if(!busy())weapon?.setSkin($('weapon-skin').value);};
document.addEventListener('keydown',event=>{if(event.code==='KeyV'&&!event.repeat&&document.pointerLockElement===canvas&&state==='running')weapon?.inspect();});
$('weapon-select').onchange=()=>{if(busy())return;activeWeapon=WEAPONS[$('weapon-select').value]?$('weapon-select').value:DEFAULT_WEAPON;renderWeaponInfo();};
renderMapInfo();renderWeaponInfo();
$('sensitivity').onchange = () => { baseline = profile().sensitivity; put('base-sens-label', `Gốc: ${baseline.toFixed(3)}`); };
$('dpi-input').onchange = () => { dpiSource = 'declared'; profile(); };
document.querySelectorAll('[data-factor]').forEach(el => el.onclick = () => { $('sensitivity').value = clamp(baseline * Number(el.dataset.factor), .01, 10).toFixed(3); profile(); });
$('sens-reset').onclick = () => { $('sensitivity').value = baseline; profile(); };
$('fullscreen-btn').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('range-shell').requestFullscreen(); } catch { toast('Trình duyệt không cho phép toàn màn hình.'); } };
function settingsLocked(locked) {if(locked){$('mode-picker').open=false;menuModes.setAttribute('aria-expanded','false');} menuPlay.disabled=locked;menuModes.disabled=locked;document.querySelectorAll('.settings-panel input,.settings-panel button,.settings-panel select,.library-panel button,.scenario-config-panel button,.scenario-config-panel select,.map-page-content [data-map-id],.map-page-content [data-zone-id],.map-page-content [data-scenario-id],.map-page-content [data-open-scenario],.angle-carousel button').forEach(el => el.disabled = locked); }
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
 const mapMaterial=(spec,color=spec.palette.ground,emissive=spec.palette.primary,intensity=.32)=>new THREE.MeshStandardMaterial({color,roughness:.66,metalness:.04,...surfaceMaps('stone'),emissive,emissiveIntensity:intensity*.15});
 const mapBox=(group,geometry,material,position,rotation=[0,0,0])=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
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

function initializeCombatVisuals(){
 enemyVisual=createEnemyRig({tint:'#ff5263',accent:'#7be5df',includeHead:true});scene.add(enemyVisual.root);
 decoyVisuals=[createEnemyRig({tint:'#c5529b',accent:'#ffc76b',variant:'scout',includeHead:true}),createEnemyRig({tint:'#d76c57',accent:'#a8e8ff',variant:'engineer',includeHead:true})];
 decoyVisuals.forEach((rig)=>scene.add(rig.root));
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
 enemyTracer=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#ff5365',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));enemyTracer.visible=false;scene.add(enemyTracer);
}

function isCombatRun(){return Boolean(run&&TASKS[run.config.task]?.combat);}
function clearPlayerInput(){if(state==='running')recordControl(null,'input-reset',{reason:'pause_or_visibility'});for(const key of Object.keys(playerInput))playerInput[key]=false;fireHeld=false;sprayIndex=0;}
function resetCombatScene(){
 combatEnemies=[];
 if(enemyVisual)enemyVisual.root.visible=false;
 decoyVisuals.forEach((rig)=>{rig.root.visible=false;});
 if(enemyTracer)enemyTracer.visible=false;
 if(target)target.visible=true;
}
function defaultCombatBehavior(){
 const requested=run?.config?.scenario?.behavior;
 if(['static','strafe','peek','wide','random'].includes(requested))return requested;
 if(run?.config?.task==='counter')return 'peek';
 if(run?.config?.task==='survival')return 'random';
 return 'strafe';
}
function combatTiming(){
 const difficulty=run?.config?.difficulty??'normal';
 const cooldown={easy:1350,normal:1050,hard:790,expert:620}[difficulty]??1050;
 const reaction=run?.config?.scenario?.reaction;
 const initial={instant:620,'150':770,'250':870,'350':970,random:820}[reaction]??820;
 const hitChance={easy:.24,normal:.36,hard:.46,expert:.56}[difficulty]??.36;
 return {cooldown,initial,hitChance};
}
function combatEnemyOptions(index, anchor, archetype=defaultCombatBehavior()){
 const timing=combatTiming(), survival=run?.config?.task==='survival', difficulty=run?.config?.difficulty??'normal';
 const spread=survival?3.6:2.55;
 return {
  id:`enemy-${index}`, archetype, seed:run.config.seed, spawnIndex:index, randomSpawn:false,
  anchor:{x:anchor.x,y:anchor.y,z:anchor.z}, bounds:{minX:anchor.x-spread,maxX:anchor.x+spread,minZ:anchor.z-1.9,maxZ:anchor.z+1.9},
  size:activeTarget?.radius??.4, amplitude:survival?2.85:2.15, speed:DIFFICULTIES[difficulty]?.speed??1,
  cooldownMs:Math.round(timing.cooldown*(index?1.18:1)), initialShotDelayMs:timing.initial+index*170,
  hitChance:Math.max(.1,timing.hitChance-index*.04), movementEvasion:.06, damage:survival?(index?11:15):18,
 };
}
const combatHud=createCombatHud($('range-shell'));
function syncEnemyVisual(entry,motion){
 const position=motion.position, rig=entry.rig;
 const visible=motion.visible&&entry.alive;
 rig.root.position.set(position.x,position.y,position.z);rig.root.visible=visible;rig.hitbox.visible=visible;
 if(entry.bot){
 const seen=clearSiteLine(currentSite(),position,camera.position);
 if(seen)entry.bot.lastSeen={x:camera.position.x,z:camera.position.z};
 const aim=seen?camera.position:entry.bot.lastSeen??entry.bot.route?.[0]??{x:0,z:0};
 const desired=Math.atan2(aim.x-position.x,aim.z-position.z);
 rig.root.rotation.y=turnToward(rig.root.rotation.y,desired,Math.min(.1,(performance.now()-(entry.lastAnimation??performance.now()))/1000));
 entry.bot.aimError=Math.abs(Math.atan2(Math.sin(desired-rig.root.rotation.y),Math.cos(desired-rig.root.rotation.y)));
 }else rig.root.lookAt(camera.position.x,position.y,camera.position.z);
 const now=performance.now(),delta=entry.lastAnimation?Math.min(.1,(now-entry.lastAnimation)/1000):0;entry.lastAnimation=now;rig.animate?.(motion.velocity,delta,now,motion.crouch??0,motion);
 const scale=isSiteRun()?1:Math.max(.72,Math.min(1.18,(activeTarget?.radius??.4)/.4));rig.root.scale.setScalar(scale);rig.hitbox.scale.setScalar(isSiteRun()?ENEMY_HEAD_RADIUS:(activeTarget?.radius??.4)/scale);
}
function syncCombatFocusTarget(){
 if(!isCombatRun()||!target)return;
 const focused=combatEnemies.find((entry)=>entry.alive&&entry.rig.root.visible)||combatEnemies.find((entry)=>entry.alive);
 if(!focused){target.visible=false;return;}
 focused.rig.root.updateMatrixWorld(true);focused.rig.hitbox.getWorldPosition(target.position);target.visible=!isSiteRun()&&focused.rig.root.visible;target.scale.setScalar(activeTarget?.radius??.4);
 if(isSiteRun()){const distance=camera.position.distanceTo(target.position);activeTarget={...activeTarget,radius:ENEMY_HEAD_RADIUS,distance:Number(distance.toFixed(1)),distanceBand:distance<12?'near':distance<24?'mid':'far'};target.scale.setScalar(ENEMY_HEAD_RADIUS);}
}
function configureCombatEnemies(){
 resetCombatScene();
 if(!isCombatRun()||!target)return;
 const count=isSiteRun()?siteBotCount(run.config.difficulty):run.config.task==='survival'?3:1;
 while(decoyVisuals.length<count-1){const rig=createEnemyRig({variant:decoyVisuals.length%2?'engineer':'scout',tint:decoyVisuals.length%2?'#d76c57':'#c5529b'});scene.add(rig.root);decoyVisuals.push(rig);}
 for(let index=0;index<count;index++){
  const offset=index===0?0:index===1?-3.1:3.1;
  const anchor=isSiteRun()?siteSpawn(currentSite(),run.config.seed,run.trials.length,index,playerState.position):{x:target.position.x+offset,y:target.position.y,z:target.position.z-index*.7};
  const archetype=isSiteRun()?['strafe','wide','random'][(index+run.trials.length)%3]:index===0?defaultCombatBehavior():index===1?'peek':'wide';
  const options=combatEnemyOptions(index,anchor,archetype);
  if(isSiteRun())Object.assign(options,{spawnIndex:run.trials.length*10+index,id:`wave-${run.trials.length}-${index}`,size:ENEMY_HEAD_RADIUS,amplitude:1.7,archetype:'random',damage:VANDAL_DAMAGE.body,health:150,cooldownMs:botLevel(run.config.difficulty).cooldown,hitChance:botLevel(run.config.difficulty).accuracy,initialShotDelayMs:botLevel(run.config.difficulty).reaction+index*350,randomStepMs:run.config.task==='readmove'?550:1000,bounds:{minX:anchor.x-1.7,maxX:anchor.x+1.7,minZ:anchor.z-.5,maxZ:anchor.z+.5}});
  const spawned=spawnEnemy(options);
  const rig=index===0?enemyVisual:decoyVisuals[index-1];
  const entry={id:spawned.id,primary:index===0,rig,options,startedMs:elapsed,alive:true,health:150,hitObject:rig.hitbox,lastPosition:{...spawned.position}};
  if(isSiteRun()){entry.startedMs=elapsed+index*BOT_SPAWN_GAP_MS;entry.bot={position:{...spawned.position},index:options.spawnIndex,difficulty:run.config.difficulty};}
  combatEnemies.push(entry);syncEnemyVisual(entry,{position:spawned.position,visible:true});
  if(isSiteRun()&&entry.startedMs>elapsed){rig.root.visible=false;rig.hitbox.visible=false;}
 }
 syncCombatFocusTarget();
}
function showEnemyTracer(entry,event,now){
 if(!enemyTracer||!entry?.rig)return;
 entry.rig.root.updateMatrixWorld(true);const source=new THREE.Vector3();entry.rig.muzzle.getWorldPosition(source);
 const positions=enemyTracer.geometry.attributes.position;positions.setXYZ(0,source.x,source.y,source.z);positions.setXYZ(1,camera.position.x,camera.position.y,camera.position.z);positions.needsUpdate=true;
 enemyTracer.material.color.set(event.hit?'#ff5263':'#71d9dc');enemyTracer.visible=true;enemyTracerUntil=now+130;
 entry.rig.flash.visible=true;entry.rig.flash.userData.until=now+75;
}
function applyEnemyDamage(damage){
 if(!playerState||!damage)return false;combatHud.damage();
 const shield=Math.min(playerState.shield,damage), health=Math.max(0,damage-shield);
 playerState={...playerState,shield:playerState.shield-shield,health:Math.max(0,playerState.health-health)};
 if(run?.combat){run.combat.damageTaken+=damage;run.combat.playerHealth=playerState.health;run.combat.playerShield=playerState.shield;}
 return playerState.health<=0;
}
function updateCombat(fromMs,toMs,now,stateAt=()=>({velocity:playerState?.velocity})){
 if(!isCombatRun()||!combatEnemies.length)return false;
 for(const entry of combatEnemies){
  if(!entry.alive)continue;
  if(isSiteRun()&&toMs<entry.startedMs)continue;
  const from=Math.max(0,fromMs-entry.startedMs), to=Math.max(0,toMs-entry.startedMs);
  const update={...updateEnemy(entry.options,from,to,(eventTime,shotIndex)=>stateAt(eventTime+entry.startedMs,entry,shotIndex))};
  if(isSiteRun()){update.motion=evadeBot(currentSite(),entry.bot,playerState.position,to,Math.min(.1,(to-from)/1000),run.config.seed);entry.lastPosition=update.motion.position;}
  syncEnemyVisual(entry,update.motion);
  for(let event of update.shots){
   if(!event.fired)continue;
   if(isSiteRun()&&(!entry.bot.action?.burst||Math.abs(entry.bot.vy??0)>.2||entry.bot.aimError>.18))continue;
   if(isSiteRun()&&!clearSiteLine(currentSite(),entry.lastPosition,camera.position))continue;
   if(isSiteRun()){
    const region=combatRandom(run.config.seed,event.shotIndex*71+entry.options.spawnIndex*4099)<botLevel(run.config.difficulty).headChance?'head':'body';
    event={...event,position:{...entry.lastPosition},region,damage:event.hit?VANDAL_DAMAGE[region]:0};
    entry.bot.pauseUntil=to+120;
   }
   const record={...event,t:event.t+entry.startedMs};
   run.combat.enemyShots.push(record);run.combat.shotsFired++;
   showEnemyTracer(entry,event,now);
   if(event.hit){run.combat.shotsLanded++;if(applyEnemyDamage(event.damage)){run.combat.eliminatedAt=record.t;finish('ended-early','eliminated');return true;}}
  }
 }
 syncCombatFocusTarget();
 return false;
}
function updateCombatEffects(now){
 if(enemyTracer&&now>=enemyTracerUntil)enemyTracer.visible=false;
 for(const entry of combatEnemies){if(entry.rig.flash.visible&&now>=entry.rig.flash.userData.until)entry.rig.flash.visible=false;}
}
function combatEnemySnapshot(){
 const focused=combatEnemies.find((entry)=>entry.alive&&entry.rig.root.visible)||combatEnemies.find((entry)=>entry.alive);
 if(!focused)return null;
 focused.rig.root.updateMatrixWorld(true);const position=focused.rig.hitbox.getWorldPosition(new THREE.Vector3());
 return {id:focused.id,archetype:focused.options.archetype,visible:focused.rig.root.visible,position:position.toArray()};
}
try {
 renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); configureRenderer(renderer);
 scene = new THREE.Scene(); scene.background = new THREE.Color('#071321'); scene.fog = new THREE.FogExp2('#071321', .0125);
 camera = new THREE.PerspectiveCamera(verticalFov(103, 16/9), 16/9, .1, 150); camera.position.set(0, 1.6, 0); camera.rotation.order = 'YXZ';
 scene.add(camera);
 rangeLighting=new THREE.Group();scene.add(rangeLighting);rangeLighting.add(new THREE.HemisphereLight(0xdceaff, 0x596065, 1.8));
 const light = new THREE.DirectionalLight(0xfff0dc, 2.6); light.position.set(-20, 30, -15);light.target.position.set(0,0,-35);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-45,right:45,top:40,bottom:-40,near:.5,far:140});light.shadow.normalBias=.04;light.shadow.bias=-.0001;rangeLighting.add(light,light.target);
 configureShadows(rangeLighting);
 const qualitySelect=document.getElementById('render-quality');
 qualitySelect.value=savedRenderQuality();
 qualitySelect.addEventListener('change',()=>{
  try{localStorage.setItem('gamesen.render-quality',qualitySelect.value);}catch{}
  configureRenderer(renderer,qualitySelect.value);configureShadows(scene,qualitySelect.value);
 });
 cinematicWorld=createCinematicWorld();
 siteWorld=createSiteWorld(scene);
 target = new THREE.Mesh(new THREE.SphereGeometry(1,32,24), new THREE.MeshStandardMaterial({ color:'#ffe8e8', emissive:'#bd354d', emissiveIntensity:.62, roughness:.3 }));
 target.position.set(0,1.6,-20); target.scale.setScalar(.4); scene.add(target);
 initializeCombatVisuals();
 weapon=createViewWeapon(camera,activeWeapon);weapon.setSkin($('weapon-skin')?.value??'original');
 new ResizeObserver(() => { const w=canvas.clientWidth,h=canvas.clientHeight; if (!w||!h) return; renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov=verticalFov(103,w/h); camera.updateProjectionMatrix(); }).observe(canvas);
} catch (error) { put('overlay-title','Không khởi tạo được đồ họa 3D'); put('overlay-copy','Mở bằng trình duyệt desktop có WebGL2 và bật tăng tốc phần cứng.'); $('start-btn').disabled = true; console.error(error); }
const telemetryFrustum=new THREE.Frustum(),telemetryProjection=new THREE.Matrix4(),telemetrySphere=new THREE.Sphere();
function targetInView(){camera.updateMatrixWorld();telemetryProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);telemetryFrustum.setFromProjectionMatrix(telemetryProjection);telemetrySphere.center.copy(target.position);telemetrySphere.radius=target.scale.x;return telemetryFrustum.intersectsSphere(telemetrySphere);}
function errorAngleAt(point) { camera.getWorldDirection(forward); direction.copy(point).sub(camera.position).normalize(); return THREE.MathUtils.radToDeg(forward.angleTo(direction)); }
function errorAngle() { return errorAngleAt(target.position); }
function combatHitEntry(){
 if(!isCombatRun())return null;
 camera.updateMatrixWorld();ray.setFromCamera({x:0,y:0},camera);
 const candidates=combatEnemies.filter((entry)=>entry.alive&&entry.rig?.root.visible&&entry.hitObject?.visible);
 if(!candidates.length)return null;
 candidates.forEach((entry)=>entry.rig.root.updateMatrixWorld(true));
 const objects=isSiteRun()?candidates.flatMap(e=>e.rig.hurtMeshes):candidates.map(e=>e.hitObject);
 const hit=ray.intersectObjects(objects,false)[0];
 if(hit&&isSiteRun()&&equippedSlot===3&&hit.distance>2)return null;
 if(hit&&isSiteRun()&&!clearSiteLine(currentSite(),camera.position,hit.point))return null;
 const entry=hit?candidates.find(entry=>entry.hitObject===hit.object||entry.rig.hurtMeshes.includes(hit.object)):null;
 if(entry)entry.hitRegion=hit.object.userData.hitRegion??'body';
 return entry??null;
}
function isHit() {
 if(run?.config.task==='priority')return priorityHit()===expectedPriority();
 if(isCombatRun())return Boolean(combatHitEntry());
 if(!target.visible)return false;camera.updateMatrixWorld(); target.updateMatrixWorld(); ray.setFromCamera({x:0,y:0},camera); return ray.intersectObject(target).length > 0;
}
function eliminateCombatEnemy(entry,shotTime){
 if(!entry?.alive)return false;
 if(isSiteRun()){
  entry.health=Math.max(0,entry.health-(equippedSlot===3?50:weaponDamage(heldWeapon(),entry.hitRegion)));
  if(entry.health>0)return false;
 }
 entry.alive=false;entry.rig.root.visible=false;entry.hitObject.visible=false;
 if(run?.combat){
  run.combat.enemiesEliminated=(Number(run.combat.enemiesEliminated)||0)+1;
  run.combat.eliminations??=[];
  run.combat.eliminations.push({enemyId:entry.id,archetype:entry.options.archetype,t:shotTime});
 }
 if(trial)trial.eliminations=(Number(trial.eliminations)||0)+1;
 syncCombatFocusTarget();
 return combatEnemies.every((candidate)=>!candidate.alive);
}
function placeTarget(yaw, pitch, distance=20, origin=null) { const anchor=origin instanceof THREE.Vector3?origin:Array.isArray(origin)?new THREE.Vector3(...origin):camera.position;target.position.set(anchor.x+Math.sin(yaw)*Math.cos(pitch)*distance,anchor.y+Math.sin(pitch)*distance,anchor.z-Math.cos(yaw)*Math.cos(pitch)*distance); }
function eventActiveTime(){return Math.min(run.config.durationMs,elapsed+(state==='running'?Math.max(0,performance.now()-previous):0));}
function targetForRun(index,cameraYaw=0,cameraPitch=0) {
 const scenario=run?.config?.scenario??{};
 return targetPosition({task:run.config.task,map:run.config.map,difficulty:run.config.difficulty,seed:run.config.seed,index,cameraYaw,cameraPitch,distanceMode:scenario.distance,headLevel:scenario.head});
}
function behaviorMotionTask() {
 const behavior=run?.config?.scenario?.gameMode==='scenario'?run.config.scenario.behavior:null;
 if(behavior==='static')return null;
 if(behavior==='strafe')return 'strafe';
 if(behavior==='peek')return 'peek';
 if(behavior==='wide')return 'switcher';
 if(behavior==='random'){const modes=['strafe','peek','switcher'];return modes[(Math.floor(elapsed/2500)+(run.config.seed%modes.length))%modes.length];}
 const current=TASKS[run?.config?.task];
 return current?.motion||current?.tracking||current?.moving?run.config.task:null;
}
function spawnTrial() {
 const angles=targetForRun(run.trials.length,-camera.rotation.y,camera.rotation.x);
 const origin=camera.position.clone();
 activeTarget=angles;target.scale.setScalar(angles.radius);target.visible=true;placeTarget(angles.yaw,angles.pitch,angles.distance,origin);
 trial={targetRadius:angles.radius,sizeBand:angles.sizeBand,distance:angles.distance,distanceBand:angles.distanceBand,layoutKey:angles.layoutKey,baseYaw:angles.yaw,basePitch:angles.pitch,spawnOrigin:origin.toArray(),trialId:run.trials.length+1,startedMs:elapsed,initialErrorDeg:errorAngle(),outcome:'pending',endedMs:null,firstVisibleMs:null,firstHitMs:null,shots:0,eliminations:0,firstEntryMs:null,firstShotMs:null,firstShotHit:null,hitMs:null,entryToFirstShotMs:null}; run.trials.push(trial);
 if(isCombatRun())configureCombatEnemies();else resetCombatScene();
 Object.assign(trial,decisionTrial(run.config.task,run.config.seed,trial.trialId-1),{elevationLevel:run.config.task==='ladder'&&angles.headLevel!=='fixed'?[-1,0,1,1,0,-1][(trial.trialId-1)%6]:Math.sign(angles.pitch)});setupDecision();
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
   elapsed=0;lastCheckpointMs=0;lastPointerDownSeq=null;nextWaveAt=0;jumpVelocity=0;lastFire=-Infinity;
   const assessment=playlistSelection?.assessment??null;
   const phase=pendingCoaching?'intervention':$('assessment-phase').value;
   const seed=assessment?.assignedConfig?.seed??CHALLENGES[challengeId]?.seed??crypto.getRandomValues(new Uint32Array(1))[0];
   run={schemaVersion:DATA_VERSION,isSynthetic:false,playerId,identityPersistent,
    clock:{timebase:'session_active_ms',inputCoordinateSpace:'browser_movement_units',angleUnit:'rad',errorUnit:'deg',positionUnit:'harness_unit',sourceTimestamp:'DOM_event_timeStamp_ms',receiveTimestamp:'performance.now_ms',timeOrigin:performance.timeOrigin},
    protocol:{blockId:crypto.randomUUID(),phase,fatigueBefore:$('fatigue-level').value===''?null:Number($('fatigue-level').value),assignment:assessment?'protocol_fixed':'self_selected',assessment,coaching:pendingCoaching,consentForTraining:$('consent-training').checked},
    provenance:{collectorVersion:'0.4.0',buildId:typeof __BUILD_ID__==='undefined'?'development-unpinned':__BUILD_ID__},device:{platform:navigator.platform,viewport:[canvas.clientWidth,canvas.clientHeight],devicePixelRatio,displayHz:null,pollingHz:null},id:crypto.randomUUID(),startedAt:new Date().toISOString(),status:'in-progress',
    config:{...profile(),task,map:activeMap,weapon:activeWeapon,challengeId,exerciseVersion:EXERCISE_VERSION,playlist:playlistSelection,trackingTask:!!TASKS[task]?.tracking,combatTask:!!TASKS[task]?.combat,difficulty:$('difficulty').value,durationMs:Number($('duration').value)*1000,deadlineMs:taskDeadlineMs(task,$('difficulty').value),yawDeg:.07,horizontalFovDeg:103,seed,inputMode,rawVerified:false,scenario:tacticalScenario?{...tacticalScenario}:null},
    shots:[],trials:[],frames:[],inputEvents:[],controlEvents:[],frameIntervals:[],pauses:[],tracking:{validMs:0,onTargetMs:0,squaredErrorTime:0},combat:{enabled:!!TASKS[task]?.combat,shotsFired:0,shotsLanded:0,damageTaken:0,playerHealth:100,playerShield:50,enemiesEliminated:0,eliminations:[],enemyShots:[]}};
   run.protocol.referenceSessionId=phase==='retest'?(pendingRetest?.baselineId??(history().find(h=>h.playerId===playerId&&h.protocol?.phase==='baseline'&&h.qualityClean===true&&comparable(run.config,h.config))?.id??null)):null;
   pendingCoaching=null;pendingRetest=null;clearDecisionTargets();siteWorld.root.visible=false;cinematicWorld.root.visible=true;if(isSiteRun()){siteWorld.build(run.config.scenario?.siteId??'atrium');cinematicWorld.root.visible=false;}else cinematicWorld.setMap(activeMap);camera.position.set(0,1.6,0);camera.rotation.set(0,0,0);playerState={position:{x:0,y:1.6,z:0},velocity:{x:0,y:0,z:0},health:100,shield:50,moving:false};clearPlayerInput();equippedSlot=1;crouchBlend=0;weapon?.setEquipment?.(1,run.config.weapon);run.objective=['attack','retake'].includes(task)?createObjective(task):null;if(run.objective&&currentSite().objectivePosition)run.objective.position={...currentSite().objectivePosition};
   if(run.objective)run.config.durationMs=135000;
   if(isSiteRun()){const start=currentSite().starts?.[task]??currentSite().starts?.attack??{x:0,y:1.6,z:run.objective?13:0,yaw:0};playerState.position={x:start.x,y:start.y,z:start.z};camera.position.set(start.x,start.y,start.z);camera.rotation.y=start.yaw;}
   resetCombatScene();target.scale.setScalar(DIFFICULTIES[run.config.difficulty].radius*TASKS[task].radius); trial=null;spawnNext=false;activeTarget=targetForRun(0);target.scale.setScalar(activeTarget.radius);
  } else run.pauses.push({resumedAt:new Date().toISOString(),elapsedMs:elapsed,inputMode});
  state='countdown'; countdownUntil=performance.now()+3000; weapon?.setVisible(true); settingsLocked(true); show('range-overlay',false); show('countdown',true); show('crosshair',true); show('game-hud',true); show('end-btn',true); show('result-panel',false); put('range-state','Chuẩn bị');
  document.dispatchEvent(new CustomEvent('v-aim:run-started',{detail:run.config.playlist}));
 } else {
  pending=null;clearPlayerInput();
  if (state==='running'||state==='countdown') { state='paused'; run.pauses.push({pausedAt:new Date().toISOString(),elapsedMs:elapsed}); show('countdown',false); show('range-overlay',true); put('overlay-title','Phiên tập đã tạm dừng'); put('overlay-copy','Thời gian dừng không tính vào kết quả.'); put('start-btn','Tiếp tục phiên tập ↗'); put('range-state','Tạm dừng'); }
 }
}
document.addEventListener('pointerlockchange',handleLockChange);
document.addEventListener('visibilitychange',()=>{ if(document.hidden){clearPlayerInput();if(document.pointerLockElement) document.exitPointerLock();} });
document.addEventListener('keydown',event=>{if(Object.hasOwn(playerInput,event.code)||/^Digit[1-4]$/.test(event.code))recordControl(event,'keydown',{code:event.code,repeat:event.repeat});if(document.pointerLockElement===canvas&&state==='running'&&isSiteRun()&&/^Digit[1-4]$/.test(event.code)){
 if(run.objective?.interacting)return;
 equippedSlot=Number(event.code.slice(-1));equipReadyAt=performance.now()+300;fireHeld=false;weapon?.setEquipment?.(equippedSlot,run.config.weapon);event.preventDefault();return;
 }if(!Object.hasOwn(playerInput,event.code))return;if(document.pointerLockElement===canvas&&state==='running'&&isCombatRun()){playerInput[event.code]=true;event.preventDefault();}});
document.addEventListener('keyup',event=>{if(Object.hasOwn(playerInput,event.code))recordControl(event,'keyup',{code:event.code});if(!Object.hasOwn(playerInput,event.code))return;playerInput[event.code]=false;if(document.pointerLockElement===canvas&&isCombatRun())event.preventDefault();});
document.addEventListener('mousemove',event=>{
 if (document.pointerLockElement===canvas && (state==='running'||state==='countdown')) {
  camera.rotation.y-=rotationDelta(event.movementX,run.config.sensitivity); camera.rotation.x=clamp(camera.rotation.x-rotationDelta(event.movementY,run.config.sensitivity),-Math.PI*.49,Math.PI*.49);
  if(state==='running') run.inputEvents.push({seq:run.inputEvents.length,t:eventActiveTime(),receivedAtMs:performance.now(),sourceTimestampMs:Number.isFinite(event.timeStamp)?event.timeStamp:null,isTrusted:event.isTrusted,trialId:trial?.trialId??null,dx:event.movementX,dy:event.movementY,yaw:camera.rotation.y,pitch:camera.rotation.x});
 }
});
function firePlayerShot(control=null){
 const blocked=reason=>{if(control)control.fireBlockedReason=reason;};
 if(state!=='running'||document.pointerLockElement!==canvas||TASKS[run.config.task].tracking||trial?.outcome!=='pending'){blocked('NO_ACTIVE_SHOOTING_TRIAL');return;}
 const now=performance.now();if(isSiteRun()&&(equippedSlot===4||now<equipReadyAt||run.objective?.interacting||now-lastFire<(equippedSlot===3?500:equippedSlot===2?180:105))){blocked('EQUIPMENT_INTERACTION_OR_COOLDOWN');return;}
 if(now-lastFire>350)sprayIndex=0;lastFire=now;
 const shotTime=eventActiveTime(), ms=shotTime-trial.startedMs;
 if(shotTime>=run.config.durationMs){blocked('SESSION_DEADLINE');return;}
 if(!isSiteRun()&&ms>=run.config.deadlineMs){blocked('TRIAL_DEADLINE');closeTrial(trial.decision==='withhold'&&trial.shots===0?'no_shot':'timeout',Math.min(shotTime,trial.startedMs+run.config.deadlineMs));spawnNext=true;return;}
 const struckEnemy=isCombatRun()?combatHitEntry():null,priorityMesh=run.config.task==='priority'?priorityHit():null;
 const decision=decisionShot(trial,priorityTargets.indexOf(priorityMesh),run.config.task==='priority'?Boolean(priorityMesh):isCombatRun()?Boolean(struckEnemy):isHit()),hit=decision.hit;
 if(hit&&trial.firstEntryMs===null)trial.firstEntryMs=ms;
 if(hit&&trial.firstHitMs===null){trial.firstHitMs=ms;trial.hitMs=ms;}
 const aimPoint=priorityMesh?.position??(struckEnemy?(struckEnemy.rig.hitbox.updateMatrixWorld(true),struckEnemy.rig.hitbox.getWorldPosition(new THREE.Vector3())):target.position);
 if(isSiteRun()){trial.distance=camera.position.distanceTo(aimPoint);trial.distanceBand=trial.distance<12?'near':trial.distance<24?'mid':'far';trial.targetRadius=ENEMY_HEAD_RADIUS;target.scale.setScalar(ENEMY_HEAD_RADIUS);}
 const offset=aimOffset(aimPoint.toArray(),camera.rotation.y,camera.rotation.x,camera.position.toArray());
 run.shots.push({seq:run.shots.length,t:shotTime,trialId:trial.trialId,controlSeq:control?.seq??lastPointerDownSeq,hitTargetId:hit?(struckEnemy?.id??'target-'+trial.trialId):null,referenceTargetId:struckEnemy?.id??(isCombatRun()?combatEnemySnapshot()?.id:null)??'target-'+trial.trialId,target:aimPoint.toArray(),cameraPosition:camera.position.toArray(),yaw:camera.rotation.y,pitch:camera.rotation.x,weapon:heldWeapon(),equipment:equippedSlot,playerVelocity:playerState?{...playerState.velocity}:null,hit,damage:hit&&isSiteRun()?(equippedSlot===3?50:weaponDamage(heldWeapon(),struckEnemy?.hitRegion)):null,hitRegion:struckEnemy?.hitRegion??null,errorDeg:errorAngleAt(aimPoint),aimX:offset?.x??null,aimY:offset?.y??null,targetRadius:target.scale.x,sizeBand:trial.sizeBand,distance:trial.distance,distanceBand:trial.distanceBand});weapon?.fire(performance.now());trial.shots++;
 if(trial.firstShotMs===null){trial.firstShotMs=ms;trial.firstShotHit=hit;trial.entryToFirstShotMs=trial.firstEntryMs===null?null:ms-trial.firstEntryMs;}
 Object.assign(run.shots.at(-1),{decisionError:decision.decisionError,motionPhase:motionPhase(run.config.task,ms,DIFFICULTIES[run.config.difficulty].speed),sinceReversalMs:run.config.task==='zigzag'?sinceReversal(ms,DIFFICULTIES[run.config.difficulty].speed):null,prioritySlot:priorityMesh?priorityTargets.indexOf(priorityMesh):null});
 if(run.config.task==='priority'){const shot=run.shots.at(-1);shot.referenceTargetId=`target-${trial.trialId}-${trial.priorityOrder[trial.priorityIndex]}`;shot.hitTargetId=hit?`target-${trial.trialId}-${priorityTargets.indexOf(priorityMesh)}`:null;}
 if(trial.decision==='withhold'){closeTrial('miss',shotTime);spawnNext=true;return;}
 if(hit&&trial.decision==='priority'){priorityMesh.visible=false;trial.priorityIndex++;if(trial.priorityIndex<3){target.position.copy(expectedPriority().position);decisionCue.textContent=`BẮN SỐ ${trial.priorityIndex+1}`;return;}}
 if(hit){
  const cleared=!isCombatRun()||eliminateCombatEnemy(struckEnemy,shotTime);
  show('hit-marker',true);setTimeout(()=>show('hit-marker',false),80);
  if(cleared){closeTrial('hit',shotTime);trial.clearMs=ms;spawnNext=!run.objective||run.objective.mode==='attack'&&run.objective.phase==='planted';nextWaveAt=elapsed+(isSiteRun()?WAVE_PAUSE_MS:0);}
 }
 if(isSiteRun()&&equippedSlot<3){const kick=recoilShot(sprayIndex++);run.shots.at(-1).recoilApplied={...kick};camera.rotation.x=clamp(camera.rotation.x+kick.pitch,-Math.PI*.49,Math.PI*.49);camera.rotation.y+=kick.yaw;}
}
document.addEventListener('mousedown',event=>{if(event.button!==0)return;const control=recordControl(event,'pointerdown',{button:event.button,fireBlockedReason:null});lastPointerDownSeq=control?.seq??null;fireHeld=document.pointerLockElement===canvas;firePlayerShot(control);});
document.addEventListener('mouseup',event=>{recordControl(event,'pointerup',{button:event.button});if(event.button===0)fireHeld=false;});
function liveStats() {
 const s=summarizeRun(run), tracking=TASKS[run.config.task].tracking;
 put('stat-shots',s.shots);put('stat-accuracy',s.accuracy===null?'—':`${(100*s.accuracy).toFixed(1)}%`);put('stat-hits',s.hits);
 put('timing-label',tracking?'THỜI GIAN TRÊN TARGET':'TRUNG VỊ TỚI HIT');put('stat-time',tracking?(s.timeOnTarget===null?'—':`${(s.timeOnTarget*100).toFixed(1)}%`):(s.medianAcquireMs===null?'—':`${Math.round(s.medianAcquireMs)} ms`));
 const combat=Boolean(run.combat?.enabled), health=playerState?.health??100, shield=playerState?.shield??50;
 if(trial?.decision==='withhold'&&trial.outcome==='pending'){decisionCue.hidden=false;decisionCue.textContent='× HOLD — KHÔNG BẮN';}
 put('hud-time',`${Math.max(0,Math.ceil((run.config.durationMs-elapsed)/1000))}s`);put('hud-map',isSiteRun()?currentSite().name.split(' · ')[0]:MAPS[resolveMapId(run.config.map)].short.split(' / ')[0]);put('hud-task',run.config.task.toUpperCase());put('hud-distance',activeTarget?`${activeTarget.distance}M · ${activeTarget.distanceBand.toUpperCase()}`:'—');put('hud-hits',tracking?'GIỮ TÂM TRÊN TARGET':combat?`${run.combat.enemiesEliminated||0} HẠ GỤC`:`${s.hits} TRÚNG`);put('hud-health',combat?`${health} HP · ${shield} SH`:'RANGE SAFE');put('hud-move',combat?(playerState?.moving?'MOVING · WASD':'HOLD · WASD'):'AIM ONLY');put('hud-weapon',equippedSlot===3?'3 KNIFE':equippedSlot===4?'4 SPIKE':`${equippedSlot} ${heldWeapon().toUpperCase()}`);
 if(run.objective){const o=run.objective;put('hud-task',`${o.mode.toUpperCase()} · ${o.phase.toUpperCase()}`);put('hud-time',`${Math.ceil(o.remaining/1000)}s`);put('hud-distance',o.interacting?`${o.phase==='carried'?'PLANT':'DEFUSE'} ${Math.round(o.progress/(o.phase==='carried'?4000:7000)*100)}%`:'HOLD F · OBJECTIVE');}
}
let lastUi=0;
function planCombatPlayer(deltaMs){
 if(!isCombatRun()||!playerState)return null;
 const before={position:{...playerState.position},velocity:{...playerState.velocity},moving:playerState.moving};
 const walk=playerInput.ShiftLeft||playerInput.ShiftRight,crouch=playerInput.ControlLeft||playerInput.ControlRight;
 let movement=stepPlayer(playerState,playerInput,deltaMs,{speed:movementSpeed({walk,crouch,slot:equippedSlot,interacting:run.objective?.interacting&&playerInput.KeyF}),maxDeltaMs:100,bounds:isSiteRun()?(currentSite().bounds??SITE_BOUNDS):PLAYER_BOUNDS,heading:camera.rotation.y});
 if(isSiteRun()){
  const seconds=Math.max(.001,movement.elapsedMs/1000),vertical=jumpStep(currentSite(),before.position,jumpVelocity,seconds,playerInput.Space&&!run.objective?.interacting);jumpVelocity=vertical.vy;playerInput.Space=false;
  const eased=smoothVelocity(before.velocity,movement.velocity,seconds); const position=slideSite(currentSite(),{...before.position,y:vertical.y},{x:before.position.x+eased.x*seconds,y:vertical.y,z:before.position.z+eased.z*seconds});
  const velocity={x:(position.x-before.position.x)/seconds,y:jumpVelocity,z:(position.z-before.position.z)/seconds};movement={...movement,position,velocity,moving:Math.hypot(velocity.x,velocity.z)>.01};
 }
 return {before,movement,elapsedMs:movement.elapsedMs};
}
function applyCombatPlayer(plan){
 if(!plan||!playerState)return;
 playerState={...playerState,...plan.movement};crouchBlend+=((playerInput.ControlLeft||playerInput.ControlRight?1:0)-crouchBlend)*(1-Math.exp(-14*plan.elapsedMs/1000));camera.position.set(playerState.position.x,playerState.position.y-crouchBlend*.55,playerState.position.z);
}
function combatStateSampler(plan,fromMs,toMs){
 if(!plan)return()=>({velocity:playerState?.velocity,position:playerState?.position,moving:playerState?.moving});
 const span=Math.max(0,toMs-fromMs),activeMs=Math.min(span,plan.elapsedMs),before=plan.before.position,after=plan.movement.position;
 return (eventMs)=>{
  const relative=Math.max(0,Math.min(span,eventMs-fromMs)),progress=activeMs?Math.min(1,relative/activeMs):1,active=relative<=activeMs&&plan.movement.moving;
  return {moving:active,velocity:active?plan.movement.velocity:{x:0,y:0,z:0},position:{x:before.x+(after.x-before.x)*progress,y:before.y+(after.y-before.y)*progress,z:before.z+(after.z-before.z)*progress}};
 };
}
function animate(now){requestAnimationFrame(animate);
 combatHud.update({active:state==='running'&&isSiteRun(),site:isSiteRun()?currentSite():null,player:playerState,yaw:camera?.rotation.y??0,enemies:combatEnemies.filter(e=>e.alive&&e.rig.root.visible&&clearSiteLine(currentSite(),camera.position,e.lastPosition)).map(e=>e.lastPosition),objective:run?.objective,now});if(!renderer)return; const dt=previous?now-previous:0;previous=now;
 if(state==='countdown'){put('countdown',Math.max(1,Math.ceil((countdownUntil-now)/1000)));if(now>=countdownUntil){state='running';show('countdown',false);put('range-state','Đang tập');if(!TASKS[run.config.task].tracking&&!trial)spawnTrial();}}
 else if(state==='running'){
  const from=elapsed, step=Math.min(dt,run.config.durationMs-elapsed),playerPlan=planCombatPlayer(step);elapsed+=step;applyCombatPlayer(playerPlan);run.frameIntervals.push(dt);
  if(spawnNext&&elapsed>=nextWaveAt&&elapsed<run.config.durationMs){spawnNext=false;if(!isSiteRun()&&!TASKS[run.config.task].tracking&&run.config.scenario?.repetitions&&run.trials.length>=run.config.scenario.repetitions){finish('completed');return;}spawnTrial();}
  if(TASKS[run.config.task].tracking){activeTarget=targetForRun(Math.floor(elapsed/6000));target.scale.setScalar(activeTarget.radius);}
  const motionTask=isCombatRun()?null:behaviorMotionTask();
  if(motionTask){const pos=taskMotion({task:motionTask,difficulty:run.config.difficulty,seed:run.config.seed,index:(trial?.trialId??1)-1,timeMs:TASKS[run.config.task].tracking?elapsed:elapsed-(trial?.startedMs??0),baseYaw:trial?.baseYaw??0,basePitch:trial?.basePitch??0});const origin=trial?.spawnOrigin??run?.spawnOrigin??[0,1.6,0];placeTarget(pos.yaw,pos.pitch,activeTarget?.distance??20,origin);}
  if(updateCombat(from,elapsed,now,combatStateSampler(playerPlan,from,elapsed)))return;
  if(run.objective){
   const o=run.objective,phase=o.phase;
   stepObjective(o,{dt:step,position:playerState.position,zone:currentSite().plantZone,held:playerInput.KeyF,slot:equippedSlot,moving:Math.hypot(playerState.velocity.x,playerState.velocity.z)>.15,grounded:Math.abs(jumpVelocity)<.01&&playerState.position.y<1.7});
   siteWorld.setObjective?.(o);
   if(phase!==o.phase){closeTrial('interrupted',elapsed);spawnNext=true;nextWaveAt=elapsed+2800;equippedSlot=1;weapon?.setEquipment?.(1,run.config.weapon);}
   if(o.result){finish(o.result.endsWith('win')?'completed':'ended-early',o.result);return;}
  }
  if(isSiteRun()&&fireHeld)firePlayerShot();
  const focusedEnemy=combatEnemySnapshot(),hitEnemy=isCombatRun()?combatHitEntry():null;
  const targetId=run.config.task==='priority'?`target-${trial?.trialId}-${trial?.priorityOrder?.[trial.priorityIndex]}`:isCombatRun()?focusedEnemy?.id??null:'target-'+(trial?.trialId??'tracking');
  const targetObservable=run.config.task==='priority'?Boolean(expectedPriority()?.visible):isCombatRun()?Boolean(focusedEnemy?.visible&&(!isSiteRun()||clearSiteLine(currentSite(),camera.position,target.position))):target.visible;
  const inView=targetObservable&&targetInView();if(inView&&trial?.outcome==='pending'&&trial.firstVisibleMs===null)trial.firstVisibleMs=elapsed-trial.startedMs;
  const errorDeg=targetObservable?errorAngle():null,onTarget=targetObservable?(isCombatRun()?hitEnemy?.id===targetId&&(!isSiteRun()||hitEnemy.hitRegion==='head'):isHit()):null;
  run.frames.push({seq:run.frames.length,cameraPosition:camera.position.toArray(),targetId,hitTargetId:hitEnemy?.id??null,targetObservable,inView,targets:run.config.task==='priority'?priorityTargets.map((m,index)=>({id:`target-${trial?.trialId}-${index}`,position:m.position.toArray(),visible:m.visible,lineOfSight:true,priority:trial.priorityOrder.indexOf(index)+1})):isCombatRun()?combatEnemies.filter(e=>e.alive).map(e=>({id:e.id,position:e.rig.hitbox.getWorldPosition(new THREE.Vector3()).toArray(),visible:e.rig.root.visible,lineOfSight:!isSiteRun()||clearSiteLine(currentSite(),camera.position,e.rig.hitbox.getWorldPosition(new THREE.Vector3()))})):[],targetRadius:target.scale.x,sizeBand:activeTarget?.sizeBand??null,distance:activeTarget?.distance??null,distanceBand:activeTarget?.distanceBand??null,trialId:trial?.trialId??null,t:elapsed,errorDeg,onTarget,target:target.position.toArray(),yaw:camera.rotation.y,pitch:camera.rotation.x,equipment:isSiteRun()?equippedSlot:null,crouch:isSiteRun()?crouchBlend:null,objective:run.objective?{phase:run.objective.phase,progress:run.objective.progress,remaining:run.objective.remaining}:null,player:playerState?{position:{...playerState.position},velocity:{...playerState.velocity},health:playerState.health,shield:playerState.shield}:null,enemy:focusedEnemy,dt});
  if(dt<=100&&dt>0&&errorDeg!==null&&onTarget!==null){run.tracking.validMs+=step;run.tracking.onTargetMs+=onTarget?step:0;run.tracking.squaredErrorTime+=errorDeg*errorDeg*step;}
  if(trial&&trial.outcome==='pending'){if(onTarget&&trial.firstEntryMs===null&&(isSiteRun()||elapsed-trial.startedMs<run.config.deadlineMs))trial.firstEntryMs=elapsed-trial.startedMs;if(!isSiteRun()&&elapsed-trial.startedMs>=run.config.deadlineMs){closeTrial(trial.decision==='withhold'&&trial.shots===0?'no_shot':'timeout',Math.min(elapsed,trial.startedMs+run.config.deadlineMs));if(elapsed<run.config.durationMs)spawnNext=true;}}
  if(elapsed>=run.config.durationMs)finish('completed');else checkpoint();
 }
 if(now-lastUi>200){lastUi=now;put('fps-label',dt>0?`${Math.round(1000/dt)} FPS`:'— FPS');if(run&&busy())liveStats();}
 updateCombatEffects(now);updateCinematicWorld(now);siteWorld?.update(now);weapon?.update(now,state==='running'||state==='countdown',Math.hypot(playerState?.velocity?.x??0,playerState?.velocity?.z??0));if(rangeLighting){rangeLighting.visible=!siteWorld.root.visible;if(siteWorld.root.visible)renderer.toneMappingExposure=siteWorld.renderProfile.exposure;}renderer.render(scene,camera);
 if(window.gamesenDesktop&&!desktopReadySent){desktopReadySent=true;window.gamesenDesktop.ready({webgl:true});}
}
requestAnimationFrame(animate);
function history(){try {const data=JSON.parse(localStorage.getItem('gamesen.sessions')||'[]');return Array.isArray(data)?data.filter(x=>x?.config&&x?.summary).slice(0,30):[];}catch{return [];}}
function finish(status, reason=null){if(!busy())return;const finishedActiveMs=eventActiveTime();state='finished';if(run.objective&&!run.objective.result)run.objective.result=reason==='eliminated'?'eliminated-loss':'aborted';run.status=status;if(reason)run.endReason=reason;run.elapsedMs=Math.max(elapsed,finishedActiveMs);run.endedAt=new Date().toISOString();if(trial?.outcome==='pending')closeTrial('interrupted',run.elapsedMs);run.derived={version:'derived-1',trialTelemetry:deriveRunTelemetry(run)};run.quality=assessSession(run);run.summary=summarizeRun(run);run.rewards=drillStats(run);run.analysis=analyzeRun(run,history());run.analysis.insights=sessionInsights(run);run.analysis.chartCoaching=chartCoaching(run);const currentRecord={...run,qualityClean:run.rewards.eligible};run.analysis.followup=coachingFollowup(currentRecord,history());run.analysis.forecast=nextAssessmentForecast([currentRecord,...history()],{playerId,assignment:run.protocol.assessment});run.analysis.quality.push('Chất lượng dữ liệu: '+(run.quality.eligibleForAimEvaluation?'đủ cho đánh giá aim mô tả':'chưa đủ cho so sánh aim')+' · '+run.quality.reasonCodes.join(', '));if(run.quality.eligibleForPredictiveDataset)run.analysis.quality.push('Phiên assessment có consent và cấu hình cố định: được xuất cho tập dữ liệu dự đoán, chưa tự huấn luyện mô hình.');else if(run.protocol.consentForTraining)run.analysis.quality.push('Đã có consent, nhưng phiên này chưa phải assessment chuẩn hoá đủ điều kiện cho tập dữ liệu dự đoán.');
 const comparableScores=history().filter(h=>h.id!==run.id&&h.playerId===run.playerId&&h.status==='completed'&&h.qualityClean===true&&!h.imported&&comparable(h.config,run.config)).map(sessionScore).filter(Number.isFinite);if(run.rewards.eligible&&run.rewards.score!==null)run.analysis.evidence.push(comparableScores.length?`Kỷ lục cùng cấu hình: ${Math.max(...comparableScores,run.rewards.score*100).toFixed(1)}%${run.rewards.score*100>Math.max(...comparableScores)?' · KỶ LỤC MỚI':''}`:'Đã tạo mốc đầu tiên cho cấu hình này.');
 run.analysis.evidence.push(rewardText(run.rewards),...run.rewards.details.map(d=>`${d.label}: ${d.value}`));
 if(window.gamesenDesktop)window.gamesenDesktop.saveSession(JSON.stringify(run)).then(result=>toast(result?.quarantined?'Đã lưu riêng phiên có lỗi dữ liệu; không dùng để đánh giá.':result?.dataLake?.state==='ingested'?'Đã lưu phiên và đồng bộ vào data lake cục bộ.':result?.dataLake?.state==='skipped'?'Đã lưu phiên cục bộ; data lake không nhận phiên này vì '+result.dataLake.reason+'.':'Đã lưu dữ liệu phiên đầy đủ trong ứng dụng.')).catch(()=>toast('Không tự lưu được dữ liệu phiên. Hãy tải JSON để giữ kết quả.'));
 renderAnalysis(run.analysis);renderInsights(run.analysis.insights,$('insights-panel'));liveStats();clearPlayerInput();resetCombatScene();clearDecisionTargets();document.exitPointerLock();settingsLocked(false);show('countdown',false);show('crosshair',false);show('game-hud',false);show('end-btn',false);show('range-overlay',true);show('result-panel',true);put('overlay-title',reason==='eliminated'?'Bạn đã bị hạ gục.':'Đã lưu một điểm bắt đầu.');put('overlay-copy',reason==='eliminated'?'Xem áp lực địch, lượng sát thương và thử lại với nhịp di chuyển khác.':'Xem kết quả bên dưới hoặc thử một phiên mới.');put('start-btn','Tập phiên mới ↗');put('range-state','Phiên tập kết thúc');
 const reveal=()=> $('result-panel').scrollIntoView({behavior:'smooth',block:'start'});if(document.fullscreenElement)document.exitFullscreen().then(reveal).catch(reveal);else reveal();
 put('result-status',run.objective?.result?run.objective.result.toUpperCase():status==='completed'?'HOÀN TẤT':reason==='eliminated'?'BỊ HẠ GỤC':'KẾT THÚC SỚM');
 put('result-copy',`${run.config.task.toUpperCase()} · ${(elapsed/1000).toFixed(1)} giây · sens ${run.config.sensitivity} · ${run.config.dpi} DPI (${run.config.dpiSource==='declared'?'từ profile chuột':'profile legacy'}). ${run.combat?.enabled?`Bạn hạ ${run.combat.enemiesEliminated||0} địch. Địch bắn ${run.combat.shotsFired} lần, trúng ${run.combat.shotsLanded} lần và gây ${run.combat.damageTaken} sát thương.`:'Chưa phải kết luận về sens tối ưu.'}`);
 const s=run.summary, details=[['Độ khó',DIFFICULTIES[run.config.difficulty].name],['Kích thước cầu','Nhỏ / Vừa / Lớn'],['Frame trên 100ms',s.invalidFrameGaps],['Combo sạch',run.rewards.bestCombo],['Huy chương',run.rewards.medal??'Chưa đạt'],...(run.combat?.enabled?[['HP kết thúc',`${run.combat.playerHealth} HP · ${run.combat.playerShield} SH`],['Địch hạ gục',run.combat.enemiesEliminated||0],['Áp lực địch',`${run.combat.shotsLanded}/${run.combat.shotsFired} phát trúng`]]:[])];
 $('result-detail').replaceChildren(...details.map(([label,value])=>{const div=document.createElement('div');const small=document.createElement('span');small.textContent=label;const strong=document.createElement('b');strong.textContent=value;div.append(small,strong);return div;}));
 renderCharts(run,!!TASKS[run.config.task].tracking);
 try{localStorage.setItem('gamesen.sessions',JSON.stringify([{id:run.id,startedAt:run.startedAt,status,elapsedMs:elapsed,config:run.config,summary:s,rewards:run.rewards,analysis:run.analysis,playerId:run.playerId,schemaVersion:run.schemaVersion,protocol:run.protocol,quality:run.quality,qualityClean:run.rewards.eligible},...history()].slice(0,30)));renderTaskProgress();document.dispatchEvent(new CustomEvent('v-aim:session-finished'));}catch{toast('Không lưu được lịch sử. Hãy tải JSON để giữ kết quả.');}
 playlistSelection=null;document.dispatchEvent(new CustomEvent('v-aim:run-finished',{detail:run}));
}
$('end-btn').onclick=()=>finish('ended-early');
function download(data,type,extension){if(!run||state!=='finished')return;const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=`gamesen-${run.id}.${extension}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-json').onclick=()=>download(JSON.stringify(run,null,2),'application/json','json');
$('export-csv').onclick=()=>download(trialsCsv(run),'text/csv;charset=utf-8','csv');
function renderHistory(){const records=history();put('history-count',`${records.length} PHIÊN`);$('history-list').replaceChildren();if(!records.length){const p=document.createElement('p');p.className='history-empty';p.textContent='Chưa có phiên tập. Kết quả đầu tiên sẽ xuất hiện ở đây.';$('history-list').append(p);}for(const r of records){const row=document.createElement('div');row.className='history-row';const mapId=historicalMapId(r.config.map),map=mapId?MAPS[mapId]:null,weaponProfile=WEAPONS[r.config.weapon??DEFAULT_WEAPON]||WEAPONS[DEFAULT_WEAPON],mapLabel=map?map.short.split(' / ')[0]:'LEGACY';for(const value of [new Date(r.startedAt).toLocaleString('vi-VN'),`${String(r.config.task).toUpperCase()} · ${mapLabel}`,`${weaponProfile.name} · ${DIFFICULTIES[r.config.difficulty??'normal']?.name??'Tiêu chuẩn'}`,`Sens ${r.config.sensitivity} · ${r.config.dpi} DPI`,TASKS[r.config.task]?.tracking?`${((r.summary.timeOnTarget||0)*100).toFixed(1)}% trên target`:`${r.summary.hits}/${r.summary.shots} trúng`,r.status==='completed'?'Hoàn tất':'Kết thúc sớm']){const el=document.createElement('span');el.textContent=value;row.append(el);}const review=document.createElement('button');review.className='text-button';review.textContent=r.analysis?'Xem phân tích ↗':'Phiên cũ: chỉ có tóm tắt';review.disabled=!r.analysis;review.onclick=()=>{show('history-review',true);renderAnalysis(r.analysis,$('history-review'));$('history-review').scrollIntoView({behavior:'smooth'});};row.append(review);$('history-list').append(row);}}
function scheduleRetest(baselineId){
 const baselineRecord=history().find(record=>record?.id===baselineId);
 if(!baselineRecord?.config){toast('Không tìm được baseline để cấu hình đo lại.');return;}
 const config=baselineRecord.config,assignment=baselineRecord.protocol?.assessment??null;
 pendingCoaching=null;pendingRetest={baselineId};
 playlistSelection=assignment?{id:'assessment',index:assignment.blockIndex,kind:'assessment',protocolId:assignment.protocolId,protocolPhase:'retest',assessment:assignment}:null;
 tacticalScenario=config.scenario??null;clearChallenge();selectTask(config.task);
 activeMap=resolveMapId(config.map);activeWeapon=WEAPONS[config.weapon]?config.weapon:DEFAULT_WEAPON;
 $('map-select').value=activeMap;$('weapon-select').value=activeWeapon;
 if(![...$('duration').options].some(option=>option.value===String(config.durationMs/1000)))$('duration').add(new Option(`${config.durationMs/1000} giây`,String(config.durationMs/1000)));
 $('duration').value=String(config.durationMs/1000);$('difficulty').value=DIFFICULTIES[config.difficulty]?config.difficulty:'normal';
 $('sensitivity').value=config.sensitivity;$('dpi-input').value=config.dpi;dpiSource=config.dpiSource==='declared'?'declared':'legacy';
 $('assessment-phase').value='retest';renderMapInfo();renderWeaponInfo();renderScenario();renderTaskProgress();navigate('practice');
 toast('Đã khóa lại cấu hình baseline cho phiên đo lại.');$('range-shell').scrollIntoView({behavior:'smooth',block:'center'});
}

function renderAnalysis(analysis, panel=$('coach-panel')){
panel.replaceChildren();
 const heading=document.createElement('h3');heading.textContent=analysis.headline;panel.append(heading);
 if(panel.id==='history-review'&&analysis.chartCoaching){const priority=analysis.chartCoaching.priority;for(const text of [priority.title,priority.evidence,priority.action]){const p=document.createElement('p');p.textContent=text;panel.append(p);}}
 if(panel.id==='history-review'&&analysis.insights){const details=document.createElement('div');renderInsights(analysis.insights,details);panel.append(details);}
 if(analysis.challenge){const p=document.createElement('p');p.className='challenge-result';p.textContent=`${analysis.challenge.passed?'ĐẠT':analysis.challenge.eligible?'CHƯA ĐẠT':'CHƯA XÉT'} · ${analysis.challenge.name}: ${analysis.challenge.reason}`;panel.append(p);}
 for(const [title,items] of [['Đo được trong phiên',analysis.evidence],['Việc nên làm tiếp',analysis.actions],['Chất lượng dữ liệu',analysis.quality]]){
  if(!items.length)continue;const label=document.createElement('h4');label.textContent=title;const list=document.createElement('ul');for(const text of items){const li=document.createElement('li');li.textContent=text;list.append(li);}panel.append(label,list);
 }
 if(analysis.followup?.message){const label=document.createElement('h4');label.textContent='Chuỗi baseline → tập → đo lại';const message=document.createElement('p');message.className='small-note';message.textContent=analysis.followup.message;panel.append(label,message);}
 if(analysis.forecast?.message){const label=document.createElement('h4');label.textContent='Mốc lần assessment kế tiếp';const message=document.createElement('p');message.className='small-note';message.textContent=analysis.forecast.message;panel.append(label,message);}
 for(const text of [analysis.comparison,analysis.disclaimer]){const p=document.createElement('p');p.className='small-note';p.textContent=text;panel.append(p);}
 const button=document.createElement('button');button.className='secondary-button';button.textContent=`Chọn bài tiếp: ${TASKS[analysis.nextTask].name}`;button.onclick=()=>{if(busy())return;pendingCoaching={sourceSessionId:run?.id??null,recommenderVersion:'rules-0.4',task:analysis.nextTask,plannedDurationMs:30000,plannedDifficulty:'easy'};navigate('practice');clearChallenge();selectTask(analysis.nextTask);$('difficulty').value='easy';$('duration').value='30';renderScenario();$('range-shell').scrollIntoView({behavior:'smooth',block:'center'});};panel.append(button);
 if(analysis.followup?.canScheduleRetest){const retest=document.createElement('button');retest.className='secondary-button';retest.textContent='Chuẩn bị đo lại baseline';retest.onclick=()=>{if(busy())return;scheduleRetest(analysis.followup.baselineId);};panel.append(retest);}
}
try{
 const saved=JSON.parse(localStorage.getItem('gamesen.profile')||'null');
 if(saved){$('sensitivity').value=validNumber(saved.sensitivity,.01,10,.3);$('dpi-input').value=validNumber(saved.dpi,100,32000,800);dpiSource=saved.dpiSource==='declared'?'declared':'legacy';baseline=Number($('sensitivity').value);put('base-sens-label',`Gốc: ${baseline.toFixed(3)}`);}
}catch{}
profile();renderHistory();
$('history-export').onclick=()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify({format:'gamesen-history',version:1,sessions:history()},null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='gamesen-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('history-import').onclick=()=>$('history-file').click();
$('history-file').onchange=async()=>{
 const file=$('history-file').files[0];if(!file)return;
 try{if(file.size>5*1024*1024)throw new Error('File lịch sử vượt giới hạn 5 MiB.');const sessions=parseHistory(await file.text());localStorage.setItem('gamesen.sessions',JSON.stringify(mergeHistory(history(),sessions)));renderHistory();renderTaskProgress();document.dispatchEvent(new CustomEvent('v-aim:session-finished'));toast(`Đã nhập ${sessions.length} bản tóm tắt; không nhập quỹ đạo.`);}catch(error){toast(error.message||'Không nhập được file lịch sử.');}finally{$('history-file').value='';}
};

if(window.gamesenDesktop){
 document.title='V-AIM COACH — Desktop';
 document.querySelector('.local-badge').lastChild.textContent=' Desktop · dữ liệu trên máy';

 const imports=document.createElement('div');imports.className='model-imports';
 const label=document.createElement('span');label.textContent='MODEL GLB CỤC BỘ';imports.append(label);
 const importModel=async(slot,label)=>{
  try{
   const result=await window.gamesenDesktop.importModel(slot);if(result?.cancelled)return;
   toast(`${label} đã được nạp cục bộ. Đang khởi động lại 3D...`);setTimeout(()=>location.reload(),400);
  }catch(error){toast(error?.message||'Không thể nạp GLB.');}
 };
 for(const [slot,label] of [['weapon','Nạp Vandal GLB'],['agent','Nạp SAS agent GLB']]){
  const button=document.createElement('button');button.type='button';button.className='secondary-button';button.textContent=label;button.onclick=()=>importModel(slot,label.replace('Nạp ',''));imports.append(button);
 }
 $('weapon-specs').before(imports);

 const note=document.createElement('p');note.className='small-note';note.textContent='App tự lưu JSON đầy đủ sau mỗi phiên. Menu Ứng dụng → Mở thư mục dữ liệu phiên.';$('history-view').prepend(note);
 if(!renderer)window.gamesenDesktop.ready({webgl:false});
}

document.addEventListener('v-aim:playlist-closed',()=>{playlistSelection=null;});
initAppShell({
 preparePlaylist(step,selection){
  if(busy()||pending)return;
  const assessment=selection.kind==='assessment'?assessmentAssignment(selection.protocolId,selection.index):null;
  playlistSelection={...selection,assessment};tacticalScenario=null;clearChallenge();selectTask(assessment?.assignedConfig.task??step.task);
  if(assessment){
   const config=assessment.assignedConfig;
   activeMap=resolveMapId(config.map);$('map-select').value=activeMap;activeWeapon=config.weapon;renderMapInfo();renderWeaponInfo();
   $('assessment-phase').value=selection.protocolPhase==='retest'?'retest':'baseline';
  }
  if(![...$('duration').options].some(o=>o.value===String(step.seconds)))$('duration').add(new Option(`${step.seconds} giây`,String(step.seconds)));
  const durationSeconds=assessment?assessment.assignedConfig.durationMs/1000:step.seconds;
  $('duration').value=String(durationSeconds);$('difficulty').value=assessment?.assignedConfig.difficulty??'normal';renderScenario();renderTaskProgress();navigate('practice');
 },
 endPlaylistStep(){if(busy())finish('ended-early','playlist-skip');},
 navigate,
 history,
 canNavigate:()=>!busy()&&!document.pointerLockElement&&!pending,
 configureTraining({mapId,zoneId=null,scenarioId=null,angleId=null,taskId,config={}}={}){
  if(busy())return;
  const behavior=['auto','static','strafe','peek','wide','random'].includes(config.behavior)?config.behavior:'auto';
  playlistSelection=null;
  const reaction=['instant','150','250','350','random'].includes(config.reaction)?config.reaction:'instant';
  const distance=['close','medium','long','mixed'].includes(config.distance)?config.distance:'medium';
  const head=['fixed','realistic','dynamic'].includes(config.head)?config.head:'realistic';
  const repetitions=[15,25,40].includes(Number(config.repetitions))?Number(config.repetitions):25;
  const gameMode=(config.gameMode==='scenario'||Object.hasOwn(TASKS,config.gameMode))?config.gameMode:'scenario';
  activeMap=resolveMapId(mapId);renderMapInfo();
  if(siteWorld){siteWorld.root.visible=Boolean(TASKS[taskId]?.site);cinematicWorld.root.visible=!TASKS[taskId]?.site;if(TASKS[taskId]?.site){siteWorld.build(SITES[config.siteId]?config.siteId:'atrium');camera.position.set(0,1.6,0);camera.rotation.set(0,0,0);target.visible=false;}}
  tacticalScenario={mapId:activeMap,zoneId:typeof zoneId==='string'?zoneId:null,scenarioId:typeof scenarioId==='string'?scenarioId:null,angleId:typeof angleId==='string'?angleId:null,gameMode,behavior,reaction,distance,head,repetitions,siteId:SITES[config.siteId]?config.siteId:'atrium'};
  if(TASKS[taskId]){clearChallenge();selectTask(taskId);}
  const durationByRepetitions={15:'30',25:'60',40:'90'};
  $('duration').value=durationByRepetitions[repetitions];
  const difficultyByReaction={instant:'normal','150':'normal','250':'normal','350':'easy',random:'hard'};
  if(TASKS[taskId]?.site&&['30','60','90'].includes(String(config.duration)))$('duration').value=String(config.duration);
  const difficulty=TASKS[taskId]?.site&&DIFFICULTIES[config.difficulty]?config.difficulty:difficultyByReaction[reaction];
  if(difficulty&&DIFFICULTIES[difficulty]){$('difficulty').value=difficulty;renderScenario();renderTaskProgress();}
 },
 launchTraining(){
  if(busy()||pending)return;
  navigate('practice');
  $('start-btn').click();
 },
 hasLiveAnalysis:()=>Boolean(run?.analysis&&state==='finished'),
 openLatestAnalysis(){
  if(busy()||document.pointerLockElement||pending)return;
  if(!run?.analysis||state!=='finished'){toast('Hoàn tất một phiên để xem heatmap và biểu đồ thời gian.');return;}
  navigate('practice');
  requestAnimationFrame(()=>$('result-panel').scrollIntoView({behavior:'smooth',block:'start'}));
 },
});
