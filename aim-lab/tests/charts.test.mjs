import test from 'node:test';
import assert from 'node:assert/strict';
import { chartData } from '../src/charts.js';
const frame=(t,dt=20)=>({t,dt,errorDeg:0,target:[0,1.6,-20],yaw:0,pitch:0,onTarget:true});
test('heatmap uses elapsed time rather than frame counts and rejects stalls',()=>{
 const a=chartData({elapsedMs:100,frames:[frame(50,50),frame(100,50),frame(100,200)]});
 const b=chartData({elapsedMs:100,frames:[20,40,60,80,100].map(t=>frame(t))});
 assert.equal(a.cells.reduce((x,y)=>x+y,0),100);assert.deepEqual(a.cells,b.cells);assert.equal(a.cells[7*25+12],100);
});
test('buckets split frame time across boundaries and retain final hits',()=>{
 const d=chartData({elapsedMs:5010,frames:[frame(5010,20)],shots:[{t:5010,hit:true},{t:5020,hit:true}]});
 assert.equal(d.buckets[0].valid,10);assert.equal(d.buckets[1].valid,10);assert.equal(d.buckets[1].hits,1);
});
test('heatmap reports outside coverage instead of clamping into edge',()=>{
 const d=chartData({elapsedMs:20,frames:[{...frame(20),target:[20,1.6,-1]}]});assert.equal(d.outside,20);assert.equal(d.cells.reduce((x,y)=>x+y,0),0);
});

test('aim offset describes aim relative to target and wraps yaw',async()=>{const {aimOffset}=await import('../src/charts.js');assert.ok(Math.abs(aimOffset([20,1.6,-20],0,0).x+45)<1e-9);assert.ok(Math.abs(aimOffset([20,1.6,-20],-Math.PI/4,0).x)<1e-9);assert.ok(aimOffset([0,2.6,-20],0,0).y<0);assert.equal(aimOffset([NaN,0,0],0,0),null);});
test('zoom retains total located time and reports exclusions',()=>{const run={elapsedMs:20,frames:[{...frame(20),target:[1,1.6,-20]}]};const wide=chartData(run,3),tight=chartData(run,1);assert.equal(wide.inside,20);assert.equal(tight.outside,20);assert.equal(wide.located,tight.located);});
