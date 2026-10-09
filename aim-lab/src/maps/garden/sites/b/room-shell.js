// Exposed edges of a union of authored rooms. Shared room edges remain open.
// Collision walls and rendered walls use this same list.
export function roomShell(rooms){
 const xs=[...new Set(rooms.flatMap(r=>[r.x-r.width/2,r.x+r.width/2]))].sort((a,b)=>a-b);
 const zs=[...new Set(rooms.flatMap(r=>[r.z-r.depth/2,r.z+r.depth/2]))].sort((a,b)=>a-b);
 const inside=(x,z)=>rooms.some(r=>Math.abs(x-r.x)<r.width/2&&Math.abs(z-r.z)<r.depth/2);
 const horizontal=new Map(),vertical=new Map();
 const edge=(map,key,a,b)=>{if(!map.has(key))map.set(key,[]);map.get(key).push([a,b]);};
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
  const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;
  if(!inside(x,z))continue;
  if(!inside(x,zs[j]-.001))edge(horizontal,zs[j],xs[i],xs[i+1]);
  if(!inside(x,zs[j+1]+.001))edge(horizontal,zs[j+1],xs[i],xs[i+1]);
  if(!inside(xs[i]-.001,z))edge(vertical,xs[i],zs[j],zs[j+1]);
  if(!inside(xs[i+1]+.001,z))edge(vertical,xs[i+1],zs[j],zs[j+1]);
 }
 const walls=[];
 for(const [map,axis] of [[horizontal,'z'],[vertical,'x']])for(const [fixed,spans] of map){
  spans.sort((a,b)=>a[0]-b[0]);const merged=[];
  for(const span of spans){const last=merged.at(-1);if(last&&Math.abs(last[1]-span[0])<1e-6)last[1]=span[1];else merged.push([...span]);}
  for(const [a,b] of merged)walls.push({position:axis==='z'?[(a+b)/2,3.5,fixed]:[fixed,3.5,(a+b)/2],size:axis==='z'?[b-a,7,.7]:[.7,7,b-a],detail:'lotus-wall'});
 }
 return walls;
}
