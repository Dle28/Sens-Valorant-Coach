export function addTraversal(site){
 if(site.authoredTraversal)return site;
 site.plantZone={x:0,z:-5,width:7,depth:6};
 site.entrances=[{name:'WEST ENTRY',x:-14,z:9,width:6},{name:'MAIN ENTRY',x:0,z:9,width:6},{name:'EAST ENTRY',x:14,z:9,width:6}];
 site.platforms=[{x:21,z:-13,width:8,depth:18,height:3},{x:-21,z:-13,width:8,depth:18,height:1.8}];
 if(site.interior){site.platforms=[{x:21,z:-12,width:6,depth:16,height:2.4},{x:-21,z:-11,width:6,depth:14,height:1.8}];}
 site.ramps=site.platforms.map(p=>({x:p.x,z:1,width:8,depth:10,height:p.height}));
 for(const [x,w] of (site.interior?[[-7,8],[7,8]]:[[-21,8],[-7,8],[7,8],[21,8]]))site.cover.push({position:[x,1.6,9],size:[w,3.2,1]});
 return site;
}
export function terrainHeight(site,x,z){
 let height=0;
 if(site.pit){const p=site.pit,r=Math.hypot(x-p.x,z-p.z);if(r<p.radius)height=-p.depth*Math.min(p.steps,Math.floor((p.radius-r)/((p.radius-p.innerRadius)/p.steps))+1)/p.steps;}
 for(const p of site.platforms??[])if(Math.abs(x-p.x)<=p.width/2&&Math.abs(z-p.z)<=p.depth/2)height=Math.max(height,p.height);
 for(const r of site.ramps??[])if(Math.abs(x-r.x)<=r.width/2&&Math.abs(z-r.z)<=r.depth/2)height=Math.max(height,r.height*(r.riseToward==='south'?z-r.z+r.depth/2:r.z+r.depth/2-z)/r.depth);
 for(const b of site.cover??[])if(b.walkable&&Math.abs(x-b.position[0])<=b.size[0]/2&&Math.abs(z-b.position[2])<=b.size[2]/2)height=Math.max(height,b.position[1]+b.size[1]/2);
 return height;
}
export function renderTraversal(site,block){
 for(const p of site.platforms??[]){
  block(p.x,p.height/2,p.z,p.width,p.height,p.depth,site.color);
  // Outer boundary wall encloses this ledge; inner edge allows jumping down.
 }
 for(const r of site.ramps??[]){
  // Fine stair treads follow the walkable ramp surface, with <= 6 cm steps.
  const count=60;for(let i=0;i<count;i++){const h=r.height*(i+.5)/count,sign=r.riseToward==='south'?1:-1;block(r.x,h/2,r.z+sign*((i+.5)*r.depth/count-r.depth/2),r.width,h,r.depth/count,site.color);}
 }
 const p=site.plantZone;
 if(p)for(const x of [-1,1]){block(p.x+x*p.width/2,(p.height??0)+.035,p.z,.08,.025,p.depth,0xe9ba69);block(p.x,(p.height??0)+.035,p.z+x*p.depth/2,p.width,.025,.08,0xe9ba69);}
 for(const gate of site.entrances??[]){
  if(site.authoredTraversal)continue; // The site scene owns correctly oriented lintels.
  block(gate.x,3.4,gate.z,gate.width,.3,1.1,site.accent);
  for(const side of [-1,1])block(gate.x+side*(gate.width/2-.1),1.6,gate.z,.15,3.2,1.05,site.accent);
 }
}
