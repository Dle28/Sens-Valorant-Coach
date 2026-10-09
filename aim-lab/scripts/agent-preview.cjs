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
 server=fork(path.join(__dirname,'../server.mjs'),[],{env:{...process.env,PORT:'4195',ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const errors=[];
 win.webContents.on('console-message',event=>{if(event.level==='error'){errors.push(event.message);console.error('RENDERER',event.message);}});
 await win.loadURL('http://127.0.0.1:4195/');
 const exec=code=>win.webContents.executeJavaScript(`(()=>{try{${code}}catch(error){console.error(error.stack);throw error;}})()`,true);

 await win.webContents.executeJavaScript(`(async()=>{
 const THREE=await import('/node_modules/three/build/three.module.js');const {createEnemyRig}=await import('/src/enemy-rig.js');
 const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:999999;background:#14202d';document.body.append(overlay);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1440,1000);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;overlay.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#14202d');const camera=new THREE.PerspectiveCamera(35,1.44,.1,30);camera.position.set(2,2.3,5.8);camera.lookAt(0,1,0);
 scene.add(new THREE.HemisphereLight(0xe6eeff,0x494335,2));const sun=new THREE.DirectionalLight(0xffdec0,3);sun.position.set(-3,6,5);sun.castShadow=true;scene.add(sun);
 const plane=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0x344455,roughness:1}));plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;scene.add(plane);
 for(const [i,variant] of ['sentinel','scout','engineer'].entries()){const rig=createEnemyRig({variant,tint:['#d64d60','#a54d82','#cf7850'][i]});rig.root.position.set((i-1)*1.05,1.6,0);rig.root.visible=true;rig.hitbox.visible=false;scene.add(rig.root);rig.animate({x:0,z:0},.016,1000);}
 renderer.render(scene,camera);
 })()`,true);
 await wait(350);const output=path.join(__dirname,'../output');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'agent-lineup.png'),(await win.webContents.capturePage()).toPNG());assert.deepEqual(errors,[]);console.log('AGENT_PREVIEW passed');server.kill();app.exit(0);
}).catch(error=>{console.error(error);server?.kill();app.exit(1);});
