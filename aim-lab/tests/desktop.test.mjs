import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { parseHistory, mergeHistory } from '../src/history-transfer.js';
const {localPage,assetFor,sessionPayload}=createRequire(import.meta.url)('../desktop/policy.cjs');
const id='12345678-1234-4234-8234-123456789abc';
const record={id,status:'completed',startedAt:'2026-09-07T00:00:00Z',elapsedMs:30000,config:{task:'precision',map:'verdant',sensitivity:.3,dpi:800},summary:{shots:20,hits:15,accuracy:.75}};
test('desktop origin rejects remote pages and confusing host names',()=>{assert.equal(localPage('gamesen://app/'),true);for(const url of ['https://app/','gamesen://app.evil/','file:///etc/passwd','gamesen://evil@app/','gamesen://app:99/'])assert.equal(localPage(url),false);});
test('desktop serves only bundled asset whitelist',()=>{assert.equal(assetFor('gamesen://app/main.js'),'main.js');assert.equal(assetFor('gamesen://app/assets/lotus-tactical-sanctum-v1.png'),'assets/lotus-tactical-sanctum-v1.png');assert.equal(assetFor('gamesen://app/assets/lotus-water-court-v1.png'),'assets/lotus-water-court-v1.png');assert.equal(assetFor('gamesen://app/assets/dark-signal-lane-v1.png'),'assets/dark-signal-lane-v1.png');assert.equal(assetFor('gamesen://app/assets/models/vandal-valorant.glb'),'assets/models/vandal-valorant.glb');assert.equal(assetFor('gamesen://app/assets/models/sas-cs2-blue.glb'),'assets/models/sas-cs2-blue.glb');for(const url of ['gamesen://app/desktop/main.cjs','gamesen://app/%2e%2e/%2e%2e/etc/passwd','gamesen://app/main.js.map','gamesen://app/assets/models/other.glb','gamesen://app/%2fetc%2fpasswd'])assert.equal(assetFor(url),null);});
test('native save validates UUID and completed-session shape',()=>{const data={...record,shots:[],trials:[],frames:[]};assert.equal(sessionPayload(JSON.stringify(data)).id,id);for(const change of [{id:'../../escape'},{status:'in-progress'},{frames:null},{config:null}])assert.throws(()=>sessionPayload(JSON.stringify({...data,...change})));});
test('history migration keeps map and summaries, marks provenance, never invents analysis',()=>{const [r]=parseHistory(JSON.stringify({format:'gamesen-history',version:1,sessions:[{...record,analysis:{headline:'untrusted'},qualityClean:true}]}));assert.equal(r.config.map,'verdant');assert.equal(r.summary.accuracy,.75);assert.equal(r.qualityClean,false);assert.equal(r.imported,true);assert.equal(r.analysis,undefined);});
test('history import fails before merge if any record is invalid',()=>{assert.throws(()=>parseHistory(JSON.stringify({format:'gamesen-history',version:1,sessions:[record,{...record,config:{...record.config,sensitivity:-1}}]})));assert.throws(()=>parseHistory(JSON.stringify(record)));});
test('history merge preserves existing records with same UUID',()=>{const rows=mergeHistory([{...record,analysis:{headline:'original'}}],[{...record,imported:true}]);assert.equal(rows.length,1);assert.equal(rows[0].analysis.headline,'original');});
test('history merge bounds storage to latest thirty entries',()=>{const rows=Array.from({length:40},(_,i)=>({...record,id:String(i),startedAt:new Date(Date.UTC(2026,0,i+1)).toISOString()}));const result=mergeHistory([],rows);assert.equal(result.length,30);assert.equal(result[0].id,'39');});

test('desktop allows interface assets but rejects arbitrary font paths',()=>{
 assert.equal(assetFor('gamesen://app/interface.css'),'interface.css');
 for(const weight of [400,600,700,800])assert.equal(assetFor(`gamesen://app/assets/fonts/be-vietnam-pro-${weight}.ttf`),`assets/fonts/be-vietnam-pro-${weight}.ttf`);
 for(const url of ['gamesen://app/assets/fonts/other.ttf','gamesen://app/assets/fonts/../../desktop/main.cjs','https://app/assets/fonts/be-vietnam-pro-400.ttf'])assert.equal(assetFor(url),null);
});

test('desktop permits only known rendered map captures',()=>{
 for(const map of ['garden','piazza','atrium','foundry'])for(const view of ['entry','court','overview'])assert.equal(assetFor(`gamesen://app/assets/maps/${map}-${view}.png`),`assets/maps/${map}-${view}.png`);
 for(const map of ['lotus','dark'])assert.equal(assetFor(`gamesen://app/assets/maps/range-${map}.png`),`assets/maps/range-${map}.png`);
 for(const art of ['temple-relief-v1','foundry-panel-v1','piazza-mosaic-v1','atrium-window-v1'])assert.equal(assetFor(`gamesen://app/assets/maps/${art}.png`),`assets/maps/${art}.png`);
 assert.equal(assetFor('gamesen://app/assets/maps/unknown.png'),null);
});
