/**
 * Bounded, credential-free public metadata probe.
 * No RuFlo execution, source-file access, or merge-readiness claim.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const TARGET = Object.freeze({owner:'ibboabdoli-ai',repo:'Proffera',pr:941});
const API = 'https://api.github.com/repos/' + TARGET.owner + '/' + TARGET.repo;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const MAX_CHECKS = 100;

function checkedNumber(value,max=10000) {
  return Number.isSafeInteger(value) && value>=0 && value<=max;
}
async function publicGet(url,fetchImpl) {
  let result;
  try {
    result=await fetchImpl(url,{
      method:'GET',redirect:'error',
      headers:{
        Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28',
        'User-Agent':'ruflo-hub-public-metadata-probe'
      },
      signal:AbortSignal.timeout(8000)
    });
  } catch {
    throw Error('NOT VERIFIED: public GitHub read failed');
  }
  if(!result?.ok) {
    const status=Number.isInteger(result?.status)?result.status:'unknown';
    throw Error('NOT VERIFIED: public GitHub returned HTTP '+status);
  }
  try {return await result.json();}
  catch {throw Error('NOT VERIFIED: invalid public API JSON');}
}

export async function inspectPublicProfferaPr(expectedSha,fetchImpl=fetch) {
  if(typeof expectedSha!=='string'||!SHA_PATTERN.test(expectedSha))
    throw Error('NOT VERIFIED: expected full lowercase 40-character SHA');
  if(typeof fetchImpl!=='function')throw TypeError('fetchImpl must be a function');
  const pr=await publicGet(API+'/pulls/'+TARGET.pr,fetchImpl);
  if(pr?.number!==TARGET.pr ||
    pr?.base?.repo?.full_name!==TARGET.owner+'/'+TARGET.repo ||
    pr?.state!=='open'||typeof pr?.draft!=='boolean')
    throw Error('NOT VERIFIED: unexpected PR identity or state');
  if(pr.head?.sha!==expectedSha)
    throw Error('NOT VERIFIED: PR head differs from the explicitly approved SHA');
  if(!checkedNumber(pr.changed_files))
    throw Error('NOT VERIFIED: missing or invalid PR file count');
  if(pr.merged===true)
    throw Error('NOT VERIFIED: target PR already merged');

  const checks=await publicGet(API+'/commits/'+expectedSha+
    '/check-runs?per_page='+MAX_CHECKS,fetchImpl);
  if(!checkedNumber(checks?.total_count,MAX_CHECKS) ||
      !Array.isArray(checks?.check_runs) ||
      checks.check_runs.length!==checks.total_count)
    throw Error('NOT VERIFIED: incomplete check run page or too many results');
  let successes=0;
  for(const check of checks.check_runs) {
    if(check?.head_sha!==expectedSha||typeof check?.name!=='string'||
       !['queued','in_progress','completed','waiting','pending','requested'].includes(check?.status))
      throw Error('NOT VERIFIED: malformed or cross-SHA check result');
    if(check.status==='completed'&&check.conclusion==='success')successes++;
  }
  return Object.freeze({
    result:'OBSERVED_ONLY_NOT_MERGE_APPROVAL',
    source:'public-github-rest',
    target:TARGET.owner+'/'+TARGET.repo+'#'+TARGET.pr,
    exactSha:expectedSha,
    state:pr.state,draft:pr.draft,
    changedFilesReported:pr.changed_files,
    checkRuns:checks.total_count,checksSuccessful:successes,
    checksNotSuccessful:checks.total_count-successes,
    codeOrSecretsRead:false,repositoryMutations:false
  });
}
// One explicit run only; no schedules, retries, credentials or provider calls.
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==3) {
    console.error('Usage: node scripts/inspect-public-proffera-pr.mjs FULL_EXPECTED_SHA');
    process.exitCode=2;
  } else {
    try {console.log(JSON.stringify(await inspectPublicProfferaPr(process.argv[2]),null,2));}
    catch(error) {
      console.error(error instanceof Error&&/^NOT VERIFIED:/.test(error.message)?
        error.message:'NOT VERIFIED: probe failed');
      process.exitCode=1;
    }
  }
}
