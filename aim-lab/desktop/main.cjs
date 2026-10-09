const { app, BrowserWindow, Menu, protocol, session, ipcMain, dialog, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { localPage, assetFor, sessionPayload } = require('./policy.cjs');
const smoke = process.argv.includes('--smoke-test');
// Smoke checks use an isolated profile; they never read the user's training history.
if (smoke) app.setPath('userData',path.join(app.getPath('temp'),'gamesen-smoke-'+process.pid));
app.setName('V-AIM COACH');
protocol.registerSchemesAsPrivileged([{scheme:'gamesen',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let win;
const sessionDirectory=()=>path.join(app.getPath('userData'),'sessions');
const localLakeDirectory=()=>path.join(app.getPath('userData'),'data-lake');
const importedModelDirectory=()=>path.join(app.getPath('userData'),'models');
const importedModels=Object.freeze({weapon:'vandal-valorant.glb',agent:'sas-cs2-blue.glb'});
const trustedSender=event=>win&&!win.isDestroyed()&&event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame&&localPage(event.senderFrame.url);
if(!app.requestSingleInstanceLock())app.quit();
else {
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
 app.whenReady().then(async()=>{
  const ses=session.defaultSession;
  ses.protocol.handle('gamesen',async request=>{
   const asset=assetFor(request.url);
   if(!asset||request.method!=='GET')return new Response('Not found',{status:404});
   try {
    const modelName=asset.startsWith('assets/models/')?path.basename(asset):null;
    const installed=modelName&&Object.values(importedModels).includes(modelName)?path.join(importedModelDirectory(),modelName):null;
    let data;
    try{data=await fs.readFile(installed??path.join(__dirname,'../dist',asset));}
    catch{data=await fs.readFile(path.join(__dirname,'../dist',asset));}
    const type=asset.endsWith('.js')?'text/javascript':asset.endsWith('.css')?'text/css':asset.endsWith('.png')?'image/png':asset.endsWith('.glb')?'model/gltf-binary':asset.endsWith('.ttf')?'font/ttf':'text/html';
    return new Response(data,{headers:{'Content-Type':type+(type.startsWith('text/')?'; charset=utf-8':''),'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-src 'none'",'X-Content-Type-Options':'nosniff'}});
   }catch{return new Response('Missing application asset',{status:404});}
  });
  const permissions=new Set(['pointerLock','fullscreen']);
  ses.setPermissionRequestHandler((contents,permission,callback,details)=>callback(contents===win?.webContents&&localPage(contents.getURL())&&details.isMainFrame!==false&&permissions.has(permission)));
  ses.setPermissionCheckHandler((contents,permission,origin)=>contents===win?.webContents&&localPage(origin)&&permissions.has(permission));
  ses.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!localPage(details.url)&&!details.url.startsWith('data:')&&!details.url.startsWith('blob:gamesen://app/')}));
  win=new BrowserWindow({width:1440,height:960,minWidth:1000,minHeight:720,title:'V-AIM COACH',icon:path.join(__dirname,'app.png'),backgroundColor:'#07131D',show:!smoke&&!process.argv.includes('--data-smoke'),webPreferences:{offscreen:process.argv.includes('--data-smoke'),backgroundThrottling:!process.argv.includes('--data-smoke'),preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!localPage(url))event.preventDefault();});
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  win.webContents.setZoomFactor(1);
  win.webContents.on('before-input-event',(event,input)=>{if((input.control||input.meta)&&['+','-','=','0'].includes(input.key))event.preventDefault();});
  ses.on('will-download',(event,item,contents)=>{
   if(contents!==win.webContents||!/^gamesen-[a-zA-Z0-9-]+\.(json|csv)$/.test(item.getFilename())){event.preventDefault();return;}
   item.setSaveDialogOptions({title:'Lưu dữ liệu phiên tập',defaultPath:path.join(app.getPath('downloads'),item.getFilename())});
  });
  const {assessSession}=await import('../src/data-contract.js');
  const {ingestRawSession}=await import('../src/data-lake.js');
  let saveQueue=Promise.resolve();
  const persist=(event,payload,checkpoint=false)=>{
   if(!trustedSender(event))throw new Error('Invalid sender');
   const checked=sessionPayload(payload,{checkpoint});
   const work=saveQueue.then(async()=>{
    const data=JSON.parse(checked.text);
    if(process.argv.includes('--data-smoke'))data.isSynthetic=true;
    const quality=assessSession(data,{checkpoint});
    // Native validation never trusts a renderer-supplied eligibility flag.
    data.quality=quality;
    const directory=path.join(sessionDirectory(),checkpoint?'checkpoints':quality.structurallyValid?'raw':'quarantine');
    await fs.mkdir(directory,{recursive:true});
    const destination=path.join(directory,checked.id+'.json'),temporary=destination+'.tmp';
    const text=JSON.stringify(data);
    await fs.writeFile(temporary,text,{encoding:'utf8',mode:0o600});await fs.rename(temporary,destination);
    let dataLake={state:'not-requested'};
    if(!checkpoint){
     const manifest={schemaVersion:data.schemaVersion,sessionId:data.id,sha256:createHash('sha256').update(text).digest('hex'),configSha256:createHash('sha256').update(JSON.stringify(data.config)).digest('hex'),bytes:Buffer.byteLength(text),quality};
     await fs.writeFile(destination+'.manifest.tmp',JSON.stringify(manifest,null,2),'utf8');await fs.rename(destination+'.manifest.tmp',destination+'.manifest.json');
     await fs.rm(path.join(sessionDirectory(),'checkpoints',checked.id+'.json'),{force:true});
     try{dataLake=await ingestRawSession({run:data,text,sourceManifest:manifest,lakeDirectory:localLakeDirectory(),source:'desktop-auto-sync'});}catch(error){dataLake={state:'error',reason:error.message};console.error('Local data lake sync failed:',error);}
    }
    return {saved:true,quarantined:!quality.structurallyValid,quality,dataLake};
   });
   saveQueue=work.catch(()=>{});return work;
  };
  ipcMain.handle('gamesen:save-session',(event,payload)=>persist(event,payload));
  ipcMain.handle('gamesen:checkpoint',(event,payload)=>persist(event,payload,true));
  ipcMain.handle('gamesen:import-model',async(event,slot)=>{
   if(!trustedSender(event)||!Object.hasOwn(importedModels,slot))throw new Error('Invalid model import request');
   const result=await dialog.showOpenDialog(win,{title:slot==='weapon'?'Chọn Vandal GLB':'Chọn SAS agent GLB',buttonLabel:'Nạp model',properties:['openFile'],filters:[{name:'Binary glTF',extensions:['glb']}]});
   if(result.canceled||!result.filePaths[0])return {cancelled:true};
   const source=result.filePaths[0],info=await fs.stat(source);
   if(!info.isFile()||info.size<20||info.size>100*1024*1024)throw new Error('GLB phải là tệp từ 20 byte đến 100 MiB.');
   const header=Buffer.alloc(4);const handle=await fs.open(source,'r');try{await handle.read(header,0,4,0);}finally{await handle.close();}
   if(header.toString('ascii')!=='glTF')throw new Error('Tệp không phải GLB hợp lệ.');
   await fs.mkdir(importedModelDirectory(),{recursive:true});
   await fs.copyFile(source,path.join(importedModelDirectory(),importedModels[slot]));
   return {cancelled:false,name:importedModels[slot],bytes:info.size};
  });
  ipcMain.on('gamesen:ready',async(event,status)=>{
   if(!trustedSender(event))return;
   if(smoke){
    try{
     const ui=await win.webContents.executeJavaScript(`(async()=>{await document.fonts.ready;const faces=await document.fonts.load('16px "Be Vietnam Pro"');const maps=['garden','piazza','atrium','foundry'].flatMap(id=>['entry','court','overview'].map(view=>id+'-'+view)).concat(['range-lotus','range-dark','temple-relief-v1','foundry-panel-v1','piazza-mosaic-v1','atrium-window-v1']);await Promise.all(maps.map(async name=>{const img=new Image();img.src='gamesen://app/assets/maps/'+name+'.png';await img.decode();}));return {mapImagesLoaded:maps.length,interfaceLoaded:getComputedStyle(document.querySelector('.training-hero')).backgroundImage.includes('garden-overview'),fontLoaded:faces.length>0&&faces.every(face=>face.status==='loaded')};})()`);
     console.log('GAMESEN_SMOKE '+JSON.stringify({loaded:true,webgl:status?.webgl===true,desktop:status?.desktop===true,...ui,electron:process.versions.electron}));app.exit(status?.webgl===true&&ui.interfaceLoaded&&ui.fontLoaded?0:2);
    }catch(error){console.error(error);app.exit(2);}
   }
  });
  const openData=async()=>{await fs.mkdir(sessionDirectory(),{recursive:true});await shell.openPath(sessionDirectory());};
  const openLake=async()=>{await fs.mkdir(localLakeDirectory(),{recursive:true});await shell.openPath(localLakeDirectory());};
  Menu.setApplicationMenu(Menu.buildFromTemplate([
   {label:'Ứng dụng',submenu:[{label:'Mở thư mục dữ liệu phiên',click:openData},{label:'Mở data lake cục bộ',click:openLake},{type:'separator'},{role:'quit',label:'Thoát'}]},
   {label:'Hiển thị',submenu:[{label:'Toàn màn hình',accelerator:'F11',click:()=>win.setFullScreen(!win.isFullScreen())}]},
   {label:'Trợ giúp',submenu:[{label:'Về V-AIM COACH',click:()=>dialog.showMessageBox(win,{type:'info',title:'V-AIM COACH',message:'V-AIM COACH '+app.getVersion(),detail:'Phòng tập 3D offline · 16 bài · 4 độ khó · 3 thử thách\nPhiên có consent được đồng bộ vào data lake cục bộ; không gửi dữ liệu ra Internet.\nDPI phần cứng không được đọc tự động.'})}]}
  ]));
  win.on('closed',()=>{win=null;});
  win.webContents.on('render-process-gone',(_event,details)=>{console.error('Renderer stopped:',details.reason);if(smoke)app.exit(3);});
  try{await win.loadURL('gamesen://app/');}catch(error){if(!smoke)throw error;}
  if(smoke)setTimeout(()=>{console.error('GAMESEN_SMOKE timeout');app.exit(4);},20000).unref();
 }).catch(error=>{console.error(error);app.exit(1);});
 app.on('window-all-closed',()=>app.quit());
}
