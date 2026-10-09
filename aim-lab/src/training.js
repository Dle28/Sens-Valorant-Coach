import { median, summarizeRun, mulberry32 } from './metrics.js';
import { summarizeCombat } from './combat-analysis.js';
import {scenarioKey} from './training-config.js';

/**
 * Shared tuning for every exercise.  `radius` is a target-size multiplier,
 * `deadlineMs` is the click window and `speed` is the motion multiplier.
 * Keeping these values in one exported object lets the UI render a difficulty
 * picker without duplicating game rules.
 */
export const DIFFICULTIES = Object.freeze({
 easy: Object.freeze({ name:'Làm quen', radius:.65, deadlineMs:3200, speed:.72 }),
 normal: Object.freeze({ name:'Tiêu chuẩn', radius:.4, deadlineMs:2500, speed:1 }),
 hard: Object.freeze({ name:'Thử thách', radius:.23, deadlineMs:1800, speed:1.3 }),
 expert: Object.freeze({ name:'Chuyên gia', radius:.16, deadlineMs:1300, speed:1.7 }),
});

const DIFFICULTY_ORDER = Object.freeze(Object.keys(DIFFICULTIES));
export const SIZE_BANDS = Object.freeze({
 small: Object.freeze({ label:'Nhỏ', multiplier:.78 }),
 medium: Object.freeze({ label:'Vừa', multiplier:1 }),
 large: Object.freeze({ label:'Lớn', multiplier:1.2 }),
});
const SIZE_BAND_ORDER = Object.freeze(Object.keys(SIZE_BANDS));
export const DISTANCE_BANDS = Object.freeze({
 near: Object.freeze({ label:'Gần', minimum:0, maximum:12 }),
 mid: Object.freeze({ label:'Trung', minimum:12, maximum:24 }),
 far: Object.freeze({ label:'Xa', minimum:24, maximum:Infinity }),
});
export const MAPS = Object.freeze({
 lotus: Object.freeze({name:'Lotus', short:'LOTUS / TEMPLE', copy:'Đền đá nhiều tầng, thác nước, cây leo và hoa năng lượng trên các cột cao.', palette:{sky:'#78c8d7',fog:'#617d69',primary:'#ef75b9',secondary:'#76af64',ground:'#8e7756'}, layout:'lotus',target:{yawScale:.76,pitchOffset:.06,distanceOffset:3,laneBias:.03},environment:{fogDensity:.0075,exposure:1.17}}),
 dark: Object.freeze({name:'Dark Range', short:'DARK / MINIMAL', copy:'Nền tối tối giản để tập trung hoàn toàn vào tâm ngắm và mục tiêu.', palette:{sky:'#05070c',fog:'#070911',primary:'#718094',secondary:'#222d3d',ground:'#0c111a'}, layout:'dark',target:{yawScale:1,pitchOffset:0,distanceOffset:0,laneBias:0},environment:{fogDensity:.018,exposure:.95}}),
});
export const DEFAULT_MAP = 'lotus';
export const MAP_ALIASES = Object.freeze({verdant:'lotus'});
export function resolveMapId(map) {return MAPS[map]?map:MAP_ALIASES[map]??DEFAULT_MAP;}
export function historicalMapId(map) {if(map==null)return null;return MAPS[map]?map:MAP_ALIASES[map]??null;}
const DISTANCE_PROFILES = Object.freeze({
 figure8:[12,20,28], pendulum:[10,18,26], zigzag:[12,20,28], stopgo:[10,16,24], ladder:[10,17,25], snap:[12,18,26],
 precision:[10,16,23], transfer:[14,22,29], tracking:[12,20,28], micro:[7,9,11],
 wide:[18,27,35], horizontal:[12,18,23], reactive:[14,21,29], burst:[8,12,16],
 grid:[11,18,25], strafe:[14,21,28], orbit:[12,20,30], switcher:[18,27,36],
 peek:[16,24,31], vertical:[10,17,25], recoil:[8,12,17], clutch:[22,30,38],
 duel:[12,18,25], counter:[10,16,22], survival:[14,21,29], site:[8,14,22], readmove:[8,14,22],
});
function difficultyConfig(value='normal') {
 return DIFFICULTIES[value] || DIFFICULTIES.normal;
}
function finiteSeed(seed) {
 const n=Number(seed);
 return Number.isFinite(n) ? (n>>>0) : 0;
}
export const TASKS = {
 discrimination:{name:'Shoot / No-shoot',description:'Đọc ký hiệu · chỉ bắn mục tiêu SHOOT',category:'precision',icon:'!',radius:1,span:.3,pitch:.1,layout:'decision-lanes',targetDistance:16,scenario:'SHOOT / dấu +: bắn. HOLD / dấu ×: không bắn tới khi mục tiêu biến mất. Mọi phát bắn ở lượt HOLD đều tính sai quyết định.'},
 priority:{name:'Priority trio',description:'Ba mục tiêu · bắn đúng thứ tự 1 → 2 → 3',category:'speed',icon:'123',radius:1,span:.3,pitch:.1,deadlineScale:2.4,layout:'priority-trio',targetDistance:18,scenario:'Ba mục tiêu cùng xuất hiện. Bắn theo số 1 → 2 → 3; bắn nhầm số tính trượt. Hoàn tất cả bộ trong thời gian giới hạn.'},
 figure8:{name:'Figure 8',description:'Bám số 8 · phối hợp ngang và dọc',category:'tracking',icon:'∞',radius:1,tracking:true,motion:'figure8',layout:'centered-motion',targetDistance:20,scenario:'Giữ tâm trên mục tiêu chạy hình số 8. Không cần bắn; kết quả tính bằng thời gian bám trúng.'},
 pendulum:{name:'Pendulum',description:'Bám con lắc · đọc tăng giảm tốc',category:'tracking',icon:'∿',radius:.95,tracking:true,motion:'pendulum',layout:'centered-motion',targetDistance:18,scenario:'Bám con lắc chậm ở hai đầu và nhanh ở giữa. Giữ chuột mượt khi mục tiêu đảo chiều; không cần bắn.'},
 zigzag:{name:'Zigzag click',description:'Đổi hướng gấp · bắt mục tiêu chạy chéo',category:'speed',icon:'ϟ',radius:1,span:.3,pitch:.14,moving:true,motion:'zigzag',layout:'zigzag-lanes',targetDistance:20,scenario:'Mục tiêu chạy chéo theo đường zíc-zắc liên tục. Đọc điểm đổi hướng và xác nhận tâm trước mỗi phát.'},
 stopgo:{name:'Stop & Go',description:'Chạy–dừng · chọn nhịp bắn',category:'precision',icon:'↦',radius:.85,span:.3,pitch:.1,moving:true,motion:'stopgo',layout:'stopgo-lanes',targetDistance:16,scenario:'Mục tiêu chạy ngang rồi dừng ngắn ở hai đầu. Chờ nhịp dừng để bắn chính xác; vẫn có thể bắn khi mục tiêu chạy.'},
 ladder:{name:'Elevation ladder',description:'Chuyển tâm theo bậc · ba cao độ',category:'precision',icon:'↟',radius:.8,span:.25,pitch:.28,layout:'elevation-ladder',targetDistance:17,scenario:'Sáu vị trí lần lượt đi lên ở bên trái rồi đi xuống bên phải. Mục tiêu đứng yên để luyện dừng tâm theo cao độ.'},
 snap:{name:'Flash flick',description:'Flick nhanh · cửa sổ bắn ngắn',category:'speed',icon:'⚡',radius:1,span:.4,pitch:.16,deadlineScale:.55,layout:'flash-lanes',targetDistance:18,scenario:'Mục tiêu đứng yên nhưng chỉ tồn tại 55% thời gian thông thường: 1,375 giây ở mức Tiêu chuẩn. Ưu tiên phát đầu chính xác.'},
 retake:{name:'Spike Retake',description:'Clear site and defuse the planted device',category:'movement',icon:'◈',radius:.8,span:.4,pitch:.1,combat:true,site:true,layout:'retake',targetDistance:14,scenario:'Clear the defenders, approach the device and hold F to defuse. Half progress is saved.'},
 attack:{name:'Attack & Plant',description:'Enter the site, plant and defend',category:'movement',icon:'◈',radius:.8,span:.4,pitch:.1,combat:true,site:true,layout:'attack',targetDistance:14,scenario:'Enter through one of three lanes. Equip 4 and hold F in the plant zone, then survive the retake.'},
 site:{name:'Site Defense',description:'Giữ bomb site trước các đợt địch liên tục',category:'movement',icon:'◈',radius:.8,span:.4,pitch:.1,moving:true,motion:'strafe',combat:true,site:true,layout:'site-defense',targetDistance:14,scenario:'FPS trực tiếp: WASD di chuyển, chuột ngắm, click bắn. Địch xuất hiện nhiều góc; dùng cover để sống sót.'},
 readmove:{name:'Movement Read',description:'Đọc nhịp đổi hướng, dừng giả và wide swing',category:'movement',icon:'↯',radius:.8,span:.4,pitch:.1,moving:true,motion:'switcher',combat:true,site:true,layout:'movement-read',targetDistance:14,scenario:'Bám chuyển động địch trong site 3D. Chờ nhịp đổi hướng, xác nhận tâm rồi bắn; không có đường hướng dẫn.'},
 precision: { name:'Precision', description:'Dừng tâm chính xác · gần đến trung', category:'precision', icon:'◎', radius:1, span:.15, pitch:.16, layout:'staggered', targetDistance:16, scenario:'Trái/phải xen kẽ, cao/thấp nhẹ ở 10–23 m để luyện dừng tâm.' },
 transfer: { name:'Transfer', description:'Chuyển góc · trung đến xa', category:'speed', icon:'↗', radius:1, span:.48, pitch:.16, layout:'staggered', targetDistance:22, scenario:'Đổi lane trái/phải và cao/thấp ở 14–29 m sau mỗi target.' },
 tracking: { name:'Tracking', description:'Theo target · trung đến xa', category:'tracking', icon:'∿', radius:1, tracking:true, motion:'tracking', layout:'centered-motion', targetDistance:20, scenario:'Mục tiêu lượn đều qua các cự ly 12–28 m; size đổi 6 giây, cự ly đổi 18 giây.' },
 micro: { name:'Micro adjustment', description:'Chỉnh 2–5° · cự ly gần', category:'precision', icon:'·', radius:.4, span:.08, pitch:.06, layout:'near-center', targetDistance:9, scenario:'Target ở gần tâm, 7–11 m, chỉ lệch vài độ để luyện chỉnh nhỏ.' },
 wide: { name:'Wide flick', description:'Flick rộng · trung đến xa', category:'speed', icon:'⇆', radius:1, span:.62, pitch:.18, layout:'wide-staggered', targetDistance:27, scenario:'Hai phía màn hình, cao độ xen kẽ ở 18–35 m với khoảng flick rộng.' },
 horizontal: { name:'Head-line', description:'Đổi ngang · cự ly trung', category:'speed', icon:'↔', radius:.8, span:.45, pitch:0, layout:'horizontal-line', targetDistance:18, scenario:'Target giữ cùng tầm ngang, đổi trái/phải ở 12–23 m.' },
 reactive: { name:'Moving click', description:'Bắn mục tiêu chạy · trung đến xa', category:'speed', icon:'⚡', radius:1.1, span:.3, pitch:.1, moving:true, motion:'reactive', layout:'moving-staggered', targetDistance:21, scenario:'Target xuất hiện lệch lane rồi chạy ngang ở 14–29 m.' },
 burst: { name:'Burst control', description:'Chuỗi gần · kiểm soát nhịp bắn', category:'precision', icon:'✦', radius:.78, span:.2, pitch:.12, motion:'burst', layout:'staggered', targetDistance:12, scenario:'Chuỗi target đổi bên và độ cao từ gần 8 m đến trung 16 m.' },
 grid: { name:'Grid shot', description:'Quét 3×3 · gần đến xa', category:'speed', icon:'▦', radius:.9, span:.58, pitch:.3, motion:'grid', layout:'grid', targetDistance:18, scenario:'Lưới 3×3 đổi ô theo nhịp ở 11 m, 18 m và 25 m.' },
 strafe: { name:'Strafe click', description:'Target lắc ngang · trung đến xa', category:'speed', icon:'↝', radius:.95, span:.42, pitch:.12, moving:true, motion:'strafe', layout:'moving-staggered', targetDistance:21, scenario:'Target lắc ngang quanh lane trái/phải ở 14–28 m.' },
 orbit: { name:'Orbit tracking', description:'Bám vòng cung · trung đến xa', category:'tracking', icon:'◌', radius:1, tracking:true, motion:'orbit', layout:'centered-motion', targetDistance:20, scenario:'Mục tiêu chạy vòng cung mượt; size đổi 6 giây, cự ly 12–30 m đổi 18 giây.' },
 switcher: { name:'Target switch', description:'Đổi mục tiêu · trung đến xa', category:'speed', icon:'⤢', radius:.86, span:.67, pitch:.2, motion:'switcher', layout:'wide-staggered', targetDistance:27, scenario:'Luân phiên hai phía, ba cao độ và 18–36 m để ép chuyển mục tiêu.' },
 peek: { name:'Angle peek', description:'Peek góc khuất · trung đến xa', category:'speed', icon:'◁', radius:.88, span:.52, pitch:.22, motion:'peek', layout:'peek-lanes', targetDistance:24, scenario:'Target bật ra khỏi cover theo nhịp, buộc mở góc và dừng tâm trước khi bắn.' },
 vertical: { name:'Vertical slice', description:'Cắt dọc · gần đến xa', category:'precision', icon:'↕', radius:.84, span:.18, pitch:.48, motion:'vertical', layout:'vertical-lanes', targetDistance:17, scenario:'Mục tiêu đi qua ba cao độ, mô phỏng clear đầu và chân cầu thang.' },
 recoil: { name:'Recoil reset', description:'Burst reset · cự ly gần', category:'precision', icon:'⌁', radius:.72, span:.2, pitch:.2, motion:'recoil', layout:'recoil-pair', targetDistance:12, scenario:'Chuỗi target ngắn với nhịp nghỉ, luyện reset tâm sau burst hai đến ba viên.' },
 clutch: { name:'Clutch 180', description:'Đổi hướng 180° · cự ly xa', category:'speed', icon:'⟲', radius:.86, span:.76, pitch:.28, motion:'clutch', layout:'clutch-wide', targetDistance:30, scenario:'Hai lane xa xuất hiện lệch nhịp, mô phỏng tình huống clutch cuối round.' },
 duel: { name:'Strafe duel', description:'Vừa di chuyển vừa xử lý địch strafe', category:'movement', icon:'⚔', radius:.92, span:.36, pitch:.14, moving:true, motion:'strafe', combat:true, layout:'duel-lanes', targetDistance:18, scenario:'Địch di chuyển ngang và bắn trả theo nhịp. Dùng WASD để giữ góc, Shift để đi bộ.' },
 counter: { name:'Counter-strafe', description:'Dừng bắn sau khi đổi hướng', category:'movement', icon:'↯', radius:.84, span:.32, pitch:.12, moving:true, motion:'peek', combat:true, layout:'counter-lanes', targetDistance:16, scenario:'Đổi hướng, nhả phím để dừng tâm rồi xử lý địch peek. Tập nhịp di chuyển trước phát đầu.' },
 survival: { name:'Survival lane', description:'Né, giữ khoảng cách và loại địch', category:'movement', icon:'◈', radius:.8, span:.5, pitch:.18, moving:true, motion:'switcher', combat:true, layout:'survival-lanes', targetDistance:21, scenario:'Địch đổi lane và bắn trả. Di chuyển, chọn mục tiêu và giữ nhịp dưới áp lực.' },
};
export const CHALLENGES = {
 eight:{name:'Bám số 8',task:'figure8',difficulty:'normal',duration:60,seed:61103,minOnTarget:.55,description:'60s · giữ tâm trên target ≥55%'},
 rhythm:{name:'Bắt nhịp chạy–dừng',task:'stopgo',difficulty:'normal',duration:30,seed:31109,minHits:15,minAccuracy:.85,description:'30s · ít nhất 15 hit · accuracy ≥85%'},
 flash:{name:'Phản xạ chớp nhoáng',task:'snap',difficulty:'normal',duration:30,seed:31121,minHits:20,minAccuracy:.8,description:'30s · ít nhất 20 hit · accuracy ≥80%'},
 elevation:{name:'Chinh phục cao độ',task:'ladder',difficulty:'normal',duration:60,seed:61129,minHits:30,minAccuracy:.9,description:'60s · ít nhất 30 hit · accuracy ≥90%'},
 clean: {name:'20 hit sạch',task:'precision',difficulty:'normal',duration:30,seed:31021,minHits:20,minAccuracy:.9,description:'30s · ít nhất 20 hit · accuracy ≥90%'},
 switch: {name:'Chuyển góc chính xác',task:'wide',difficulty:'normal',duration:60,seed:61043,minHits:35,minAccuracy:.8,description:'60s · ít nhất 35 hit · accuracy ≥80%'},
 follow: {name:'Bám đuổi 60 giây',task:'tracking',difficulty:'normal',duration:60,seed:61067,minOnTarget:.6,description:'60s · giữ tâm trên target ≥60%'},
};
export function targetAngles(task, random, index, cameraYaw=0, cameraPitch=0) {
 const t=TASKS[task]||TASKS.precision;
 if(task==='micro') return {yaw:cameraYaw+(index%2?1:-1)*(.035+random()*.05),pitch:Math.max(-.35,Math.min(.35,cameraPitch+(random()*2-1)*t.pitch))};
 if(t.tracking) return {yaw:cameraYaw,pitch:cameraPitch};
 if(task==='grid') {
  const slot=index%9, col=slot%3, row=Math.floor(slot/3);
  return {yaw:(col-1)*.28+(random()-.5)*.07,pitch:(1-row)*.2+(random()-.5)*.06};
 }
 if(task==='burst') {
  const side=index%2?1:-1;
  return {yaw:side*(.08+random()*.12),pitch:(random()*2-1)*t.pitch};
 }
 if(task==='vertical') return {yaw:(random()*2-1)*t.span,pitch:(index%2?1:-1)*(.16+random()*.25)};
 if(task==='clutch') return {yaw:(index%2?1:-1)*(.55+random()*.22),pitch:(random()*2-1)*t.pitch};
 return {yaw:task==='wide'?(index%2?1:-1)*(.32+random()*.3):(random()*2-1)*t.span,pitch:t.pitch===0?0:(random()*2-1)*t.pitch};
}

