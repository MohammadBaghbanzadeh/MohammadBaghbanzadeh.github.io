import {readFile,writeFile,mkdtemp,rm,chmod} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {encryptActivity} from '../assets/activity-crypto.js';

export function dateInTehran(value) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function summarize(commits,now=new Date()) {
  const today=dateInTehran(now),cutoff=new Date(today+'T12:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-364);
  const start=cutoff.toISOString().slice(0,10),days=new Map(),seen=new Set();
  for (const commit of commits) {
    if (seen.has(commit.sha)) continue;
    seen.add(commit.sha);
    const date=dateInTehran(commit.date);
    if (date<start || date>today) continue;
    const entries=days.get(date)||[];
    entries.push({sha:commit.sha.slice(0,12),message:commit.message.slice(0,300)});days.set(date,entries);
  }
  return {version:1,timezone:'Asia/Tehran',start,end:today,updatedAt:now.toISOString(),metric:'commits',days:[...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,commits])=>({date,count:commits.length,commits:commits.sort((a,b)=>a.sha.localeCompare(b.sha))}))};
}
async function collect() {
  if (process.env.ACTIVITY_LOCAL_REPOSITORY) {
    const output=execFileSync('git',['-C',process.env.ACTIVITY_LOCAL_REPOSITORY,'log','--since=370 days ago','--format=%H%x00%cI%x00%s','HEAD'],{encoding:'utf8'});
    return output.trim().split('\n').filter(Boolean).map(line=>{const [sha,date,message]=line.split('\0');return {sha,date,message};});
  }
  const repository=process.env.ACTIVITY_REPOSITORY,key=process.env.ACTIVITY_READ_KEY;
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !key) throw new Error('Activity access is not configured');
  const temporary=await mkdtemp(join(tmpdir(),'private-activity-'));await chmod(temporary,0o700);
  try {
    const keyFile=join(temporary,'read-key'),hosts=join(temporary,'known_hosts');
    await writeFile(keyFile,key+'\n',{mode:0o600});
    const response=await fetch('https://api.github.com/meta',{headers:{'User-Agent':'portfolio-activity'}});
    if (!response.ok) throw new Error('Unable to verify SSH host');
    const meta=await response.json();await writeFile(hosts,meta.ssh_keys.map(k=>'github.com '+k).join('\n')+'\n',{mode:0o600});
    // mkdtemp paths originate from the OS, never commit data or user input.
    const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
    const env={...process.env,GIT_SSH_COMMAND:`ssh -i ${quote(keyFile)} -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${quote(hosts)}`};
    const options={cwd:temporary,env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:20*1024*1024};
    execFileSync('git',['init','--bare','.'],options);
    execFileSync('git',['fetch','--quiet','--filter=blob:none',`git@github.com:${repository}.git`,'HEAD'],options);
    const output=execFileSync('git',['log','--since=370 days ago','--format=%H%x00%cI%x00%s','FETCH_HEAD'],options);
    return output.trim().split('\n').filter(Boolean).map(line=>{const [sha,date,message]=line.split('\0');return {sha,date,message};});
  } finally {await rm(temporary,{recursive:true,force:true});}
}
if (process.argv[1]?.endsWith('/activity.mjs') || process.argv[1]==='scripts/activity.mjs') {
  try {
    const payload=summarize(await collect());
    // Skip unchanged snapshots. Dates advance even on days without commits.
    const digestInput=JSON.stringify({...payload,updatedAt:undefined});
    if (!process.env.ACTIVITY_READ_KEY) throw new Error('Activity access is not configured');
    const digest=createHmac('sha256',process.env.ACTIVITY_READ_KEY).update('activity-fingerprint:v1\0'+digestInput).digest('hex');
    const old=await readFile('data/activity.digest','utf8').catch(()=>'');
    if (old.trim()===digest) console.log('Encrypted activity is already current.');
    else {
      const publicKey=JSON.parse(await readFile('assets/activity-public-key.json','utf8'));
      await writeFile('data/activity.enc.json',JSON.stringify(await encryptActivity(payload,publicKey))+'\n');
      await writeFile('data/activity.digest',digest+'\n');
      console.log('Encrypted activity updated.');
    }
  } catch {console.error('Activity update failed. Check repository access and workflow configuration.');process.exitCode=1;}
}
