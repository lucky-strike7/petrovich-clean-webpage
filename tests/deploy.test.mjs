import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,copyFile,symlink,readlink,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const commit='a'.repeat(40);
async function fixture(t){
 const base=await realpath(await mkdtemp(join(tmpdir(),'pb-deploy-'))),bin=join(base,'bin'),release=join(base,'releases',commit),previous=join(base,'releases/old/deploy/compose.yml');
 for(const dir of [bin,join(release,'deploy'),join(release,'scripts'),join(base,'releases/old/deploy'),join(base,'state')])await mkdir(dir,{recursive:true});
 t.after(()=>rm(base,{recursive:true,force:true}));
 await copyFile(new URL('../deploy/publish.sh',import.meta.url),join(release,'deploy/publish.sh'));
 await writeFile(join(release,'deploy/compose.yml'),'');await writeFile(join(release,'scripts/check-release.mjs'),'');await writeFile(previous,'');await symlink('releases/old',join(base,'current'));
 const scripts={
 flock:'exit 0',sleep:'exit 0',
 git:'count=$(cat "$TEST_BASE/git-count" 2>/dev/null || echo 0); count=$((count+1)); echo "$count" > "$TEST_BASE/git-count"; if [[ "${TEST_STALE:-}" == 1 && "$count" -gt 1 ]]; then echo "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb refs/heads/main"; else echo "$TEST_COMMIT refs/heads/main"; fi',
 docker:`case "$1" in
 inspect) if [[ "$*" == *com.docker.compose.project.config_files* ]]; then echo "$TEST_PREVIOUS"; elif [[ "\${TEST_SAME_COMMIT:-}" == 1 ]]; then echo petrovich-clean:commit-aaaaaaaaaaaa; else echo 'old-image:stable'; fi ;;
 image) echo "$TEST_COMMIT" ;;
 run) echo candidate ;;
 exec) if [[ "$*" == *'pb-website node'* ]]; then [[ "\${TEST_PROD_FAIL:-}" != 1 ]]; else [[ "\${TEST_CANDIDATE_FAIL:-}" != 1 ]]; fi ;;
 compose) echo "$PB_RELEASE" >> "$TEST_BASE/compose-calls" ;;
 rm) exit 0 ;;
 *) echo "Unexpected Docker operation: $*" >&2; exit 1 ;;
esac`,
 curl:'while [[ "$#" -gt 0 ]]; do if [[ "$1" == -D ]]; then shift; printf "HTTP/2 200\\r\\nx-site-release: %s\\r\\n" "$TEST_COMMIT" > "$1"; fi; shift; done',
 sudo:'printf "%s\\n" "$*"',
 };
 for(const[name,body]of Object.entries(scripts))await writeFile(join(bin,name),'#!/usr/bin/env bash\nset -eu\n'+body+'\n',{mode:0o755});
 return {base,release,env:{...process.env,PATH:bin+':'+process.env.PATH,PB_DEPLOY_LOCK_HELD:'1',TEST_BASE:base,TEST_COMMIT:commit,TEST_PREVIOUS:previous}};
}
async function run(t,flags={}){const f=await fixture(t);const r=spawnSync('bash',[join(f.release,'deploy/publish.sh'),commit],{env:{...f.env,...flags},encoding:'utf8'});return{...f,result:r};}
async function calls(base){try{return(await readFile(join(base,'compose-calls'),'utf8')).trim().split('\n');}catch{return[];}}
test('deployment restores the previous image/config when production checks fail',async t=>{
 const f=await run(t,{TEST_PROD_FAIL:'1'});assert.equal(f.result.status,1,f.result.stderr);assert.deepEqual(await calls(f.base),['petrovich-clean:commit-'+commit.slice(0,12),'old-image:stable']);assert.equal(await readlink(join(f.base,'current')),'releases/old');
});
test('candidate failure and superseded main never replace production',async t=>{
 for(const flags of [{TEST_CANDIDATE_FAIL:'1'},{TEST_STALE:'1'}]){const f=await run(t,flags);assert.equal(f.result.status,flags.TEST_STALE?0:1,f.result.stderr);assert.deepEqual(await calls(f.base),[]);assert.equal(await readlink(join(f.base,'current')),'releases/old');}
});
test('successful deployment records the previous release after public verification',async t=>{
 const f=await run(t);assert.equal(f.result.status,0,f.result.stderr);assert.equal(await readlink(join(f.base,'current')),'releases/'+commit);const state=JSON.parse(await readFile(join(f.base,'state/last-deployment.json'),'utf8'));assert.equal(state.commit,commit);assert.equal(state.url,'https://petrovichbrothers.ru/');assert.equal(state.previousImage,'old-image:stable');assert.equal((await calls(f.base)).length,1);
});
test('restricted SSH entry accepts only one full deploy SHA, never shell commands',async t=>{
 const f=await fixture(t),script=new URL('../deploy/ssh-command.sh',import.meta.url).pathname;
 for(const command of ['', 'id', 'deploy main', 'deploy '+commit+'; id','deploy '+commit+' extra','deploy '+commit+'\n']){const r=spawnSync('bash',[script],{env:{...f.env,SSH_ORIGINAL_COMMAND:command},encoding:'utf8'});assert.equal(r.status,64,command);assert.equal(r.stdout,'');}
 const r=spawnSync('bash',[script],{env:{...f.env,SSH_ORIGINAL_COMMAND:'deploy '+commit},encoding:'utf8'});assert.equal(r.status,0);assert.equal(r.stdout.trim(),'-n /usr/local/sbin/pb-website-receive '+commit);
});

test('re-running the healthy same commit skips rebuild, restart and rollback-state changes',async t=>{
 const f=await run(t,{TEST_SAME_COMMIT:'1'});assert.equal(f.result.status,0,f.result.stderr);assert.deepEqual(await calls(f.base),[]);assert.match(f.result.stdout,/no rebuild or restart/);
});
