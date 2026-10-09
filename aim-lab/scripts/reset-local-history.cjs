// Explicit maintenance action: remove only training summaries from the app origin.
// Settings and other Chromium storage are preserved. Run with the regular app closed.
const {app,session}=require('electron');
process.argv.push('--data-smoke');
app.on('browser-window-created',(_e,win)=>win.webContents.once('did-finish-load',async()=>{
 try{
  const result=await win.webContents.executeJavaScript("localStorage.removeItem('gamesen.sessions');localStorage.setItem('gamesen.dataVersion','0.4');({remaining:localStorage.getItem('gamesen.sessions'),profilePreserved:localStorage.getItem('gamesen.profile')!==null})");
  session.defaultSession.flushStorageData();console.log('HISTORY_RESET',JSON.stringify(result));app.quit();
 }catch(e){console.error(e);app.exit(1);}
}));
require('../desktop/main.cjs');
