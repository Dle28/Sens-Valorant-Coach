import {roomShell} from './room-shell.js';
// Original training geometry. Defender side is north (-Z), A east (+X).
// Relative connections follow Riot's Lotus overview, normalized by 180 degrees.
// Dimensions are authored estimates; see docs/LOTUS_B_STRUCTURE.md.
const rooms=[
 {name:'B SITE',x:0,z:-13,width:16,depth:16},
 {name:'B MAIN · THROAT',x:2,z:-2.5,width:4.8,depth:5},
 {name:'B MAIN · TURN',x:0,z:1.75,width:8.8,depth:3.5},
 {name:'B PILLARS · APPROACH',x:-2,z:7,width:4.8,depth:7},
 {name:'A LINK',x:12.5,z:-7.5,width:9,depth:5},
 {name:'A LINK · DOOR ROOM',x:17.5,z:-10,width:7,depth:10},
 {name:'A MAIN · EDGE',x:22,z:-15,width:6,depth:6},
 {name:'C LINK · THROAT',x:-10,z:-18,width:4,depth:4},
 {name:'C LINK',x:-15,z:-20,width:6,depth:8},
 {name:'C WATERFALL · EDGE',x:-20,z:-18,width:4,depth:4},
 {name:'C GRAVEL · APPROACH',x:-15,z:-27,width:6,depth:6},
 {name:'DEFENDER · APPROACH',x:-4,z:-30,width:22,depth:5},
 {name:'B UPPER',x:4,z:-25.5,width:8,depth:9},
];
const wall=(x,z,w,d)=>({position:[x,3.5,z],size:[w,7,d],detail:'lotus-wall'});
export default {
 name:'Lotus B · Linked Chambers',color:0xa9b8b7,accent:0xa79d83,sky:0xa8d5e8,
 interior:true,authoredTraversal:true,rooms,
 bounds:{minX:-23,maxX:26,minZ:-33,maxZ:12},
 cover:[...roomShell(rooms),
  // Offset Upper doorway and right-hand return, rather than an open rear hallway.
  wall(.65,-21,1.3,.7),wall(6.35,-21,3.3,.7),
  wall(4.65,-18.7,1.3,4.6),
  {position:[1.35,.025,-15.3],size:[5.4,2.65,7.6],detail:'lotus-plinth',walkable:true},
  {position:[3,.675,-20.05],size:[2.1,1.35,1.9],detail:'lotus-bridge',walkable:true},
  {position:[-5.8,.9,-7.4],size:[2.5,1.8,2.4],detail:'lotus-crate'},
  {position:[-3.9,.4,-7.4],size:[1.1,.8,1.5],detail:'lotus-crate'},
  {position:[-5.8,.55,-19],size:[1.8,1.1,1.5],detail:'lotus-crate'},
 ],
 spawns:[[-6,-11],[-5,-15],[6,-12],[-3,-19.5],[6,-18],[12,-7.5],[18,-10],[-15,-21],[4,-24],[-2,7]],
 plantZone:{x:0,z:-10.65,width:2.4,depth:.5,height:-1.26},
 objectivePosition:{x:0,y:-1.26,z:-10.65},
 starts:{attack:{x:-2,y:1.6,z:7,yaw:0},retake:{x:-15,y:1.6,z:-22,yaw:Math.PI}},
 entrances:[{name:'B MAIN',x:2,z:-5,width:4.8},{name:'A LINK',x:8,z:-7.5,width:5,axis:'x'},{name:'C LINK',x:-8,z:-18,width:4,axis:'x'}],
 upperEntrance:{name:'B UPPER',x:3,z:-21,width:3.4,height:1.35},
 platforms:[{x:4,z:-24,width:7.3,depth:6,height:1.35}],
 ramps:[{x:4,z:-29.25,width:3.4,depth:4.5,height:1.35,riseToward:'south'}],
 pit:{x:0,z:-13,radius:4.6,innerRadius:2.8,depth:1.26,steps:8},
};


