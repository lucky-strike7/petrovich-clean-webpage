import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/telegram-relay.js';
test('Telegram relay requires authentication, validates payload and propagates delivery failure', async()=>{
 const saved={...process.env},originalFetch=globalThis.fetch;
 const invoke=async(method,secret,body)=>{let status,result;const res={setHeader(){},status(n){status=n;return this},json(v){result=v}};await handler({method,headers:{'x-pb-relay-secret':secret},body},res);return {status,result}};
 try{
 process.env.TELEGRAM_RELAY_SECRET='test-secret';process.env.TELEGRAM_BOT_TOKEN='test-token';process.env.TELEGRAM_CHAT_ID='test-chat';
 globalThis.fetch=()=>{throw new Error('Unauthenticated calls must not send')};
 assert.equal((await invoke('GET','','')).status,405);
 assert.equal((await invoke('POST','wrong',{phone:'+1234567890'})).status,401);
 assert.equal((await invoke('POST','test-secret',{phone:'bad'})).status,400);
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.telegram.org/bottest-token/sendMessage');assert.equal(JSON.parse(options.body).chat_id,'test-chat');return {ok:true,json:async()=>({ok:true})}};
 assert.deepEqual(await invoke('POST','test-secret',{phone:'+1234567890'}),{status:200,result:{success:true}});
 globalThis.fetch=async()=>({ok:false,json:async()=>({ok:false})});
 assert.equal((await invoke('POST','test-secret',{phone:'+1234567890'})).status,503);
 }finally{globalThis.fetch=originalFetch;for(const k of ['TELEGRAM_RELAY_SECRET','TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID']){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}}
});
