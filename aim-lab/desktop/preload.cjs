const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gamesenDesktop',Object.freeze({
 platform:process.platform,
 saveSession:session=>ipcRenderer.invoke('gamesen:save-session',session),
 ready:status=>ipcRenderer.send('gamesen:ready',{webgl:status?.webgl===true,desktop:true}),
}));
