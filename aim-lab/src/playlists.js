import { CORE_AIM_BATTERY } from './assessment-protocol.js';

export const PLAYLISTS={
 warmup:{name:'Khởi động · 5 phút',rest:15,steps:[{task:'precision',seconds:90},{task:'figure8',seconds:90},{task:'stopgo',seconds:90}]},
 control:{name:'Kiểm soát tâm · 10 phút',rest:30,steps:[{task:'micro',seconds:120},{task:'ladder',seconds:120},{task:'pendulum',seconds:120},{task:'zigzag',seconds:150}]},
 decisions:{name:'Đọc tín hiệu · 4 phút',rest:15,steps:[{task:'discrimination',seconds:60},{task:'priority',seconds:60},{task:'snap',seconds:90}]},
 assessment:{name:'Đánh giá chuẩn hoá · 5 phút',rest:10,kind:'assessment',protocolId:CORE_AIM_BATTERY.id,steps:CORE_AIM_BATTERY.blocks.map(block=>({task:block.task,seconds:block.durationMs/1000,blockId:block.id}))},
};
export function createQueue(id, protocolPhase='baseline'){
 if(!PLAYLISTS[id])throw new Error('Unknown playlist');
 const isAssessment=PLAYLISTS[id].kind==='assessment';
 return {id,index:0,phase:'ready',results:[],remaining:0,protocolPhase:isAssessment&&['baseline','retest'].includes(protocolPhase)?protocolPhase:null};
}
export function advanceQueue(queue,result){
 if(queue.phase==='done')return queue;
 const next={...queue,index:queue.index+1,results:[...queue.results,result]};
 next.phase=next.index>=PLAYLISTS[next.id].steps.length?'done':'rest';next.remaining=next.phase==='rest'?PLAYLISTS[next.id].rest:0;return next;
}
export function tickQueue(queue,seconds){if(queue.phase!=='rest')return queue;const remaining=Math.max(0,queue.remaining-seconds);return {...queue,remaining,phase:remaining===0?'ready':'rest'};}

