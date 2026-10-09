// Original, meter-scale coaching layouts. Pure timeline/occlusion model shared
// by the renderer and tests; these demonstrations never write player scores.
const v=(x,z,y=0)=>[x,y,z];
const box=(x,z,w,d,h=3)=>({position:[x,h/2,z],size:[w,h,d]});
const key=(t,position,aim,label,fire=false)=>({t,position,aim,label,fire});
const foe=(id,position,keys=null)=>({id,position,keys});
const corner=[box(-5,1,5,4,3.2),box(4,-7,3,1,1),box(-.5,-3,2,2,1.1)];
const site=[box(0,0,6,4,3.5),box(-6,7,8,1,3),box(6,7,8,1,3),box(-6,-5,2,2,1),box(6,-6,3,3,2.8)];
const held=v(5,-6),edge=v(-3.33,4),start=v(-4.2,4);
const lesson=(id,title,goal,cover,enemies,keys,extra={})=>({id,title,goal,cover,enemies,keys,duration:keys.at(-1).t, ...extra});
export const TACTICAL_LESSONS=[
 lesson('01-wide-swing','Wide Swing vs Hold Angle','Ra xa góc rồi dừng: buộc người giữ góc chỉnh tâm ngang nhiều hơn.',corner,[foe('A',held)],[key(0,start,edge,'Ẩn sau góc'),key(1.2,start,held,'Chuẩn bị'),key(2,v(-3.3,4.1),held,'Tăng tốc ngang'),key(3,v(-1.5,4.8),held,'Mở rộng đường chạy'),key(3.8,v(.5,4.5),held,'Counter-strafe'),key(4.5,v(.5,4.5),held,'Dừng ổn định'),key(5.2,v(.5,4.5),held,'Bắn',true)],{hold:edge,dimension:[v(-2.5,4.5),v(.5,4.5)]}),
 lesson('02-jiggle-peek','Jiggle Peek / Information','Lộ ngắn để lấy thông tin, đảo hướng và trở về cover.',corner,[foe('A',held)],[key(0,start,held,'Trong cover'),key(1,v(-3.15,4),held,'Lộ một phần'),key(1.3,start,held,'Đảo hướng ngay'),key(2.4,start,held,'Đọc thông tin'),key(3.2,v(-3.15,4),held,'Peek ngắn lần hai'),key(3.5,start,held,'Rút vào cover'),key(4.4,start,held,'An toàn')],{hold:edge,peek:true}),
 lesson('03-angle-clearing','Entry + Angle Clearing','Clear trái, phải, góc sâu rồi cao; dùng thùng giữa để tách góc.',site,[foe('A',v(6,-6,2.8))],[key(0,v(0,8.2),v(-5,5),'Cửa vào'),key(1.2,v(-1,6),v(-5,5),'1 · Close-left'),key(2.4,v(1,6),v(5,5),'2 · Close-right'),key(3.8,v(3.6,3),v(5,-4),'Tiến sát cover'),key(5,v(3.6,.5),v(5,-4),'3 · Back-site'),key(6,v(3.6,-2.5),v(6,-6,2.8),'4 · Góc cao'),key(6.8,v(3.6,-2.5),v(6,-6,2.8),'Xác nhận rồi bắn',true)]),
 lesson('04-off-angle','Off-angle Acquisition','Pre-aim góc quen → phát hiện lệch góc → flick → chỉnh nhỏ.',[box(-4,0,3,4),box(5,-6,2,1,1)], [foe('A',v(5,-5))],[key(0,v(0,6),v(0,-6),'Pre-aim góc quen'),key(1.5,v(0,4),v(0,-6),'Phát hiện off-angle'),key(2.2,v(1,3.5),v(4.5,-5),'Flick lấy mục tiêu'),key(3,v(1,3.5),v(4.85,-5),'Dừng di chuyển'),key(3.8,v(1,3.5),v(5,-5),'Micro-correction'),key(4.6,v(1,3.5),v(5,-5),'Bắn',true)],{expected:v(0,-6),correction:'large'}),
 lesson('05-counter-strafe','Counter-strafe Duel','Di chuyển → phanh → đứng ổn định → bắn.',[box(-7,3,2,4,1.5),box(7,-4,2,4,1.5)],[foe('A',v(3,-5),[key(0,v(3,-5)),key(2,v(0,-5)),key(2.6,v(-.4,-5)),key(5,v(-.4,-5))])],[key(0,v(-3,4),v(3,-5),'Strafe phải'),key(2,v(0,4),v(0,-5),'Phát hiện địch'),key(2.6,v(.4,4),v(-.4,-5),'Đảo phím / phanh'),key(3.5,v(.4,4),v(-.4,-5),'Ổn định'),key(4.1,v(.4,4),v(-.4,-5),'Bắn chính xác',true),key(5,v(.4,4),v(-.4,-5),'Reset')],{duel:true}),
 lesson('06-shoulder-peek','Hold Angle vs Shoulder Peek','Chỉ lộ vai để nhử phát bắn; đầu và tâm vẫn ở trong cover.',corner,[foe('A',held)],[key(0,start,held,'Trong cover'),key(1.5,v(-3.5,4),held,'Chỉ lộ vai'),key(1.7,v(-3.5,4),held,'Nhử địch bắn'),key(2,start,held,'Rút ngay'),key(3.5,start,held,'Cover an toàn')],{hold:edge,peek:true,bait:true}),
 lesson('07-micro-adjustment','Micro-adjustment After Pre-aim','Chỉnh rất nhỏ quanh đầu; giữ vị trí và xác nhận tâm.',[box(-3,3,2,2,1.3),box(3,-4,2,1,1)], [foe('A',v(2,-3))],[key(0,v(-1,4),v(1.85,-3),'Pre-aim sát đầu'),key(1.5,v(-1,4),v(1.85,-3),'Thấy lệch nhỏ'),key(2.3,v(-1,4),v(2,-3),'Micro-correction'),key(3,v(-1,4),v(2,-3),'Đầu đã thẳng tâm'),key(3.7,v(-1,4),v(2,-3),'Bắn',true)],{expected:v(1.85,-3),correction:'small'}),
 lesson('08-target-switch','Target Switch','Xác nhận A → chuyển góc lớn → ổn định tâm trên B.',[box(-3,3,2,2,1.2),box(5,-5,3,3,2.8)],[foe('A',v(-5,-3)),foe('B',v(5,-5,2.8))],[key(0,v(0,5),v(-5,-3),'Lấy mục tiêu A'),key(1.5,v(0,5),v(-5,-3),'Bắn A',true),key(2.4,v(0,5),v(-5,-3),'Phát hiện B'),key(3.2,v(.5,4.8),v(4.7,-5,2.8),'Chuyển tâm sang B'),key(4,v(.5,4.8),v(5,-5,2.8),'Ổn định trên B'),key(4.8,v(.5,4.8),v(5,-5,2.8),'Bắn B',true)],{switch:true}),
 lesson('09-vertical-transition','Vertical Angle Transition','Vừa đi ngang vừa đưa tâm lên vị trí cao.',[box(-6,1,2,3,1.6),box(2,-5,5,3,3)],[foe('A',v(2,-4,3))],[key(0,v(-3,5),v(2,-4),'Pre-aim ngang'),key(1.4,v(-1.5,5),v(2,-4),'Nhận ra cao độ'),key(2.5,v(0,5),v(2,-4,2.7),'Đưa tâm lên'),key(3.2,v(0,5),v(2,-4,3),'Lấy mục tiêu cao'),key(4,v(0,5),v(2,-4,3),'Bắn',true)],{expected:v(2,-4),vertical:true}),
 lesson('10-retake','Retake / Multi-angle Entry','Dùng cover giữa để lần lượt tách hai góc; tránh cắt thẳng sân.',[box(0,0,5,5,3.5),box(-7,-5,2,2,1),box(7,-5,2,2,1)],[foe('A',v(-6,-5)),foe('B',v(6,-5))],[key(0,v(0,7),v(-6,-5),'Tiếp cận'),key(1.5,v(-3.4,4),v(-6,-5),'Tách góc A'),key(2.2,v(-3.4,3),v(-6,-5),'Bắn A',true),key(3.3,v(-2,4),v(-6,-5),'Trở về cover'),key(4.5,v(2,4),v(6,-5),'Đổi phía sau cover'),key(5.5,v(3.4,3),v(6,-5),'Tách góc B'),key(6.2,v(3.4,3),v(6,-5),'Bắn B',true)],{retake:true}),
];

