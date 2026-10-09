import * as THREE from 'three';

export function waterMaterial(){
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},
  vertexShader:'varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}',
  fragmentShader:`uniform float time;varying vec2 vUv;varying vec3 vWorld;
   void main(){
    float edge=smoothstep(0.,.12,vUv.x)*(1.-smoothstep(.88,1.,vUv.x));
    float streak=sin(vUv.x*83.+sin(vUv.y*9.+time*2.))*sin(vUv.x*37.-vUv.y*17.-time*5.);
    float ripple=sin(vUv.y*55.+time*7.+sin(vUv.x*31.))* .5+.5;
    float glint=pow(max(0.,streak),7.)*.65+ripple*.09;
    vec3 col=mix(vec3(.15,.33,.30),vec3(.72,.86,.79),.4+glint);
    gl_FragColor=vec4(col,edge*(.22+glint*.46));
   }`,
 });material.userData.animateTime=true;return material;
}

export function addWaterDetails(root,positions){
 const water=waterMaterial(),stone=new THREE.MeshStandardMaterial({color:0x617569,roughness:.48});
 const foam=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float time;varying vec2 vUv;void main(){float r=length((vUv-.5)*2.);float wave=pow(max(0.,sin(r*32.-time*4.)),18.);float fade=(1.-smoothstep(.3,1.,r))*smoothstep(0.,.12,r);gl_FragColor=vec4(.72,.84,.75,wave*fade*.3);}'
 });foam.userData.animateTime=true;
 for(const [x,z] of positions){
  // Existing pillar face is the backing; no new wall in the playable lane.
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(.62,5.8),water);sheet.position.set(x,3.35,z+.785);root.add(sheet);
  const spout=new THREE.Mesh(new THREE.CylinderGeometry(.18,.11,.23,10),stone);spout.rotation.x=Math.PI/2;spout.position.set(x,6.25,z+.8);root.add(spout);
  const ripple=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),foam);ripple.rotation.x=-Math.PI/2;ripple.scale.y=.65;ripple.position.set(x,.048,z+.84);root.add(ripple);
 }
}
