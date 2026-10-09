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
 const scene=new THREE.Scene();scene.background=new THREE.Color();scene.fog=new THREE.FogExp2(0x889899,.005);const camera=new THREE.PerspectiveCamera(70.53,16/9,.1,150);const world=createSiteWorld(scene);world.build('garden');
 window.__lotus={renderer,scene,camera,world};
 const {getSite}=await import('/src/site-layout.js');const {terrainHeight}=await import('/src/maps/shared/traversal.js');const site=getSite('garden'),s=site.worldScale;
 world.setObjective({phase:'planted',position:site.objectivePosition});scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 for(const [x,z] of [[.8,-10.65],[0,-13],[3,-20],[4,-29.3],[4,-24],[6,-12]]){
  ray.set(new THREE.Vector3(x*s,4,z*s),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObjects(scene.children,true).find(h=>h.object.isMesh&&h.object.visible);
  const floor=terrainHeight(site,x*s,z*s);
  if(!hit||Math.abs(hit.point.y-floor)>.07)throw new Error('render/terrain mismatch '+[x,z,floor,hit?.point.y]);
 }
 })()`,true);
 const output=path.join(__dirname,'../output');fs.mkdirSync(output,{recursive:true});
 const captures=[];
 for(const [name,position,look] of [['entry',[2.7,1.6,-4.05],[0,1.3,-22.95]],['a-link',[16.2,1.6,-10.125],[-2.7,1,-17.55]],['c-link',[-14.85,1.6,-24.3],[2.7,1.4,-18.9]],['overview',[-8,6,-9],[1,.2,-20]],['upper',[5.4,2.95,-31.05],[0,.7,-13.5]],['riot-angle',[4.05,2.95,-22.95],[-2.7,1.6,-6.75]]]){
 await win.webContents.executeJavaScript(`(()=>{const {renderer,scene,camera,world}=window.__lotus;camera.position.set(${position.join(',')});camera.lookAt(${look.join(',')});world.update(3200);renderer.render(scene,camera);})()`,true);await wait(250);
 fs.writeFileSync(path.join(output,'lotus-b-structure-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 const stats=await win.webContents.executeJavaScript('JSON.parse(JSON.stringify(window.__lotus.renderer.info.render))');
 captures.push({site:'garden',view:name,position,look,calls:stats.calls,triangles:stats.triangles});
 }
 fs.writeFileSync(path.join(output,'lotus-b-structure-captures.json'),JSON.stringify({source:'Local Three.js map geometry',width:1600,height:900,captures},null,2));
 const info=await win.webContents.executeJavaScript('JSON.stringify(window.__lotus.renderer.info.render)');assert.deepEqual(errors,[]);console.log('LOTUS_PREVIEW '+info);server.kill();app.exit(0);
}).catch(error=>{console.error(error);server?.kill();app.exit(1);});




