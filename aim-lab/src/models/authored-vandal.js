import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Authored from side-view visual references. Forward is -Z, grip at the origin.
// No downloaded mesh or texture is used by this model.
export function createAuthoredVandal(){
 const root=new THREE.Group();root.name='authored-vandal';
 const metal=new THREE.MeshStandardMaterial({color:0x343b40,roughness:.43,metalness:.72});
 const edge=new THREE.MeshStandardMaterial({color:0x606971,roughness:.37,metalness:.8});
 const polymer=new THREE.MeshStandardMaterial({color:0x1b2025,roughness:.8,metalness:.08});
 const recess=new THREE.MeshStandardMaterial({color:0x090c10,roughness:.68});
 function mesh(g,m,p,parent=root){const o=new THREE.Mesh(g,m);o.position.set(...p);parent.add(o);o.castShadow=o.receiveShadow=true;return o;}
 function box(s,p,m=metal,parent=root){return mesh(new RoundedBoxGeometry(...s,2,Math.min(...s)*.12),m,p,parent);}
 function profile(points,width,m,name,parent=root){
  const shape=new THREE.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelThickness:.005,bevelSize:.006,bevelSegments:2,steps:1});
  g.rotateY(-Math.PI/2);g.translate(width/2,0,0);const o=mesh(g,m,[0,0,0],parent);o.name=name;return o;
 }
 function cylinder(radius,length,p,m=metal){const o=mesh(new THREE.CylinderGeometry(radius,radius,length,16),m,p);o.rotation.x=Math.PI/2;return o;}
 profile([[-.72,.075],[-.65,.18],[-.15,.18],[-.08,.14],[.02,.12],[.015,-.035],[-.22,-.075],[-.35,-.015],[-.73,-.015]],.115,metal,'angular-receiver');
 profile([[-.70,.085],[-.65,.155],[-.38,.155],[-.39,.08]],.127,edge,'handguard-bevel');
 profile([[.015,.115],[.35,.105],[.365,.07],[.36,-.135],[.285,-.13],[.19,-.025],[.025,.012]],.095,polymer,'stock');
 profile([[.07,.065],[.315,.068],[.32,-.095],[.29,-.08],[.2,.008]],.099,metal,'stock-inset');
 box([.106,.21,.028],[0,-.024,.36],polymer);
 for(let i=0;i<7;i++)box([.11,.009,.009],[0,-.105+i*.026,.378],recess);
 profile([[-.035,-.035],[.055,-.065],[.1,-.22],[.065,-.24],[.035,-.23],[-.015,-.12]],.072,polymer,'pistol-grip');
 for(let i=0;i<6;i++)box([.076,.012,.045],[0,-.11-i*.018,.02+i*.007],metal);
 const guardCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.055,-.18),new THREE.Vector3(0,-.115,-.17),new THREE.Vector3(0,-.13,-.08),new THREE.Vector3(0,-.08,-.015)]);
 mesh(new THREE.TubeGeometry(guardCurve,18,.01,6,false),metal,[0,0,0]);
 const trigger=box([.013,.044,.015],[0,-.081,-.095],recess);trigger.rotation.x=-.3;
 const magazine=new THREE.Group();magazine.name='magazine';root.add(magazine);
 profile([[-.32,-.035],[-.21,-.06],[-.23,-.17],[-.27,-.28],[-.34,-.38],[-.405,-.43],[-.455,-.375],[-.39,-.31],[-.35,-.22],[-.325,-.13]],.079,polymer,'curved-magazine',magazine);
 for(const side of [-1,1]){
  for(let i=0;i<12;i++){const t=i/11,z=-.32-.106*t*t,y=-.092-.295*t;const rib=box([.008,.012,.018],[side*.046,y,z],edge,magazine);rib.rotation.x=-t*.8;}
  for(let i=0;i<4;i++)box([.007,.025,.051],[side*.065,.144,-.62+i*.068],recess);
  for(let i=0;i<11;i++)box([.006,.039,.014],[side*.066,.037,-.65+i*.022],recess);
  box([.006,.024,.13],[side*.061,.11,-.22],recess);
  for(const z of [-.36,-.06,.29]){const pin=mesh(new THREE.CylinderGeometry(.011,.011,.007,12),edge,[side*.063,.055,z]);pin.rotation.z=Math.PI/2;box([.008,.003,.013],[side*.068,.055,z],recess);}
 }
 profile([[-.46,-.367],[-.407,-.437],[-.391,-.43],[-.448,-.354]],.092,metal,'magazine-base',magazine);
 cylinder(.019,.3,[0,.087,-.86]);cylinder(.027,.135,[0,.087,-1.04]);
 for(let i=0;i<4;i++)cylinder(.029,.012,[0,.087,-.988-i*.027],edge);
 cylinder(.016,.002,[0,.087,-1.109],recess);
 profile([[-.87,.102],[-.817,.172],[-.796,.172],[-.79,.105]],.035,metal,'front-sight');
 box([.025,.039,.026],[0,.19,-.8],polymer);
 cylinder(.012,.17,[0,.147,-.737]);
 box([.065,.018,.078],[0,.191,-.25],polymer);
 for(const side of [-1,1])box([.012,.025,.022],[side*.023,.21,-.255],metal);
 const bolt=box([.016,.018,.105],[.077,.108,-.2],edge);bolt.name='charging-handle';
 box([.045,.022,.023],[.09,.104,-.15],polymer,bolt).position.set(.013,0,.05);
 root.userData.animate=(kick)=>{bolt.position.z=-.2+kick*.045;};
 return root;
}
