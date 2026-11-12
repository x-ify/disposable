import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText, inspect } from './scan.mjs';
test('scanner gives finding codes without exposing matched secret material',()=>{
 const fake='ghp_'+'A'.repeat(36);const found=scanText(`token ${fake}\ncurl https://example.org/install | sh`);
 assert.deepEqual(found,['credential','remote-execution']);assert.ok(!JSON.stringify(found).includes(fake));
 assert.deepEqual(scanText('Rename copied files after confirmation.'),[]);
});
test('bounded GitHub checks pin a revision and skill validation fails closed',async t=>{
 const sha='a'.repeat(40);let calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push([String(url),options]);
  if(String(url).includes('/commits/'))return Response.json({sha});
  if(String(url).includes('/contents/'))return Response.json([{name:'SKILL.md',type:'file',path:'tools/SKILL.md',size:40}]);
  return new Response('---\nname: example\n---\nSafe instructions.');
 });
 const data={type:'skill',sourceUrl:'https://github.com/example/project',sourcePath:'tools',sourceRef:sha,title:'t',summary:'s',example:'e',requirements:'r',steps:'s',limits:'l',body:'b',cost:'c',support:'s'};
 const scan=await inspect(data);assert.equal(scan.status,'partial');assert.equal(scan.commit,sha);assert.deepEqual(scan.files,['tools/SKILL.md']);assert.equal(calls.length,3);assert.ok(calls.every(([,o])=>o.redirect==='error'));
 t.mock.restoreAll();t.mock.method(globalThis,'fetch',async()=>new Response('unavailable',{status:404}));
 const failed=await inspect({...data,sourcePath:''});assert.equal(failed.status,'held');assert.equal(failed.sourceError,true);
});

test('an external rule is read first and holds the tool when the source has no rule file', async () => {
 const sha='a'.repeat(40), data={type:'rule',sourceUrl:'https://github.com/example/project',sourcePath:'.cursor/rules',sourceRef:sha};
 const listing=names=>async url=>String(url).includes('/commits/')?Response.json({sha}):String(url).includes('/contents/')?Response.json(names.map(name=>({name,type:'file',path:`.cursor/rules/${name}`,size:20}))):new Response('- Ask before deleting files.');
 const many=['a.md','b.md','c.md','d.md','e.md','f.md','g.md','h.md','review.mdc'];
 const found=await inspect(data,listing(many));assert.equal(found.status,'partial');assert.equal(found.files[0],'.cursor/rules/review.mdc');assert.equal(found.files.length,8);
 const missing=await inspect(data,listing(['notes.md']));assert.equal(missing.sourceError,true);assert.equal(missing.status,'held');
});

test('source inspection refuses unpinned or mismatched revisions and oversized bodies', async () => {
 const sha='a'.repeat(40), data={type:'program',sourceUrl:'https://github.com/example/project',sourcePath:'',sourceRef:sha};
 let calls=0;
 const mismatch=async()=>{calls++;return Response.json({sha:'b'.repeat(40)});};
 assert.equal((await inspect({...data,sourceRef:''},mismatch)).sourceError,true);assert.equal(calls,0);
 assert.equal((await inspect(data,mismatch)).sourceError,true);assert.equal(calls,1);
 const oversized=async url=>String(url).includes('/commits/')?new Response('x'.repeat(350001)):new Response('');
 assert.equal((await inspect(data,oversized)).status,'held');
});
