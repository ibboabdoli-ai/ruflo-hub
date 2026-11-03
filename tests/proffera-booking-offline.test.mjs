import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluate,CASE_NAMES} from '../benchmarks/offline/proffera-booking/cases.mjs';
import * as defective from '../benchmarks/offline/proffera-booking/defective.mjs';
import * as reference from '../benchmarks/offline/proffera-booking/reference.mjs';
import {bookingFixture} from '../benchmarks/offline/proffera-booking/fixture.mjs';

test('synthetic booking-duration baseline contains reproducible bugs',()=>{
  const baseline=evaluate(defective);
  assert.equal(baseline.length,12);
  assert.deepEqual(baseline.map(x=>x.case),[...CASE_NAMES]);
  assert.ok(baseline.filter(x=>!x.passed).length>=3);
});
test('pre-reviewed synthetic booking reference satisfies all fixed requirements',()=>{
  const outcomes=evaluate(reference);
  assert.equal(outcomes.length,12);
  assert.ok(outcomes.every(x=>x.passed));
});
test('booking repair runs in a disposable folder without models or live bookings',async()=>{
  const r=await bookingFixture();
  assert.equal(r.fixtureCases,12);
  assert.equal(r.passesAfter,12);
  assert.ok(r.baselineFailures>=3);
  assert.equal(r.providerCalls,0);
  assert.equal(r.sourceRepoEdits,0);
  assert.equal(r.patchOrigin,'pre-reviewed-static-reference');
  assert.equal(r.realProfferaCodeRead,false);
  assert.equal(r.realProfferaBookingsTouched,false);
});
test('the booking RuFlo workflow is read-only, zero-key, and branch scoped',()=>{
  const script=readFileSync(new URL('../benchmarks/offline/bench.mjs',import.meta.url),'utf8');
  const workflow=readFileSync(new URL('../.github/workflows/ruflo-proffera-booking-zero-key.yml',import.meta.url),'utf8');
  assert.match(script,/bookingFixture/);
  assert.match(script,/task_complete/);
  assert.match(script,/task_status/);
  assert.match(script,/refs\/heads\/work\/proffera-booking-offline-20261103/);
  assert.match(workflow,/permissions:\s*\n  contents: read/);
  assert.match(workflow,/persist-credentials: false/);
  assert.match(workflow,/--ignore-scripts/);
  assert.match(workflow,/npm audit --omit=dev --omit=optional/);
  assert.match(workflow,/node benchmarks\/offline\/bench\.mjs direct booking/);
  assert.match(workflow,/node benchmarks\/offline\/bench\.mjs ruflo booking/);
  assert.doesNotMatch(workflow,/secrets\.|pull_request_target|contents: write|gh pr merge|git push|repository: ibboabdoli-ai\/Proffera/);
  assert.match(workflow,/OPENAI_API_KEY: ''/);
  assert.match(workflow,/ANTHROPIC_API_KEY: ''/);
});
