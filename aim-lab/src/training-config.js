export const EXERCISE_VERSION='0.20';
const scenarioFields=['mapId','zoneId','scenarioId','angleId','gameMode','behavior','reaction','distance','head','repetitions','siteId'];
export function copyScenario(value){
 if(value===null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const result={};
 for(const key of scenarioFields){
  const v=value[key];
  if(v===null||typeof v==='string'&&v.length<=100||typeof v==='number'&&Number.isFinite(v))result[key]=v;
 }
 return result;
}
export function scenarioKey(config){
 if(!Object.hasOwn(config??{},'scenario'))return null;
 if(config.scenario===null)return 'free-practice';
 const scenario=copyScenario(config.scenario);
 if(!scenario||scenarioFields.some(key=>!Object.hasOwn(scenario,key)))return null;
 return JSON.stringify(scenarioFields.map(key=>scenario[key]));
}
