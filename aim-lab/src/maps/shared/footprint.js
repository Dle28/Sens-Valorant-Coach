export function insideFootprint(site,x,z,margin=0){
 if(!site.rooms)return true;
 return site.rooms.some(r=>Math.abs(x-r.x)<=r.width/2-margin&&Math.abs(z-r.z)<=r.depth/2-margin);
}
