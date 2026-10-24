(()=>{
'use strict';
const API='https://api.github.com/repos/';
const PROFILE='https://raw.githubusercontent.com/ibboabdoli-ai/ruflo-hub/main/profiles/proffera.json';
const SOURCES=[{repo:'ibboabdoli-ai/ruflo-hub',prefix:'hub',label:'RuFlo'},{repo:'ibboabdoli-ai/Proffera',prefix:'proffera',label:'Proffera'}];
const MAX_CHECKS=20,MAX_PRS=5,SUPERVISOR_PR=941;
const shaPattern=/^[a-f0-9]{40}$/;
const $=id=>document.getElementById(id);
const set=(id,value)=>{$(id).textContent=String(value)};
let running=false;
async function read(url){
  const response=await fetch(url,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('GitHub HTTP '+response.status);
  return response.json();
}
function empty(id,value){$(id).replaceChildren();const p=document.createElement('p');p.className='empty';p.textContent=value;$(id).append(p)}
function checkReport(data,sha,limit){
  if(!data||!Number.isSafeInteger(data.total_count)||data.total_count<0||!Array.isArray(data.check_runs)||data.check_runs.length>limit||data.check_runs.length>data.total_count||data.check_runs.length!==Math.min(data.total_count,limit))throw Error('نتیجه بررسی ناقص یا ناسازگار');
  for(const item of data.check_runs){
    if(item.head_sha!==sha||typeof item.name!=='string'||item.name.length>200||!['completed','queued','in_progress','waiting','pending','requested'].includes(item.status))throw Error('بررسی متعلق به commit انتخابی نیست');
  }
  return {items:data.check_runs,total:data.total_count,partial:data.total_count>limit};
}
function result(item){
  if(item.status!=='completed')return {label:'در جریان',kind:'bad'};
  if(item.conclusion==='success')return {label:'موفق',kind:'good'};
  if(['skipped','neutral'].includes(item.conclusion))return {label:'اجرا نشده',kind:'neutral'};
  if(item.conclusion==='cancelled')return {label:'لغوشده',kind:'bad'};
  return {label:'ناموفق / نامشخص',kind:'bad'};
}
function appendCheck(container,item,prefix){
  const line=document.createElement('div');line.className='check-item';
  const name=document.createElement('span');name.textContent=prefix+' · '+item.name;
  const state=document.createElement('b');const r=result(item);state.textContent=r.label;if(r.kind==='bad')state.className='bad';if(r.kind==='neutral')state.className='neutral-result';
  line.append(name,state);container.append(line);
}
function verifyBranch(source,branch){
  const sha=branch?.commit?.sha;
  if(!shaPattern.test(sha)||branch.name!=='main')throw Error('اطلاعات شاخه اصلی معتبر نیست');
  return sha;
}
async function loadMain(source){
  const sha=verifyBranch(source,await read(API+source.repo+'/branches/main'));
  set(source.prefix+'-main',sha.slice(0,10));set(source.prefix+'-state','SHA تأیید شد');
  const report=checkReport(await read(API+source.repo+'/commits/'+sha+'/check-runs?filter=latest&per_page='+MAX_CHECKS),sha,MAX_CHECKS);
  set(source.prefix+'-checks',report.items.length+' از '+report.total+(report.partial?' (ناقص)':''));
  return {source,...report};
}
async function loadPRs(source){
  const data=await read(API+source.repo+'/pulls?state=open&sort=updated&direction=desc&per_page='+MAX_PRS);
  if(!Array.isArray(data)||data.length>MAX_PRS)throw Error('لیست PR معتبر نیست');
  for(const pr of data){
    if(!Number.isSafeInteger(pr.number)||pr.number<1||pr.number>9999999||pr.state!=='open'||pr.base?.repo?.full_name!==source.repo||!shaPattern.test(pr.head?.sha)||typeof pr.title!=='string'||pr.title.length>500)throw Error('اطلاعات PR معتبر نیست');
  }
  const list=$(source.prefix+'-pr-list');list.replaceChildren();
  if(!data.length)empty(source.prefix+'-pr-list','هیچ PR بازی در پاسخ GitHub وجود ندارد.');
  for(const pr of data){
    const line=document.createElement('div');line.className='pr-item';
    const link=document.createElement('a');link.href='https://github.com/'+source.repo+'/pull/'+pr.number;link.target='_blank';link.rel='noopener noreferrer';link.textContent='#'+pr.number+' · '+pr.title;
    const status=document.createElement('small');status.textContent=pr.draft?'پیش‌نویس':'باز';
    line.append(link,status);list.append(line);
  }
  set(source.prefix+'-prs',data.length+(data.length===MAX_PRS?'+':'')+' نمایشی');
  return {count:data.length,atLimit:data.length===MAX_PRS};
}
async function loadProfile(){
  const p=await read(PROFILE);
  if(p?.id!=='proffera'||p.repository!=='ibboabdoli-ai/Proffera')throw Error('پروفایل عمومی معتبر نیست');
  const off=p.connected===false&&p.mode==='read_only'&&['write','commit','push','merge','deploy','manageSecrets'].every(k=>p.permissions?.[k]===false);
  set('connection',off?'قطع':p.connected===true?'هشدار':'نامشخص');
  set('profile-state',off?'بر اساس پروفایل عمومی: connected=false، حالت فقط‌خواندنی و تمام مجوزهای تغییر غیرفعال‌اند. این به معنی کنترل مستقیم شبکه یا Supervisor نیست.':'پروفایل عمومی جداسازی کامل را تأیید نمی‌کند؛ تنظیمات را در GitHub بررسی کنید.');
}
async function loadSupervisor(){
  const repo='ibboabdoli-ai/Proffera';const pr=await read(API+repo+'/pulls/'+SUPERVISOR_PR);
  if(pr.number!==SUPERVISOR_PR||pr.base?.repo?.full_name!==repo||!shaPattern.test(pr.head?.sha)||!['open','closed'].includes(pr.state))throw Error('PR پایلوت معتبر نیست');
  const state=pr.merged===true||pr.merged_at?'ادغام شده':pr.state==='open'?'باز':'بسته';
  set('supervisor-state','PR #941: '+state+' · HEAD '+pr.head.sha.slice(0,10)+'؛ فقط شواهد CI، نه تأیید فعالیت لحظه‌ای Supervisor.');
  const report=checkReport(await read(API+repo+'/commits/'+pr.head.sha+'/check-runs?filter=latest&per_page=100'),pr.head.sha,100);
  const selected=report.items.filter(c=>/supervisor|governance|control-plane|worker/i.test(c.name)).slice(0,4);
  const list=$('supervisor-checks');list.replaceChildren();
  if(!selected.length)empty('supervisor-checks','در نتایج دریافت‌شده، بررسی مرتبطی پیدا نشد.');
  for(const item of selected)appendCheck(list,item,'PR #941');
  if(report.partial){const p=document.createElement('p');p.className='hint';p.textContent='این شواهد ناقص‌اند؛ '+report.items.length+' از '+report.total+' بررسی دریافت شده است.';list.append(p)}
}
function reset(){
  for(const id of ['success','failed','prs-total','hub-main','proffera-main','hub-checks','proffera-checks','hub-prs','proffera-prs'])set(id,'—');
  for(const id of ['hub-state','proffera-state','connection'])set(id,'نامشخص');
  set('profile-state','وضعیت هنوز تأیید نشده است.');set('supervisor-state','اطلاعات عمومی PR هنوز دریافت نشده است.');
  empty('hub-pr-list','داده‌ای دریافت نشده است.');empty('proffera-pr-list','داده‌ای دریافت نشده است.');
  empty('check-list','داده‌ای دریافت نشده است.');empty('supervisor-checks','شواهد بررسی نشده‌اند.');
}
async function refresh(){
  if(running)return;
  running=true;$('refresh').disabled=true;set('notice','در حال خواندن GitHub؛ اطلاعات قبلی بازنشانی شد…');reset();
  try{
    const tasks=[...SOURCES.map(loadMain),...SOURCES.map(loadPRs),loadProfile(),loadSupervisor()];
    const results=await Promise.allSettled(tasks);
    const mainReports=results.slice(0,2),prReports=results.slice(2,4);
    const issues=[];let passes=0,attention=0,complete=0,partial=false;
    const list=$('check-list');list.replaceChildren();
    for(let i=0;i<mainReports.length;i++){
      const outcome=mainReports[i];const source=SOURCES[i];
      if(outcome.status==='rejected'){
        issues.push(source.label+' main/CI: دریافت تأیید نشد');set(source.prefix+'-state','نامشخص');continue;
      }
      complete++;const report=outcome.value;partial ||=report.partial;
      for(const c of report.items){const r=result(c);if(r.kind==='good')passes++;else if(r.kind==='bad')attention++;}
      for(const c of report.items.slice(0,6))appendCheck(list,c,source.label+' main');
      if(report.partial||report.items.length>6){
        const p=document.createElement('p');p.className='hint';
        p.textContent=source.label+': '+Math.min(6,report.items.length)+' مورد نمایش داده شده از '+report.items.length+' مورد خوانده‌شده'+(report.partial?'؛ تعداد کل '+report.total+' است و آمار ناقص است.':'.');list.append(p);
      }
    }
    if(!list.childNodes.length)empty('check-list','هیچ بررسی معتبری دریافت نشد.');
    if(complete){const suffix=(complete<2||partial)?' (ناقص)':'';set('success',passes+suffix);set('failed',attention+suffix)}
    if(partial)issues.push('بررسی‌های main فقط به‌صورت نمونه قابل مشاهده‌اند');
    let openPRs=0,prSources=0,prAtLimit=false;
    for(let i=0;i<2;i++){
      if(prReports[i].status==='fulfilled'){
        prSources++;openPRs+=prReports[i].value.count;prAtLimit ||= prReports[i].value.atLimit;
      }else issues.push(SOURCES[i].label+' PRها: دریافت تأیید نشد');
    }
    if(prSources)set('prs-total',openPRs+(prAtLimit?'+':'')+(prSources!==2?' (ناقص)':''));
    if(results[4].status==='rejected')issues.push('پروفایل امنیتی: دریافت تأیید نشد');
    if(results[5].status==='rejected')issues.push('شواهد PR #941: دریافت تأیید نشد');
    set('notice',issues.length?'اطلاعات کامل نیست: '+issues.join('؛ '):'اطلاعات عمومی GitHub دریافت شد. نتایج، تأیید ادغام یا سلامت عملیاتی نیستند.');
    set('updated','آخرین تلاش: '+new Date().toLocaleString('fa-IR'));
  }finally{$('refresh').disabled=false;running=false}
}
$('refresh').addEventListener('click',()=>{void refresh()});
void refresh();
})();