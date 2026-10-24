/** Fixed no-network GitHub response fixture loaded by the subprocess tests. */
const SHA='9ac8b38df37cdcb8a917ea4c10f2cc9f79a750ca';
const MODE=process.env.PROFFERA_TEST_MODE;
if(!['good','stale','403'].includes(MODE))throw Error('Unsupported fixture mode');
const base='https://api.github.com/repos/ibboabdoli-ai/Proffera';
const urls=[base+'/pulls/941',base+'/commits/'+SHA+'/check-runs?filter=all&per_page=100'];
let calls=0;
globalThis.fetch=async(url,options)=>{
  if(url!==urls[calls]||options?.method!=='GET'||options?.headers?.Authorization!==undefined)
    throw Error('Fixture received non-allowlisted request');
  calls++;
  if(MODE==='403')return {ok:false,status:403,json:async()=>({message:'SIMULATED_BODY_NOT_FOR_OUTPUT'})};
  const data=calls===1
    ? {number:941,state:'open',draft:false,merged:false,changed_files:40,
       head:{sha:MODE==='stale'?'a'.repeat(40):SHA},
       base:{repo:{full_name:'ibboabdoli-ai/Proffera'}}}
    : {total_count:2,check_runs:[
        {head_sha:SHA,name:'validation',status:'completed',conclusion:'success'},
        {head_sha:SHA,name:'other',status:'completed',conclusion:'skipped'}]};
  return {ok:true,status:200,json:async()=>data};
};