function layoutAngles(task, random, index, cameraYaw=0, cameraPitch=0) {
 const t=TASKS[task]||TASKS.precision;
 if(task==='ladder') {
  const slot=index%6, side=slot<3?-1:1, level=slot<3?slot:5-slot;
  return {yaw:side*.24,pitch:(level-1)*.22,layoutKey:`ladder-${slot}`};
 }
 if(t.tracking) return {yaw:cameraYaw,pitch:cameraPitch,layoutKey:'center'};
 if(task==='micro') {
  const side=index%2?1:-1;
  return {yaw:cameraYaw+side*(.035+random()*.05),pitch:Math.max(-.35,Math.min(.35,cameraPitch+(random()*2-1)*.035)),layoutKey:side>0?'near-right':'near-left'};
 }
 if(task==='horizontal') {
  const side=index%2?1:-1;
  return {yaw:side*(.27+random()*.16),pitch:0,layoutKey:side>0?'right-level':'left-level'};
 }
 if(task==='grid') {
  const slot=index%9,col=slot%3,row=Math.floor(slot/3);
  return {yaw:(col-1)*.28+(random()-.5)*.035,pitch:(1-row)*.2+(random()-.5)*.025,layoutKey:`grid-${slot}`};
 }
 const side=index%2?1:-1;
 const elevationSign=Math.floor(index/2)%2===0?1:-1;
 const magnitudes={
  precision:[.12,.2,.08,.14], transfer:[.27,.43,.1,.18], wide:[.34,.61,.12,.22],
  reactive:[.18,.31,.08,.14], burst:[.1,.19,.07,.13], strafe:[.2,.35,.08,.14], switcher:[.43,.64,.12,.22],
  peek:[.24,.48,.1,.2], vertical:[.1,.2,.18,.4], recoil:[.08,.18,.07,.16], clutch:[.5,.76,.14,.28],
  duel:[.2,.38,.08,.16], counter:[.16,.32,.08,.15], survival:[.3,.52,.1,.2],
 };
 const [yawMin,yawMax,pitchMin,pitchMax]=magnitudes[task]||[.18,.35,.08,.16];
 const yawMagnitude=yawMin+random()*(yawMax-yawMin),pitchMagnitude=pitchMin+random()*(pitchMax-pitchMin);
 return {yaw:side*yawMagnitude,pitch:elevationSign*pitchMagnitude,layoutKey:`${side>0?'right':'left'}-${elevationSign>0?'high':'low'}`};
}

