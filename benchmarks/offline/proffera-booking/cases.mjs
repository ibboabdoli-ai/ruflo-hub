// Synthetic service-booking scenario; not copied from the Proffera repository.
import assert from 'node:assert/strict';
export const CASE_NAMES = Object.freeze([
  'a 210-minute service exposes only valid slots after an existing 180-minute booking',
  'the too-late 14:00 start is excluded for a 210-minute service',
  'closing time is respected with no bookings',
  'an existing booking end is preserved when service duration changes',
  'a candidate ending exactly at the next booking start is permitted',
  'a candidate starting exactly when an existing booking ends is permitted',
  'overlapping slots are rejected',
  'zero service duration is rejected',
  'negative service duration is rejected',
  'zero slot step is rejected',
  'malformed existing booking is rejected',
  'input bookings are not mutated'
]);
const original=()=>({opensAt:540,closesAt:1020,slotStep:30,duration:210,
  bookings:[{start:540,end:720}]});
export function evaluate(mod){
  const tests=[
    ()=>assert.deepEqual(mod.getSlots(original()),[720,750,780,810]),
    ()=>assert.equal(mod.getSlots(original()).includes(840),false),
    ()=>assert.equal(mod.getSlots({...original(),bookings:[]}).at(-1),810),
    ()=>{const previous=[{start:540,end:720}];mod.getSlots({...original(),bookings:previous});assert.deepEqual(previous,[{start:540,end:720}])},
    ()=>assert.equal(mod.getSlots({...original(),bookings:[{start:750,end:780}]}).includes(540),true),
    ()=>assert.equal(mod.getSlots(original()).includes(720),true),
    ()=>assert.equal(mod.getSlots({...original(),bookings:[{start:720,end:750}]}).includes(690),false),
    ()=>assert.throws(()=>mod.getSlots({...original(),duration:0}),RangeError),
    ()=>assert.throws(()=>mod.getSlots({...original(),duration:-10}),RangeError),
    ()=>assert.throws(()=>mod.getSlots({...original(),slotStep:0}),RangeError),
    ()=>assert.throws(()=>mod.getSlots({...original(),bookings:[{start:780,end:720}]}),RangeError),
    ()=>{const cfg=original();const snapshot=JSON.stringify(cfg);mod.getSlots(cfg);assert.equal(JSON.stringify(cfg),snapshot)}
  ];
  return Object.freeze(tests.map((fn,i)=>{
    try{fn();return {case:CASE_NAMES[i],passed:true}}
    catch{return {case:CASE_NAMES[i],passed:false}}
  }));
}
