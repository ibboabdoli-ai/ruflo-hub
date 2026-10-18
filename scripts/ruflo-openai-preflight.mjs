const key=process.env.OPENAI_API_KEY;
if(!key || key.length<20){
 console.error("FAIL: OPENAI_API_KEY is unavailable in this GitHub Actions job.");
 process.exit(2);
}
if(process.env.GITHUB_REPOSITORY!=="ibboabdoli-ai/ruflo-hub"||
 process.env.GITHUB_REF!=="refs/heads/work/ruflo-three-agent-lab-20261018"){
 throw Error("Wrong repository or branch; refusing API request.");
}
try{
 const result=await fetch("https://api.openai.com/v1/models/gpt-4.1-mini",{
  method:"GET",redirect:"error",
  headers:{"Authorization":"Bearer "+key,Accept:"application/json"},
  signal:AbortSignal.timeout(15000)
 });
 if(result.status!==200){
  console.error("FAIL: OpenAI metadata endpoint HTTP "+result.status+
   ". 401 invalid key, 403 restricted permissions, 404 unavailable model, 429 rate/quota.");
  process.exitCode=1;
 }else{
  const metadata=await result.json();
  if(metadata.id!=="gpt-4.1-mini")throw Error("Unexpected metadata model id");
  console.log("PASS: GitHub Actions secret works with OpenAI API model metadata.");
  console.log("PASS: No token-consuming model generations requested.");
 }
}catch(e){
 console.error("FAIL: OpenAI metadata probe failed ("+
  (e?.name==="TimeoutError"?"timeout":"network or unexpected response")+").");
 process.exitCode=1;
}