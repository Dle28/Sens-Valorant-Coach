import { chartCoaching } from './chart-coaching.js';
import { renderChartCoaching } from './chart-coaching-view.js';
const finite = Number.isFinite;
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import { aimOffset } from './aim-geometry.js';
export { aimOffset } from './aim-geometry.js';
export function chartData(run,extent=30){
 const duration=Math.max(0,run.elapsedMs||0), buckets=Array.from({length:Math.max(1,Math.ceil(duration/5000))},(_,i)=>({start:i*5000,hits:0,shots:0,valid:0,on:0}));
 const cells=Array(25*15).fill(0);let outside=0,inside=0,located=0;
 const frames=(run.frames||[]).filter(f=>finite(f.t)&&f.t>=0&&finite(f.errorDeg)&&f.errorDeg>=0&&f.dt>0&&f.dt<=100);
 for(const s of run.shots||[])if(finite(s.t)&&s.t>=0&&s.t<=duration){const b=buckets[Math.min(buckets.length-1,Math.floor(s.t/5000))];b.shots++;if(s.hit)b.hits++;}
 for(const f of frames){
  const end=Math.min(duration,f.t),start=Math.max(0,f.t-f.dt),weight=Math.max(0,end-start);
  for(let i=Math.floor(start/5000);i<buckets.length&&i*5000<end;i++){const w=Math.max(0,Math.min(end,(i+1)*5000)-Math.max(start,i*5000));buckets[i].valid+=w;buckets[i].on+=f.onTarget?w:0;}
  const offset=aimOffset(f.target,f.yaw,f.pitch,f.cameraPosition);if(!offset)continue;located+=weight;
  if(Math.abs(offset.x)>extent||Math.abs(offset.y)>extent*.6){outside+=weight;continue;}inside+=weight;
  const col=Math.min(24,Math.floor((offset.x+extent)/(2*extent)*25)),row=Math.min(14,Math.floor((extent*.6-offset.y)/(extent*1.2)*15));cells[row*25+col]+=weight;
 }
 return {duration,frames,buckets,cells,outside,inside,located};
}
const label=(x,y,t,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" class="chart-label" font-size="12" font-family="system-ui">${escape(t)}</text>`;
const number=n=>Number(n.toFixed(1));
function axes(max,duration,unit=''){let s='';for(let i=0;i<=4;i++){const y=180-i*38;s+=`<path d="M48 ${y}H582" class="chart-grid"/>`+label(40,y+4,number(max*i/4)+unit,'end');}for(let i=0;i<=4;i++)s+=label(48+i*133.5,207,number(duration/1000*i/4)+'s');return s;}
function describe(id,text){const el=document.getElementById(id);if(el)el.textContent=text;}
export function renderCharts(run,tracking){
 renderChartCoaching(chartCoaching(run));
 const extent=Number(document.getElementById('heat-extent')?.value)||30,d=chartData(run,extent);
 const bins=Array.from({length:Math.ceil(d.duration/1000)},(_,i)=>({t:i*1000,weight:0,sum:0,min:Infinity,max:0}));
 for(const f of d.frames){const end=Math.min(d.duration,f.t),start=Math.max(0,f.t-f.dt);for(let i=Math.floor(start/1000);i<bins.length&&i*1000<end;i++){const w=Math.max(0,Math.min(end,(i+1)*1000)-Math.max(start,i*1000));const b=bins[i];b.weight+=w;b.sum+=f.errorDeg*w;b.min=Math.min(b.min,f.errorDeg);b.max=Math.max(b.max,f.errorDeg);}}
 const max=Math.max(1,...bins.filter(b=>b.weight).map(b=>b.max)),x=t=>48+t/Math.max(1,d.duration)*534,y=v=>180-v/max*152;
 let timeline=axes(max,d.duration),last=null;
 for(const b of bins){if(!b.weight){last=null;continue;}const t=Math.min(d.duration,b.t+500),avg=b.sum/b.weight;timeline+=`<path d="M${x(t)} ${y(b.min)}V${y(b.max)}" stroke="var(--chart-main)" stroke-width="5" opacity=".22"/>`;if(last)timeline+=`<path d="M${x(last.t)} ${y(last.avg)}L${x(t)} ${y(avg)}" fill="none" stroke="var(--chart-main)" stroke-width="2.5"/>`;timeline+=`<circle cx="${x(t)}" cy="${y(avg)}" r="3.5" fill="var(--chart-main)"><title>${number(b.t/1000)}–${number(Math.min(d.duration,b.t+1000)/1000)}s: trung bình ${number(avg)}°, min ${number(b.min)}°, max ${number(b.max)}° · ${number(b.weight)}ms hợp lệ</title></circle>`;last={t,avg};}
 if(!last&&!bins.some(b=>b.weight))timeline+=label(310,100,'Chưa có dữ liệu hợp lệ');
 document.getElementById('result-chart').innerHTML=timeline;
 const total=bins.reduce((a,b)=>a+b.weight,0),mean=total?bins.reduce((a,b)=>a+b.sum,0)/total:null;
 describe('error-caption',`Đường sáng: trung bình mỗi giây; vạch mờ: khoảng nhỏ nhất–lớn nhất. ${mean===null?'Chưa đủ dữ liệu.':`Toàn phiên: ${number(mean)}° trên ${number(total/1000)}s hợp lệ.`} Góc thấp hơn nghĩa là tâm gần mục tiêu hơn; khoảng trống là thiếu dữ liệu.`);
 const metric=document.getElementById('pace-metric');if(metric){metric.disabled=tracking;metric.options[0].textContent=tracking?'Thời gian trên mục tiêu (%)':'Số trúng / phút';if(tracking)metric.value='rate';metric.title=tracking?'Tracking luôn hiển thị thời gian trên mục tiêu.':'';}
 const accuracy=metric?.value==='accuracy',values=d.buckets.map(b=>tracking?(b.valid?100*b.on/b.valid:null):accuracy?(b.shots?100*b.hits/b.shots:null):(Math.min(5000,d.duration-b.start)>0?b.hits*60000/Math.min(5000,d.duration-b.start):null)),top=tracking||accuracy?100:Math.max(10,...values.filter(finite));
 let pace=axes(top,d.duration);values.forEach((v,i)=>{const b=d.buckets[i],end=Math.min(b.start+5000,d.duration),left=x(b.start),width=x(end)-left;
 if(v===null){pace+=label(left+width/2,165,'—');return;}const valueLabel=tracking||accuracy?'%':'/phút';pace+=`<rect x="${left+3}" y="${180-v/top*152}" width="${Math.max(1,width-6)}" height="${Math.max(1,v/top*152)}" rx="3" fill="var(--chart-main)"><title>${b.start/1000}–${number(end/1000)}s: ${number(v)}${valueLabel} · ${tracking?number(b.on/1000)+' / '+number(b.valid/1000)+'s trên mục tiêu':b.hits+' trúng / '+b.shots+' phát'}</title></rect>`+label(left+width/2,Math.max(20,171-v/top*152),number(v));});
 document.getElementById('pace-chart').innerHTML=pace;
 describe('pace-caption',tracking?'% thời gian tâm nằm trong hình cầu trên thời gian hợp lệ. — nghĩa là không có dữ liệu.':accuracy?'Số phát trúng / tổng phát trong từng khoảng. — nghĩa là không bắn; không được tính là 0% độ chính xác.':'Số trúng quy đổi theo phút từ thời lượng từng khoảng. Rê chuột lên cột để xem số phát thực; các khoảng ngắn dễ dao động.');
 const shotsView=document.getElementById('heat-kind')?.value==='shots',peak=Math.max(0,...d.cells);let heat='';
 const px=v=>300+v/extent*240,py=v=>116-v/(extent*.6)*96;
 let validShots=0,shotOutside=0,shownHits=0,shownMisses=0;
 d.cells.forEach((v,i)=>{const col=i%25,row=Math.floor(i/25),cx=60+col*19.2,cy=20+row*12.8;const color=shotsView||!v?'var(--heat-empty)':`hsl(${190-175*Math.sqrt(v/peak)} 85% ${64-15*v/peak}%)`;heat+=`<rect x="${cx}" y="${cy}" width="18.6" height="12.2" rx="1.5" fill="${color}"><title>${number(-extent+col*extent*2/25)}° đến ${number(-extent+(col+1)*extent*2/25)}° ngang · ${(v/1000).toFixed(3)}s (${d.located?(100*v/d.located).toFixed(1):0}% thời gian có tọa độ)</title></rect>`;});
 heat+='<path d="M300 20V212M60 116H540" class="chart-cross" stroke-dasharray="4 4"/>';
 if(shotsView){for(const s of run.shots||[]){if(!finite(s.aimX)||!finite(s.aimY))continue;validShots++;if(Math.abs(s.aimX)>extent||Math.abs(s.aimY)>extent*.6){shotOutside++;continue;}if(s.hit)shownHits++;else shownMisses++;heat+=`<circle cx="${px(s.aimX)}" cy="${py(s.aimY)}" r="3.3" fill="${s.hit?'var(--chart-main)':'var(--danger)'}" fill-opacity=".8" stroke="var(--panel)" stroke-width=".7"><title>${number(s.t/1000)}s · ${s.hit?'trúng':'trượt'} · ngang ${number(s.aimX)}°, dọc ${number(s.aimY)}°</title></circle>`;}
 if(!validShots)heat+=label(300,95,tracking?'Bài tracking không ghi phát bắn':'Chưa có tọa độ phát bắn');}
 heat+=`<circle cx="300" cy="116" r="4" fill="none" stroke="var(--chart-text)" stroke-width="1.5"/>`+label(60,235,'−'+extent+'°')+label(300,235,'0° · tâm mục tiêu')+label(540,235,'+'+extent+'°')+label(52,28,'+'+number(extent*.6)+'°','end')+label(52,216,'−'+number(extent*.6)+'°','end');
 if(!shotsView){for(let i=0;i<80;i++)heat+=`<rect x="${170+i*3.25}" y="259" width="3.5" height="8" fill="hsl(${190-175*Math.sqrt(i/79)} 85% ${64-15*i/79}%)"/>`;heat+=label(162,268,'0s','end')+label(438,268,(peak/1000).toFixed(2)+'s / ô','start');}
 else heat+=label(300,267,`● Xanh: ${shownHits} trúng · Đỏ: ${shownMisses} trượt trong vùng`);
 document.getElementById('heatmap-chart').innerHTML=heat;
 describe('heatmap-summary',shotsView?`${validShots} phát có tọa độ · ${shotOutside} ngoài vùng · ${(run.shots||[]).length-validShots} thiếu tọa độ`:`${number(d.inside/1000)}s trong vùng · ${number(d.outside/1000)}s ngoài vùng · ${number(d.located/1000)}s có tọa độ hợp lệ`);
 describe('heatmap-caption',shotsView?'Mỗi chấm là hướng tâm ngắm so với tâm mục tiêu lúc bắn. Trái/phải, trên/dưới thể hiện vị trí lệch; không tự kết luận overshoot hay sens sai. Đây không phải mô phỏng đạn/recoil.':'Tâm mục tiêu ở giữa. Ô bên trái nghĩa là tâm ngắm đang ở bên trái mục tiêu. Màu ấm = ở ô đó lâu hơn, không đồng nghĩa tệ hơn. Thang màu tự đổi theo ô có thời gian cao nhất; không so màu trực tiếp giữa hai phiên.');
}
