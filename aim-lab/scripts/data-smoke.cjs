// Uses production protocol/preload/native persistence with an isolated profile.
const {app}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path');
const assert=require('node:assert/strict');
const profile=path.join(app.getPath('temp'),'v-aim-data-smoke-'+process.pid);
app.setPath('userData',profile);process.argv.push('--data-smoke');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.on('browser-window-created',(_e,win)=>{
 win.webContents.once('did-finish-load',async()=>{
  try{
   const exec=code=>win.webContents.executeJavaScript(code,true);
   await exec(`let locked=null,full=null;Object.defineProperty(document,'pointerLockElement',{get:()=>locked});Object.defineProperty(document,'fullscreenElement',{get:()=>full});
   document.exitPointerLock=()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'));};document.exitFullscreen=async()=>{full=null;};
   document.querySelector('#range-canvas').requestPointerLock=async function(){locked=this;};document.querySelector('#range-shell').requestFullscreen=async function(){full=this;};undefined;`);
   for(const task of ['precision','tracking','site']){
    if(task==='site')await exec(`document.querySelector('[data-route="tactics"]').click();document.querySelector('#site-layout').value='atrium';document.querySelector('[data-site-play="site"]').click();`);
    else await exec(`document.querySelector('[data-task="${task}"]').click();document.querySelector('#difficulty').value='easy';document.querySelector('#assessment-phase').value='baseline';document.querySelector('#start-btn').click();`);
    await wait(3400);
    assert.equal(await exec(`document.querySelector('#range-state').textContent`),'Đang tập');
    await exec(`document.dispatchEvent(new MouseEvent('mousemove',{movementX:12,movementY:4}));document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}));document.dispatchEvent(new MouseEvent('mousedown',{button:0}));`);
    await wait(1100);
    await exec(`document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}));document.dispatchEvent(new MouseEvent('mouseup',{button:0}));`);
    await wait(4400);
    const checkpoints=await fs.readdir(path.join(profile,'sessions','checkpoints'));
    assert.ok(checkpoints.some(f=>f.endsWith('.json')),'periodic checkpoint missing');
    if(task==='precision'){
     const snapshot=JSON.parse(await fs.readFile(path.join(profile,'sessions','checkpoints',checkpoints.find(f=>f.endsWith('.json'))),'utf8'));
     const frame=snapshot.frames.at(-1),[x,y,z]=frame.target.map((v,i)=>v-frame.cameraPosition[i]);
     const gain=snapshot.config.sensitivity*.07*Math.PI/180;
     const dx=Math.round((-Math.atan2(x,-z)-frame.yaw)/-gain),dy=Math.round((Math.atan2(y,Math.hypot(x,z))-frame.pitch)/-gain);
     await exec(`document.dispatchEvent(new MouseEvent('mousemove',{movementX:${dx},movementY:${dy}}));document.dispatchEvent(new MouseEvent('mousedown',{button:0}));document.dispatchEvent(new MouseEvent('mouseup',{button:0}));`);
     await wait(100);
    }
    await exec(`document.querySelector('#end-btn').click();`);await wait(700);
   }
   const {assessSession}=await import('../src/data-contract.js');
   const directory=path.join(profile,'sessions','raw');
   const files=(await fs.readdir(directory)).filter(f=>f.endsWith('.json')&&!f.endsWith('.manifest.json'));
   const runs=[];
   for(const file of files){const run=JSON.parse(await fs.readFile(path.join(directory,file),'utf8'));const q=assessSession(run);assert.equal(q.structurallyValid,true,JSON.stringify(q.errors));assert.equal(run.schemaVersion,'0.4');assert.ok(run.inputEvents.length&&run.controlEvents.length);assert.equal(q.eligibleForSensitivityFit,false);assert.equal(run.isSynthetic,true);assert.equal(q.eligibleForAimEvaluation,false);if(run.config.task==='precision')assert.ok(run.trials.some(t=>t.firstHitMs!==null&&t.hitMs===t.firstHitMs),'first hit timing missing');runs.push({task:run.config.task,frames:run.frames.length,shots:run.shots.length,errors:q.errors});}
   const quarantine=await fs.readdir(path.join(profile,'sessions','quarantine')).catch(()=>[]);
   if(quarantine.length){for(const f of quarantine.filter(f=>f.endsWith('.json')&&!f.endsWith('.manifest.json'))){const r=JSON.parse(await fs.readFile(path.join(profile,'sessions','quarantine',f),'utf8'));console.error('QUARANTINE',r.config.task,JSON.stringify(r.quality.errors));}}
   assert.equal(files.length,3);assert.equal(quarantine.length,0);assert.equal((await fs.readdir(path.join(profile,'sessions','checkpoints'))).length,0);
   console.log('DATA_SMOKE '+JSON.stringify({profile,runs}));app.exit(0);
  }catch(e){console.error(e);console.error('PROFILE',profile);app.exit(1);}
 });
});
require('../desktop/main.cjs');
setTimeout(()=>{console.error('DATA_SMOKE timeout',profile);app.exit(2);},55000).unref();
