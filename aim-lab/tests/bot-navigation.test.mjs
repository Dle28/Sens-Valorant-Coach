import test from 'node:test';
import assert from 'node:assert/strict';
import {SITES} from '../src/site-layout.js';
import {terrainHeight} from '../src/maps/shared/traversal.js';
import {evadeBot} from '../src/site-combat.js';
import {BOT_LEVELS,weaponDamage,VANDAL_DAMAGE} from '../src/combat-balance.js';
test('every spawn relocates through real cover without getting stuck',()=>{
 for(const [name,site] of Object.entries(SITES))for(const [index,[x,z]] of site.spawns.entries()){
  const bot={position:{x,y:1.6+terrainHeight(site,x,z),z},index},cells=new Set();let moving=0;
  for(let t=0;t<12000;t+=50){
   const m=evadeBot(site,bot,{x:0,y:1.6,z:0},t,.05,42);
   cells.add(`${Math.round(m.position.x)},${Math.round(m.position.z)}`);
   if(Math.hypot(m.velocity.x,m.velocity.z)>.2)moving++;
   for(const b of site.cover)assert.ok(bot.position.y-1.6>=b.position[1]+b.size[1]/2-.01||Math.abs(m.position.x-b.position[0])>=b.size[0]/2+.31||Math.abs(m.position.z-b.position[2])>=b.size[2]/2+.31,`${name} spawn ${index} collision`);
  }
  assert.ok(cells.size>=5,`${name} spawn ${index} stuck`);
  assert.ok(moving>180,`${name} spawn ${index} idles`);
 }
});
test('Vandal damage is shared and difficulty adjusts skill instead of damage',()=>{
 assert.equal(weaponDamage('vandal','head'),VANDAL_DAMAGE.head);
 assert.equal(weaponDamage('vandal','body'),40);
 assert.equal(Math.ceil(150/weaponDamage('vandal','body')),4);
 assert.equal(Math.ceil(150/weaponDamage('vandal','head')),1);
 const levels=Object.values(BOT_LEVELS);
 for(let i=1;i<levels.length;i++){assert.ok(levels[i].speed>levels[i-1].speed);assert.ok(levels[i].reaction<levels[i-1].reaction);assert.ok(levels[i].accuracy>levels[i-1].accuracy);}
});