function trialSizeBand(seed,index) {
 const n=(finiteSeed(seed)+Math.imul(Number(index)||0,7))>>>0;
 return SIZE_BAND_ORDER[n%SIZE_BAND_ORDER.length];
}
export function distanceBand(distance) {
 const value=Number(distance);
 if(!Number.isFinite(value)||value<=0)return null;
 if(value<DISTANCE_BANDS.near.maximum)return 'near';
 if(value<DISTANCE_BANDS.mid.maximum)return 'mid';
 return 'far';
}
function trialDistance(task, seed, index) {
 const profile=DISTANCE_PROFILES[task]||DISTANCE_PROFILES.precision;
 const offset=finiteSeed(seed)%profile.length;
 const trialIndex=Math.max(0,Math.floor(Number(index)||0));
 // Size rotates every trial.  Holding range for a three-target group means
 // each small/medium/large target is sampled at the same range before it
 // advances, avoiding an accidental size-to-distance correlation.
 const distanceIndex=Math.floor(trialIndex/3);
 return profile[(distanceIndex+offset)%profile.length];
}

function configuredDistance(distance, mode='mixed') {
 const value=Number(distance);
 if(!Number.isFinite(value))return 16;
 if(mode==='close')return Math.max(6,Math.min(11.9,value));
 if(mode==='medium')return Math.max(12,Math.min(23.9,value));
 if(mode==='long')return Math.max(24,value);
 return value;
}

