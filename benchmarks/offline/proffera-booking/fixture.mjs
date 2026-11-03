// Verifies the same static oracle fixture under both experiment arms.
import {copyFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {evaluate} from './cases.mjs';
import * as defective from './defective.mjs';

const here=fileURLToPath(new URL('.',import.meta.url));
const passing=items=>items.filter(t=>t.passed).length;
export async function bookingFixture(){
  const before=evaluate(defective);
  const baselineFailures=before.length-passing(before);
  if(baselineFailures<3)throw Error('Synthetic fixture insufficiently defective');
  const root=mkdtempSync(join(tmpdir(),'ruflo-booking-synthetic-'));
  const scratch=join(root,'scratch');mkdirSync(scratch);
  try{
    const candidate=join(scratch,'reference.mjs');
    const started=process.hrtime.bigint();
    copyFileSync(join(here,'reference.mjs'),candidate);
    const after=evaluate(await import(pathToFileURL(candidate).href));
    if(passing(after)!==after.length)throw Error('Reference failed fixed requirements');
    return {scenario:'synthetic-booking-duration-180-to-210',
      fixtureCases:after.length,baselineFailures,passesAfter:passing(after),
      repairAndTestMs:Number((Number(process.hrtime.bigint()-started)/1e6).toFixed(3)),
      patchOrigin:'pre-reviewed-static-reference',providerCalls:0,sourceRepoEdits:0,
      realProfferaCodeRead:false,realProfferaBookingsTouched:false};
  }finally{rmSync(root,{recursive:true,force:true})}
}
