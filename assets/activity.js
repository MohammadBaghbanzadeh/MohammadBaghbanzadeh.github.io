import {decryptActivity} from './activity-crypto.js';
const persian=new Intl.NumberFormat('fa-IR');
const formatDate=date=>new Intl.DateTimeFormat('fa-IR',{dateStyle:'full',timeZone:'Asia/Tehran'}).format(new Date(date+'T12:00:00Z'));
const dayIndex=date=>(new Date(date+'T12:00:00Z').getUTCDay()+1)%7;
const level=n=>n===0?0:n===1?1:n<=3?2:n<=6?3:4;
let revision=0;
export function clearActivity() {
  revision++;
  document.getElementById('activity-section')?.remove();
}
export async function loadActivity(config,parent) {
  clearActivity();
  if (!config?.privateKeyJwk) return;
  const request=revision;
  const section=document.createElement('section');section.id='activity-section';section.className='activity-section';
  const heading=document.createElement('h2');heading.textContent='تقویم فعالیت‌های پایان‌نامه';
  const status=document.createElement('p');status.className='activity-status';status.textContent='در حال دریافت فعالیت‌ها…';
  section.append(heading,status);parent.append(section);
  try {
    const response=await fetch('data/activity.enc.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    if (!response.ok) throw new Error('Unavailable');
    const data=await decryptActivity(await response.json(),config.privateKeyJwk);
    if (request!==revision || !section.isConnected) return;
    if (data.version!==1 || !Array.isArray(data.days)) throw new Error('Invalid activity');
    const records=new Map(data.days.map(day=>[day.date,day]));
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const end=new Date(today+'T12:00:00Z'),first=new Date(end);first.setUTCDate(first.getUTCDate()-364);
    const firstDate=first.toISOString().slice(0,10);let total=0,active=0;
    const scroll=document.createElement('div');scroll.className='activity-scroll';scroll.tabIndex=0;scroll.setAttribute('aria-label','تقویم روزانه؛ برای دیدن همهٔ روزها به چپ و راست حرکت کنید');
    const grid=document.createElement('div');grid.className='activity-grid';grid.setAttribute('aria-label','فعالیت روزانه در یک سال اخیر');
    for (let i=0;i<dayIndex(firstDate);i++){const spacer=document.createElement('span');spacer.className='activity-spacer';grid.append(spacer);}
    const detail=document.createElement('div');detail.className='activity-detail';detail.setAttribute('aria-live','polite');
    const hint=document.createElement('p');hint.textContent='برای دیدن تاریخ و کارهای هر روز، مربع آن روز را انتخاب کنید.';detail.append(hint);
    for (let current=new Date(first);current<=end;current.setUTCDate(current.getUTCDate()+1)) {
      const date=current.toISOString().slice(0,10),record=records.get(date),count=record?.count||0;
      total+=count;if(count)active++;
      const label=formatDate(date)+' · '+persian.format(count)+' کامیت';
      const button=document.createElement('button');button.type='button';button.className='activity-cell';button.dataset.level=level(count);button.title=label;button.setAttribute('aria-label',label);
      button.addEventListener('click',()=>{
        detail.replaceChildren();const title=document.createElement('p');title.textContent=label;detail.append(title);
        if (count) {const list=document.createElement('ul');for (const commit of record.commits){const item=document.createElement('li');const message=document.createElement('bdi');message.textContent=commit.message;item.append(message);list.append(item);}detail.append(list);}
        else {const empty=document.createElement('p');empty.textContent='کامیتی برای این روز ثبت نشده است.';detail.append(empty);}
      });grid.append(button);
    }
    scroll.append(grid);
    const legend=document.createElement('div');legend.className='activity-legend';legend.append(document.createTextNode('کمتر'));
    for(let i=0;i<5;i++){const square=document.createElement('span');square.className='activity-cell';square.dataset.level=i;square.setAttribute('aria-hidden','true');legend.append(square);}legend.append(document.createTextNode('بیشتر'));
    status.textContent=persian.format(total)+' کامیت در '+persian.format(active)+' روز فعال · یک سال اخیر';
    const range=document.createElement('div');range.className='activity-range';range.append(document.createTextNode(formatDate(firstDate)));const last=document.createElement('span');last.textContent=formatDate(today);range.append(last);
    const note=document.createElement('p');note.className='activity-note';note.textContent='هر مربع یک روز است؛ سبز پررنگ‌تر یعنی کامیت بیشتر. زمان‌ها به وقت تهران‌اند و همگام‌سازی خودکار حدود هر ساعت انجام می‌شود. آخرین همگام‌سازی: '+new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tehran'}).format(new Date(data.updatedAt));
    section.append(scroll,range,legend,detail,note);
  } catch {if (request===revision && section.isConnected) status.textContent='تقویم فعالیت‌ها فعلاً در دسترس نیست؛ کمی بعد دوباره وارد شوید.';}
}