export function initPlaylists({root,tasks,prepare,start,canChange,end}){
 let queue=null,timer=null,last=0,paused=false;
 try{const saved=JSON.parse(localStorage.getItem('gamesen.playlist')??'null');if(saved&&PLAYLISTS[saved.id]&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<=PLAYLISTS[saved.id].steps.length&&Array.isArray(saved.results)){queue={...createQueue(saved.id,saved.protocolPhase),index:saved.index,results:saved.results.slice(0,4),phase:saved.index===PLAYLISTS[saved.id].steps.length?'done':'ready'};}}catch{}
 const save=()=>{try{localStorage.setItem('gamesen.playlist',JSON.stringify(queue));}catch{}};
 const load=()=>{const plan=PLAYLISTS[queue.id],step=plan.steps[queue.index];prepare(step,{id:queue.id,index:queue.index,protocolPhase:queue.protocolPhase,kind:plan.kind??'training',protocolId:plan.protocolId??null});};
 const panel=document.createElement('section');panel.className='routine-panel';panel.hidden=true;document.querySelector('#practice-view').prepend(panel);
 function render(){
  if(!root.querySelector('.routine-catalog')){
  root.innerHTML='<header class="page-heading"><div><h1>Luyện tập có lộ trình</h1><p>Chọn một mục tiêu. Tập từng bài, nghỉ đúng nhịp.</p></div></header>';
  const catalog=document.createElement('div');catalog.className='routine-catalog';root.append(catalog);
  const descriptions={warmup:'Đánh thức phản xạ, làm quen nhịp chuột trước khi vào trận.',control:'Ổn định chuyển động nhỏ và kiểm soát tâm qua nhiều hướng.',decisions:'Nhận diện đúng mục tiêu và quyết định trước khi bóp cò.',assessment:'Bốn block cố định, seed cố định và Dark Range để tạo baseline hoặc retest có thể so sánh.'};
  for(const [id,p] of Object.entries(PLAYLISTS)){
   const card=document.createElement('article');card.className='routine-card';
   const duration=Math.round((p.steps.reduce((sum,step)=>sum+step.seconds,0)+p.rest*(p.steps.length-1))/60);
   card.innerHTML=`<span class="routine-duration">${duration} phút <span>· ${p.steps.length} bài tập</span></span><h2>${p.name.split(' · ')[0]}</h2><p>${descriptions[id]}</p><ol>${p.steps.map(s=>`<li><span>${tasks[s.task].name}</span><b>${s.seconds} giây</b></li>`).join('')}</ol><small>Nghỉ ${p.rest} giây giữa các bài</small>`;
   const start=(protocolPhase='baseline')=>{if(!canChange())return;queue=createQueue(id,protocolPhase);paused=false;load();save();render();};
   const button=document.createElement('button');button.type='button';button.className='coach-primary';button.dataset.routine=id;button.textContent=p.kind==='assessment'?'Chạy baseline':'Bắt đầu lộ trình';
   button.setAttribute('aria-label',`${button.textContent} ${p.name}`);button.onclick=()=>start('baseline');card.append(button);
   if(p.kind==='assessment'){const retest=document.createElement('button');retest.type='button';retest.className='secondary-button';retest.textContent='Chạy đo lại';retest.setAttribute('aria-label',`Chạy đo lại ${p.name}`);retest.onclick=()=>start('retest');card.append(retest);}
   catalog.append(card);
  }
  const help=document.createElement('p');help.className='routine-help';help.textContent='Tiến độ được lưu trên máy. Sau giờ nghỉ, nhấn “Bắt đầu bài tiếp” để vào phòng tập. Bạn có thể tạm dừng hoặc bỏ qua bài.';root.append(help);
  }
  panel.hidden=!queue;
  if(!queue){root.querySelector('[data-resume-routine]')?.remove();return;}
  panel.replaceChildren();const p=PLAYLISTS[queue.id],heading=document.createElement('h2');heading.textContent=`${p.name} · ${queue.phase==='done'?'Hoàn tất':`${queue.index+1}/${p.steps.length}`}`;panel.append(heading);
  const info=document.createElement('p');info.setAttribute('aria-live','polite');info.textContent=queue.phase==='done'?`${queue.results.filter(r=>r.status==='completed').length}/${p.steps.length} bài hoàn tất. ${queue.results.map(r=>`${tasks[r.task]?.name}: ${r.status==='skipped'?'bỏ qua':r.score===null?'chưa có điểm':Math.round(r.score*100)+'%'}`).join(' · ')}`:queue.phase==='rest'?`Nghỉ ${Math.ceil(queue.remaining)} giây${paused?' · đã tạm dừng':''}`:`${tasks[p.steps[queue.index].task].name} · ${p.steps[queue.index].seconds}s · ${queue.phase==='running'?'Đang tập':'Sẵn sàng'}`;panel.append(info);
  const button=(label,action)=>{const b=document.createElement('button');b.className='secondary-button';b.textContent=label;b.onclick=action;panel.append(b);};
  if(queue.phase==='ready')button('Bắt đầu bài tiếp',()=>{if(!canChange())return;load();start();});
  if(queue.phase==='rest')button(paused?'Tiếp tục nghỉ':'Tạm dừng nghỉ',()=>{paused=!paused;last=performance.now();render();});
  if(queue.phase!=='done')button('Bỏ qua bài',()=>{if(queue.phase==='running'){end();return;}queue=advanceQueue(queue,{task:p.steps[queue.index].task,status:'skipped',score:null});paused=false;save();render();});
  button('Đóng lộ trình',()=>{if(!canChange())return;queue=null;document.dispatchEvent(new Event('v-aim:playlist-closed'));save();render();});
 }
 document.addEventListener('v-aim:run-finished',event=>{
  const run=event.detail;if(!queue||queue.phase!=='running'||run.config.playlist?.id!==queue.id||run.config.playlist.index!==queue.index)return;
  const expected=PLAYLISTS[queue.id].steps[queue.index];
  const completed=run.status==='completed'&&run.config.task===expected.task&&run.config.durationMs===expected.seconds*1000;
  queue=advanceQueue(queue,{task:expected.task,status:completed?'completed':'skipped',score:completed?run.rewards?.score??null:null});last=performance.now();paused=false;save();render();
 });
 document.addEventListener('v-aim:run-started',event=>{if(queue&&event.detail?.id===queue.id&&event.detail.index===queue.index){queue.phase='running';save();render();}});
 document.addEventListener('v-aim:navigate',event=>{if(event.detail.view==='playlists'){root.querySelector('[data-resume-routine]')?.remove();render();if(queue&&queue.phase!=='running'){const resume=document.createElement('button');resume.dataset.resumeRoutine='';resume.textContent='Tiếp tục lộ trình đã lưu';resume.className='coach-primary';resume.onclick=()=>{if(!canChange())return;if(queue.phase!=='done')load();else document.querySelector('.sidebar-route[data-route="practice"]').click();render();};root.prepend(resume);}}});
 timer=setInterval(()=>{const now=performance.now(),dt=last?(now-last)/1000:0;last=now;if(!queue||queue.phase!=='rest'||paused||document.hidden)return;queue=tickQueue(queue,dt);if(queue.phase==='ready'&&canChange())load();save();render();},500);
 window.addEventListener('beforeunload',()=>clearInterval(timer));render();
}
