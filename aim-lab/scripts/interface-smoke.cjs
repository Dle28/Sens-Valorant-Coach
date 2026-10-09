// Runs in an isolated hidden Electron renderer against the production bundle.
const {app,BrowserWindow}=require('electron');
const {fork}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
app.setPath('userData',path.join(app.getPath('temp'),'v-aim-interface-'+process.pid));
let server;
app.whenReady().then(async()=>{
  server=fork(path.join(__dirname,'../server.mjs'),['--dist'],{env:{...process.env,PORT:'4198',ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',()=>reject(Error('Preview server exited')));});
  const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
  const errors=[];
  win.webContents.on('console-message',event=>{if(event.level==='error'){errors.push(event.message);console.error(event.message);}});
  await win.loadURL('http://127.0.0.1:4198');
  const run=code=>win.webContents.executeJavaScript(code,true);
  await run('document.fonts.ready');
  assert.equal(await run(`document.fonts.check('16px "Be Vietnam Pro"')`),true);
  const output=path.join(__dirname,'../output');fs.mkdirSync(output,{recursive:true});
  const routes=['home','tactics','practice','map','scenario','playlists','analytics','profile','preferences','history','dpi'];
  const results=[];
  for(const width of [1440,800,390]){
    win.setContentSize(width,1000);
    for(const route of routes){
      await run(`document.querySelector('[data-route="${route}"]').click();window.scrollTo(0,0)`);
      await new Promise(resolve=>setTimeout(resolve,90));
      const layout=await run(`({route:document.querySelector('.view:not([hidden])').id,width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('.view:not([hidden]) *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(0,6).map(e=>e.className)})`);
      assert.equal(layout.route,route+'-view');
      if(layout.scroll>layout.width+1){fs.writeFileSync(path.join(output,'interface-overflow.png'),(await win.webContents.capturePage()).toPNG());console.log(await run(`JSON.stringify([...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+8).map(e=>({tag:e.tagName,id:e.id,cls:e.className,sw:e.scrollWidth,cw:e.clientWidth})).slice(0,20))`));}
      assert.ok(layout.scroll<=layout.width+1,`${width} ${route}: ${JSON.stringify(layout)}`);
      results.push({width,route});
      if(['home','tactics','map','scenario','practice','playlists'].includes(route))fs.writeFileSync(path.join(output,`interface-${route}-${width}.png`),(await win.webContents.capturePage()).toPNG());
    }
  }
  await run(`document.querySelector('.navigation-toggle').click()`);
  assert.equal(await run(`document.querySelector('.navigation-toggle').getAttribute('aria-expanded')`),'true');
  await run(`document.querySelector('.sidebar-route[data-route="map"]').click()`);
  assert.equal(await run(`document.querySelector('.navigation-toggle').getAttribute('aria-expanded')`),'false');
  await run(`document.querySelector('.navigation-toggle').click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  assert.equal(await run(`document.activeElement.className`),'navigation-toggle');
  await run(`document.querySelector('[data-route="home"]').click();document.querySelector('.period-pill').click()`);
  assert.equal(await run(`document.getElementById('history-view').hidden`),false);
  for(const theme of ['light','dark']){
    await run(`document.getElementById('theme-select').value='${theme}';document.getElementById('theme-select').dispatchEvent(new Event('change'))`);
    assert.equal(await run('document.documentElement.dataset.theme'),theme);
    assert.ok(await run(`parseFloat(getComputedStyle(document.getElementById('theme-toggle')).fontSize)>=12`));
  }
  await run(`document.querySelector('[data-route="tactics"]').click()`);
  for(const map of ['garden','piazza','atrium','foundry']){
    await run(`document.querySelector('[data-capture-map="${map}"]').click()`);
    assert.equal(await run(`document.querySelector('#site-layout').value`),map);
    for(const view of ['entry','court','overview']){
      await run(`document.querySelector('[data-capture-view="${view}"]').click();document.querySelector('.site-selected-preview img').decode()`);
      assert.ok(await run(`document.querySelector('.site-selected-preview img').src.endsWith('${map}-${view}.png')`));
    }
  }
  await run(`document.querySelector('[data-route="preferences"]').click()`);
  for(const quality of ['high','performance','balanced']){
    await run(`(()=>{const q=document.querySelector('#render-quality');q.value='${quality}';q.dispatchEvent(new Event('change'));})()`);
    assert.equal(await run(`localStorage.getItem('gamesen.render-quality')`),quality);
  }
  await run(`document.querySelector('[data-route="playlists"]').click();document.querySelector('[data-routine="warmup"]').focus()`);
  await new Promise(resolve=>setTimeout(resolve,1100));
  assert.equal(await run(`document.activeElement.dataset.routine`),'warmup','Catalog keeps keyboard focus across timer ticks');
  await run(`document.querySelector('[data-routine="warmup"]').click()`);
  assert.equal(await run(`document.getElementById('practice-view').hidden`),false);
  assert.equal(await run(`document.querySelector('.routine-panel').hidden`),false);
  win.setContentSize(1440,1000);win.webContents.setZoomFactor(1.5);
  await run(`document.querySelector('[data-route="home"]').click()`);
  assert.ok(await run(`document.documentElement.scrollWidth<=innerWidth+1`),'Zoom reflow');
  win.webContents.setZoomFactor(1);
  assert.deepEqual(errors,[]);
  console.log('INTERFACE_SMOKE '+JSON.stringify({routes:results.length,mobileMenu:true,historyAction:true,fontLoaded:true,themes:true,zoom:true,errors}));
  server.kill();app.exit(0);
}).catch(error=>{console.error(error);server?.kill();app.exit(1);});
