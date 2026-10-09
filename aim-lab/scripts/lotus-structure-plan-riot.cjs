const {app,BrowserWindow}=require('electron');const {fork}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(app.getPath('temp'),'lotus-plan-'+process.pid));let server;
app.whenReady().then(async()=>{
 server=fork(path.join(__dirname,'../server.mjs'),[],{env:{...process.env,PORT:'4195',ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j)});
 const w=new BrowserWindow({show:false,webPreferences:{offscreen:true}});await w.loadURL('http://localhost:4195');
 const data=await w.webContents.executeJavaScript(`(async()=>{
 const {default:after}=await import('/src/maps/garden/sites/b/layout.js');const {default:before}=await import('/output/lotus-structure-before/aim-lab/src/maps/garden/sites/b/layout.js');
 const c=document.createElement('canvas');c.width=800;c.height=1120;const g=c.getContext('2d');g.fillStyle='#12262c';g.fillRect(0,0,800,1120);g.fillStyle='#edf6f4';g.font='bold 30px sans-serif';g.fillText('LOTUS B — CẤU TRÚC PHÒNG',35,46);g.font='18px sans-serif';g.fillText('Cùng hướng sơ đồ Riot: attacker trên · defender dưới',35,81);
 const draw=(site,left,title)=>{const scale=13.5,X=x=>left+375-x*scale,Z=z=>120+(12-z)*scale;
 g.fillStyle='#8bd8cf';g.font='bold 23px sans-serif';g.fillText(title,left+35,122);
 const rect=(r,color)=>{g.fillStyle=color;g.fillRect(X(r.x+r.width/2),Z(r.z+r.depth/2),r.width*scale,r.depth*scale)};
 for(const r of site.rooms)rect(r,'#69818a');
 const p=site.pit;for(let i=0;i<=p.steps;i++){g.beginPath();g.arc(X(p.x),Z(p.z),(p.radius-i*(p.radius-p.innerRadius)/p.steps)*scale,0,Math.PI*2);g.fillStyle=i%2?'#284b57':'#315664';g.fill();}
 for(const p of site.platforms)rect(p,'#b7a776');for(const r of site.ramps)rect(r,'#998963');
 for(const b of site.cover)rect({x:b.position[0],z:b.position[2],width:b.size[0],depth:b.size[2]},b.walkable?'#b7a776':b.detail==='lotus-crate'?'#8d7152':'#263b42');
 g.fillStyle='#70f0ae';g.beginPath();g.arc(X(site.objectivePosition.x),Z(site.objectivePosition.z),5,0,7);g.fill();
 site.rooms.forEach((r,i)=>{g.fillStyle='#07191f';g.beginPath();g.arc(X(r.x),Z(r.z),10,0,7);g.fill();g.fillStyle='white';g.font='bold 11px sans-serif';g.textAlign='center';g.fillText(i+1,X(r.x),Z(r.z)+4);});g.textAlign='left';
 g.strokeStyle='#c8dedb';g.lineWidth=2;g.beginPath();g.moveTo(left+45,760);g.lineTo(left+45+5*scale,760);g.stroke();g.font='14px sans-serif';g.fillStyle='#d8e8e6';g.fillText('6,75 m runtime',left+45,782);
 g.font='15px sans-serif';site.rooms.forEach((r,i)=>g.fillText((i+1)+'. '+r.name,left+35+(i>=7?370:0),835+(i%7)*30));
 };
 draw(after,0,'BẢN MỚI · LINKED CHAMBERS');
 g.font='16px sans-serif';g.fillStyle='#adc7c6';g.fillText('Sàn xanh · Bệ vàng · Mục tiêu xanh lá · Dữ liệu layout/collision',35,1091);
 return c.toDataURL('image/png').split(',')[1];})()`,true);
 fs.writeFileSync(path.join(__dirname,'../output/lotus-b-structure-plan-riot.png'),Buffer.from(data,'base64'));server.kill();app.exit(0);
}).catch(e=>{console.error(e);server?.kill();app.exit(1)});


