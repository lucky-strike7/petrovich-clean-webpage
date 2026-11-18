import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from'node:fs/promises';
import{runInNewContext}from'node:vm';
const source=await readFile(new URL('../fresh/cookies.js',import.meta.url),'utf8');
function sandbox(host,choice){
 const handlers={},scripts=[],nodes=[];
 const element=()=>({children:[],classList:{add(){}},setAttribute(){},append(...children){this.children.push(...children);},addEventListener(name,fn){this[name]=fn;},remove(){this.removed=true;}});
 const document={currentScript:{src:'https://'+host+'/fresh/cookies.js'},readyState:'complete',head:{append:script=>scripts.push(script)},body:{append:bar=>nodes.push(bar)},createElement:element,addEventListener:(name,fn)=>handlers[name]=fn};
 const context={document,location:{hostname:host},localStorage:{getItem:()=>choice,setItem:(_,value)=>choice=value},URL,Date,requestAnimationFrame:fn=>fn()};context.window=context;
 runInNewContext(source,context);
 return{context,handlers,scripts,nodes};
}
test('analytics never loads on previews even with previously accepted consent',()=>{
 for(const host of ['localhost','127.0.0.1','preview.petrovichbrothers.ru','lucky-strike7.github.io'])assert.equal(sandbox(host,'ok').scripts.length,0);
});
test('production waits for consent and decline does not initialize',()=>{
 let s=sandbox('petrovichbrothers.ru',null);assert.equal(s.scripts.length,0);s.nodes[0].children.find(n=>n.textContent==='Без аналитики').click();assert.equal(s.scripts.length,0);
 s=sandbox('petrovichbrothers.ru',null);const accept=s.nodes[0].children.find(n=>n.textContent==='Хорошо');accept.click();accept.click();assert.equal(s.scripts.length,1);assert.equal(s.context.ym.a.length,1);
});
test('goal allowlist only sends event names, not arbitrary payloads',()=>{
 const s=sandbox('petrovichbrothers.ru','ok');s.handlers['pb:goal']({detail:{name:'callback_success',phone:'secret'}});s.handlers['pb:goal']({detail:{name:'arbitrary'}});
 assert.equal(s.context.ym.a.length,2);assert.deepEqual([...s.context.ym.a[1]],[46078563,'reachGoal','callback_success']);
});
