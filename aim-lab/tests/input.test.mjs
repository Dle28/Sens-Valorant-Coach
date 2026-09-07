import test from 'node:test';
import assert from 'node:assert/strict';
import {requestUnadjustedInput} from '../src/input.js';
test('unadjusted request succeeds without ordinary input retry',async()=>{let calls=0;await requestUnadjustedInput({requestPointerLock(options){calls++;assert.deepEqual(options,{unadjustedMovement:true});return Promise.resolve();}},()=>assert.fail('unexpected release'));assert.equal(calls,1);});
test('unsupported raw input releases and never falls back',async()=>{let calls=0,released=0;await assert.rejects(requestUnadjustedInput({requestPointerLock(){calls++;return Promise.reject(new Error('unsupported'));}},()=>released++));assert.equal(calls,1);assert.equal(released,1);});
test('legacy API without acknowledgement is rejected',async()=>{let released=0;await assert.rejects(requestUnadjustedInput({requestPointerLock(){}},()=>released++));assert.equal(released,1);});
