import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('release cleanup protects current, rollback, mounted and unrelated resources',()=>{
 const r=spawnSync('python3',[new URL('./cleanup_test.py',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr+r.stdout);
});
