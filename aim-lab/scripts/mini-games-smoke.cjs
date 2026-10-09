// Isolated renderer integration test. Pointer lock is simulated, not a mouse hardware test.
const {app,BrowserWindow}=require('electron');
const {fork}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
app.setPath('userData',path.join(app.getPath('temp'),'v-aim-minigames-'+process.pid));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let server;
app.whenReady().then(async()=>{
 server=fork(path.join(__dirname,'../server.mjs'),[],{env:{...process.env,PORT:'4192',ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const errors=[];
 win.webContents.on('console-message',event=>{if(event.level==='error'){errors.push(event.message);console.error('RENDERER',event.message);}});
 await win.loadURL('http://127.0.0.1:4192/');
 const exec=code=>win.webContents.executeJavaScript(`(()=>{try{${code}}catch(error){console.error(error.stack);throw error;}})()`,true);
 await exec(`window.__saved=[];window.gamesenDesktop={saveSession:async text=>window.__saved.push(JSON.parse(text)),ready:()=>{}};
 let locked=null,full=null;Object.defineProperty(document,'pointerLockElement',{get:()=>locked});Object.defineProperty(document,'fullscreenElement',{get:()=>full});
 document.exitPointerLock=()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'));};
 document.exitFullscreen=async()=>{full=null;};
 document.querySelector('#range-canvas').requestPointerLock=async function(){locked=this;};
 document.querySelector('#range-shell').requestFullscreen=async function(){full=this;};undefined;`);
 for(const mode of ['figure8','pendulum','zigzag','stopgo','ladder','snap']){
  await exec(`document.querySelector('.sidebar-route[data-route="scenario"]').click();
   const selector=document.querySelector('[data-config="gameMode"]');selector.value='${mode}';selector.dispatchEvent(new Event('change'));
   if(!document.querySelector('[data-config="behavior"]').disabled)throw new Error('Motion override still enabled');
   if(!document.querySelector('[data-mode-brief]').textContent.length)throw new Error('Missing mode instructions');
   document.querySelector('[data-launch]').click();`);
  await wait(5300);
  await exec(`document.querySelector('#end-btn').click();`);
  await wait(150);
 }
 const records=await exec('return window.__saved;');
 assert.equal(records.length,6);
 for(const run of records){
  assert.ok(run.frames.length>10,run.config.task+' telemetry');
  assert.equal(run.config.scenario.gameMode,run.config.task);
  if(['figure8','pendulum','zigzag','stopgo'].includes(run.config.task))assert.ok(new Set(run.frames.map(frame=>frame.target.join(','))).size>5,run.config.task+' movement');
  if(run.config.task==='snap'){
   assert.equal(run.config.deadlineMs,1375);
   assert.ok(run.trials.some(trial=>trial.outcome==='timeout'));
  }
 }
 await exec(`document.querySelector('.sidebar-route[data-route="practice"]').click();
  const select=document.querySelector('#challenge-select');if(select.options.length!==8)throw new Error('Missing challenges');
  select.value='flash';select.dispatchEvent(new Event('change'));document.querySelector('#start-btn').click();`);
 await wait(4000);
 await exec(`document.querySelector('#end-btn').click();`);
 const challenge=await exec('return window.__saved.at(-1);');
 assert.equal(challenge.config.task,'snap');assert.equal(challenge.config.scenario,null);
 await exec(`document.querySelector('.sidebar-route[data-route="scenario"]').click();`);
 await wait(350);
 assert.equal(await exec('return document.querySelector("#scenario-view").hidden;'),false);
 const output=path.join(__dirname,'../output');fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'mini-games-briefing.png'),(await win.webContents.capturePage()).toPNG());
 assert.deepEqual(errors,[]);
 console.log('MINI_GAMES_SMOKE '+JSON.stringify(records.map(r=>({task:r.config.task,frames:r.frames.length,trials:r.trials.length,deadline:r.config.deadlineMs}))));
 server.kill();app.exit(0);
}).catch(error=>{console.error(error);server?.kill();app.exit(1);});
