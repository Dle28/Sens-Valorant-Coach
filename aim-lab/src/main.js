import { parseHistory, mergeHistory } from './history-transfer.js';
import { requestUnadjustedInput } from './input.js';
import * as THREE from 'three';
import { clamp, validNumber, cm360, rotationDelta, verticalFov, calibrationTrial, calibrationSummary, summarizeRun, mulberry32, trialsCsv } from './metrics.js';
import { TASKS, CHALLENGES, targetAngles, analyzeRun } from './training.js';
const $ = id => document.getElementById(id);
const show = (id, yes) => $(id).hidden = !yes;
const put = (id, text) => $(id).textContent = text;
let toastTimer;
function toast(message) { put('toast', message); show('toast', true); clearTimeout(toastTimer); toastTimer = setTimeout(() => show('toast', false), 4500); }
let challengeId=null;
let task = 'precision', baseline = .3, dpiSource = 'manual', calibration = null;
let state = 'idle', run = null, elapsed = 0, previous = 0, countdownUntil = 0, pending = null, inputMode = 'not-requested', rng, trial, spawnNext=false;
let renderer, scene, camera, target, activeLockElement=null, desktopReadySent=false;
const ray = new THREE.Raycaster(), forward = new THREE.Vector3(), direction = new THREE.Vector3();
const canvas = $('range-canvas');
for (const [id, data] of Object.entries(TASKS)) {
 const button=document.createElement('button');button.className='task-card'+(id===task?' selected':'');button.dataset.task=id;button.setAttribute('aria-pressed',String(id===task));
 const icon=document.createElement('span');icon.className='task-icon';icon.textContent=data.tracking?'∿':'◎';
 const text=document.createElement('span'),title=document.createElement('b'),description=document.createElement('small');title.textContent=data.name;description.textContent=data.description;text.append(title,description);button.append(icon,text);$('task-list').append(button);
}
function clearChallenge(){challengeId=null;$('challenge-select').value='';put('challenge-description','Tập tự do · không xét mục tiêu thử thách.');}
function selectTask(id){task=id;document.querySelectorAll('[data-task]').forEach(button=>{button.classList.toggle('selected',button.dataset.task===id);button.setAttribute('aria-pressed',String(button.dataset.task===id));});}
$('challenge-select').onchange=()=>{challengeId=$('challenge-select').value||null;const c=CHALLENGES[challengeId];if(!c)return clearChallenge();selectTask(c.task);$('difficulty').value=c.difficulty;$('duration').value=c.duration;put('challenge-description',c.description+' · chuỗi target cố định · hoàn tất không tạm dừng.');};
$('duration').onchange=clearChallenge;$('difficulty').onchange=clearChallenge;
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
document.querySelectorAll('[data-task]').forEach(el => el.onclick = () => {
 if (busy()) return; clearChallenge(); task = el.dataset.task;
 document.querySelectorAll('[data-task]').forEach(button => { button.classList.toggle('selected', button === el); button.setAttribute('aria-pressed', String(button === el)); });
});
$('sensitivity').onchange = () => { baseline = profile().sensitivity; put('base-sens-label', `Gốc: ${baseline.toFixed(3)}`); };
$('dpi-input').onchange = () => { dpiSource = 'manual'; calibration = null; profile(); };
document.querySelectorAll('[data-factor]').forEach(el => el.onclick = () => { $('sensitivity').value = clamp(baseline * Number(el.dataset.factor), .01, 10).toFixed(3); profile(); });
$('sens-reset').onclick = () => { $('sensitivity').value = baseline; profile(); };
$('fullscreen-btn').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('range-shell').requestFullscreen(); } catch { toast('Trình duyệt không cho phép toàn màn hình.'); } };
function settingsLocked(locked) { document.querySelectorAll('.settings-panel input,.settings-panel button,.settings-panel select').forEach(el => el.disabled = locked); }
try {
 renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
 scene = new THREE.Scene(); scene.background = new THREE.Color('#142d2c'); scene.fog = new THREE.Fog('#142d2c', 25, 80);
 camera = new THREE.PerspectiveCamera(verticalFov(103, 16/9), 16/9, .1, 150); camera.position.set(0, 1.6, 0); camera.rotation.order = 'YXZ';
 scene.add(new THREE.HemisphereLight(0xccefe1, 0x203a33, 2));
 const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(3, 10, 5); scene.add(light);
 const mat = new THREE.MeshStandardMaterial({ color: '#23433e', roughness: .9 });
 const floor = new THREE.Mesh(new THREE.PlaneGeometry(150,150), mat); floor.rotation.x = -Math.PI/2; floor.position.y = -6; scene.add(floor);
 const grid = new THREE.GridHelper(150, 50, '#537765', '#2e5148'); grid.position.y = -5.99; scene.add(grid);
 const wall = new THREE.Mesh(new THREE.BoxGeometry(120,55,1), mat); wall.position.set(0,12,-42); scene.add(wall);
 const glow = new THREE.MeshBasicMaterial({ color: '#648975' });
 for (let i=-4;i<=4;i++) { const beam = new THREE.Mesh(new THREE.BoxGeometry(.07,35,.08), glow); beam.position.set(i*9,10,-41.4); scene.add(beam); }
 for (const y of [-5, 4, 13, 22]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(120,.04,.08),glow); bar.position.set(0,y,-41.4); scene.add(bar); }
 const ring = new THREE.Mesh(new THREE.TorusGeometry(5,.025,8,96),glow); ring.position.set(0,1.6,-41.3); scene.add(ring);
 target = new THREE.Mesh(new THREE.SphereGeometry(1,32,24), new THREE.MeshStandardMaterial({ color:'#d4f878', emissive:'#75962d', emissiveIntensity:.45, roughness:.35 }));
 target.position.set(0,1.6,-20); target.scale.setScalar(.4); scene.add(target);
 new ResizeObserver(() => { const w=canvas.clientWidth,h=canvas.clientHeight; if (!w||!h) return; renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov=verticalFov(103,w/h); camera.updateProjectionMatrix(); }).observe(canvas);
} catch (error) { put('overlay-title','Không khởi tạo được đồ họa 3D'); put('overlay-copy','Mở bằng trình duyệt desktop có WebGL2 và bật tăng tốc phần cứng.'); $('start-btn').disabled = true; console.error(error); }
function errorAngle() { camera.getWorldDirection(forward); direction.copy(target.position).sub(camera.position).normalize(); return THREE.MathUtils.radToDeg(forward.angleTo(direction)); }
function isHit() { camera.updateMatrixWorld(); target.updateMatrixWorld(); ray.setFromCamera({x:0,y:0},camera); return ray.intersectObject(target).length > 0; }
function placeTarget(yaw, pitch) { const distance=20; target.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,1.6+Math.sin(pitch)*distance,-Math.cos(yaw)*Math.cos(pitch)*distance); }
function eventActiveTime(){return Math.min(run.config.durationMs,elapsed+Math.max(0,performance.now()-previous));}
function spawnTrial() {
 const angles=targetAngles(run.config.task,rng,run.trials.length,-camera.rotation.y,camera.rotation.x);
 placeTarget(angles.yaw,angles.pitch);
 trial={baseYaw:angles.yaw,basePitch:angles.pitch,trialId:run.trials.length+1,startedMs:elapsed,initialErrorDeg:errorAngle(),outcome:'pending',shots:0,firstEntryMs:null,firstShotMs:null,firstShotHit:null,hitMs:null,entryToFirstShotMs:null}; run.trials.push(trial);
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
$('start-btn').onclick=()=>lock(canvas,'game');
document.addEventListener('pointerlockerror',()=>{ if (!document.pointerLockElement) { pending=null; toast('Yêu cầu khóa chuột bị từ chối. Hãy thử nhấn Bắt đầu lần nữa.'); } });
function handleLockChange(){
 if(document.pointerLockElement){
  if(inputMode!=='unadjusted-requested-unverified'){if(inputMode!=='requesting-unadjusted')document.exitPointerLock();return;}
  if(activeLockElement===document.pointerLockElement)return;
  activeLockElement=document.pointerLockElement;
 }else activeLockElement=null;
 if (document.pointerLockElement===canvas) {
  pending=null;
  if (state!=='paused') {
   elapsed=0; const seed=CHALLENGES[challengeId]?.seed??crypto.getRandomValues(new Uint32Array(1))[0]; rng=mulberry32(seed);
   run={schemaVersion:'0.2',id:crypto.randomUUID(),startedAt:new Date().toISOString(),status:'in-progress',config:{...profile(),task,challengeId,exerciseVersion:'0.2',difficulty:$('difficulty').value,durationMs:Number($('duration').value)*1000,deadlineMs:2500,yawDeg:.07,horizontalFovDeg:103,seed,inputMode,rawVerified:false},shots:[],trials:[],frames:[],inputEvents:[],frameIntervals:[],pauses:[],tracking:{validMs:0,onTargetMs:0,squaredErrorTime:0}};
   camera.rotation.set(0,0,0); target.scale.setScalar(({easy:.65,normal:.4,hard:.23})[run.config.difficulty]*TASKS[task].radius); trial=null;spawnNext=false;
  } else run.pauses.push({resumedAt:new Date().toISOString(),elapsedMs:elapsed,inputMode});
  state='countdown'; countdownUntil=performance.now()+3000; settingsLocked(true); show('range-overlay',false); show('countdown',true); show('crosshair',true); show('game-hud',true); show('end-btn',true); show('result-panel',false); put('range-state','Chuẩn bị');
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
 if(event.button!==0||state!=='running'||document.pointerLockElement!==canvas||run.config.task==='tracking'||trial?.outcome!=='pending') return;
 const shotTime=eventActiveTime(), ms=shotTime-trial.startedMs;
 if(shotTime>=run.config.durationMs)return;
 if(ms>=run.config.deadlineMs){trial.outcome='timeout';spawnNext=true;return;}
 const hit=isHit();
 if(hit&&trial.firstEntryMs===null)trial.firstEntryMs=ms;
 run.shots.push({t:shotTime,trialId:trial.trialId,hit,errorDeg:errorAngle()});trial.shots++;
 if(trial.firstShotMs===null){trial.firstShotMs=ms;trial.firstShotHit=hit;trial.entryToFirstShotMs=trial.firstEntryMs===null?null:ms-trial.firstEntryMs;}
 if(hit){trial.outcome='hit';trial.hitMs=ms;show('hit-marker',true);setTimeout(()=>show('hit-marker',false),80);spawnNext=true;}
});
function liveStats() {
 const s=summarizeRun(run), tracking=run.config.task==='tracking';
 put('stat-shots',s.shots);put('stat-accuracy',s.accuracy===null?'—':`${(100*s.accuracy).toFixed(1)}%`);put('stat-hits',s.hits);
 put('timing-label',tracking?'THỜI GIAN TRÊN TARGET':'TRUNG VỊ TỚI HIT');put('stat-time',tracking?(s.timeOnTarget===null?'—':`${(s.timeOnTarget*100).toFixed(1)}%`):(s.medianAcquireMs===null?'—':`${Math.round(s.medianAcquireMs)} ms`));
 put('hud-time',`${Math.max(0,Math.ceil((run.config.durationMs-elapsed)/1000))}s`);put('hud-task',run.config.task.toUpperCase());put('hud-hits',tracking?'GIỮ TÂM TRÊN TARGET':`${s.hits} TRÚNG`);
}
let lastUi=0;
function animate(now){requestAnimationFrame(animate);if(!renderer)return; const dt=previous?now-previous:0;previous=now;
 if(state==='countdown'){put('countdown',Math.max(1,Math.ceil((countdownUntil-now)/1000)));if(now>=countdownUntil){state='running';show('countdown',false);put('range-state','Đang tập');if(run.config.task!=='tracking'&&!trial)spawnTrial();}}
 else if(state==='running'){
  const step=Math.min(dt,run.config.durationMs-elapsed);elapsed+=step;run.frameIntervals.push(dt);
  if(spawnNext&&elapsed<run.config.durationMs){spawnNext=false;spawnTrial();}
  if(TASKS[run.config.task].moving&&trial)placeTarget(trial.baseYaw+Math.sin((elapsed-trial.startedMs)/450)*.12,trial.basePitch);
  if(run.config.task==='tracking')placeTarget(Math.sin(elapsed/1800)*.38,Math.sin(elapsed/1100)*.13);
  const errorDeg=errorAngle(), onTarget=isHit();run.frames.push({trialId:trial?.trialId??null,t:elapsed,errorDeg,onTarget,target:target.position.toArray(),yaw:camera.rotation.y,pitch:camera.rotation.x,dt});
  if(dt<=100&&dt>0){run.tracking.validMs+=step;run.tracking.onTargetMs+=onTarget?step:0;run.tracking.squaredErrorTime+=errorDeg*errorDeg*step;}
  if(trial&&trial.outcome==='pending'){if(onTarget&&trial.firstEntryMs===null)trial.firstEntryMs=elapsed-trial.startedMs;if(elapsed-trial.startedMs>=run.config.deadlineMs){trial.outcome='timeout';if(elapsed<run.config.durationMs)spawnNext=true;}}
  if(elapsed>=run.config.durationMs)finish('completed');
 }
 if(now-lastUi>200){lastUi=now;put('fps-label',dt>0?`${Math.round(1000/dt)} FPS`:'— FPS');if(run&&busy())liveStats();}
 renderer.render(scene,camera);
 if(window.gamesenDesktop&&!desktopReadySent){desktopReadySent=true;window.gamesenDesktop.ready({webgl:true});}
}
requestAnimationFrame(animate);
function history(){try {const data=JSON.parse(localStorage.getItem('gamesen.sessions')||'[]');return Array.isArray(data)?data.filter(x=>x?.config&&x?.summary).slice(0,30):[];}catch{return [];}}
function finish(status){if(!busy())return;state='finished';run.status=status;run.elapsedMs=elapsed;run.endedAt=new Date().toISOString();if(trial?.outcome==='pending')trial.outcome='interrupted';run.summary=summarizeRun(run);run.analysis=analyzeRun(run,history());
 if(window.gamesenDesktop)window.gamesenDesktop.saveSession(JSON.stringify(run)).then(()=>toast('Đã lưu dữ liệu phiên đầy đủ trong ứng dụng.')).catch(()=>toast('Không tự lưu được dữ liệu phiên. Hãy tải JSON để giữ kết quả.'));
 renderAnalysis(run.analysis);liveStats();document.exitPointerLock();settingsLocked(false);show('countdown',false);show('crosshair',false);show('game-hud',false);show('end-btn',false);show('range-overlay',true);show('result-panel',true);put('overlay-title','Đã lưu một điểm bắt đầu.');put('overlay-copy','Xem kết quả bên dưới hoặc thử một phiên mới.');put('start-btn','Tập phiên mới ↗');put('range-state','Phiên tập kết thúc');
 const reveal=()=> $('result-panel').scrollIntoView({behavior:'smooth',block:'start'});if(document.fullscreenElement)document.exitFullscreen().then(reveal).catch(reveal);else reveal();
 put('result-status',status==='completed'?'HOÀN TẤT':'KẾT THÚC SỚM');
 put('result-copy',`${run.config.task.toUpperCase()} · ${(elapsed/1000).toFixed(1)} giây · sens ${run.config.sensitivity} · ${run.config.dpi} DPI (${run.config.dpiSource==='manual'?'nhập tay':'ước lượng'}). Chưa phải kết luận về sens tối ưu.`);
 const s=run.summary, details=run.config.task==='tracking'?[['Sai số RMS',s.trackingRmsDeg===null?'—':`${s.trackingRmsDeg.toFixed(2)}°`],['Thời gian đo hợp lệ',`${(run.tracking.validMs/1000).toFixed(1)}s`]]:[['Trúng phát đầu ≤ 2,5s',s.firstShotSuccessRate===null?'—':`${(s.firstShotSuccessRate*100).toFixed(1)}%`],['Target đã bắt đầu',s.startedTrials]];
 details.push(['Frame >100ms',s.invalidFrameGaps],['cm/360° preset, trước hiệu chỉnh',cm360(run.config.dpi,run.config.sensitivity).toFixed(2)]);
 $('result-detail').replaceChildren(...details.map(([label,value])=>{const div=document.createElement('div');const small=document.createElement('span');small.textContent=label;const strong=document.createElement('b');strong.textContent=value;div.append(small,strong);return div;}));
 const points=run.frames.filter((_,i)=>i%Math.max(1,Math.ceil(run.frames.length/350))===0), max=Math.max(1,...points.map(p=>p.errorDeg));
 $('result-chart').innerHTML=`<polyline fill="none" stroke="#527b3a" stroke-width="2" points="${points.map(p=>`${(p.t/Math.max(1,elapsed)*700).toFixed(1)},${(105-p.errorDeg/max*100).toFixed(1)}`).join(' ')}"/>`;
 try{localStorage.setItem('gamesen.sessions',JSON.stringify([{id:run.id,startedAt:run.startedAt,status,elapsedMs:elapsed,config:run.config,summary:s,analysis:run.analysis,qualityClean:!run.pauses.length&&!s.invalidFrameGaps&&run.config.inputMode!=='browser-adjusted-fallback'},...history()].slice(0,30)));}catch{toast('Không lưu được lịch sử. Hãy tải JSON để giữ kết quả.');}
}
$('end-btn').onclick=()=>finish('ended-early');
function download(data,type,extension){if(!run||state!=='finished')return;const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=`gamesen-${run.id}.${extension}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-json').onclick=()=>download(JSON.stringify(run,null,2),'application/json','json');
$('export-csv').onclick=()=>download(trialsCsv(run),'text/csv;charset=utf-8','csv');
function renderHistory(){const records=history();put('history-count',`${records.length} PHIÊN`);$('history-list').replaceChildren();if(!records.length){const p=document.createElement('p');p.className='history-empty';p.textContent='Chưa có phiên tập. Kết quả đầu tiên sẽ xuất hiện ở đây.';$('history-list').append(p);}for(const r of records){const row=document.createElement('div');row.className='history-row';for(const value of [new Date(r.startedAt).toLocaleString('vi-VN'),String(r.config.task).toUpperCase(),`Sens ${r.config.sensitivity} · ${r.config.dpi} DPI`,r.config.task==='tracking'?`${((r.summary.timeOnTarget||0)*100).toFixed(1)}% trên target`:`${r.summary.hits}/${r.summary.shots} trúng`,r.status==='completed'?'Hoàn tất':'Kết thúc sớm']){const el=document.createElement('span');el.textContent=value;row.append(el);}const review=document.createElement('button');review.className='text-button';review.textContent=r.analysis?'Xem phân tích ↗':'Phiên cũ: chỉ có tóm tắt';review.disabled=!r.analysis;review.onclick=()=>{show('history-review',true);renderAnalysis(r.analysis,$('history-review'));$('history-review').scrollIntoView({behavior:'smooth'});};row.append(review);$('history-list').append(row);}}
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
 if(analysis.challenge){const p=document.createElement('p');p.className='challenge-result';p.textContent=`${analysis.challenge.passed?'ĐẠT':analysis.challenge.eligible?'CHƯA ĐẠT':'CHƯA XÉT'} · ${analysis.challenge.name}: ${analysis.challenge.reason}`;panel.append(p);}
 for(const [title,items] of [['Đo được trong phiên',analysis.evidence],['Việc nên làm tiếp',analysis.actions],['Chất lượng dữ liệu',analysis.quality]]){
  if(!items.length)continue;const label=document.createElement('h4');label.textContent=title;const list=document.createElement('ul');for(const text of items){const li=document.createElement('li');li.textContent=text;list.append(li);}panel.append(label,list);
 }
 for(const text of [analysis.comparison,analysis.disclaimer]){const p=document.createElement('p');p.className='small-note';p.textContent=text;panel.append(p);}
 const button=document.createElement('button');button.className='secondary-button';button.textContent=`Chọn bài tiếp: ${TASKS[analysis.nextTask].name}`;button.onclick=()=>{if(busy())return;navigate('practice');clearChallenge();selectTask(analysis.nextTask);$('difficulty').value='easy';$('duration').value='30';$('range-shell').scrollIntoView({behavior:'smooth',block:'center'});};panel.append(button);
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
 try{if(file.size>5*1024*1024)throw new Error('File lịch sử vượt giới hạn 5 MiB.');const sessions=parseHistory(await file.text());localStorage.setItem('gamesen.sessions',JSON.stringify(mergeHistory(history(),sessions)));renderHistory();toast(`Đã nhập ${sessions.length} bản tóm tắt; không nhập quỹ đạo.`);}catch(error){toast(error.message||'Không nhập được file lịch sử.');}finally{$('history-file').value='';}
};

if(window.gamesenDesktop){
 document.title='Gamesen Aim Lab — Desktop';
 document.querySelector('.local-badge').lastChild.textContent=' Desktop · dữ liệu trên máy';
 document.querySelector('.version-tag').textContent='DESKTOP / 0.3';
 const note=document.createElement('p');note.className='small-note';note.textContent='App tự lưu JSON đầy đủ sau mỗi phiên. Menu Ứng dụng → Mở thư mục dữ liệu phiên.';$('history-view').prepend(note);
 if(!renderer)window.gamesenDesktop.ready({webgl:false});
}
