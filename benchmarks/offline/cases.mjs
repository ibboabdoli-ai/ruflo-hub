import assert from 'node:assert/strict';
// Explicit requirements; frozen test suite shared by both arms.
export const CASE_NAMES = Object.freeze([
  'empty average returns null',
  'average finite values',
  'average mixed-sign values',
  'invalid average input is rejected',
  'IDs normalized and deduplicated',
  'IDs preserve first appearance',
  'empty normalized IDs removed'
]);
export function evaluate(module) {
  const tests = [
    () => assert.equal(module.average([]), null),
    () => assert.equal(module.average([2, 4, 6]), 4),
    () => assert.equal(module.average([-4, 0, 4]), 0),
    () => assert.throws(() => module.average([1, Infinity]), TypeError),
    () => assert.deepEqual(module.canonicalIds([' AbC ', 'abc', 'X']), ['abc', 'x']),
    () => assert.deepEqual(module.canonicalIds(['z', ' A ', 'a', 'Z', 'b']), ['z','a','b']),
    () => assert.deepEqual(module.canonicalIds([' ', 'a', '', 'A']), ['a'])
  ];
  return Object.freeze(tests.map((run,i) => {
    try { run(); return {case:CASE_NAMES[i],passed:true}; }
    catch { return {case:CASE_NAMES[i],passed:false}; }
  }));
}
