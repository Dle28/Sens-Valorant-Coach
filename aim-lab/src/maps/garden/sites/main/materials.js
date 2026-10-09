import * as THREE from 'three';

const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
export function mineralNoise(x,y,period){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),wrap=n=>(n%period+period)%period;
 const a=hash(wrap(ix),wrap(iy)),b=hash(wrap(ix+1),wrap(iy)),c=hash(wrap(ix),wrap(iy+1)),d=hash(wrap(ix+1),wrap(iy+1));
 return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
// Mineral variation at several scales, shared height drives both colour and normals.
export function mineralMaps(kind='limestone',size=512){
 const h=new Float32Array(size*size),clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let value=0,weight=0;
  for(let octave=0;octave<5;octave++){const p=4*2**octave,w=1/2**octave;value+=mineralNoise(x/size*p,y/size*p,p)*w;weight+=w;}
  const grain=hash(x,y)*.045;
  const joint=kind==='limestone'&&(y%(size/4)<2||(x+(Math.floor(y/(size/4))%2)*size/4)%(size/2)<2);
  h[y*size+x]=value/weight+grain-(joint?.09:0);
 }
 const make=()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=size;return canvas;};
 const canvases=[make(),make(),make()],contexts=canvases.map(c=>c.getContext('2d')),pixels=contexts.map(c=>c.createImageData(size,size));
 const sample=(x,y)=>h[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,value=sample(x,y),earth=kind==='earth';
  const base=earth?[130,118,96]:[213,204,185],contrast=earth?47:27;
  pixels[0].data.set([...base.map(c=>clamp(c+(value-.5)*contrast)),255],i);
  const dx=(sample(x-1,y)-sample(x+1,y))*(earth?2:1.4),dy=(sample(x,y-1)-sample(x,y+1))*1.4,length=Math.hypot(dx,dy,1);
  pixels[1].data.set([clamp((dx/length*.5+.5)*255),clamp((dy/length*.5+.5)*255),clamp((1/length*.5+.5)*255),255],i);
  const rough=clamp((earth?.91:.76)*255+value*27);pixels[2].data.set([rough,rough,rough,255],i);
 }
 const textures=canvases.map((canvas,i)=>{contexts[i].putImageData(pixels[i],0,0);const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;t.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;return t;});
 return {map:textures[0],normalMap:textures[1],roughnessMap:textures[2]};
}

export function mossMaterial(){
 const size=128,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),p=ctx.createImageData(size,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const r=Math.hypot((x-64)/64,(y-64)/64),noise=mineralNoise(x/16,y/16,8),i=(y*size+x)*4;
  p.data.set([69+noise*28,81+noise*26,46+noise*15,Math.max(0,Math.min(1,(1-r)*3-noise*.5))*155],i);
 }
 ctx.putImageData(p,0,0);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-1});
}
