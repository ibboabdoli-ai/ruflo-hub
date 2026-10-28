import {copyFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {evaluate} from './cases.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const faulty=resolve(here,'defective.mjs');
const reference=resolve(here,'reference.mjs');
const count=items=>items.filter(item=>item.passed).length;
export async function benchmarkFixture() {
  const before=evaluate(await import(pathToFileURL(faulty).href));
  const failedBefore=before.length-count(before);
  if(failedBefore<3)throw Error('Fixture must have at least three reproducible defects');
  const root=mkdtempSync(join(tmpdir(),'ruflo-benchmark-'));
  const scratch=join(root,'scratch');
  mkdirSync(scratch);
  const candidate=join(scratch,'candidate.mjs');
  try {
    const started=process.hrtime.bigint();
    // No agent generated this patch: identical oracle copy in both arms.
    copyFileSync(reference,candidate);
    const after=evaluate(await import(pathToFileURL(candidate).href));
    const repairAndTestMs=Number(process.hrtime.bigint()-started)/1e6;
    if(count(after)!==after.length)throw Error('Reference patch failed fixed tests');
    return {fixtureCases:before.length,baselineFailures:failedBefore,passesAfter:count(after),
      repairAndTestMs:Number(repairAndTestMs.toFixed(3)),patchOrigin:'pre-reviewed-static-reference',
      providerCalls:0,sourceRepoEdits:0};
  }finally{rmSync(root,{recursive:true,force:true})}
}
