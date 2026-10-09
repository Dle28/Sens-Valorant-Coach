import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {TACTICAL_LESSONS as lessons,sampleLesson,sightline} from '../src/tactical-lessons.js';
const {assetFor}=createRequire(import.meta.url)('../desktop/policy.cjs');
test('moving duel enemies cannot fire accurate shots and shoulder bait stays partial',()=>{
 const moving=sampleLesson(lessons[4],1.5).enemies[0];assert.ok(moving.speed>.12);assert.equal(moving.canFire,false);
 assert.equal(sampleLesson(lessons[4],3.5).enemies[0].canFire,true);
 const shoulder=sampleLesson(lessons[5],1.5).enemies[0];assert.equal(shoulder.los.visible,false);assert.ok(shoulder.exposed>0&&shoulder.exposed<1);assert.equal(shoulder.canFire,true);
 assert.equal(sampleLesson(lessons[5],2.1).enemies[0].canFire,false);
});
test('all ten lessons have shipped concept assets and finite repeatable timelines',async()=>{
 assert.equal(lessons.length,10);assert.equal(new Set(lessons.map(l=>l.id)).size,10);
 for(const l of lessons){
  await access(new URL(`../src/assets/tactical/${l.id}.png`,import.meta.url));
  assert.equal(assetFor(`gamesen://app/assets/tactical/${l.id}.png`),`assets/tactical/${l.id}.png`);
  for(let t=0;t<=l.duration;t+=.05){const s=sampleLesson(l,t);assert.deepEqual(s,sampleLesson(l,t));assert.ok(s.player.position.every(Number.isFinite));assert.ok(s.player.speed>=0);}
 }
 assert.equal(assetFor('gamesen://app/assets/tactical/unknown.png'),null);
});
test('cover clips a ray at the first obstacle and respects elevation',()=>{
 const cover=[{position:[0,1,0],size:[2,2,2]}];
 assert.deepEqual(sightline([-3,1,0],[3,1,0],cover).end,[-1,1,0]);
 assert.equal(sightline([-3,3,0],[3,3,0],cover).visible,true);
 assert.equal(sightline([-3,1,3],[3,1,3],cover).visible,true);
});
test('wide swing goes from concealment to full exposure and stops before firing',()=>{
 const l=lessons[0];assert.equal(sampleLesson(l,0).enemies[0].exposed,0);
 const end=sampleLesson(l,l.duration);assert.equal(end.enemies[0].exposed,1);assert.equal(end.player.speed,0);assert.equal(end.player.fire,true);
 assert.equal(Math.hypot(...l.dimension[0].map((v,i)=>l.dimension[1][i]-v)),3);
});
test('jiggle sees briefly and retreats while shoulder bait keeps head concealed',()=>{
 const jiggle=lessons[1],shoulder=lessons[5];
 assert.equal(sampleLesson(jiggle,0).enemies[0].los.visible,false);
 assert.equal(sampleLesson(jiggle,1).enemies[0].los.visible,true);
 assert.equal(sampleLesson(jiggle,1.3).enemies[0].exposed,0);
 const bait=sampleLesson(shoulder,1.5).enemies[0];assert.equal(bait.los.visible,false);assert.ok(bait.exposed>0&&bait.exposed<1);
 assert.equal(sampleLesson(shoulder,2).enemies[0].exposed,0);
});
test('entry conceals late enemy at start and retake isolates enemies throughout route',()=>{
 assert.equal(sampleLesson(lessons[2],0).enemies[0].los.visible,false);
 assert.equal(sampleLesson(lessons[2],6).enemies[0].los.visible,true);
 const retake=lessons[9];
 for(let t=0;t<=retake.duration;t+=.01)assert.ok(sampleLesson(retake,t).enemies.filter(e=>e.los.visible).length<=1);
 assert.deepEqual(sampleLesson(retake,2.2).enemies.map(e=>e.los.visible),[true,false]);
 assert.deepEqual(sampleLesson(retake,5.5).enemies.map(e=>e.los.visible),[false,true]);
});
test('target switch activates B after A and micro correction is much smaller than off angle',()=>{
 assert.deepEqual(sampleLesson(lessons[7],0).enemies.map(e=>e.active),[true,false]);
 assert.deepEqual(sampleLesson(lessons[7],3).enemies.map(e=>e.active),[false,true]);
 const gap=l=>Math.hypot(...l.expected.map((v,i)=>l.enemies[0].position[i]-v));
 assert.ok(gap(lessons[6])<gap(lessons[3])/10);
 assert.ok(lessons[8].keys.at(-1).aim[1]>lessons[8].keys[0].aim[1]);
});