function configuredHeadLevel(pitch, level='realistic', index=0) {
 if(level==='fixed')return 0;
 if(level==='dynamic')return Math.max(-.48,Math.min(.48,pitch+((Math.floor(index)%3)-1)*.075));
 return pitch;
}

/**
 * Return the scenario copy and layout contract used by the task picker.
 * This is intentionally data-only so the UI can render it without starting a run.
 */
export function scenarioInfo(taskOrOptions, difficulty='normal') {
 const requestedTask=taskOrOptions&&typeof taskOrOptions==='object'?taskOrOptions.task:taskOrOptions;
 const requestedDifficulty=taskOrOptions&&typeof taskOrOptions==='object'?taskOrOptions.difficulty:difficulty;
 const task=TASKS[requestedTask]?requestedTask:'precision', level=DIFFICULTY_ORDER.includes(requestedDifficulty)?requestedDifficulty:'normal';
 const t=TASKS[task], d=DIFFICULTIES[level];
 const distances=DISTANCE_PROFILES[task]||[t.targetDistance];
 return {task,difficulty:level,name:t.name,description:t.description,scenario:t.scenario,category:t.category,icon:t.icon,layout:t.layout,targetDistance:t.targetDistance,distanceRange:{minimum:Math.min(...distances),maximum:Math.max(...distances)},distanceBands:[...new Set(distances.map(distanceBand))],motion:t.motion||'static',tracking:!!t.tracking,combat:!!t.combat,sizeBands:Object.entries(SIZE_BANDS).map(([id,b])=>({id,label:b.label,multiplier:b.multiplier})),difficultyName:d.name};
}
export const getScenarioInfo = scenarioInfo;

