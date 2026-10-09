const {app,BrowserWindow}=require('electron');const {fork}=require('node:child_process');const fs=require('node:fs'),path=require('node:path');
app.setPath('userData',path.join(app.getPath('temp'),'appearance-'+process.pid));let server;
app.whenReady().then(async()=>{
 server=fork(path.join(__dirname,'../server.mjs'),[],{env:{...process.env,PORT:'4194',ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});
 const win=new BrowserWindow({show:false,width:1600,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});await win.loadURL('http://localhost:4194');
 const result=await win.webContents.executeJavaScript(`(async()=>{
 const T=await import('/node_modules/three/build/three.module.js');const {createEnemyRig}=await import('/src/enemy-rig.js');const {createEnemyRig:before}=await import('/tests/fixtures/enemy-rig-appearance-before.js');
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1600,1000);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene();scene.background=new T.Color('#17242e');scene.add(new T.HemisphereLight(0xd9efff,0x829394,2.4));const key=new T.DirectionalLight(0xffe8d0,3);key.position.set(-3,4,6);scene.add(key);
 const camera=new T.PerspectiveCamera(35,1.6,.01,40);const rigs=[before(),createEnemyRig()];rigs.forEach((r,i)=>{r.root.visible=true;r.root.position.set(i?.65:-.65,1.6,0);r.root.rotation.y=.3;scene.add(r.root);});
 const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;const ctx=canvas.getContext('2d'),images={};
 for(const [view,position,look] of [['full',[0,1.2,3.6],[0,.85,0]],['close',[0,1.56,2.1],[0,1.34,0]]]){camera.position.set(...position);camera.lookAt(...look);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);ctx.fillStyle='#e6f4f7';ctx.font='bold 28px sans-serif';ctx.fillText('BEFORE',240,60);ctx.fillText('AFTER',1140,60);images[view]=canvas.toDataURL('image/png').split(',')[1];}
 const stats=[];for(const make of [before,createEnemyRig]){const s=new T.Scene();s.add(new T.AmbientLight(0xffffff,2));for(let i=0;i<10;i++){const r=make();r.root.visible=true;r.root.position.set((i%5-2)*.7,1.6,-Math.floor(i/5));s.add(r.root);}camera.position.set(0,2,7);camera.lookAt(0,1,0);renderer.render(s,camera);stats.push({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});}
 return {images,stats};})()`,true);
 const out=process.env.APPEARANCE_OUTPUT||path.join(__dirname,'../output');fs.mkdirSync(out,{recursive:true});for(const [name,data]of Object.entries(result.images))fs.writeFileSync(path.join(out,'character-appearance-'+name+'.png'),Buffer.from(data,'base64'));fs.writeFileSync(path.join(out,'character-appearance-render-counts.json'),JSON.stringify(result.stats,null,2));console.log(JSON.stringify(result.stats));server.kill();app.exit(0);
}).catch(e=>{console.error(e);server?.kill();app.exit(1);});
