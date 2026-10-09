import test from 'node:test';
import assert from 'node:assert/strict';
import {getSite,SITES,siteSpawn} from '../src/site-layout.js';
import {siteBotCount,evadeBot} from '../src/site-combat.js';
import {navigationGrid} from '../src/bot-navigation.js';
test('expanded sites align cover, planting and routes with rendered scale',()=>{
 for(const id of Object.keys(SITES)){
  const site=getSite(id),base=SITES[id];assert.equal(getSite(id),site);
  assert.equal(site.plantZone.width,base.plantZone.width*1.35);
  assert.equal(site.cover[0].position[0],base.cover[0].position[0]*1.35);
  assert.equal(site.cover[0].size[1],base.cover[0].size[1]);
  assert.ok([...navigationGrid(site).values()].some(p=>Math.abs(p.x)>25||p.z< -31));
  for(let index=0;index<siteBotCount('expert');index++){
   const position=siteSpawn(site,42,1,index,{x:0,z:0}),bot={position:{...position},index};
   for(let t=0;t<6000;t+=50)evadeBot(site,bot,{x:0,y:1.6,z:0},t,.05,42);
   assert.ok(Math.hypot(bot.position.x-position.x,bot.position.z-position.z)>.5,`${id} bot ${index} stuck`);
  }
 }
 assert.deepEqual(['easy','normal','hard','expert'].map(siteBotCount),[4,6,8,10]);
});
