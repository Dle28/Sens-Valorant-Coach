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
 server=fork(path.join(__dirname,'../server.mjs'),[],{env:{...process.env,PORT:'4198',ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const errors=[];
 win.webContents.on('console-message',event=>{if(event.level==='error'){errors.push(event.message);console.error('RENDERER',event.message);}});
 await win.loadURL('http://127.0.0.1:4198/');
 const exec=code=>win.webContents.executeJavaScript(`(()=>{try{${code}}catch(error){console.error(error.stack);throw error;}})()`,true);


 await win.webContents.executeJavaScript(`(async()=>{
 const THREE=await import('/node_modules/three/build/three.module.js');const {createViewWeapon}=await import('/src/weapon-view.js');const {loadModel,fitModel}=await import('/src/models/model-library.js');
 const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:999999';document.body.append(overlay);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1440,1000);renderer.toneMapping=THREE.ACESFilmicToneMapping;overlay.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#263340');const camera=new THREE.PerspectiveCamera(65,1.44,.01,100);scene.add(camera);scene.add(new THREE.HemisphereLight(0xffffff,0x556677,3));
 const weapon=createViewWeapon(camera,'vandal');await weapon.ready;weapon.setSkin('blaster-a');weapon.update(1000,true,0);
 const crate=await loadModel('crate-medium'),model=fitModel(crate.scene,1.5);model.position.set(-.9,-.1,-3);scene.add(model);const mixer=new THREE.AnimationMixer(crate.scene);mixer.clipAction(crate.animations.find(c=>c.name==='open-close')).play();mixer.setTime(.5);
 window.__models={renderer,scene,camera,weapon,mixer,crate};renderer.render(scene,camera);
 })()`,true);
 const output=path.join(__dirname,'../output');fs.mkdirSync(output,{recursive:true});
 for(const [i,skin]of ['original','blaster-a','blaster-r','blaster-n'].entries()){
 await exec(`const {renderer,scene,camera,weapon}=window.__models;weapon.setSkin('${skin}');weapon.update(1000,true,0);renderer.render(scene,camera);`);await wait(150);fs.writeFileSync(path.join(output,'model-'+skin+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 const authoredCheck=await exec(`const {weapon}=window.__models;weapon.setSkin('original');const model=weapon.rig.getObjectByName('authored-vandal');const visible=model.visible;weapon.fire(1000);weapon.update(1000,true,0);const bolt=model.getObjectByName('charging-handle').position.z;weapon.update(2000,true,0);const rest=model.getObjectByName('charging-handle').position.z;weapon.setEquipment(2,'vandal');const sidearmHidden=!model.visible;weapon.setEquipment(3,'vandal');const knifeHidden=!model.visible;weapon.setEquipment(1,'vandal');return {visible,bolt,rest,sidearmHidden,knifeHidden,restored:model.visible};`);
 assert.ok(authoredCheck.visible&&authoredCheck.sidearmHidden&&authoredCheck.knifeHidden&&authoredCheck.restored);assert.ok(authoredCheck.bolt>authoredCheck.rest);await exec(`window.__models.weapon.setSkin('blaster-n');`);
 const check=await exec(`const {weapon,mixer}=window.__models;const imported=weapon.rig.getObjectByName('imported-weapon');const count=imported.children.length;weapon.fire(1000);weapon.update(1000,true,0);const kicked=weapon.rig.position.z;weapon.update(2000,true,0);const rested=weapon.rig.position.z;weapon.setEquipment(3,'vandal');const hidden=!imported.visible;weapon.setEquipment(1,'vandal');return {count,kicked,rested,hidden,shown:imported.visible};`);
 const animation=await exec("const {crate,mixer}=window.__models;const lid=crate.scene.getObjectByName('lid');mixer.setTime(0);const before=lid.quaternion.clone();mixer.setTime(.5);return before.angleTo(lid.quaternion);");assert.ok(animation>.01,'crate lid must animate');
 await win.webContents.executeJavaScript(`(async()=>{const THREE=await import('/node_modules/three/build/three.module.js');const {createAuthoredVandal}=await import('/src/models/authored-vandal.js');const {renderer}=window.__models;const scene=new THREE.Scene();scene.background=new THREE.Color('#17232e');const model=createAuthoredVandal();scene.add(model);scene.add(new THREE.HemisphereLight(0xe4f1ff,0x7c8995,3));const key=new THREE.DirectionalLight(0xffeddb,4);key.position.set(2,3,-1);scene.add(key);const camera=new THREE.PerspectiveCamera(32,1.44,.01,20);camera.position.set(2.4,.65,.75);camera.lookAt(0,-.1,-.36);renderer.render(scene,camera);})()`,true);
 await wait(150);fs.writeFileSync(path.join(output,'vandal-authored-detail.png'),(await win.webContents.capturePage()).toPNG());
 assert.equal(check.count,3);assert.ok(check.kicked>check.rested);assert.ok(check.hidden&&check.shown);assert.deepEqual(errors,[]);console.log('MODELS_SMOKE '+JSON.stringify(check));server.kill();app.exit(0);
}).catch(error=>{console.error(error);server?.kill();app.exit(1);});
