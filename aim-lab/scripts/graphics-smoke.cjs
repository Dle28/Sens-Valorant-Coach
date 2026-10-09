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
 server=fork(path.join(__dirname,'../server.mjs'),[],{env:{...process.env,PORT:'4194',ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const errors=[];
 win.webContents.on('console-message',event=>{if(event.level==='error'){errors.push(event.message);console.error('RENDERER',event.message);}});
 await win.loadURL('http://127.0.0.1:4194/');
 const exec=code=>win.webContents.executeJavaScript(`(()=>{try{${code}}catch(error){console.error(error.stack);throw error;}})()`,true);
 await exec(`window.__saved=[];window.gamesenDesktop={saveSession:async text=>window.__saved.push(JSON.parse(text)),saveCheckpoint:async text=>{window.__checkpoint=JSON.parse(text);},ready:()=>{}};
 let locked=null,full=null;Object.defineProperty(document,'pointerLockElement',{get:()=>locked});Object.defineProperty(document,'fullscreenElement',{get:()=>full});
 document.exitPointerLock=()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'));};
 document.exitFullscreen=async()=>{full=null;};
 document.querySelector('#range-canvas').requestPointerLock=async function(){locked=this;};
 document.querySelector('#range-shell').requestFullscreen=async function(){full=this;};undefined;`);

 for(const site of ['garden','piazza','atrium','foundry']){
 await exec(`document.querySelector('[data-route="tactics"]').click();document.querySelector('#site-layout').value='${site}';document.querySelector('#site-skin').value='${process.env.MODEL_SKIN||'original'}';document.querySelector('[data-site-play="site"]').click();`);
 const deadline=Date.now()+20000;
 while(Date.now()<deadline){if(await exec('return document.querySelector("#range-state").textContent;')==='Đang tập')break;await wait(250);}
 await wait(1600);
 const status=await exec('return document.querySelector("#range-state").textContent;');assert.equal(status,'Đang tập');
 const output=path.join(__dirname,'../output');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'graphics-'+site+'.png'),(await win.webContents.capturePage()).toPNG());
 await exec('document.querySelector("#end-btn").click();');await wait(250);
 }
 const runs=await exec('return window.__saved;');assert.equal(runs.length,4);assert.ok(runs.every(r=>r.frames.length>20));assert.deepEqual(errors,[]);console.log('GRAPHICS_SMOKE '+JSON.stringify(runs.map(r=>({site:r.config.scenario.siteId,frames:r.frames.length,frameMedian:r.summary.frameMedianMs}))));server.kill();app.exit(0);
}).catch(error=>{console.error(error);server?.kill();app.exit(1);});
