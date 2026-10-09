import * as THREE from 'three';
// Deterministic, code-authored surface maps: no downloaded texture assets.
export function surfaceTexture(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const c=canvas.getContext('2d');c.fillStyle='#d7d5cc';c.fillRect(0,0,256,256);
 let seed=9147;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<6500;i++){const value=Math.floor(150+random()*90);c.fillStyle=`rgba(${value},${value},${value},.18)`;c.fillRect(random()*256,random()*256,random()*3+1,1);}
 c.strokeStyle=kind==='metal'?'#999e9d':'#a8a69b';c.lineWidth=1.5;
 if(kind==='metal'){
  for(let x=8;x<256;x+=32){c.strokeRect(x,8,24,240);for(const y of [15,240]){c.fillStyle='#7a807e';c.beginPath();c.arc(x+12,y,2,0,Math.PI*2);c.fill();}}
 }else{
  for(let y=0;y<256;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();for(let x=(y/64)%2?64:0;x<256;x+=128){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+64);c.stroke();}}
 }
 if(kind==='ancient'){
  // Exposed stone beneath patchy plaster, mineral streaks and branching fissures.
  for(let i=0;i<55;i++){
   const x=random()*256,y=random()*256,r=5+random()*23;
   c.fillStyle=i%3?'rgba(173,155,121,.065)':'rgba(139,130,101,.045)';c.beginPath();
   for(let j=0;j<9;j++){const a=j/9*Math.PI*2,rr=r*(.5+random()*.5);c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();
  }
  c.strokeStyle='rgba(98,94,81,.22)';c.lineWidth=.8;
  for(let i=0;i<12;i++){let x=random()*256,y=random()*220;c.beginPath();c.moveTo(x,y);for(let j=0;j<5;j++){x+=random()*14-7;y+=4+random()*10;c.lineTo(x,y);if(j===2){c.lineTo(x+9,y+3);c.moveTo(x,y);}}c.stroke();}
  for(let i=0;i<35;i++){const x=random()*256,y=random()*256;c.fillStyle='rgba(66,79,45,.045)';c.fillRect(x,y,2+random()*7,12+random()*30);}
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;return texture;
}

// Independent linear-data maps; colour textures must never double as normal maps.
export function surfaceMaps(kind){
 const map=surfaceTexture(kind),size=384,height=new Float32Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const grain=(Math.sin(x*.91+y*1.37)+Math.sin(x*2.7-y*.81))*.018;
  const mortar=kind==='metal'?(x%32<2):(y%64<2||((x+(Math.floor(y/64)%2)*64)%128<2));
  height[y*size+x]=.52+grain-(mortar?.16:0);
 }
 const make=()=>{const c=document.createElement('canvas');c.width=c.height=size;return c;};
 const normal=make(),rough=make(),nc=normal.getContext('2d'),rc=rough.getContext('2d');
 const nd=nc.createImageData(size,size),rd=rc.createImageData(size,size);
 const sample=(x,y)=>height[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(sample(x-1,y)-sample(x+1,y))*2,dy=(sample(x,y-1)-sample(x,y+1))*2,len=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  nd.data.set([Math.round((dx/len*.5+.5)*255),Math.round((dy/len*.5+.5)*255),Math.round((1/len*.5+.5)*255),255],i);
  const value=Math.round((kind==='metal'?.55:.84)*255+sample(x,y)*24);rd.data.set([value,value,value,255],i);
 }
 nc.putImageData(nd,0,0);rc.putImageData(rd,0,0);
 const texture=canvas=>{const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.colorSpace=THREE.NoColorSpace;return t;};
 return {map,normalMap:texture(normal),roughnessMap:texture(rough)};
}
