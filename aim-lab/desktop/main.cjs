const { app, BrowserWindow, Menu, protocol, session, ipcMain, dialog, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { localPage, assetFor, sessionPayload } = require('./policy.cjs');
const smoke = process.argv.includes('--smoke-test');
// Smoke checks use an isolated profile; they never read the user's training history.
if (smoke) app.setPath('userData',path.join(app.getPath('temp'),'gamesen-smoke-'+process.pid));
app.setName('Gamesen Aim Lab');
protocol.registerSchemesAsPrivileged([{scheme:'gamesen',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let win;
const sessionDirectory=()=>path.join(app.getPath('userData'),'sessions');
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
    const data=await fs.readFile(path.join(__dirname,'../dist',asset));
    const type=asset.endsWith('.js')?'text/javascript':asset.endsWith('.css')?'text/css':'text/html';
    return new Response(data,{headers:{'Content-Type':type+'; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'",'X-Content-Type-Options':'nosniff'}});
   }catch{return new Response('Missing application asset',{status:404});}
  });
  const permissions=new Set(['pointerLock','fullscreen']);
  ses.setPermissionRequestHandler((contents,permission,callback,details)=>callback(contents===win?.webContents&&localPage(contents.getURL())&&details.isMainFrame!==false&&permissions.has(permission)));
  ses.setPermissionCheckHandler((contents,permission,origin)=>contents===win?.webContents&&localPage(origin)&&permissions.has(permission));
  ses.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!localPage(details.url)&&!details.url.startsWith('data:')&&!details.url.startsWith('blob:gamesen://app/')}));
  win=new BrowserWindow({width:1440,height:960,minWidth:1000,minHeight:720,title:'Gamesen Aim Lab',icon:path.join(__dirname,'app.png'),backgroundColor:'#eeeee7',show:!smoke,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!localPage(url))event.preventDefault();});
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  win.webContents.setZoomFactor(1);
  win.webContents.on('before-input-event',(event,input)=>{if((input.control||input.meta)&&['+','-','=','0'].includes(input.key))event.preventDefault();});
  ses.on('will-download',(event,item,contents)=>{
   if(contents!==win.webContents||!/^gamesen-[a-zA-Z0-9-]+\.(json|csv)$/.test(item.getFilename())){event.preventDefault();return;}
   item.setSaveDialogOptions({title:'Lưu dữ liệu phiên tập',defaultPath:path.join(app.getPath('downloads'),item.getFilename())});
  });
  ipcMain.handle('gamesen:save-session',async(event,payload)=>{
   if(!trustedSender(event))throw new Error('Invalid sender');
   const checked=sessionPayload(payload),directory=sessionDirectory();
   await fs.mkdir(directory,{recursive:true});
   const destination=path.join(directory,checked.id+'.json'),temporary=destination+'.tmp';
   await fs.writeFile(temporary,checked.text,{encoding:'utf8',mode:0o600});
   await fs.rename(temporary,destination);
   return {saved:true};
  });
  ipcMain.on('gamesen:ready',(event,status)=>{
   if(!trustedSender(event))return;
   if(smoke){console.log('GAMESEN_SMOKE '+JSON.stringify({loaded:true,webgl:status?.webgl===true,desktop:status?.desktop===true,electron:process.versions.electron}));app.exit(status?.webgl===true?0:2);}
  });
  const openData=async()=>{await fs.mkdir(sessionDirectory(),{recursive:true});await shell.openPath(sessionDirectory());};
  Menu.setApplicationMenu(Menu.buildFromTemplate([
   {label:'Ứng dụng',submenu:[{label:'Mở thư mục dữ liệu phiên',click:openData},{type:'separator'},{role:'quit',label:'Thoát'}]},
   {label:'Hiển thị',submenu:[{label:'Toàn màn hình',accelerator:'F11',click:()=>win.setFullScreen(!win.isFullScreen())}]},
   {label:'Trợ giúp',submenu:[{label:'Về Gamesen Aim Lab',click:()=>dialog.showMessageBox(win,{type:'info',title:'Gamesen Aim Lab',message:'Gamesen Aim Lab '+app.getVersion(),detail:'Phòng tập 3D offline · 7 bài · 3 thử thách\nSens hip-fire VALORANT theo preset.\nLưu dữ liệu trên máy; không kết nối VALORANT.\nDPI phần cứng không được đọc tự động.'})}]}
  ]));
  win.on('closed',()=>{win=null;});
  win.webContents.on('render-process-gone',(_event,details)=>{console.error('Renderer stopped:',details.reason);if(smoke)app.exit(3);});
  await win.loadURL('gamesen://app/');
  if(smoke)setTimeout(()=>{console.error('GAMESEN_SMOKE timeout');app.exit(4);},20000).unref();
 }).catch(error=>{console.error(error);app.exit(1);});
 app.on('window-all-closed',()=>app.quit());
}
