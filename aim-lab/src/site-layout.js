import {insideFootprint} from './maps/shared/footprint.js';
import {sightline} from './tactical-lessons.js';
import {seededUnit,enemyMotion} from './enemy-behavior.js';
import {SITES} from './maps/index.js';
import {terrainHeight} from './maps/shared/traversal.js';
import {navigationGrid} from './bot-navigation.js';
export {SITES};
export const SITE_BOUNDS={minX:-25,maxX:25,minZ:-31,maxZ:16};
export const SITE_EXPANSION=1.35;
const expandedSites=new WeakMap();
export function getSite(id){
 const source=SITES[id]??SITES.atrium;
 if(expandedSites.has(source))return expandedSites.get(source);
 const s=SITE_EXPANSION,rect=r=>({...r,x:r.x*s,z:r.z*s,width:r.width*s,depth:r.depth===undefined?undefined:r.depth*s});
 const site={...source,visualLayout:source,worldScale:s,
  cover:source.cover.map(b=>({...b,position:[b.position[0]*s,b.position[1],b.position[2]*s],size:[b.size[0]*s,b.size[1],b.size[2]*s]})),
  rooms:source.rooms?.map(rect),platforms:source.platforms.map(rect),ramps:source.ramps.map(rect),
  entrances:source.entrances.map(rect),plantZone:rect(source.plantZone),spawns:source.spawns.map(([x,z])=>[x*s,z*s]),
  pit:source.pit?{...source.pit,x:source.pit.x*s,z:source.pit.z*s,radius:source.pit.radius*s,innerRadius:source.pit.innerRadius*s}:undefined,
  objectivePosition:source.objectivePosition?{...source.objectivePosition,x:source.objectivePosition.x*s,z:source.objectivePosition.z*s}:undefined,
  starts:source.starts?Object.fromEntries(Object.entries(source.starts).map(([mode,p])=>[mode,{...p,x:p.x*s,z:p.z*s}])):undefined,
  bounds:Object.fromEntries(Object.entries(source.bounds??SITE_BOUNDS).map(([key,value])=>[key,value*s]))};
 expandedSites.set(source,site);return site;
}
export function clearSiteLine(site,from,to){
 if(!sightline([from.x,from.y,from.z],[to.x,to.y,to.z],site.cover).visible)return false;
 const steps=Math.ceil(Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z)/.1);
 for(let i=1;i<steps;i++){const t=i/steps;if(from.y+(to.y-from.y)*t<terrainHeight(site,from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t))return false;}
 return true;
}
export function readMovementPose(options,time){
 const cycle=900,phase=time%cycle,travel=680;
 const pose=enemyMotion(options,Math.floor(time/cycle)*travel+Math.min(phase,travel));
 return {...pose,velocity:phase>=travel?{x:0,y:0,z:0}:pose.velocity};
}
export function slideSite(site,before,next,radius=.32){
 const p={...before};
 const bounds=site.bounds??SITE_BOUNDS;
 const free=q=>insideFootprint(site,q.x,q.z)&&terrainHeight(site,q.x,q.z)<=p.y-1.6+.18&&site.cover.every(b=>q.y-1.6>=b.position[1]+b.size[1]/2-.01||q.x<b.position[0]-b.size[0]/2-radius||q.x>b.position[0]+b.size[0]/2+radius||q.z<b.position[2]-b.size[2]/2-radius||q.z>b.position[2]+b.size[2]/2+radius);
 // Swept substeps prevent crossing a thin obstacle on a delayed frame.
 const n=Math.max(1,Math.ceil(Math.hypot(next.x-before.x,next.z-before.z)/.15));
 for(let i=0;i<n;i++){
  const x={...p,x:Math.max(bounds.minX,Math.min(bounds.maxX,p.x+(next.x-before.x)/n))};if(free(x))p.x=x.x;
  const z={...p,z:Math.max(bounds.minZ,Math.min(bounds.maxZ,p.z+(next.z-before.z)/n))};if(free(z))p.z=z.z;
  p.y=Math.max(p.y,terrainHeight(site,p.x,p.z)+1.6);
 }
 return p;
}
export function siteSpawn(site,seed,wave,index,player){
 if(site.worldScale){
  const nodes=[...navigationGrid(site).values()].filter(p=>Math.hypot(p.x-player.x,p.z-player.z)>4),used=new Set();
  const anchors=site.spawns.map((p,i)=>({p,rank:seededUnit(seed,wave*101+i*7)})).sort((a,b)=>a.rank-b.rank);
  const chosen=[];
  for(const {p} of anchors){
   let best=null,distance=Infinity;
   for(const node of nodes){const d=Math.hypot(node.x-p[0],node.z-p[1]);if(d<distance&&!used.has(node)){distance=d;best=node;}}
   if(best){chosen.push(best);used.add(best);}
  }
  if(chosen.length)return {...chosen[index%chosen.length]};
 }
 const candidates=site.spawns.map((p,i)=>({p,i,rank:seededUnit(seed,wave*101+i*7)})).filter(({p})=>Math.hypot(p[0]-player.x,p[1]-player.z)>4).sort((a,b)=>a.rank-b.rank);
 const chosen=(candidates.length?candidates:site.spawns.map(p=>({p})))[index%Math.max(1,candidates.length)];
 return {x:chosen.p[0],y:terrainHeight(site,chosen.p[0],chosen.p[1])+1.6,z:chosen.p[1]};
}
