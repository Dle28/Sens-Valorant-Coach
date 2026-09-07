import { TASKS } from './training.js';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function parseHistory(text) {
 if(typeof text!=='string'||text.length>5*1024*1024)throw new Error('File lịch sử vượt giới hạn 5 MiB.');
 const data=JSON.parse(text);
 if(data?.format!=='gamesen-history'||data.version!==1||!Array.isArray(data.sessions)||data.sessions.length>30)throw new Error('Chọn file từ nút Xuất lịch sử (tối đa 30 phiên).');
 return data.sessions.map(s=>{
  if(!s||!UUID.test(s.id)||!TASKS[s.config?.task]||!['completed','ended-early'].includes(s.status)||!Number.isFinite(Date.parse(s.startedAt)))throw new Error('File chứa phiên không hợp lệ.');
  if(!Number.isFinite(s.config.sensitivity)||s.config.sensitivity<.01||s.config.sensitivity>10||!Number.isFinite(s.config.dpi)||s.config.dpi<100||s.config.dpi>32000)throw new Error('Profile trong file không hợp lệ.');
  const summary={};for(const k of ['shots','hits','misses','accuracy','medianAcquireMs','startedTrials','firstShotSuccessRate','timeOnTarget','trackingRmsDeg','frameMedianMs','invalidFrameGaps']){
   const v=s.summary?.[k];if(v!=null&&(!Number.isFinite(v)||v<0))throw new Error('Chỉ số trong file không hợp lệ.');summary[k]=v??null;
  }
  if(!Number.isFinite(summary.shots)||!Number.isFinite(summary.hits)||summary.hits>summary.shots)throw new Error('Số phát bắn không hợp lệ.');
  const config={};for(const k of ['task','difficulty','durationMs','sensitivity','dpi','dpiSource','inputMode','inputGain','exerciseVersion','challengeId','seed','horizontalFovDeg']){const v=s.config[k];if(v===null||['string','number','boolean'].includes(typeof v))config[k]=v;}
  // Imported summaries lack verified provenance; retain them without inventing
  // trajectory analysis or admitting them to automatic progress comparisons.
  return {id:s.id,startedAt:s.startedAt,status:s.status,elapsedMs:Number.isFinite(s.elapsedMs)?s.elapsedMs:0,config,summary,qualityClean:false,imported:true};
 });
}
export function mergeHistory(current,incoming) {
 const byId=new Map();for(const s of [...current,...incoming])if(!byId.has(s.id))byId.set(s.id,s);
 return [...byId.values()].sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)).slice(0,30);
}
