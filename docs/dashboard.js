
(() => {
  'use strict';
  const API = 'https://api.github.com/repos/';
  const PROFILE_URL = 'https://raw.githubusercontent.com/ibboabdoli-ai/ruflo-hub/main/profiles/proffera.json';
  const SOURCES = Object.freeze([
    Object.freeze({key:'hub',repo:'ibboabdoli-ai/ruflo-hub',pr:4}),
    Object.freeze({key:'proffera',repo:'ibboabdoli-ai/Proffera',pr:941})
  ]);
  const allowed = new Set([
    `${API}ibboabdoli-ai/ruflo-hub/pulls/4`,
    `${API}ibboabdoli-ai/Proffera/pulls/941`,
    PROFILE_URL
  ]);
  const $ = id => document.getElementById(id);
  const set = (id,text) => {$(id).textContent = String(text);};
  const shaPattern = /^[0-9a-f]{40}$/;
  const buckets = () => ({pass:0,skip:0,pending:0,fail:0});
  const fmt = value => typeof value === 'number' ? value.toLocaleString('fa-IR') : '—';
  const shortSha = sha => shaPattern.test(sha||'') ? sha.slice(0,8) : '—';
  let busy = false;
  function allowCheckUrl(repo,sha){
    if (!SOURCES.some(s=>s.repo===repo) || !shaPattern.test(sha))throw Error('نشانی بررسی قابل تأیید نیست');
    const url = `${API}${repo}/commits/${sha}/check-runs?filter=latest&per_page=100`;
    allowed.add(url);return url;
  }
  async function getJson(url){
    if(!allowed.has(url))throw Error('درخواست خارج از فهرست مجاز');
    const response = await fetch(url,{
      method:'GET',mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',
      referrerPolicy:'no-referrer',headers:{Accept:'application/vnd.github+json'},
      signal:AbortSignal.timeout(12000)
    });
    if(!response.ok)throw Error(response.status===403?'محدودیت GitHub (403)':`خطای دریافت (${response.status})`);
    return response.json();
  }
  function displayPr(source,pr){
    if(!pr || pr.number!==source.pr || pr.base?.repo?.full_name!==source.repo || !shaPattern.test(pr.head?.sha))
      throw Error('شماره پروژه یا نسخه PR تأیید نشد');
    const merged = pr.merged===true || pr.merged_at!=null;
    const state=merged?'ادغام‌شده':pr.state==='open'?(pr.draft?'پیش‌نویس':'باز'):pr.state==='closed'?'بسته':'نامشخص';
    const id=source.key==='hub'?'hubStatus':'profferaStatus';
    set(id,state);
    $(id).className='chip '+(merged?'good':pr.state==='open'?'warn':'');
    set(source.key==='hub'?'hubSha':'profferaSha',shortSha(pr.head.sha));
    if(source.key==='proffera')set('profferaFiles',Number.isSafeInteger(pr.changed_files)?fmt(pr.changed_files):'—');
    return pr.head.sha;
  }
  function getClassification(item){
    if(item.status!=='completed')return 'pending';
    if(item.conclusion==='success')return 'pass';
    if(item.conclusion==='skipped'||item.conclusion==='neutral')return 'skip';
    return 'fail';
  }
  function checkReport(repo,sha,data){
    if(!Number.isSafeInteger(data?.total_count)||data.total_count<0||data.total_count>100||
       !Array.isArray(data.check_runs)||data.check_runs.length!==data.total_count)
      throw Error('فهرست بررسی‌ها ناقص یا بیش از ۱۰۰ مورد است');
    const counts=buckets();
    const items=data.check_runs.map(check=>{
      if(check.head_sha!==sha||typeof check.name!=='string'||!['completed','queued','in_progress','waiting','pending','requested'].includes(check.status))
        throw Error('نتیجه بررسی مربوط به نسخه متفاوت است');
      const kind=getClassification(check);counts[kind]++;
      return {kind,name:check.name,repo,status:check.status,conclusion:check.conclusion};
    });
    return {counts,items};
  }
  function resetProject(source){
    const root=source.key==='hub'?'hub':'proffera';
    set(root+'Status','نامشخص');$(root+'Status').className='chip';
    set(root+'Sha','—');
    if(root==='hub')set('hubChecks','—');else set('profferaFiles','—');
  }
  function renderChecks(reports){
    if(!reports.length){
      ['passedCount','issueCount','legendPass','legendSkip','legendPending','legendFail'].forEach(id=>set(id,'—'));
      set('checkDescription','نتیجه‌ای برای نمایش قابل تأیید نیست');set('checkSummary','تأییدنشده');
      $('checkBar').replaceChildren();$('checkList').replaceChildren();
      const p=document.createElement('p');p.className='note';p.textContent='برای دریافت دوباره از دکمه به‌روزرسانی استفاده کنید.';$('checkList').append(p);return;
    }
    const totals=buckets();for(const r of reports)for(const key of Object.keys(totals))totals[key]+=r.counts[key];
    set('passedCount',fmt(totals.pass));set('issueCount',fmt(totals.fail));
    for(const [id,key] of [['legendPass','pass'],['legendSkip','skip'],['legendPending','pending'],['legendFail','fail']])set(id,fmt(totals[key]));
    set('checkDescription',`بررسی‌های دریافت‌شده از ${fmt(reports.length)} مخزن؛ نسخه دقیق هر PR`);
    const all=totals.pass+totals.skip+totals.pending+totals.fail;
    set('checkSummary',totals.fail?'نیازمند بررسی':totals.pending?'در حال اجرا':all?'دریافت شد':'بررسی ندارد');
    $('checkSummary').className='chip '+(totals.fail?'danger':totals.pending?'warn':'good');
    $('checkBar').replaceChildren();for(const kind of ['pass','skip','pending','fail'])if(totals[kind]&&all){const span=document.createElement('span');span.className={pass:'ok',skip:'skipped',pending:'pending',fail:'fail'}[kind];span.style.width=`${totals[kind]/all*100}%`;$('checkBar').append(span);}
    const list=reports.flatMap(r=>r.items).slice(0,8);$('checkList').replaceChildren();
    if(!list.length){const p=document.createElement('p');p.className='note';p.textContent='برای این نسخه بررسی ثبت نشده است.';$('checkList').append(p);}
    for(const item of list){
      const row=document.createElement('div');row.className='check';
      const dot=document.createElement('span');dot.className='indicator '+(item.kind==='pass'?'good':item.kind==='fail'?'failed':item.kind==='pending'?'pending':'');dot.setAttribute('aria-hidden','true');
      const name=document.createElement('span');name.className='check-name';name.textContent=`${item.repo.split('/')[1]} · ${item.name}`;
      const status=document.createElement('span');status.className='check-badge';status.textContent={pass:'موفق',skip:'اجرا نشده',pending:'در انتظار',fail:'ناموفق/لغو'}[item.kind];
      row.append(dot,name,status);$('checkList').append(row);
    }
  }
  async function fetchProject(source){
    const pr=await getJson(`${API}${source.repo}/pulls/${source.pr}`);
    const sha=displayPr(source,pr);
    const result=checkReport(source.repo,sha,await getJson(allowCheckUrl(source.repo,sha)));
    if(source.key==='hub')set('hubChecks',fmt(result.items.length));
    return result;
  }
  async function fetchProfile(){
    const profile=await getJson(PROFILE_URL);
    if(profile?.id!=='proffera'||profile.repository!=='ibboabdoli-ai/Proffera'||typeof profile.connected!=='boolean')
      throw Error('پروفایل قابل تأیید نیست');
    const off=!profile.connected&&profile.mode==='read_only'&&profile.permissions?.write===false&&profile.permissions?.merge===false&&profile.permissions?.deploy===false;
    set('connectionValue',off?'قطع':profile.connected?'متصل':'نامشخص');
    set('connectionCaption',off?'پروفایل اصلی فقط‌خواندنی است':profile.connected?'هشدار: پروفایل متصل شده است':'مجوزها نیاز به بررسی دارند');
    set('policyTitle',off?'Proffera: اتصال غیرفعال و فقط‌خواندنی':profile.connected?'هشدار: اتصال در پروفایل فعال است':'پروفایل نیازمند بررسی');
    set('policyText',off?'بر اساس فایل عمومی profiles/proffera.json در شاخه main؛ این صفحه هیچ مجوز اجرایی ندارد.':'وضعیت فعلی را در GitHub بررسی کنید. این داشبورد خودش دسترسی عملیاتی ندارد.');
  }
  async function refresh(){
    if(busy)return;busy=true;
    const button=$('refresh');button.disabled=true;button.setAttribute('aria-busy','true');
    $('liveStatus').className='live';set('liveText','در حال دریافت...');$('errorBox').classList.add('hidden');
    SOURCES.forEach(resetProject);renderChecks([]);
    set('connectionValue','نامشخص');set('connectionCaption','در حال بررسی پروفایل...');
    set('policyTitle','اتصال Proffera: نامشخص');set('policyText','در حال خواندن پروفایل عمومی...');
    const answers=await Promise.allSettled([...SOURCES.map(fetchProject),fetchProfile()]);
    const reports=answers.slice(0,2).filter(r=>r.status==='fulfilled').map(r=>r.value);
    const errors=answers.map((r,i)=>r.status==='rejected'?`${i===0?'RuFlo Hub':i===1?'Proffera':'پروفایل'}: ${r.reason instanceof Error?r.reason.message:'دریافت ناموفق'}`:null).filter(Boolean);
    renderChecks(reports);
    if(errors.length){$('errorBox').textContent=`بخشی از داده‌ها تأیید نشد: ${errors.join(' | ')}`;$('errorBox').classList.remove('hidden');}
    $('liveStatus').className='live '+(errors.length?'error':'ok');set('liveText',errors.length?'داده‌های ناقص':'اطلاعات دریافت شد');
    set('lastUpdated',`آخرین تلاش: ${new Date().toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short'})}`);
    button.disabled=false;button.removeAttribute('aria-busy');busy=false;
  }
  $('refresh').addEventListener('click',()=>{void refresh();});
  void refresh();
})();
