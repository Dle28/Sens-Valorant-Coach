const ASSETS = Object.freeze({ '/':'index.html', '/index.html':'index.html', '/main.js':'main.js', '/style.css':'style.css' });
function localPage(url) {
 try { const u=new URL(url);return u.protocol==='gamesen:'&&u.host==='app'&&!u.username&&!u.password; } catch { return false; }
}
function assetFor(url) {
 if(!localPage(url))return null;
 return ASSETS[new URL(url).pathname]||null;
}
function sessionPayload(text) {
 if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>64*1024*1024)throw new Error('Session vượt giới hạn 64 MiB.');
 const data=JSON.parse(text);
 if(!data||typeof data.id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(data.id))throw new Error('Session ID không hợp lệ.');
 if(!['completed','ended-early'].includes(data.status)||!data.config||!Array.isArray(data.shots)||!Array.isArray(data.trials)||!Array.isArray(data.frames))throw new Error('Session không hợp lệ.');
 return {id:data.id,text};
}
module.exports={localPage,assetFor,sessionPayload};
