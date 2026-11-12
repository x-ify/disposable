// Build-time source checks. The text rules live in the Disposable skill's checker, the single source shared with pull request checks.
import { scanText, githubRepo, isRuleFile, RULES_VERSION } from '../../skills/disposable/scripts/check.mjs';
export { scanText };
async function bounded(fetchImpl, url, accept = 'application/vnd.github+json') {
 const response = await fetchImpl(url, { redirect:'error', headers:{Accept:accept,'User-Agent':'Disposable-source-check/0.1'}, signal:AbortSignal.timeout(8000) });
 if (!response.ok) throw new Error('source-unavailable');
 const reader = response.body.getReader(); let size=0; const parts=[];
 while (true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>350000) {await reader.cancel();throw new Error('source-limit');} parts.push(value); }
 const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 return new TextDecoder().decode(bytes);
}
export async function inspect(data, fetchImpl = globalThis.fetch) {
 const submitted = [data.title,data.summary,data.example,data.requirements,data.steps,data.limits,data.body,data.cost,data.support].join('\n');
 const report = { version:RULES_VERSION, status:'clear', findings:scanText(submitted), files:[], bytes:new TextEncoder().encode(submitted).length, commit:null, sourceURL:null, partial:false, sourceError:false, scope:'submitted text only; no dependency or binary analysis' };
 if (data.sourceUrl) {
   const repo=githubRepo(data.sourceUrl);
   if(!repo || !/^[0-9a-f]{40}$/.test(data.sourceRef || '')) {report.sourceError=true;} else try {
     const api=`https://api.github.com/repos/${repo.owner}/${repo.repo}`;
     const commit=JSON.parse(await bounded(fetchImpl, `${api}/commits/${encodeURIComponent(data.sourceRef)}`));
     if(commit.sha !== data.sourceRef) throw new Error('invalid-sha');
     report.commit=commit.sha;
     report.sourceURL=`${repo.url}/tree/${commit.sha}${data.sourcePath?'/'+data.sourcePath.split('/').map(encodeURIComponent).join('/'):''}`;
     const path=(data.sourcePath || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
     const listing=JSON.parse(await bounded(fetchImpl, `${api}/contents/${path}?ref=${commit.sha}`));
     const items=Array.isArray(listing)?listing:[listing];
     const candidates=items.filter(f=>typeof f.path==='string' && !f.path.split('/').some(p=>p==='..'||p==='.'||!p) && !/[\\?#\x00-\x1f]/.test(f.path) && f.type==='file' && f.size<=65000 && /(?:\.(?:md|mdc|txt|js|mjs|ts|tsx|jsx|py|sh|json|toml|yaml|yml|html|css)|LICENSE)$/i.test(f.name));
     const rank=f=>f.name==='SKILL.md'?0:isRuleFile(f.name)?1:2; // the files that show the type are read first
     candidates.sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
     report.partial=true; // Only immediate text files in the selected folder; never a complete repository audit.
     for(const f of candidates.slice(0,8)) {
       if(report.bytes+f.size>256000) break;
       const safePath=f.path.split('/').map(encodeURIComponent).join('/');
       const text=await bounded(fetchImpl, `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${commit.sha}/${safePath}`,'text/plain');
       if(report.bytes+new TextEncoder().encode(text).length>256000) throw new Error('source-limit');
       report.files.push(f.path);report.bytes+=new TextEncoder().encode(text).length;
       report.findings.push(...scanText(text));
     }
     if(!report.files.length || (data.type==='skill' && !report.files.some(p=>p.split('/').at(-1)==='SKILL.md')) || (data.type==='rule' && !report.files.some(isRuleFile))) report.sourceError=true;
   } catch { report.sourceError=true; }
 }
 report.findings=[...new Set(report.findings)];
 report.status=report.findings.length || report.sourceError ? 'held' : report.partial ? 'partial':'clear';
 return report;
}
