import {insideFootprint} from './maps/shared/footprint.js';
import {seededUnit} from './enemy-behavior.js';
import {terrainHeight} from './maps/shared/traversal.js';
const cache=new WeakMap();
// Authored sites include reachable upper surfaces; generic sites retain ground routes.
export function navigationEdge(site,from,to){
 if(!site.authoredTraversal)return true;
 const count=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.08);
 let previous=terrainHeight(site,from.x,from.z);
 for(let i=1;i<=count;i++){
  const t=i/count,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t,h=terrainHeight(site,x,z);
  if(!insideFootprint(site,x,z)||Math.abs(h-previous)>.18001||site.cover.some(b=>h<b.position[1]+b.size[1]/2-.01&&Math.abs(x-b.position[0])<b.size[0]/2+.32&&Math.abs(z-b.position[2])<b.size[2]/2+.32))return false;
  previous=h;
 }
 return true;
}
export function navigationGrid(site){
 if(cache.has(site))return cache.get(site);
 const nodes=new Map();
 const bounds=site.bounds??{minX:-25,maxX:25,minZ:-31,maxZ:16};
 for(let x=Math.ceil(bounds.minX+1);x<=bounds.maxX-1;x++)for(let z=Math.ceil(bounds.minZ+1);z<=bounds.maxZ-1;z++){
  const height=terrainHeight(site,x,z);
  if(!insideFootprint(site,x,z)||(!site.authoredTraversal&&height>.01)||site.cover.some(b=>height<b.position[1]+b.size[1]/2-.01&&Math.abs(x-b.position[0])<b.size[0]/2+.55&&Math.abs(z-b.position[2])<b.size[2]/2+.55))continue;
  nodes.set(`${x},${z}`,{x,y:1.6+terrainHeight(site,x,z),z});
 }
 cache.set(site,nodes);return nodes;
}
export function planBotRoute(site,position,player,seed,turn){
 const grid=navigationGrid(site),nodes=[...grid.values()];
 const start=nodes.reduce((a,b)=>Math.hypot(b.x-position.x,b.z-position.z)<Math.hypot(a.x-position.x,a.z-position.z)?b:a);
 if(!start)return [];
 const key=p=>`${p.x},${p.z}`,queue=[start],parents=new Map([[key(start),null]]);
 for(let i=0;i<queue.length;i++)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const next=grid.get(`${queue[i].x+dx},${queue[i].z+dz}`);
  if(next&&!parents.has(key(next))&&navigationEdge(site,queue[i],next)){parents.set(key(next),queue[i]);queue.push(next);}
 }
 const candidates=queue.filter(p=>{const travel=Math.hypot(p.x-position.x,p.z-position.z),range=Math.hypot(p.x-player.x,p.z-player.z);return travel>3&&travel<10&&range>5&&range<30*(site.worldScale??1);});
 const nearCover=p=>site.cover.some(b=>Math.abs(p.x-b.position[0])<b.size[0]/2+2&&Math.abs(p.z-b.position[2])<b.size[2]/2+2);
 const preferred=candidates.filter(nearCover),pool=preferred.length?preferred:candidates.length?candidates:queue.filter(p=>Math.hypot(p.x-position.x,p.z-position.z)>3);
 if(!pool.length)return [];
 let node=pool[Math.floor(seededUnit(seed,turn*97)*pool.length)],path=[];
 while(node){path.push(node);node=parents.get(key(node));}
 return path.reverse();
}