export const head=p=>[p[0],p[1]+1.55,p[2]];
export const lerp=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
export function sampleKeys(keys,time){
 const t=Math.max(0,Math.min(Number.isFinite(time)?time:0,keys.at(-1).t));
 let index=0;while(index<keys.length-1&&keys[index+1].t<=t)index++;
 const a=keys[index],b=keys[index+1]??a,raw=b.t>a.t?(t-a.t)/(b.t-a.t):0;
 const eased=raw*raw*(3-2*raw),position=lerp(a.position,b.position,eased);
 const speed=b.t>a.t?Math.hypot(...a.position.map((x,i)=>b.position[i]-x))*6*raw*(1-raw)/(b.t-a.t):0;
 return {position,aim:a.aim&&b.aim?lerp(a.aim,b.aim,eased):a.aim,label:a.label,index,speed,fire:!!a.fire&&t-a.t<.35};
}

// Slab intersection clips each ray at the first actual cover boundary.
export function sightline(from,to,cover){
 let fraction=1;
 for(const obstacle of cover){
  let lo=0,hi=1;
  for(let axis=0;axis<3;axis++){
   const min=obstacle.position[axis]-obstacle.size[axis]/2,max=obstacle.position[axis]+obstacle.size[axis]/2,d=to[axis]-from[axis];
   if(Math.abs(d)<1e-9){if(from[axis]<min||from[axis]>max){lo=2;break;}}
   else{const a=(min-from[axis])/d,b=(max-from[axis])/d;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
  }
  if(lo<=hi&&hi>1e-5&&lo<1-1e-5)fraction=Math.min(fraction,Math.max(0,lo));
 }
 return {visible:fraction>=1-1e-5,end:lerp(from,to,fraction),fraction};
}
export function sampleLesson(lesson,time){
 const player=sampleKeys(lesson.keys,time);
 const enemies=lesson.enemies.map(enemy=>{
  const pose=enemy.keys?sampleKeys(enemy.keys,time):{position:enemy.position,speed:0};
  const los=sightline(head(pose.position),head(player.position),lesson.cover);
  const exposed=[-.28,0,.28].filter(offset=>sightline(head(pose.position),head([player.position[0]+offset,player.position[1],player.position[2]]),lesson.cover).visible).length/3;
  const active=lesson.switch?(enemy.id==='A'?time<2.1:time>=2.1):true;
  // Moving opponents must settle before an accurate shot. Shoulder bait is
  // deliberately aimed at the exposed body sample, not through the wall.
  const canFire=active&&(lesson.bait?exposed>0:los.visible)&&pose.speed<.12&&time>1;
  return {...enemy,...pose,los,exposed,active,canFire};
 });
 return {player,enemies,time:Math.max(0,Math.min(time,lesson.duration))};
}
