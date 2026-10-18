import {spawnSync} from "node:child_process";
import {mkdtempSync,mkdirSync,rmSync,appendFileSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";

const approvedRef="refs/heads/work/ruflo-three-agent-lab-20261018";
if(process.env.GITHUB_REPOSITORY!=="ibboabdoli-ai/ruflo-hub"||
   process.env.GITHUB_REF!==approvedRef)throw Error("Lab scope mismatch");
const key=process.env.OPENAI_API_KEY;
if(!key||key.length<20)throw Error("OpenAI GitHub secret unavailable");
const cli=process.env.RUFLO_BIN;
if(!cli||!existsSync(cli))throw Error("Pinned RuFlo executable unavailable");
const root=mkdtempSync(join(tmpdir(),"ruflo-openai-roles-"));
const cwd=join(root,"scratch");
const home=join(root,"home");
mkdirSync(cwd,{recursive:true});mkdirSync(home,{recursive:true});
const agentEnv={...process.env,HOME:home,USERPROFILE:home,
  XDG_CONFIG_HOME:join(home,".config"),XDG_CACHE_HOME:join(home,".cache"),
  OPENAI_API_KEY:"",ANTHROPIC_API_KEY:"",OPENROUTER_API_KEY:"",
  GOOGLE_API_KEY:"",OLLAMA_API_KEY:"",GITHUB_TOKEN:"",GH_TOKEN:"",
  TURSO_DATABASE_URL:"",TURSO_AUTH_TOKEN:"",BLOB_READ_WRITE_TOKEN:"",VERCEL_TOKEN:""};
function ruflo(args,timeout=45000){
  const r=spawnSync(resolve(cli),args,{cwd,env:agentEnv,
    encoding:"utf8",timeout,maxBuffer:1024*1024});
  if(r.error||r.status!==0)throw Error("RuFlo "+args[0]+" command failed with status "+r.status);
  return (r.stdout||"")+"\n"+(r.stderr||"");
}
const roleNames=["researcher","coder","tester"];
const sample="function average(a){return a.reduce((s,x)=>s+x,0)/a.length}";
const maxOutputPerCall=140;
const calls=[];
async function generate(role,prompt,prefix){
  if(calls.length>=3)throw Error("Maximum three provider calls reached");
  if(prompt.length>1400)throw Error("Unexpectedly large prompt");
  const started=Date.now();
  calls.push(role); // prevents unbounded retries, even on HTTP error
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-4.1-mini",store:false,max_output_tokens:maxOutputPerCall,input:prompt}),
    signal:AbortSignal.timeout(30000),
    redirect:"error"
  });
  if(!response.ok)throw Error("OpenAI response for role "+role+" failed HTTP "+response.status);
  const data=await response.json();
  const answer=(data.output||[]).flatMap(x=>x.content||[])
    .filter(x=>x.type==="output_text").map(x=>x.text||"").join("\n").trim();
  if(data.status!=="completed"||!answer.startsWith(prefix)){
    throw Error("Role "+role+" returned incomplete or unexpected formatted answer");
  }
  if(answer.length>1100)throw Error("Role response exceeded size bound");
  const metrics={role,elapsedMs:Date.now()-started,
    inputTokens:data.usage?.input_tokens??null,outputTokens:data.usage?.output_tokens??null};
  console.log("PASS: "+role+" model call completed: "+JSON.stringify(metrics));
  return {answer,metrics};
}
try{
  ruflo(["--version"]);
  ruflo(["init"],90000);
  ruflo(["swarm","init","--topology","hierarchical","--max-agents","3","--strategy","specialized"]);
  for(const type of roleNames) ruflo(["agent","spawn","--type",type,"--name","lab-"+type]);
  const list=ruflo(["agent","list"]);
  const observed=roleNames.filter(type=>list.split("\n").some(line=>line.startsWith("|")&&line.includes("| "+type)&&line.includes("| idle")));
  if(observed.length!==3||!list.includes("Total: 3 agents"))throw Error("RuFlo registry not three roles");
  console.log("PASS: RuFlo CLI independently registered 3 idle agent roles without reading the API key.");

  // These are LLM-backed role calls with explicit handoffs implemented by THIS
  // TEST SCRIPT, not via RuFlo's native agent_execute or autonomous tools.
  const researcher=await generate("researcher",
    "You are a code reviewer. Given SYNTHETIC JavaScript: "+sample+
    ". Find exactly one important input edge case. Answer one concise line starting FINDING:",
    "FINDING:");
  const coder=await generate("coder",
    "You are a developer. Original synthetic function: "+sample+
    ". Researcher handoff: "+researcher.answer+
    ". Propose a concise fix in one line beginning PATCH:. Do not touch any files.",
    "PATCH:");
  const tester=await generate("tester",
    "You are a QA reviewer. Original synthetic function: "+sample+
    ". Researcher: "+researcher.answer+". Coder: "+coder.answer+
    ". Name two concrete test inputs and expected outputs in one line starting CHECK:.",
    "CHECK:");
  const totals={
    requests:calls.length,
    inputTokens:researcher.metrics.inputTokens+coder.metrics.inputTokens+tester.metrics.inputTokens,
    outputTokens:researcher.metrics.outputTokens+coder.metrics.outputTokens+tester.metrics.outputTokens
  };
  console.log("PASS: three sequential LLM-backed role outputs handed off by the test harness.");
  console.log("Provider usage (tokens, NOT verified currency cost): "+JSON.stringify(totals));
  const summary=[
    "## RuFlo registration + OpenAI three-role fixture relay",
    "",
    "- Ruflo version: 3.56.10; registry: 3 roles (researcher, coder, tester).",
    "- All model calls: "+calls.length+"/3; model: gpt-4.1-mini; max output tokens per call: "+maxOutputPerCall+".",
    "- Provider reported input/output tokens: "+totals.inputTokens+"/"+totals.outputTokens+".",
    "- Researcher output: "+researcher.answer.replace(/[\r\n]/g," ").slice(0,500),
    "- Coder output: "+coder.answer.replace(/[\r\n]/g," ").slice(0,500),
    "- Tester output: "+tester.answer.replace(/[\r\n]/g," ").slice(0,500),
    "",
    "**IMPORTANT: Hand-offs were performed by this test harness; NOT by RuFlo-native agent_execute or Codex.**",
    "No code edits, live repository reads, provider logging of secrets or Production access."
  ].join("\n");
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+"\n");
}finally{
  rmSync(root,{recursive:true,force:true});
}
