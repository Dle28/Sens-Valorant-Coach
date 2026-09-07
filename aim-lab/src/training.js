import { median, summarizeRun } from './metrics.js';
export const TASKS = {
 precision: { name:'Precision', description:'Target nhỏ · dừng tâm chính xác', radius:1, span:.15, pitch:.16 },
 transfer: { name:'Transfer', description:'Chuyển góc · nhanh và đúng', radius:1, span:.48, pitch:.16 },
 tracking: { name:'Tracking', description:'Theo target · giữ tâm ổn định', radius:1, tracking:true },
 micro: { name:'Micro adjustment', description:'Chỉnh 2–5° quanh tâm · target rất nhỏ', radius:.6, span:.08, pitch:.06 },
 wide: { name:'Wide flick', description:'Đổi bên trái–phải · góc rộng', radius:1, span:.62, pitch:.18 },
 horizontal: { name:'Head-line', description:'Chuyển target cùng tầm ngang', radius:.8, span:.45, pitch:0 },
 reactive: { name:'Moving click', description:'Bắn target đang di chuyển ngang', radius:1.1, span:.3, pitch:.1, moving:true },
};
export const CHALLENGES = {
 clean: {name:'20 hit sạch',task:'precision',difficulty:'normal',duration:30,seed:31021,minHits:20,minAccuracy:.9,description:'30s · ít nhất 20 hit · accuracy ≥90%'},
 switch: {name:'Chuyển góc chính xác',task:'wide',difficulty:'normal',duration:60,seed:61043,minHits:35,minAccuracy:.8,description:'60s · ít nhất 35 hit · accuracy ≥80%'},
 follow: {name:'Bám đuổi 60 giây',task:'tracking',difficulty:'normal',duration:60,seed:61067,minOnTarget:.6,description:'60s · giữ tâm trên target ≥60%'},
};
export function targetAngles(task, random, index, cameraYaw=0, cameraPitch=0) {
 const t=TASKS[task];
 if(task==='micro') return {yaw:cameraYaw+(index%2?1:-1)*(.035+random()*.05),pitch:Math.max(-.35,Math.min(.35,cameraPitch+(random()*2-1)*t.pitch))};
 return {yaw:task==='wide'?(index%2?1:-1)*(.32+random()*.3):(random()*2-1)*t.span,pitch:t.pitch===0?0:(random()*2-1)*t.pitch};
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
 const keys=['task','difficulty','durationMs','sensitivity','dpi','dpiSource','inputMode','inputGain','exerciseVersion','challengeId','horizontalFovDeg'];
 return keys.every(k=>a[k]===b[k]) && (a.challengeId==null || a.seed===b.seed);
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
 const enough=isTracking?run.tracking.validMs>=10000:trials.length>=10&&s.shots>=10;
 if(!enough) quality.push(isTracking?'Cần ít nhất 10 giây tracking hợp lệ để nhận xét.':'Cần ít nhất 10 target và 10 phát bắn để nhận xét.');
 const evidence=[],actions=[];
 let headline='Thu thêm dữ liệu trước khi thay đổi cách tập.',nextTask=run.config.task;
 if(enough&&isTracking){
  headline=s.timeOnTarget>=.6?'Bạn đang giữ tâm trên target khá đều.':'Ưu tiên giữ tâm liên tục trước khi tăng độ khó.';
  evidence.push(`Tâm ở trên target ${(s.timeOnTarget*100).toFixed(1)}% thời gian hợp lệ; RMS ${s.trackingRmsDeg.toFixed(2)}°.`);
  actions.push(s.timeOnTarget>=.6?'Lặp lại cùng thiết lập để kiểm độ ổn định; sau đó thử target nhỏ hơn.':'Tập Tracking mức Làm quen 30 giây, di chuột liên tục thay vì giật từng bước.');
  const valid=frames.filter(f=>f.dt>0&&f.dt<=100), halves=[valid.filter(f=>f.t<=run.elapsedMs/2),valid.filter(f=>f.t>run.elapsedMs/2)];
  const ratios=halves.map(xs=>{const total=xs.reduce((a,f)=>a+f.dt,0);return total>=3000?xs.reduce((a,f)=>a+(f.onTarget?f.dt:0),0)/total:null;});
  if(ratios.every(v=>v!==null)) evidence.push(`Nửa đầu ${(ratios[0]*100).toFixed(1)}%, nửa cuối ${(ratios[1]*100).toFixed(1)}% trên target. Chênh lệch này chưa chứng minh mệt mỏi.`);
 } else if(enough){
  evidence.push(`${s.hits}/${s.shots} phát trúng (${(s.accuracy*100).toFixed(1)}%); ${timeouts}/${trials.length} target hết thời gian.`);
  evidence.push(`Trúng phát đầu trong 2,5s: ${(s.firstShotSuccessRate*100).toFixed(1)}%. ${s.medianAcquireMs===null?'Chưa có target trúng.':`Trung vị tới hit: ${Math.round(s.medianAcquireMs)}ms, chỉ trên target trúng.`}`);
  if(correction!==null)evidence.push(`Trung vị từ lần tâm vào target đầu tiên tới hit: ${Math.round(correction)}ms. Bao gồm thời gian chỉnh tâm và chờ bắn.`);
  if(s.accuracy<.75){headline='Ưu tiên độ chính xác trước tốc độ bắn.';nextTask='micro';actions.push('Tập Micro adjustment mức Làm quen 30 giây. Chỉ bắn sau khi tâm đã nằm trong target; giữ nguyên sens.');}
  else if(timeouts/trials.length>.2){headline='Bạn bắn tương đối chính xác, nhưng còn bỏ lỡ cửa sổ thời gian.';nextTask='transfer';actions.push('Tập Transfer 30 giây với target lớn hơn, tìm target sớm và di tâm một lần có chủ đích.');}
  else {headline='Độ chính xác đang ổn trong bài này; thử chuyển sang mục tiêu khó hơn.';nextTask=run.config.task==='reactive'?'wide':'reactive';actions.push(`Lặp lại một phiên cùng thiết lập, rồi thử ${TASKS[nextTask].name} để kiểm khả năng chuyển kỹ năng.`);}
 }
 if(!enough)actions.push('Hoàn tất một phiên 30 giây ở mức Làm quen, giữ nguyên sens và DPI.');
 actions.push('Giữ đúng sens đang dùng trong VALORANT và lặp lại cùng bài qua vài phiên trước khi thử mức khác. Bắn trượt chưa xác định sens quá cao hay quá thấp.');
 const baseline=run.status==='completed'&&!run.pauses?.length&&!s.invalidFrameGaps&&run.config.inputMode!=='browser-adjusted-fallback'?history.find(h=>h.id!==run.id&&h.status==='completed'&&h.qualityClean===true&&comparable(run.config,h.config)):null;
 let comparison='Chưa có phiên hoàn tất với cùng cấu hình và chất lượng input để so sánh.';
 if(baseline){const a=isTracking?s.timeOnTarget:s.accuracy,b=isTracking?baseline.summary.timeOnTarget:baseline.summary.accuracy;if(Number.isFinite(a)&&Number.isFinite(b))comparison=`So với phiên ${new Date(baseline.startedAt).toLocaleString('vi-VN')}: ${isTracking?'thời gian trên target':'accuracy'} ${a>=b?'+':''}${((a-b)*100).toFixed(1)} điểm phần trăm. Đây là chênh lệch hai phiên, chưa phải bằng chứng tiến bộ hoặc sens tốt hơn.`;}
 return {version:'rules-0.2',headline,evidence,actions,nextTask,quality,comparison,coverage,challenge:challengeResult(run),disclaimer:'Nhận xét theo quy tắc của prototype, không phải xếp hạng người chơi hay chẩn đoán từ mô hình AI.'};
}
