// Integration harness: simulated pointer-lock/fullscreen and keyboard input.
// Runs an isolated Electron profile; never reads or writes player history.
const {app,BrowserWindow}=require('electron');
const path=require('node:path');const fs=require('node:fs');
app.setPath('userData',path.join(app.getPath('temp'),'v-aim-site-smoke-'+process.pid));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1440,height:900,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const errors=[];win.webContents.on('console-message',(_e,...args)=>{if(args[0]===3)errors.push(args[1]);});
 await win.loadURL('http://localhost:4173/');
 const exec=code=>win.webContents.executeJavaScript(code,true);
 await exec(`window.__saved=[];window.gamesenDesktop={saveSession:async text=>window.__saved.push(JSON.parse(text)),ready:()=>{}};
 let locked=null,full=null;Object.defineProperty(document,'pointerLockElement',{get:()=>locked});Object.defineProperty(document,'fullscreenElement',{get:()=>full});
 document.exitPointerLock=()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'));};document.exitFullscreen=async()=>{full=null;};
 document.querySelector('#range-canvas').requestPointerLock=async function(){locked=this;};document.querySelector('#range-shell').requestFullscreen=async function(){full=this;this.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999';};undefined;`);
 for(const [mode,site] of [['site','garden'],['readmove','piazza'],['site','atrium'],['readmove','foundry']]){
  await exec(`document.querySelector('[data-route="tactics"]').click();document.querySelector('#site-layout').value='${site}';document.querySelector('[data-site-play="${mode}"]').click();`);
  await wait(4200);
  const status=await exec(`document.querySelector('#range-state').textContent`);if(status!=='Đang tập')throw new Error('Session failed: '+status);
  await exec(`document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}));document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));document.dispatchEvent(new MouseEvent('mousedown',{button:0}));`);await wait(900);
  await exec(`document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}));for(let i=0;i<3;i++)document.dispatchEvent(new MouseEvent('mousedown',{button:0}));`);
  await wait(500);await exec(`document.dispatchEvent(new MouseEvent('mouseup',{button:0}));document.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));`);
  fs.mkdirSync(path.join(__dirname,'../output'),{recursive:true});
  fs.writeFileSync(path.join(__dirname,'../output',site+'-fps-smoke.png'),(await win.webContents.capturePage()).toPNG());
  await exec(`document.querySelector('#end-btn').click();`);await wait(400);
 }
 const records=await exec('window.__saved');
 fs.writeFileSync(path.join(__dirname,'../output/site-smoke-records.json'),JSON.stringify(records));
 for(const run of records){
  if(!run.frames.length||!run.shots.length||!run.frames.some(f=>f.player?.position.z<-.5)||!run.frames.some(f=>f.enemy))throw new Error('Missing movement / shot / enemy telemetry');
  if(run.shots.length<5||!run.frames.some(f=>f.player.position.y>2)||!run.frames.some(f=>f.pitch>.005))throw new Error('Jump / automatic fire / recoil missing');
 }
 if(records.length!==4||errors.length)throw new Error(JSON.stringify({records:records.length,errors}));
 console.log('SITE_SMOKE '+JSON.stringify(records.map(r=>({task:r.config.task,site:r.config.scenario.siteId,frames:r.frames.length,shots:r.shots.length,enemyShots:r.combat.shotsFired}))));app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
