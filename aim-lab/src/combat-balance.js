// Shared damage contract for both sides; difficulty never scales bullet damage.
export const VANDAL_DAMAGE=Object.freeze({head:160,body:40,leg:34});
export const BOT_LEVELS=Object.freeze({
 easy:{speed:1.35,reaction:1900,cooldown:650,accuracy:.20,headChance:.02},
 normal:{speed:1.65,reaction:1400,cooldown:480,accuracy:.30,headChance:.05},
 hard:{speed:2,reaction:1050,cooldown:340,accuracy:.40,headChance:.09},
 expert:{speed:2.3,reaction:800,cooldown:260,accuracy:.50,headChance:.14},
});
export function botLevel(difficulty){return BOT_LEVELS[difficulty]??BOT_LEVELS.normal;}
export function weaponDamage(weapon,region='body'){
 const table={vandal:VANDAL_DAMAGE,phantom:{head:140,body:35,leg:30},classic:{head:78,body:26,leg:22},sheriff:{head:159,body:55,leg:46}};
 return (table[weapon]??VANDAL_DAMAGE)[region]??40;
}