export function taskDeadlineMs(task, difficulty='normal') {
 return Math.round(difficultyConfig(difficulty).deadlineMs*(TASKS[task]?.deadlineScale??1));
}

// The picker and runtime share the same catalog; site modes have their own launcher.
export const MINI_GAME_GROUPS = Object.freeze([
 {id:'movement',name:'Đấu luyện · WASD'}, {id:'precision',name:'Chính xác'},
 {id:'speed',name:'Tốc độ & phản xạ'}, {id:'tracking',name:'Tracking · không cần bắn'},
]);
export function miniGameEntries(category) {
 return Object.entries(TASKS).filter(([,task])=>!task.site&&(!category||task.category===category));
}

/**
 * Return a repeatable starting point for a target.  The object form is the
 * preferred API, while positional arguments keep integration convenient:
 * `targetPosition('precision', 'hard', seed, trialIndex, cameraYaw, cameraPitch)`.
 * Returned angles are radians and include the resolved difficulty values.
 */
export function targetPosition(taskOrOptions, difficulty='normal', seed=0, index=0, cameraYaw=0, cameraPitch=0) {
 let task=taskOrOptions;
 let map=DEFAULT_MAP;
 let distanceMode='mixed', headLevel='realistic';
 if(taskOrOptions && typeof taskOrOptions==='object') {
  ({task, map=DEFAULT_MAP, difficulty='normal', seed=0, index=0, cameraYaw=0, cameraPitch=0, distanceMode='mixed', headLevel='realistic'}=taskOrOptions);
 }
 task=TASKS[task]?task:'precision';
 map=resolveMapId(map);
 const d=difficultyConfig(difficulty);
 const trialIndex=Math.max(0,Math.floor(Number(index)||0));
 const random=mulberry32((finiteSeed(seed)+Math.imul(trialIndex,0x9e3779b9))>>>0);
 const angles=layoutAngles(task,random,trialIndex,Number(cameraYaw)||0,Number(cameraPitch)||0),mapTarget=MAPS[map].target;
 const lane=mapTarget.laneBias*(trialIndex%2?1:-1);
 const yaw=TASKS[task].tracking?angles.yaw:angles.yaw*mapTarget.yawScale+lane;
 const naturalPitch=TASKS[task].tracking||task==='micro'?angles.pitch:TASKS[task].pitch===0?0:angles.pitch+mapTarget.pitchOffset*(trialIndex%2?1:-1);
 const pitch=configuredHeadLevel(naturalPitch,headLevel,trialIndex);
 const sizeBand=trialSizeBand(seed,trialIndex), size=SIZE_BANDS[sizeBand], t=TASKS[task];
 const distance=configuredDistance(Math.max(6,trialDistance(task,seed,trialIndex)+mapTarget.distanceOffset),distanceMode);
 return {...angles,yaw,pitch,map,radius:t.radius*d.radius*size.multiplier,baseRadius:t.radius*d.radius,sizeBand,sizeLabel:size.label,sizeMultiplier:size.multiplier,deadlineMs:taskDeadlineMs(task,difficulty),speed:d.speed,task,difficulty:DIFFICULTY_ORDER.includes(difficulty)?difficulty:'normal',distance,distanceBand:distanceBand(distance),distanceMode,headLevel,scenario:t.scenario,layout:t.layout};
}

/**
 * Resolve deterministic motion for a target.  Every call is pure: identical
 * task/options/time inputs produce identical angles, which makes replays and
 * heatmap overlays reproducible.  `timeMs` is elapsed active session time.
 */
