// Reproducible screenshots of the shipped Three.js scenes, never generated artwork.
const {app,BrowserWindow}=require('electron');
const {fork}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(app.getPath('temp'),'v-aim-map-capture-'+process.pid));
let server;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 server=fork(path.join(__dirname,'../server.mjs'),[],{env:{...process.env,PORT:'4199',ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 const win=new BrowserWindow({show:false,width:1600,height:900,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
 await win.loadURL('http://127.0.0.1:4199');
 const run=code=>win.webContents.executeJavaScript(code,true);
 const output=path.join(__dirname,'../src/assets/maps');fs.mkdirSync(output,{recursive:true});
 await run(`document.querySelector('[data-route="practice"]').click();const style=document.createElement('style');style.textContent='html,body{overflow:hidden!important}body *{visibility:hidden!important}#range-shell::after,#range-shell::before{display:none!important}body #range-shell,body #range-shell canvas{visibility:visible!important}body.v-aim-shell-enabled #practice-view.cinematic-menu .range-shell{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;min-height:0!important;max-height:none!important;border:0!important;aspect-ratio:auto!important;z-index:9999}';document.head.append(style);`);
 for(const map of ['lotus','dark']){
  await run(`document.getElementById('map-select').value='${map}';document.getElementById('map-select').dispatchEvent(new Event('change'));`);
  await wait(500);fs.writeFileSync(path.join(output,`range-${map}.png`),(await win.webContents.capturePage()).toPNG());
 }
 await run(`(async()=>{
 const THREE=await import('/node_modules/three/build/three.module.js');const {createSiteWorld}=await import('/src/site-world.js');const {configureRenderer}=await import('/src/maps/shared/render-quality.js');
 const holder=document.createElement('div');holder.style.cssText='position:fixed;inset:0;z-index:100000;visibility:visible!important';document.body.append(holder);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1600,900);renderer.setPixelRatio(1);configureRenderer(renderer);renderer.domElement.style.setProperty('visibility','visible','important');holder.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color();scene.fog=new THREE.FogExp2(0x889899,.005);const camera=new THREE.PerspectiveCamera(65,16/9,.1,150);const world=createSiteWorld(scene);window.__capture={renderer,scene,camera,world};
 })()`);
 const manifest=[];
 for(const site of ['garden','piazza','atrium','foundry']){
  await run(`window.__capture.world.build('${site}')`);
  await run(`Promise.all(window.__capture.world.root.userData.artworkReady??[])`);
  const views=site==='garden'?[['entry',[2.7,1.6,-4.05],[0,1.3,-22.95]],['court',[16.2,1.6,-10.125],[-2.7,1,-17.55]],['overview',[-8,6,-9],[1,.2,-20]]]:[['entry',[0,2.4,8],[2,3,-13]],['court',[-12,3,-4],[5,2,-17]],['overview',[13,6,7],[-3,2,-13]]];
  for(const [view,position,look] of views){
   const stats=await run(`(()=>{const {renderer,scene,camera,world}=window.__capture;camera.position.set(${position});camera.lookAt(${look});renderer.toneMappingExposure=world.renderProfile.exposure;world.update(3200);renderer.render(scene,camera);return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,batching:world.root.userData.batching};})()`);
   await wait(100);fs.writeFileSync(path.join(output,`${site}-${view}.png`),(await win.webContents.capturePage()).toPNG());manifest.push({site,view,position,look,...stats});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.join(output,'capture-manifest.json'),JSON.stringify({source:'Local Three.js map geometry',width:1600,height:900,captures:manifest},null,2));
 console.log('MAP_CAPTURE '+JSON.stringify(manifest));server.kill();app.exit(0);
}).catch(e=>{console.error(e);server?.kill();app.exit(1);});

