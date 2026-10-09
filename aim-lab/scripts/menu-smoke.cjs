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
 server=fork(path.join(__dirname,'../server.mjs'),[],{env:{...process.env,PORT:'4197',ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const errors=[];
 win.webContents.on('console-message',event=>{if(event.level==='error'){errors.push(event.message);console.error('RENDERER',event.message);}});
 await win.loadURL('http://127.0.0.1:4197/');
 const exec=code=>win.webContents.executeJavaScript(`(()=>{try{${code}}catch(error){console.error(error.stack);throw error;}})()`,true);


 const output=path.join(__dirname,'../output');fs.mkdirSync(output,{recursive:true});
 const shots=[];
 for(const [name,width,height,route,theme] of [['home',1440,1000,'home','dark'],['combat',1440,1000,'tactics','dark'],['home-light',1280,900,'home','light'],['home-small',800,1000,'home','dark'],['combat-small',600,900,'tactics','dark']]){
  win.setContentSize(width,height);
  await exec(`document.documentElement.dataset.theme='${theme}';document.querySelector('[data-route="${route}"]').click();window.scrollTo(0,0);`);
  await wait(450);
  const layout=await exec(`return {width:innerWidth,scroll:document.documentElement.scrollWidth,heading:document.querySelector('.view:not([hidden]) h1')?.textContent,buttons:document.querySelectorAll('[data-site-play]').length};`);
  assert.ok(layout.scroll<=layout.width+1,name+' horizontal overflow '+JSON.stringify(layout));
  fs.writeFileSync(path.join(output,'menu-'+name+'.png'),(await win.webContents.capturePage()).toPNG());shots.push({name,...layout});
 }
 await exec(`document.querySelector('[data-route="home"]').click();document.querySelector('.menu-launch[data-route="practice"]').click();`);
 assert.equal(await exec(`return !document.getElementById('practice-view').hidden;`),true);
 assert.deepEqual(errors,[]);console.log('MENU_SMOKE '+JSON.stringify(shots));server.kill();app.exit(0);
}).catch(error=>{console.error(error);server?.kill();app.exit(1);});