export function taskMotion(taskOrOptions, timeMs=0, baseYaw=0, basePitch=0, difficulty='normal') {
 let task=taskOrOptions, seed=0, index=0;
 if(taskOrOptions && typeof taskOrOptions==='object') {
  ({task, timeMs=0, baseYaw=0, basePitch=0, difficulty='normal', seed=0, index=0}=taskOrOptions);
 }
 task=TASKS[task]?task:'precision';
 const d=difficultyConfig(difficulty), t=TASKS[task], time=Math.max(0,Number(timeMs)||0)/1000;
 const speed=d.speed;
 const anchor=(Number(baseYaw)||0), elevation=(Number(basePitch)||0);
 if(!(t.motion||t.tracking||t.moving)) return {yaw:anchor,pitch:elevation};
 if(t.motion==='figure8') {
  const phase=time*1.4*speed;
  return {yaw:anchor+Math.sin(phase)*.4,pitch:elevation+Math.sin(phase*2)*.16};
 }
 if(t.motion==='pendulum') {
  const swing=Math.sin(time*1.8*speed);
  return {yaw:anchor+swing*.42,pitch:elevation+.14*swing*swing};
 }
 if(t.motion==='zigzag') {
  const triangle=value=>2/Math.PI*Math.asin(Math.sin(value));
  return {yaw:anchor+triangle(time*3.4*speed)*.16,pitch:elevation+triangle(time*2.1*speed)*.09};
 }
 if(t.motion==='stopgo') {
  const phase=(time*speed%2)/2;
  const offset=phase<.3?-.16+phase/.3*.32:phase<.5?.16:phase<.8?.16-(phase-.5)/.3*.32:-.16;
  return {yaw:anchor+offset,pitch:elevation};
 }
 if(t.motion==='tracking') {
  // Keep the original Tracking path at normal speed; difficulty changes
  // cadence while target size is handled separately by DIFFICULTIES.radius.
  return {yaw:Math.sin(time/1.8*speed)*.38+anchor,pitch:Math.sin(time/1.1*speed)*.13+elevation};
 }
 if(t.motion==='orbit') {
  const phase=(finiteSeed(seed)%360)*Math.PI/180+(Number(index)||0)*.37;
  // Motion amplitude stays stable across difficulty levels.  Harder levels
  // get smaller targets and faster cadence, preserving comparable trajectories.
  return {yaw:Math.sin(time*1.35*speed+phase)*.46+anchor,pitch:Math.cos(time*.83*speed+phase*.7)*.18+elevation};
 }
 if(t.motion==='strafe'||t.motion==='reactive') {
  const phase=(finiteSeed(seed)%360)*Math.PI/180+(Number(index)||0)*.11;
  return {yaw:anchor+Math.sin(time*3.1*speed+phase)*.12,pitch:elevation+Math.sin(time*1.7*speed+phase)*.035};
 }
 if(t.motion==='grid') {
  const slot=Math.floor(time*2.2*speed+Number(index||0))%9;
  const col=slot%3,row=Math.floor(slot/3);
  return {yaw:(col-1)*.28,pitch:(1-row)*.2};
 }
 if(t.motion==='switcher') {
  const phase=Math.floor(time*2.4*speed+Number(index||0));
  return {yaw:(phase%2?1:-1)*(.4+.12*Math.sin(time*4*speed)),pitch:((phase%3)-1)*.1};
 }
 if(t.motion==='peek') {
  const phase=Math.floor(time*1.8*speed+Number(index||0));
  return {yaw:anchor+(phase%2?1:-1)*(.29+.12*Math.sin(time*3.2*speed)),pitch:elevation+Math.sin(time*1.4*speed)*.08};
 }
 if(t.motion==='vertical') {
  return {yaw:anchor+Math.sin(time*1.8*speed)*.1,pitch:elevation+Math.sin(time*2.15*speed)*.34};
 }
 if(t.motion==='recoil') {
  return {yaw:anchor+Math.sin(time*3.4*speed)*.055,pitch:elevation+Math.max(0,Math.sin(time*2.2*speed))*.12};
 }
 if(t.motion==='clutch') {
  const phase=Math.floor(time*1.45*speed+Number(index||0));
  return {yaw:(phase%2?1:-1)*(.56+.18*Math.sin(time*3.8*speed)),pitch:((phase%3)-1)*.13};
 }
 if(t.motion==='burst') {
  return {yaw:anchor+Math.sin(time*2.1*speed)*.06,pitch:elevation+Math.sin(time*2.8*speed)*.025};
 }
 return {yaw:anchor,pitch:elevation};
}
export function matchingCorrection(reference, lab, gain=1) {
 const valid = xs => xs.length===3 && xs.every(x=>Number.isFinite(x)&&x>=1&&x<=300);
 if(!valid(reference)||!valid(lab)||!Number.isFinite(gain)||gain<=0) return {usable:false,reason:'Nhập đủ ba khoảng cách từ 1 đến 300 cm cho mỗi môi trường.'};
 const r=median(reference),l=median(lab),spread=xs=>(Math.max(...xs)-Math.min(...xs))/median(xs);
 const correction=gain*l/r;
 if(spread(reference)>.1||spread(lab)>.1) return {usable:false,reason:'Độ trải vượt 10%. Đo lại cùng góc, giữ cấu hình và thử cả tốc độ chậm/nhanh.'};
 if(correction<.25||correction>4) return {usable:false,reason:'Hệ số ngoài 0.25–4. Kiểm tra cùng góc quay và cùng sens trước khi áp dụng.'};
 return {usable:true,referenceMedian:r,labMedian:l,gain:correction,ratio:l/r,referenceSpread:spread(reference),labSpread:spread(lab)};
}
export function challengeResult(run) {
 const c=CHALLENGES[run.config.challengeId]; if(!c)return null;
 const s=summarizeRun(run),coverage=run.elapsedMs>0?run.tracking.validMs/run.elapsedMs:0;
 const complete=run.status==='completed'&&run.elapsedMs>=c.duration*1000;
 const enoughQuality= run.config.inputMode!=='browser-adjusted-fallback' && s.invalidFrameGaps===0 && !run.pauses?.length && (!c.minOnTarget||coverage>=.9);
 const passed=complete&&enoughQuality&&(c.minHits==null||s.hits>=c.minHits)&&(c.minAccuracy==null||(s.accuracy!==null&&s.accuracy>=c.minAccuracy))&&(c.minOnTarget==null||(s.timeOnTarget!==null&&s.timeOnTarget>=c.minOnTarget));
 return {name:c.name,description:c.description,passed,eligible:complete&&enoughQuality,reason:!complete?'Cần hoàn tất đủ thời lượng.':!enoughQuality?'Phiên bị tạm dừng, frame chậm hoặc input đã xử lý; chạy lại để xét thử thách.':passed?'Đã đạt mục tiêu của thử thách.':'Chưa đạt mục tiêu; xem gợi ý luyện tập bên dưới.'};
}
export function comparable(a,b) {
 if(!a||!b||scenarioKey(a)===null||scenarioKey(a)!==scenarioKey(b))return false;
 const keys=['task','weapon','difficulty','durationMs','deadlineMs','sensitivity','dpi','dpiSource','inputMode','inputGain','exerciseVersion','challengeId','horizontalFovDeg'];
 return keys.every(k=>Object.hasOwn(a,k)&&Object.hasOwn(b,k)&&a[k]!==undefined&&a[k]===b[k]) && historicalMapId(a.map)===historicalMapId(b.map) && historicalMapId(a.map)!==null && (a.challengeId==null || Number.isFinite(a.seed)&&a.seed===b.seed);
}
export function sessionScore(record) {
 const summary=record?.summary||{}, tracking=TASKS[record?.config?.task]?.tracking;
 const raw=tracking?summary.timeOnTarget:record?.rewards?.score??summary.accuracy;
 if(raw===null||raw===undefined)return null;
 const value=Number(raw);
 return Number.isFinite(value)?value*100:null;
}
export function progressSummary(records, options={}) {
 const {task='precision',map=DEFAULT_MAP,difficulty='normal',weapon='vandal'}=options;
 const resolvedMap=resolveMapId(map);
 const scores=(Array.isArray(records)?records:[])
  .filter(record=>record?.status==='completed'&&(!record.schemaVersion||record.quality?.eligibleForAimEvaluation===true||record.quality?.eligibleForDecisionEvaluation===true)&&(!options.playerId||record.playerId===options.playerId)&&record.qualityClean===true&&!record.imported&&options.config&&comparable(record.config,options.config)&&record.config?.task===task&&historicalMapId(record.config?.map)===resolvedMap&&(record.config?.difficulty??'normal')===difficulty&&(record.config?.weapon??'vandal')===weapon)
  .map(sessionScore).filter(score=>score!==null).slice(0,8);
 const last=scores[0]??null, best=scores.length?Math.max(...scores):null, previous=scores[1]??null;
 return {scores,last,best,delta:last!==null&&previous!==null?last-previous:null,count:scores.length};
}

