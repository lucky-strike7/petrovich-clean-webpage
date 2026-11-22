import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from'node:fs/promises';
import{runInNewContext}from'node:vm';
const source=await readFile(new URL('../fresh/cookies.js',import.meta.url),'utf8');
function sandbox(host,choice,options={}){
 const handlers={},scripts=[],nodes=[];
 const element=()=>({children:[],classList:{add(){}},setAttribute(){},append(...children){this.children.push(...children);},addEventListener(name,fn){this[name]=fn;},remove(){this.removed=true;}});
 const document={currentScript:{src:'https://'+host+'/fresh/cookies.js'},readyState:'complete',head:{append:script=>scripts.push(script)},body:{append:bar=>nodes.push(bar)},createElement:element,addEventListener:(name,fn)=>handlers[name]=fn};
 const context={document,location:{hostname:host,pathname:options.path||'/'},navigator:{doNotTrack:options.dnt},__pbMini:options.loaded,__pbMiniLoading:options.loading,localStorage:{getItem:()=>choice,setItem:(_,value)=>choice=value},URL,Date,requestAnimationFrame:fn=>fn()};context.window=context;
 runInNewContext(source,context);
 return{context,handlers,scripts,nodes};
}
test('analytics never loads on previews even with previously accepted consent',()=>{
 for(const host of ['localhost','127.0.0.1','preview.petrovichbrothers.ru','new.petrovichbrothers.ru','old.petrovichbrothers.ru','lucky-strike7.github.io'])assert.equal(sandbox(host,'ok').scripts.length,0);
});
test('production initializes automatically without a banner or saved-choice dependency',()=>{
 for(const host of ['petrovichbrothers.ru','www.petrovichbrothers.ru'])for(const choice of [null,'ok','declined']){
  const s=sandbox(host,choice);assert.equal(s.scripts.length,2);assert.equal(s.context.ym.a.length,1);assert.equal(s.nodes.length,0);
  assert.deepEqual([...s.context.ym.a[0]].slice(0,2),[46078563,'init']);
 }
});
test('goal allowlist only sends event names, not arbitrary payloads',()=>{
 const s=sandbox('petrovichbrothers.ru','ok');s.handlers['pb:goal']({detail:{name:'callback_success',phone:'secret'}});s.handlers['pb:goal']({detail:{name:'arbitrary'}});
 assert.equal(s.context.ym.a.length,2);assert.deepEqual([...s.context.ym.a[1]],[46078563,'reachGoal','callback_success']);
});

test('PB Search uses the existing same-origin collector and respects DNT/admin/deduplication',()=>{
 const sourceFor=s=>s.scripts.filter(x=>x.src==='/pb-search/t/script.js');
 for(const host of ['petrovichbrothers.ru','www.petrovichbrothers.ru']){
  const s=sandbox(host,null);assert.equal(sourceFor(s).length,1);assert.equal(sourceFor(s)[0].async,true);
 }
 for(const options of [{dnt:'1'},{path:'/pb-search/'},{loaded:true},{loading:true}])assert.equal(sourceFor(sandbox('petrovichbrothers.ru',null,options)).length,0);
});
