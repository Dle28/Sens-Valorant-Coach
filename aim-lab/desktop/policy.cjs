const ASSETS = Object.freeze({ '/':'index.html', '/index.html':'index.html', '/main.js':'main.js', '/style.css':'style.css', '/assets/lotus-tactical-sanctum-v1.png':'assets/lotus-tactical-sanctum-v1.png', '/assets/lotus-water-court-v1.png':'assets/lotus-water-court-v1.png', '/assets/dark-signal-lane-v1.png':'assets/dark-signal-lane-v1.png' });
function localPage(url) {
 try { const u=new URL(url);return u.protocol==='gamesen:'&&u.host==='app'&&!u.username&&!u.password; } catch { return false; }
}
function assetFor(url) {
 if(!localPage(url))return null;
 const pathname=new URL(url).pathname;
 if(/^\/assets\/maps\/(?:(?:garden|piazza|atrium|foundry)-(?:entry|court|overview)|range-(?:lotus|dark)|(?:temple-relief|foundry-panel|piazza-mosaic|atrium-window)-v1)\.png$/.test(pathname))return pathname.slice(1);
 if(pathname==='/interface.css')return 'interface.css';
 if([400,600,700,800].some(weight=>pathname===`/assets/fonts/be-vietnam-pro-${weight}.ttf`))return pathname.slice(1);
 const lessonImages=['01-wide-swing','02-jiggle-peek','03-angle-clearing','04-off-angle','05-counter-strafe','06-shoulder-peek','07-micro-adjustment','08-target-switch','09-vertical-transition','10-retake'];
 if(lessonImages.some(id=>pathname===`/assets/tactical/${id}.png`))return pathname.slice(1);
 if(['/assets/models/vandal-valorant.glb','/assets/models/sas-cs2-blue.glb'].includes(pathname))return pathname.slice(1);
 return ASSETS[new URL(url).pathname]||null;
}
function sessionPayload(text, {checkpoint=false}={}) {
 if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>64*1024*1024)throw new Error('Session vượt giới hạn 64 MiB.');
 const data=JSON.parse(text);
 if(!data||typeof data.id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(data.id))throw new Error('Session ID không hợp lệ.');
 if(!['completed','ended-early',...(checkpoint?['in-progress']:[])].includes(data.status)||!data.config||!Array.isArray(data.shots)||!Array.isArray(data.trials)||!Array.isArray(data.frames))throw new Error('Session không hợp lệ.');
 return {id:data.id,text};
}
module.exports={localPage,assetFor,sessionPayload};