function measuredNonNegative(value) {
 if(value===null||value===undefined||typeof value==='boolean'||(typeof value==='string'&&!value.trim()))return false;
 const number=Number(value);
 return Number.isFinite(number)&&number>=0;
}

function hasMeasuredCombatDamage(combat) {
 if(!combat||typeof combat!=='object')return false;
 if(measuredNonNegative(combat.damageTaken))return true;
 return Array.isArray(combat.enemyShots)&&combat.enemyShots.some((shot)=>shot&&typeof shot==='object'&&shot.hit===true&&measuredNonNegative(shot.damage));
}

function combatPressureLabel(pressure) {
 return ({low:'thấp',moderate:'trung bình',high:'cao'})[pressure]??null;
}

export function analyzeRun(run, history=[]) {
 const s=summarizeRun(run), isTracking=TASKS[run.config.task]?.tracking;
 const trials=run.trials||[], frames=run.frames||[];
 const timeouts=trials.filter(t=>t.outcome==='timeout').length;
 const hitTrials=trials.filter(t=>t.outcome==='hit');
 const correction=median(hitTrials.filter(t=>t.firstEntryMs!==null&&Number.isFinite(t.firstEntryMs)).map(t=>t.hitMs-t.firstEntryMs));
 const coverage=run.elapsedMs>0?run.tracking.validMs/run.elapsedMs:0;
 const quality=[];
 if(run.status!=='completed') quality.push('Phiên kết thúc sớm; chưa dùng để so sánh tiến bộ.');
 if(run.pauses?.length) quality.push('Có tạm dừng; nhịp chơi không liên tục.');
 if(s.invalidFrameGaps) quality.push(`${s.invalidFrameGaps} frame trên 100ms; tốc độ hiển thị có thể ảnh hưởng kết quả.`);
 if(run.config.inputMode==='browser-adjusted-fallback'||run.pauses?.some(p=>p.inputMode&&p.inputMode!==run.config.inputMode)) quality.push('Input đã xử lý hoặc đổi chế độ giữa phiên; cần kiểm tra lại độ khớp sens.');
 const decisionTask=['discrimination','priority'].includes(run.config.task);
 const enough=decisionTask?trials.length>=10:isTracking?run.tracking.validMs>=10000:trials.length>=10&&s.shots>=10;
 if(!enough) quality.push(isTracking?'Cần ít nhất 10 giây tracking hợp lệ để nhận xét.':'Cần ít nhất 10 target và 10 phát bắn để nhận xét.');
 const evidence=[],actions=[];
 let headline='Thu thêm dữ liệu trước khi thay đổi cách tập.',nextTask=run.config.task;
 if(decisionTask){headline='Đọc luật mục tiêu trước khi bắn.';nextTask=run.config.task;actions.push(run.config.task==='priority'?'Đọc số 1 → 2 → 3 trước mỗi bộ; bắn nhầm số làm đứt combo.':'Xác nhận SHOOT hoặc HOLD trước khi click. Giữ tay hết lượt HOLD để có quyết định đúng.');}
 else if(enough&&isTracking){
  headline=s.timeOnTarget>=.6?'Bạn đang giữ tâm trên target khá đều.':'Ưu tiên giữ tâm liên tục trước khi tăng độ khó.';
  evidence.push(`Tâm ở trên target ${(s.timeOnTarget*100).toFixed(1)}% thời gian hợp lệ; RMS ${s.trackingRmsDeg.toFixed(2)}°.`);
  actions.push(s.timeOnTarget>=.6?'Lặp lại cùng thiết lập để kiểm độ ổn định; sau đó thử target nhỏ hơn.':'Tập Tracking mức Làm quen 30 giây, di chuột liên tục thay vì giật từng bước.');
  const valid=frames.filter(f=>f.dt>0&&f.dt<=100), halves=[valid.filter(f=>f.t<=run.elapsedMs/2),valid.filter(f=>f.t>run.elapsedMs/2)];
  const ratios=halves.map(xs=>{const total=xs.reduce((a,f)=>a+f.dt,0);return total>=3000?xs.reduce((a,f)=>a+(f.onTarget?f.dt:0),0)/total:null;});
  if(ratios.every(v=>v!==null)) evidence.push(`Nửa đầu ${(ratios[0]*100).toFixed(1)}%, nửa cuối ${(ratios[1]*100).toFixed(1)}% trên target. Chênh lệch này chưa chứng minh mệt mỏi.`);
 } else if(enough){
  evidence.push(`${s.hits}/${s.shots} phát trúng (${(s.accuracy*100).toFixed(1)}%); ${timeouts}/${trials.length} target hết thời gian.`);
  evidence.push(`Trúng phát đầu trong ${(run.config.deadlineMs ?? 2500)/1000}s: ${(s.firstShotSuccessRate*100).toFixed(1)}%. ${s.medianAcquireMs===null?'Chưa có target trúng.':`Trung vị tới hit: ${Math.round(s.medianAcquireMs)}ms, chỉ trên target trúng.`}`);
  if(correction!==null)evidence.push(`Trung vị từ lần tâm vào target đầu tiên tới hit: ${Math.round(correction)}ms. Bao gồm thời gian chỉnh tâm và chờ bắn.`);
  if(s.accuracy<.75){headline='Ưu tiên độ chính xác trước tốc độ bắn.';nextTask='micro';actions.push('Tập Micro adjustment mức Làm quen 30 giây. Chỉ bắn sau khi tâm đã nằm trong target; giữ nguyên sens.');}
  else if(timeouts/trials.length>.2){headline='Bạn bắn tương đối chính xác, nhưng còn bỏ lỡ cửa sổ thời gian.';nextTask='transfer';actions.push('Tập Transfer 30 giây với target lớn hơn, tìm target sớm và di tâm một lần có chủ đích.');}
  else {headline='Độ chính xác đang ổn trong bài này; thử chuyển sang mục tiêu khó hơn.';nextTask=run.config.task==='reactive'?'wide':'reactive';actions.push(`Lặp lại một phiên cùng thiết lập, rồi thử ${TASKS[nextTask].name} để kiểm khả năng chuyển kỹ năng.`);}
 }
 const combat=summarizeCombat(run);
 if(combat.enabled){
  const rawCombat=run.combat;
  const damageMeasured=hasMeasuredCombatDamage(rawCombat);
  const damageObserved=damageMeasured&&(combat.damageTaken>0||combat.enemyShots>0);
  const pressureObserved=combat.enemyShots>0||damageObserved;
  if(combat.enemyShots>0){
   if(combat.enemyHitRate!==null)evidence.push(`Độ chính xác địch: ${combat.enemyHits}/${combat.enemyShots} phát trúng (${(combat.enemyHitRate*100).toFixed(1)}%).`);
   else evidence.push(`Địch đã bắn ${combat.enemyShots} phát ghi nhận, nhưng thiếu kết quả hit/miss đầy đủ để tính độ chính xác.`);
  }
  if(damageObserved){
   const vitals=[combat.health!==null?`${combat.health} HP`:null,combat.shield!==null?`${combat.shield} SH`:null].filter(Boolean);
   evidence.push(`Sát thương nhận: ${combat.damageTaken}.${vitals.length?` Chỉ số kết thúc: ${vitals.join(' · ')}.`:''}`);
  }
  if(combat.movingRatio!==null)evidence.push(`Bạn di chuyển ${(combat.movingRatio*100).toFixed(1)}% thời gian được quan sát trong duel. Đây là tỷ lệ di chuyển, không phải đánh giá kỹ năng.`);
  if(pressureObserved){
   const label=combatPressureLabel(combat.pressure);
   if(label)evidence.push(`Áp lực địch: ${label}, dựa trên ${combat.enemyShots?`${combat.enemyShots} phát địch ghi nhận`:'sát thương đã ghi nhận'}${combat.enemyHitRate===null&&combat.enemyShots?' và chưa có đủ hit/miss để tính accuracy':''}.`);
  }
  const highPressure=(damageMeasured&&combat.damageTaken>=60)||(combat.enemyShots>=3&&combat.enemyHitRate!==null&&combat.enemyHitRate>=.45);
  if(highPressure){headline='Ưu tiên thay đổi nhịp di chuyển khi địch đang gây áp lực.';nextTask='counter';actions.push('Tập Counter-strafe: đi ngang ngắn, nhả phím để ổn định tâm rồi bắn. Đổi nhịp thay vì giữ một đường chạy dài.');}
  else if(combat.enemyShots>=3&&combat.movingRatio!==null&&combat.movingRatio<.2){headline='Bạn còn đứng yên nhiều trong lúc duel.';nextTask='duel';actions.push('Trong Strafe duel, dùng WASD để đổi lane trước mỗi lần địch sẵn sàng bắn; giữ cú dừng ngắn trước phát đầu.');}
  else if(combat.enemyShots>=3&&combat.enemyHitRate!==null&&combat.enemyHitRate<=.2&&combat.health!==null&&combat.health>=60){nextTask='survival';actions.push('Áp lực hiện tại đã thấp; thử Survival lane để luyện chọn mục tiêu khi nhiều địch đổi lane.');}
 }
 if(!enough)actions.push('Hoàn tất một phiên 30 giây ở mức Làm quen, giữ nguyên sens và DPI.');
 actions.push('Giữ đúng sens đang dùng trong VALORANT và lặp lại cùng bài qua vài phiên trước khi thử mức khác. Bắn trượt chưa xác định sens quá cao hay quá thấp.');
 const baseline=(!run.schemaVersion||run.quality?.eligibleForAimEvaluation===true||run.quality?.eligibleForDecisionEvaluation===true)&&run.status==='completed'&&!run.pauses?.length&&!s.invalidFrameGaps&&run.config.inputMode!=='browser-adjusted-fallback'?history.find(h=>h.id!==run.id&&(!run.schemaVersion||h.playerId===run.playerId)&&!h.imported&&h.status==='completed'&&h.qualityClean===true&&comparable(run.config,h.config)):null;
 let comparison='Chưa có phiên hoàn tất với cùng cấu hình và chất lượng input để so sánh.';
 if(baseline){const a=decisionTask?run.rewards?.score:isTracking?s.timeOnTarget:s.accuracy,b=decisionTask?baseline.rewards?.score:isTracking?baseline.summary.timeOnTarget:baseline.summary.accuracy;if(Number.isFinite(a)&&Number.isFinite(b))comparison=`So với phiên ${new Date(baseline.startedAt).toLocaleString('vi-VN')}: ${decisionTask?'quyết định đúng':isTracking?'thời gian trên target':'accuracy'} ${a>=b?'+':''}${((a-b)*100).toFixed(1)} điểm phần trăm. Đây là chênh lệch hai phiên, chưa phải bằng chứng tiến bộ hoặc sens tốt hơn.`;}
 return {version:'rules-0.3',headline,evidence,actions,nextTask,quality,comparison,coverage,combat:combat.enabled?combat:null,challenge:challengeResult(run),disclaimer:'Nhận xét theo quy tắc của prototype, không phải xếp hạng người chơi hay chẩn đoán từ mô hình AI.'};
}
