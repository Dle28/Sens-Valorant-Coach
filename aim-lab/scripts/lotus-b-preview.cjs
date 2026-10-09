// Isolated renderer integration test. Pointer lock is simulated, not a mouse hardware test.
const {app,BrowserWindow}=require('electron');
const {fork}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
app.setPath('userData',path.join(app.getPath('temp'),'v-aim-expansion-'+process.pid));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let server;
app.whenReady().then(async()=>{
 server=fork(path.join(__dirname,'../server.mjs'),[],{env:{...process.env,PORT:'4196',ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});
 const win=new BrowserWindow({show:false,width:1600,height:900,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const errors=[];
 win.webContents.on('console-message',event=>{if(event.level==='error'){errors.push(event.message);console.error('RENDERER',event.message);}});
 await win.loadURL('http://127.0.0.1:4196/');
 const exec=code=>win.webContents.executeJavaScript(`(()=>{try{${code}}catch(error){console.error(error.stack);throw error;}})()`,true);


 await win.webContents.executeJavaScript(`(async()=>{
 const THREE=await import('/node_modules/three/build/three.module.js');const {createSiteWorld}=await import('/src/site-world.js');
 const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:999999;background:#14202d';document.body.append(overlay);document.body.style.overflow='hidden';
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1600,900);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;overlay.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color();scene.fog=new THREE.FogExp2(0x889899,.005);const camera=new THREE.PerspectiveCamera(65,16/9,.1,150);const world=createSiteWorld(scene);world.build('garden');
 window.__lotus={renderer,scene,camera,world};
 })()`,true);
 const output=path.join(__dirname,'../output');fs.mkdirSync(output,{recursive:true});
 const captures=[];
 for(const [name,position,look] of [['entry',[0,1.8,-7],[0,2.8,-20]],['court',[7.5,2.6,-11],[-2,2.8,-20]],['overview',[8,5.8,-8],[-1,1,-18]]]){
 await win.webContents.executeJavaScript(`(()=>{const {renderer,scene,camera,world}=window.__lotus;camera.position.set(${position.join(',')});camera.lookAt(${look.join(',')});world.update(3200);renderer.render(scene,camera);})()`,true);await wait(250);
 fs.writeFileSync(path.join(output,'lotus-b-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 const stats=await win.webContents.executeJavaScript('JSON.parse(JSON.stringify(window.__lotus.renderer.info.render))');
 captures.push({site:'garden',view:name,position,look,calls:stats.calls,triangles:stats.triangles});
 }
 fs.writeFileSync(path.join(output,'lotus-b-captures.json'),JSON.stringify({source:'Local Three.js map geometry',width:1600,height:900,captures},null,2));
 const info=await win.webContents.executeJavaScript('JSON.stringify(window.__lotus.renderer.info.render)');assert.deepEqual(errors,[]);console.log('LOTUS_PREVIEW '+info);server.kill();app.exit(0);
}).catch(error=>{console.error(error);server?.kill();app.exit(1);});
