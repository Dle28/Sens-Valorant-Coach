export function createCombatHud(shell){
 const root=document.createElement('div');root.className='combat-overlay';root.hidden=true;
 root.innerHTML='<canvas class="combat-minimap" width="220" height="220" aria-label="Minimap site"></canvas><div class="combat-vitals"><span>HEALTH</span><strong class="vital-number">100</strong><div class="vital-tracks"><i class="hp-track"></i><i class="shield-track"></i></div><b class="shield-number">50 SH</b></div><div class="damage-vignette"></div>';
 shell.append(root);const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),flash=root.querySelector('.damage-vignette');let hurtAt=-Infinity;
 return {damage(){hurtAt=performance.now();},update({active,site,player,yaw,enemies,objective,now}){
  root.hidden=!active;if(!active)return;
  root.querySelector('.vital-number').textContent=player.health;root.querySelector('.shield-number').textContent=`${player.shield} SH`;
  root.querySelector('.hp-track').style.width=`${player.health}%`;root.querySelector('.shield-track').style.width=`${player.shield*2}%`;
  root.classList.toggle('critical',player.health<=30);flash.style.opacity=Math.max(0,1-(now-hurtAt)/650)*.8;
  ctx.clearRect(0,0,220,220);ctx.fillStyle='#07151deb';ctx.fillRect(0,0,220,220);
  const scale=3.7/(site.worldScale??1),x=v=>110+v*scale,z=v=>22+(v+31*(site.worldScale??1))*scale;
  if(site.rooms){ctx.fillStyle='#172d34';for(const r of site.rooms)ctx.fillRect(x(r.x-r.width/2),z(r.z-r.depth/2),r.width*scale,r.depth*scale);}
  ctx.fillStyle='#334956';for(const p of site.platforms??[])ctx.fillRect(x(p.x-p.width/2),z(p.z-p.depth/2),p.width*scale,p.depth*scale);
  ctx.fillStyle='#82959c';for(const b of site.cover)ctx.fillRect(x(b.position[0]-b.size[0]/2),z(b.position[2]-b.size[2]/2),b.size[0]*scale,b.size[2]*scale);
  const zone=site.plantZone;ctx.strokeStyle='#e9be70';ctx.strokeRect(x(zone.x-zone.width/2),z(zone.z-zone.depth/2),zone.width*scale,zone.depth*scale);
  if(objective?.phase==='planted'){ctx.fillStyle='#ffe08b';ctx.fillRect(x(objective.position.x)-3,z(objective.position.z)-3,6,6);}
  ctx.fillStyle='#ff5964';for(const e of enemies){ctx.beginPath();ctx.arc(x(e.x),z(e.z),3,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.translate(x(player.position.x),z(player.position.z));ctx.rotate(-yaw);ctx.fillStyle='#72f4e0';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,4);ctx.lineTo(4,4);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle='#c0d9df';ctx.font='10px sans-serif';ctx.fillText('SITE / N ↑',9,14);
 }};
}
